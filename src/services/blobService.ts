import "server-only";

import type { Readable } from "node:stream";

import type { BlobItem } from "@azure/storage-blob";

import { ensureContainerExists, getContainerClient } from "@/lib/azure/blobClient";
import { ExternalServiceError } from "@/lib/errors/appErrors";
import { getErrorCode, getHttpStatus } from "@/lib/errors/errorDetails";
import type { DestinationFile } from "@/types/transfer";

const UPLOAD_BUFFER_SIZE = 4 * 1024 * 1024;
const UPLOAD_MAX_CONCURRENCY = 5;
const UNSAFE_NAME_CHARACTERS = /[\\/\u0000-\u001f\u007f]/g;
const MAX_BLOB_NAME_LENGTH = 1024;
const FALLBACK_BLOB_NAME = "arquivo-sem-nome";
const ALREADY_EXISTS_STATUSES = new Set([409, 412]);
const ALREADY_EXISTS_CODE = "BlobAlreadyExists";

export interface UploadParams {
  blobName: string;
  stream: Readable;
  contentType: string;
  sourceId: string;
}

/** Remove caracteres que criariam "pastas virtuais" ou nomes inválidos no Blob. */
export function toSafeBlobName(fileName: string): string {
  const sanitized = fileName.replace(UNSAFE_NAME_CHARACTERS, "_").trim();
  return (sanitized || FALLBACK_BLOB_NAME).slice(0, MAX_BLOB_NAME_LENGTH);
}

function toDestinationFile(blob: BlobItem): DestinationFile {
  return {
    name: blob.name,
    size: blob.properties.contentLength ?? null,
    contentType: blob.properties.contentType ?? null,
    modifiedAt: blob.properties.lastModified?.toISOString() ?? null,
  };
}

/** Lista todos os blobs do contêiner de destino. */
export async function listDestinationFiles(): Promise<DestinationFile[]> {
  try {
    await ensureContainerExists();

    const blobs: DestinationFile[] = [];
    for await (const blob of getContainerClient().listBlobsFlat()) {
      blobs.push(toDestinationFile(blob));
    }
    return blobs;
  } catch (error) {
    throw new ExternalServiceError("o Azure Blob Storage", error);
  }
}

/** Verifica se já existe um blob com o nome informado no contêiner. */
export async function blobExists(blobName: string): Promise<boolean> {
  return getContainerClient().getBlockBlobClient(blobName).exists();
}

/** Indica se o erro do Azure significa que o blob já existia no momento do envio. */
export function isBlobAlreadyExistsError(error: unknown): boolean {
  const status = getHttpStatus(error);
  return (status !== undefined && ALREADY_EXISTS_STATUSES.has(status)) ||
    getErrorCode(error) === ALREADY_EXISTS_CODE;
}

/**
 * Envia um stream para o contêiner como Block Blob, sem nunca sobrescrever.
 * A condição If-None-Match: * faz o Azure recusar o envio caso outro processo
 * tenha criado o blob entre a verificação de existência e o upload.
 * @returns URL do blob criado (sem token de acesso).
 */
export async function uploadStream({
  blobName,
  stream,
  contentType,
  sourceId,
}: UploadParams): Promise<string> {
  const blockBlobClient = getContainerClient().getBlockBlobClient(blobName);

  await blockBlobClient.uploadStream(stream, UPLOAD_BUFFER_SIZE, UPLOAD_MAX_CONCURRENCY, {
    blobHTTPHeaders: { blobContentType: contentType },
    metadata: { sourcefileid: sourceId },
    conditions: { ifNoneMatch: "*" },
  });

  const blobUrl = new URL(blockBlobClient.url);
  blobUrl.search = "";
  return blobUrl.toString();
}
