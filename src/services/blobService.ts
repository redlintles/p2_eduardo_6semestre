import "server-only";

import { ensureContainerExists, getContainerClient } from "@/lib/azure/blobClient";
import { ExternalServiceError } from "@/lib/errors/appErrors";

const UPLOAD_BUFFER_SIZE = 4 * 1024 * 1024;
const UPLOAD_MAX_CONCURRENCY = 5;
const UNSAFE_NAME_CHARACTERS = /[\\/\u0000-\u001f\u007f]/g;
const MAX_BLOB_NAME_LENGTH = 1024;
const HTTP_CONFLICT = 409;
const HTTP_PRECONDITION_FAILED = 412;

/**
 * Remove caracteres que criariam "pastas virtuais" ou nomes inválidos no Blob.
 * @param {string} fileName
 */
export function toSafeBlobName(fileName) {
  const sanitized = fileName.replace(UNSAFE_NAME_CHARACTERS, "_").trim();
  return (sanitized || "arquivo-sem-nome").slice(0, MAX_BLOB_NAME_LENGTH);
}

function toDestinationFile(blob) {
  return {
    name: blob.name,
    size: blob.properties.contentLength ?? null,
    contentType: blob.properties.contentType ?? null,
    modifiedAt: blob.properties.lastModified?.toISOString() ?? null,
  };
}

/**
 * Lista todos os blobs do contêiner de destino.
 * @returns {Promise<import("@/services/types").DestinationFile[]>}
 */
export async function listDestinationFiles() {
  try {
    await ensureContainerExists();

    const blobs = [];
    for await (const blob of getContainerClient().listBlobsFlat()) {
      blobs.push(toDestinationFile(blob));
    }
    return blobs;
  } catch (error) {
    throw new ExternalServiceError("o Azure Blob Storage", error);
  }
}

/**
 * Verifica se já existe um blob com o nome informado no contêiner.
 * @param {string} blobName
 */
export async function blobExists(blobName) {
  return getContainerClient().getBlockBlobClient(blobName).exists();
}

/**
 * Indica se o erro do Azure significa que o blob já existia no momento do envio.
 */
export function isBlobAlreadyExistsError(error) {
  return (
    error?.statusCode === HTTP_CONFLICT ||
    error?.statusCode === HTTP_PRECONDITION_FAILED ||
    error?.code === "BlobAlreadyExists"
  );
}

/**
 * Envia um stream para o contêiner como Block Blob, sem nunca sobrescrever.
 * A condição If-None-Match: * faz o Azure recusar o envio caso outro processo
 * tenha criado o blob entre a verificação de existência e o upload.
 * @param {{ blobName: string, stream: NodeJS.ReadableStream, contentType: string, sourceId: string }} params
 * @returns {Promise<string>} URL do blob criado (sem token de acesso).
 */
export async function uploadStream({ blobName, stream, contentType, sourceId }) {
  const blockBlobClient = getContainerClient().getBlockBlobClient(blobName);

  await blockBlobClient.uploadStream(stream, UPLOAD_BUFFER_SIZE, UPLOAD_MAX_CONCURRENCY, {
    blobHTTPHeaders: { blobContentType: contentType },
    metadata: { sourcefileid: sourceId },
    conditions: { ifNoneMatch: "*" },
  });

  return blockBlobClient.url.split("?")[0];
}
