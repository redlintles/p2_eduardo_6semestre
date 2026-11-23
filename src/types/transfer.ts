/**
 * Tipos compartilhados entre serviços, rotas de API e interface.
 */

/** Arquivo da pasta de origem no Google Drive. */
export interface SourceFile {
  /** ID do arquivo no Google Drive. */
  id: string;
  /** Nome original. */
  name: string;
  /** Tipo MIME no Drive. */
  mimeType: string;
  /** Tamanho em bytes (nulo para arquivos nativos do Google). */
  size: number | null;
  /** Data ISO da última modificação. */
  modifiedAt: string | null;
  /** Nome que o arquivo terá no Blob Storage. */
  targetName: string;
  /** Indica se o arquivo pode ser copiado. */
  isTransferable: boolean;
}

/** Blob presente no contêiner de destino. */
export interface DestinationFile {
  name: string;
  size: number | null;
  contentType: string | null;
  modifiedAt: string | null;
}

export type TransferStatus = "success" | "skipped" | "error";

/** Resultado da cópia de um único arquivo. */
export interface TransferResult {
  fileId: string;
  fileName: string;
  status: TransferStatus;
  message: string;
  blobName: string | null;
}

export interface TransferSummary {
  total: number;
  succeeded: number;
  skipped: number;
  failed: number;
}

/** Resposta completa de uma transferência. */
export interface TransferOutcome {
  results: TransferResult[];
  summary: TransferSummary;
}
