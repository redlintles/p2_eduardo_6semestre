"use client";

import { useCallback, useState } from "react";

import { LOG_LEVELS } from "@/hooks/useTransferLog";
import { API_ROUTES, apiClient } from "@/lib/client/apiClient";

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
        const isSuccess = result.status === "success";
        const text = isSuccess
          ? `SUCESSO "${result.fileName}" → ${result.blobName}`
          : `ERRO "${result.fileName}": ${result.message}`;
        addEntry(isSuccess ? LOG_LEVELS.success : LOG_LEVELS.error, text);
      });

      addEntry(
        LOG_LEVELS.info,
        `Concluído: ${summary.succeeded} de ${summary.total} arquivo(s) copiados, ${summary.failed} com erro.`,
      );
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
