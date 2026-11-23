"use client";

import { useCallback, useState } from "react";

import { LOG_LEVELS } from "@/hooks/useTransferLog";
import { API_ROUTES, apiClient } from "@/lib/client/apiClient";

const RESULT_LOG = Object.freeze({
  success: {
    level: LOG_LEVELS.success,
    format: (result) => `SUCESSO "${result.fileName}" → ${result.blobName}`,
  },
  skipped: {
    level: LOG_LEVELS.skipped,
    format: (result) => `IGNORADO "${result.fileName}": ${result.message}`,
  },
  error: {
    level: LOG_LEVELS.error,
    format: (result) => `ERRO "${result.fileName}": ${result.message}`,
  },
});

function formatSummary({ total, succeeded, skipped, failed }) {
  return (
    `Concluído: ${total} arquivo(s) processado(s) — ` +
    `${succeeded} enviado(s), ${skipped} ignorado(s) por já existirem, ${failed} com erro.`
  );
}

/**
 * Dispara a transferência no servidor e registra cada resultado no console.
 * @param {{ addEntry: (level: string, text: string) => void, onFinished: () => void }} params
 */
export function useTransfer({ addEntry, onFinished }) {
  const [isTransferring, setIsTransferring] = useState(false);
  const [statusByFileId, setStatusByFileId] = useState({});

  const logResults = useCallback(
    ({ results, summary }) => {
      results.forEach((result) => {
        const { level, format } = RESULT_LOG[result.status] ?? RESULT_LOG.error;
        addEntry(level, format(result));
      });

      addEntry(LOG_LEVELS.info, formatSummary(summary));
    },
    [addEntry],
  );

  const transfer = useCallback(
    async (fileIds) => {
      const label = fileIds ? `${fileIds.length} arquivo(s) selecionado(s)` : "todos os arquivos";
      setIsTransferring(true);
      setStatusByFileId({});
      addEntry(LOG_LEVELS.info, `Iniciando transferência de ${label}...`);

      try {
        const outcome = await apiClient.post(API_ROUTES.transfer, fileIds ? { fileIds } : {});
        logResults(outcome);
        setStatusByFileId(
          Object.fromEntries(outcome.results.map((result) => [result.fileId, result.status])),
        );
      } catch (error) {
        addEntry(LOG_LEVELS.error, `A transferência falhou: ${error.message}`);
      } finally {
        setIsTransferring(false);
        onFinished();
      }
    },
    [addEntry, logResults, onFinished],
  );

  return { transfer, isTransferring, statusByFileId };
}
