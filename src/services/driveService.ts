import "server-only";

import type { Readable } from "node:stream";

import type { drive_v3 } from "@googleapis/drive";

import { getGoogleConfig } from "@/lib/config/env";
import {
  ConfigurationError,
  ExternalServiceError,
  SourceFolderAccessError,
  ValidationError,
} from "@/lib/errors/appErrors";
import { getHttpStatus } from "@/lib/errors/errorDetails";
import { getDriveClient } from "@/lib/google/driveClient";
import { getExportFormat, isGoogleWorkspaceFile } from "@/lib/google/googleWorkspaceExport";
import type { SourceFile } from "@/types/transfer";

const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";
const DEFAULT_MIME_TYPE = "application/octet-stream";
const UNNAMED_FILE = "arquivo-sem-nome";
const PAGE_SIZE = 100;
const FILE_FIELDS = "id, name, mimeType, size, modifiedTime";
const HTTP_NOT_FOUND = 404;

type DriveFileWithId = drive_v3.Schema$File & { id: string };

export interface FileStream {
  stream: Readable;
  contentType: string;
}

/**
 * Garante que a pasta configurada existe e está visível para a Service Account.
 * Sem esta verificação, uma pasta não compartilhada seria listada como vazia,
 * pois a API do Drive não retorna erro para consultas sem resultados visíveis.
 */
async function assertFolderAccess(
  driveClient: drive_v3.Drive,
  folderId: string,
  serviceAccountEmail: string,
): Promise<void> {
  let folder: drive_v3.Schema$File;

  try {
    const response = await driveClient.files.get({
      fileId: folderId,
      fields: "id, mimeType",
      supportsAllDrives: true,
    });
    folder = response.data;
  } catch (error) {
    if (getHttpStatus(error) === HTTP_NOT_FOUND) {
      throw new SourceFolderAccessError(serviceAccountEmail);
    }
    throw new ExternalServiceError("o Google Drive", error);
  }

  if (folder.mimeType !== FOLDER_MIME_TYPE) {
    throw new ConfigurationError("GOOGLE_DRIVE_FOLDER_ID não aponta para uma pasta.");
  }
}

function buildFolderQuery(folderId: string): string {
  return [
    `'${folderId}' in parents`,
    "trashed = false",
    `mimeType != '${FOLDER_MIME_TYPE}'`,
  ].join(" and ");
}

function hasId(file: drive_v3.Schema$File): file is DriveFileWithId {
  return typeof file.id === "string" && file.id !== "";
}

/** Converte o recurso da API do Drive para o formato usado pela aplicação. */
function toSourceFile(file: DriveFileWithId): SourceFile {
  const name = file.name ?? UNNAMED_FILE;
  const mimeType = file.mimeType ?? DEFAULT_MIME_TYPE;
  const exportFormat = getExportFormat(mimeType);

  return {
    id: file.id,
    name,
    mimeType,
    size: file.size ? Number(file.size) : null,
    modifiedAt: file.modifiedTime ?? null,
    targetName: exportFormat ? `${name}${exportFormat.extension}` : name,
    isTransferable: !isGoogleWorkspaceFile(mimeType) || exportFormat !== null,
  };
}

/** Lista todos os arquivos (sem subpastas) da pasta configurada no Google Drive. */
export async function listSourceFiles(): Promise<SourceFile[]> {
  const { folderId, credentials } = getGoogleConfig();
  const driveClient = getDriveClient();
  const files: SourceFile[] = [];
  let pageToken: string | undefined;

  await assertFolderAccess(driveClient, folderId, credentials.client_email);

  try {
    do {
      const { data } = await driveClient.files.list({
        q: buildFolderQuery(folderId),
        fields: `nextPageToken, files(${FILE_FIELDS})`,
        orderBy: "name",
        pageSize: PAGE_SIZE,
        pageToken,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });

      files.push(...(data.files ?? []).filter(hasId).map(toSourceFile));
      pageToken = data.nextPageToken ?? undefined;
    } while (pageToken);
  } catch (error) {
    throw new ExternalServiceError("o Google Drive", error);
  }

  return files;
}

/**
 * Abre um stream de leitura do conteúdo de um arquivo do Drive,
 * exportando automaticamente arquivos nativos do Google.
 */
export async function openFileStream(file: SourceFile): Promise<FileStream> {
  if (!file.isTransferable) {
    throw new ValidationError("Este tipo de arquivo do Google não pode ser exportado.");
  }

  const driveClient = getDriveClient();
  const exportFormat = getExportFormat(file.mimeType);

  if (exportFormat) {
    const response = await driveClient.files.export(
      { fileId: file.id, mimeType: exportFormat.mimeType },
      { responseType: "stream" },
    );
    return { stream: response.data, contentType: exportFormat.mimeType };
  }

  const response = await driveClient.files.get(
    { fileId: file.id, alt: "media", supportsAllDrives: true },
    { responseType: "stream" },
  );
  return { stream: response.data, contentType: file.mimeType };
}
