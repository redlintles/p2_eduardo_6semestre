import "server-only";

import { ensureContainerExists } from "@/lib/azure/blobClient";
import { ValidationError } from "@/lib/errors/appErrors";
import { getErrorCode, getErrorMessage, getHttpStatus } from "@/lib/errors/errorDetails";
import { transferLogger } from "@/lib/logger/transferLogger";
import {
  blobExists,
  isBlobAlreadyExistsError,
  toSafeBlobName,
  uploadStream,
} from "@/services/blobService";
import { listSourceFiles, openFileStream } from "@/services/driveService";
import type {
  SourceFile,
  TransferOutcome,
  TransferResult,
  TransferStatus,
  TransferSummary,
} from "@/types/transfer";

const MAX_PARALLEL_TRANSFERS = 3;
const MAX_REASON_LENGTH = 200;

const SKIP_REASONS = {
  alreadyInDestination: (blobName: string) =>
    `Já existe um arquivo chamado "${blobName}" no contêiner de destino. Nada foi enviado.`,
  duplicatedInSource: (blobName: string) =>
    `Outro arquivo da pasta de origem com o nome "${blobName}" já foi enviado nesta transferência.`,
} as const;

/** Extrai uma mensagem curta e segura de um erro das SDKs (sem tokens ou chaves). */
function describeError(error: unknown): string {
  const code = getErrorCode(error) ?? getHttpStatus(error);
  const [firstLine = ""] = getErrorMessage(error).split("\n");
  const reason = code !== undefined ? `${firstLine} (código ${code})` : firstLine;
  return reason.slice(0, MAX_REASON_LENGTH);
}

/**
 * Seleciona os arquivos a transferir. IDs enviados pelo cliente só são aceitos
 * se pertencerem à pasta configurada, impedindo a cópia de arquivos arbitrários.
 */
function selectFiles(sourceFiles: SourceFile[], requestedIds: string[] | null): SourceFile[] {
  if (!requestedIds) {
    return sourceFiles.filter((file) => file.isTransferable);
  }

  const filesById = new Map(sourceFiles.map((file) => [file.id, file]));
  const selected = requestedIds
    .map((id) => filesById.get(id))
    .filter((file): file is SourceFile => file !== undefined);

  if (selected.length !== requestedIds.length) {
    throw new ValidationError("Um ou mais arquivos não pertencem à pasta de origem.");
  }

  return selected;
}

function buildResult(
  file: SourceFile,
  status: TransferStatus,
  message: string,
  blobName: string | null,
): TransferResult {
  return { fileId: file.id, fileName: file.name, status, message, blobName };
}

function skip(file: SourceFile, blobName: string, reason: string): TransferResult {
  transferLogger.skipped(file.name, reason);
  return buildResult(file, "skipped", reason, blobName);
}

/**
 * Copia um único arquivo do Drive para o Blob e registra o status no console.
 * Arquivos que já existem no destino são ignorados em vez de sobrescritos.
 * Nunca lança exceção: o erro é convertido em um resultado.
 * @param reservedNames Nomes já usados nesta transferência.
 */
async function transferFile(file: SourceFile, reservedNames: Set<string>): Promise<TransferResult> {
  const blobName = toSafeBlobName(file.targetName);

  // A verificação e a reserva acontecem sem await entre elas, então são
  // atômicas mesmo com várias transferências em paralelo.
  if (reservedNames.has(blobName)) {
    return skip(file, blobName, SKIP_REASONS.duplicatedInSource(blobName));
  }
  reservedNames.add(blobName);

  try {
    if (await blobExists(blobName)) {
      return skip(file, blobName, SKIP_REASONS.alreadyInDestination(blobName));
    }

    const { stream, contentType } = await openFileStream(file);
    const blobUrl = await uploadStream({ blobName, stream, contentType, sourceId: file.id });

    transferLogger.success(file.name, blobUrl);
    return buildResult(file, "success", "Transferido com sucesso.", blobName);
  } catch (error) {
    if (isBlobAlreadyExistsError(error)) {
      return skip(file, blobName, SKIP_REASONS.alreadyInDestination(blobName));
    }

    const reason = describeError(error);
    transferLogger.failure(file.name, reason);
    return buildResult(file, "error", reason, null);
  }
}

/** Executa as tarefas com um limite de concorrência, preservando a ordem. */
async function runWithConcurrency<TItem, TResult>(
  items: readonly TItem[],
  limit: number,
  task: (item: TItem) => Promise<TResult>,
): Promise<TResult[]> {
  const results = new Array<TResult>(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex++;
      results[currentIndex] = await task(items[currentIndex]);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
  await Promise.all(workers);
  return results;
}

function summarize(results: TransferResult[]): TransferSummary {
  const countBy = (status: TransferStatus) =>
    results.filter((result) => result.status === status).length;

  return {
    total: results.length,
    succeeded: countBy("success"),
    skipped: countBy("skipped"),
    failed: countBy("error"),
  };
}

/**
 * Copia os arquivos da pasta do Drive para o contêiner do Azure.
 * @param requestedIds IDs específicos, ou nulo para todos.
 */
export async function transferFiles(requestedIds: string[] | null = null): Promise<TransferOutcome> {
  const sourceFiles = await listSourceFiles();
  const filesToTransfer = selectFiles(sourceFiles, requestedIds);
  const reservedNames = new Set<string>();

  transferLogger.info(`Iniciando transferência de ${filesToTransfer.length} arquivo(s).`);
  await ensureContainerExists();

  const results = await runWithConcurrency(filesToTransfer, MAX_PARALLEL_TRANSFERS, (file) =>
    transferFile(file, reservedNames),
  );
  const summary = summarize(results);

  transferLogger.info(
    `Concluído: ${summary.succeeded} enviado(s), ${summary.skipped} ignorado(s), ${summary.failed} erro(s).`,
  );
  return { results, summary };
}
