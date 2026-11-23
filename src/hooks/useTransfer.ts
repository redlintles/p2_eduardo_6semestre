"use client";

import { useCallback, useState } from "react";

import type { AddLogEntry, LogLevel } from "@/hooks/useTransferLog";
import { API_ROUTES, apiClient } from "@/lib/client/apiClient";
import type {
  TransferOutcome,
  TransferResult,
  TransferStatus,
  TransferSummary,
} from "@/types/transfer";

export type FileStatusMap = Readonly<Partial<Record<string, TransferStatus>>>;

interface ResultLogFormat {
  level: LogLevel;
  format: (result: TransferResult) => string;
}

const RESULT_LOG: Readonly<Record<TransferStatus, ResultLogFormat>> = {
  success: {
    level: "success",
    format: (result) => `SUCESSO "${result.fileName}" → ${result.blobName}`,
  },
  skipped: {
    level: "skipped",
    format: (result) => `IGNORADO "${result.fileName}": ${result.message}`,
  },
  error: {
    level: "error",
    format: (result) => `ERRO "${result.fileName}": ${result.message}`,
  },
};

function formatSummary({ total, succeeded, skipped, failed }: TransferSummary): string {
  return (
    `Concluído: ${total} arquivo(s) processado(s) — ` +
    `${succeeded} enviado(s), ${skipped} ignorado(s) por já existirem, ${failed} com erro.`
  );
}

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Erro desconhecido.";
}

interface UseTransferParams {
  addEntry: AddLogEntry;
  onFinished: () => void;
}

export interface TransferController {
  transfer: (fileIds: string[] | null) => Promise<void>;
  isTransferring: boolean;
  statusByFileId: FileStatusMap;
}

/** Dispara a transferência no servidor e registra cada resultado no console. */
export function useTransfer({ addEntry, onFinished }: UseTransferParams): TransferController {
  const [isTransferring, setIsTransferring] = useState(false);
  const [statusByFileId, setStatusByFileId] = useState<FileStatusMap>({});

  const logResults = useCallback(
    ({ results, summary }: TransferOutcome) => {
      results.forEach((result) => {
        const { level, format } = RESULT_LOG[result.status];
        addEntry(level, format(result));
      });

      addEntry("info", formatSummary(summary));
    },
    [addEntry],
  );

  const transfer = useCallback(
    async (fileIds: string[] | null) => {
      const label = fileIds ? `${fileIds.length} arquivo(s) selecionado(s)` : "todos os arquivos";
      setIsTransferring(true);
      setStatusByFileId({});
      addEntry("info", `Iniciando transferência de ${label}...`);

      try {
        const outcome = await apiClient.post<TransferOutcome>(
          API_ROUTES.transfer,
          fileIds ? { fileIds } : {},
        );
        logResults(outcome);
        setStatusByFileId(
          Object.fromEntries(outcome.results.map((result) => [result.fileId, result.status])),
        );
      } catch (error) {
        addEntry("error", `A transferência falhou: ${toMessage(error)}`);
      } finally {
        setIsTransferring(false);
        onFinished();
      }
    },
    [addEntry, logResults, onFinished],
  );

  return { transfer, isTransferring, statusByFileId };
}
