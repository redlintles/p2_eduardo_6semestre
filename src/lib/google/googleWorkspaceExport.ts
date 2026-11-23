/**
 * Arquivos nativos do Google (Docs, Planilhas, Apresentações, Desenhos)
 * não possuem conteúdo binário próprio: precisam ser exportados para um
 * formato convencional antes de serem copiados.
 */
const EXPORT_FORMATS = Object.freeze({
  "application/vnd.google-apps.document": {
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    extension: ".docx",
  },
  "application/vnd.google-apps.spreadsheet": {
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    extension: ".xlsx",
  },
  "application/vnd.google-apps.presentation": {
    mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    extension: ".pptx",
  },
  "application/vnd.google-apps.drawing": {
    mimeType: "image/png",
    extension: ".png",
  },
});

const GOOGLE_APPS_PREFIX = "application/vnd.google-apps.";

export function isGoogleWorkspaceFile(mimeType) {
  return mimeType.startsWith(GOOGLE_APPS_PREFIX);
}

/**
 * @param {string} mimeType
 * @returns {{ mimeType: string, extension: string } | null}
 */
export function getExportFormat(mimeType) {
  return EXPORT_FORMATS[mimeType] ?? null;
}
