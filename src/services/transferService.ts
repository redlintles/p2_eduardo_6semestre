import "server-only";

import { ensureContainerExists } from "@/lib/azure/blobClient";
import { ValidationError } from "@/lib/errors/appErrors";
import { transferLogger } from "@/lib/logger/transferLogger";
import {
  blobExists,
  isBlobAlreadyExistsError,
  toSafeBlobName,
  uploadStream,
} from "@/services/blobService";
import { listSourceFiles, openFileStream } from "@/services/driveService";

const MAX_PARALLEL_TRANSFERS = 3;
const MAX_REASON_LENGTH = 200;

export const TRANSFER_STATUS = Object.freeze({
  success: "success",
  skipped: "skipped",
  error: "error",
});

const SKIP_REASONS = Object.freeze({
  alreadyInDestination: (blobName) =>
    `Já existe um arquivo chamado "${blobName}" no contêiner de destino. Nada foi enviado.`,
  duplicatedInSource: (blobName) =>
    `Outro arquivo da pasta de origem com o nome "${blobName}" já foi enviado nesta transferência.`,
});

/**
 * Extrai uma mensagem curta e segura de um erro das SDKs (sem tokens ou chaves).
 */
function describeError(error) {
  const code = error?.code ?? error?.statusCode;
  const message = String(error?.message ?? "Erro desconhecido").split("\n")[0];
  const reason = code ? `${message} (código ${code})` : message;
  return reason.slice(0, MAX_REASON_LENGTH);
}

/**
 * Seleciona os arquivos a transferir. IDs enviados pelo cliente só são aceitos
 * se pertencerem à pasta configurada, impedindo a cópia de arquivos arbitrários.
 */
function selectFiles(sourceFiles, requestedIds) {
  if (!requestedIds) {
    return sourceFiles.filter((file) => file.isTransferable);
  }

  const filesById = new Map(sourceFiles.map((file) => [file.id, file]));
  const unknownIds = requestedIds.filter((id) => !filesById.has(id));

  if (unknownIds.length > 0) {
    throw new ValidationError("Um ou mais arquivos não pertencem à pasta de origem.");
  }

  return requestedIds.map((id) => filesById.get(id));
}

function buildResult(file, status, message, blobName) {
  return { fileId: file.id, fileName: file.name, status, message, blobName };
}

function skip(file, blobName, reason) {
  transferLogger.skipped(file.name, reason);
  return buildResult(file, TRANSFER_STATUS.skipped, reason, blobName);
}

/**
 * Copia um único arquivo do Drive para o Blob e registra o status no console.
 * Arquivos que já existem no destino são ignorados em vez de sobrescritos.
 * Nunca lança exceção: o erro é convertido em um resultado.
 * @param {import("@/services/types").SourceFile} file
 * @param {Set<string>} reservedNames Nomes já usados nesta transferência.
 * @returns {Promise<import("@/services/types").TransferResult>}
 */
async function transferFile(file, reservedNames) {
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
    return buildResult(file, TRANSFER_STATUS.success, "Transferido com sucesso.", blobName);
  } catch (error) {
    if (isBlobAlreadyExistsError(error)) {
      return skip(file, blobName, SKIP_REASONS.alreadyInDestination(blobName));
    }

    const reason = describeError(error);
    transferLogger.failure(file.name, reason);
    return buildResult(file, TRANSFER_STATUS.error, reason, null);
  }
}

/**
 * Executa as tarefas com um limite de concorrência, preservando a ordem.
 */
async function runWithConcurrency(items, limit, task) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex++;
      results[currentIndex] = await task(items[currentIndex]);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
  await Promise.all(workers);
  return results;
}

function summarize(results) {
  const countBy = (status) => results.filter((result) => result.status === status).length;

  return {
    total: results.length,
    succeeded: countBy(TRANSFER_STATUS.success),
    skipped: countBy(TRANSFER_STATUS.skipped),
    failed: countBy(TRANSFER_STATUS.error),
  };
}

/**
 * Copia os arquivos da pasta do Drive para o contêiner do Azure.
 * @param {string[] | null} requestedIds IDs específicos, ou nulo para todos.
 * @returns {Promise<{ results: import("@/services/types").TransferResult[], summary: { total: number, succeeded: number, skipped: number, failed: number } }>}
 */
export async function transferFiles(requestedIds = null) {
  const sourceFiles = await listSourceFiles();
  const filesToTransfer = selectFiles(sourceFiles, requestedIds);
  const reservedNames = new Set();

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
