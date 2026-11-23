import "server-only";

import { getGoogleConfig } from "@/lib/config/env";
import { ExternalServiceError, ValidationError } from "@/lib/errors/appErrors";
import { getDriveClient } from "@/lib/google/driveClient";
import { getExportFormat, isGoogleWorkspaceFile } from "@/lib/google/googleWorkspaceExport";

const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";
const PAGE_SIZE = 100;
const FILE_FIELDS = "id, name, mimeType, size, modifiedTime";

function buildFolderQuery(folderId) {
  return [
    `'${folderId}' in parents`,
    "trashed = false",
    `mimeType != '${FOLDER_MIME_TYPE}'`,
  ].join(" and ");
}

/**
 * Converte o recurso da API do Drive para o formato usado pela aplicação.
 * @returns {import("@/services/types").SourceFile}
 */
function toSourceFile(file) {
  const exportFormat = getExportFormat(file.mimeType);
  const isNative = isGoogleWorkspaceFile(file.mimeType);

  return {
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
    size: file.size ? Number(file.size) : null,
    modifiedAt: file.modifiedTime,
    targetName: exportFormat ? `${file.name}${exportFormat.extension}` : file.name,
    isTransferable: !isNative || exportFormat !== null,
  };
}

/**
 * Lista todos os arquivos (sem subpastas) da pasta configurada no Google Drive.
 * @returns {Promise<import("@/services/types").SourceFile[]>}
 */
export async function listSourceFiles() {
  const { folderId } = getGoogleConfig();
  const driveClient = getDriveClient();
  const files = [];
  let pageToken;

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

      files.push(...(data.files ?? []).map(toSourceFile));
      pageToken = data.nextPageToken;
    } while (pageToken);
  } catch (error) {
    throw new ExternalServiceError("o Google Drive", error);
  }

  return files;
}

/**
 * Abre um stream de leitura do conteúdo de um arquivo do Drive,
 * exportando automaticamente arquivos nativos do Google.
 * @param {import("@/services/types").SourceFile} file
 * @returns {Promise<{ stream: NodeJS.ReadableStream, contentType: string }>}
 */
export async function openFileStream(file) {
  if (!file.isTransferable) {
    throw new ValidationError("Este tipo de arquivo do Google não pode ser exportado.");
  }

  const driveClient = getDriveClient();
  const exportFormat = getExportFormat(file.mimeType);
  const streamOptions = { responseType: "stream" };

  if (exportFormat) {
    const response = await driveClient.files.export(
      { fileId: file.id, mimeType: exportFormat.mimeType },
      streamOptions,
    );
    return { stream: response.data, contentType: exportFormat.mimeType };
  }

  const response = await driveClient.files.get(
    { fileId: file.id, alt: "media", supportsAllDrives: true },
    streamOptions,
  );
  return { stream: response.data, contentType: file.mimeType };
}
