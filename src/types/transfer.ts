/**
 * Tipos compartilhados entre serviços, rotas e interface (JSDoc).
 *
 * @typedef {Object} SourceFile
 * @property {string} id            ID do arquivo no Google Drive.
 * @property {string} name          Nome original.
 * @property {string} mimeType      Tipo MIME no Drive.
 * @property {number | null} size   Tamanho em bytes (nulo para arquivos nativos do Google).
 * @property {string} modifiedAt    Data ISO da última modificação.
 * @property {string} targetName    Nome que o arquivo terá no Blob Storage.
 * @property {boolean} isTransferable Indica se o arquivo pode ser copiado.
 *
 * @typedef {Object} DestinationFile
 * @property {string} name
 * @property {number | null} size
 * @property {string | null} contentType
 * @property {string | null} modifiedAt
 *
 * @typedef {Object} TransferResult
 * @property {string} fileId
 * @property {string} fileName
 * @property {"success" | "skipped" | "error"} status
 * @property {string} message
 * @property {string | null} blobName
 */

export {};
