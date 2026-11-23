import "server-only";

import { ensureContainerExists } from "@/lib/azure/blobClient";
import { ValidationError } from "@/lib/errors/appErrors";
import { transferLogger } from "@/lib/logger/transferLogger";
import { toSafeBlobName, uploadStream } from "@/services/blobService";
import { listSourceFiles, openFileStream } from "@/services/driveService";

const MAX_PARALLEL_TRANSFERS = 3;
const MAX_REASON_LENGTH = 200;

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

/**
 * Copia um único arquivo do Drive para o Blob e registra o status no console.
 * Nunca lança exceção: o erro é convertido em um resultado.
 * @returns {Promise<import("@/services/types").TransferResult>}
 */
async function transferFile(file) {
  const blobName = toSafeBlobName(file.targetName);

  try {
    const { stream, contentType } = await openFileStream(file);
    const blobUrl = await uploadStream({ blobName, stream, contentType, sourceId: file.id });

    transferLogger.success(file.name, blobUrl);
    return { fileId: file.id, fileName: file.name, status: "success", message: "Transferido com sucesso.", blobName };
  } catch (error) {
    const reason = describeError(error);
    transferLogger.failure(file.name, reason);
    return { fileId: file.id, fileName: file.name, status: "error", message: reason, blobName: null };
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

/**
 * Copia os arquivos da pasta do Drive para o contêiner do Azure.
 * @param {string[] | null} requestedIds IDs específicos, ou nulo para todos.
 * @returns {Promise<{ results: import("@/services/types").TransferResult[], summary: { total: number, succeeded: number, failed: number } }>}
 */
export async function transferFiles(requestedIds = null) {
  const sourceFiles = await listSourceFiles();
  const filesToTransfer = selectFiles(sourceFiles, requestedIds);

  transferLogger.info(`Iniciando transferência de ${filesToTransfer.length} arquivo(s).`);
  await ensureContainerExists();

  const results = await runWithConcurrency(filesToTransfer, MAX_PARALLEL_TRANSFERS, transferFile);
  const succeeded = results.filter((result) => result.status === "success").length;
  const summary = { total: results.length, succeeded, failed: results.length - succeeded };

  transferLogger.info(`Concluído: ${summary.succeeded} sucesso(s), ${summary.failed} erro(s).`);
  return { results, summary };
}
