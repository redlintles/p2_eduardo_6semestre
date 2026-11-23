"use client";

import { useCallback, useMemo, useState } from "react";

import { Button } from "@/components/Button/Button";
import { DestinationFileTable } from "@/components/DestinationFileTable/DestinationFileTable";
import { FilePanel } from "@/components/FilePanel/FilePanel";
import { SourceFileTable } from "@/components/SourceFileTable/SourceFileTable";
import { TransferConsole } from "@/components/TransferConsole/TransferConsole";
import { useRemoteList } from "@/hooks/useRemoteList";
import { useTransfer } from "@/hooks/useTransfer";
import { useTransferLog } from "@/hooks/useTransferLog";
import { API_ROUTES } from "@/lib/client/apiClient";
import type { DestinationFile, SourceFile } from "@/types/transfer";

/** Tela principal: origem (Drive), destino (Blob) e console de transferências. */
export function Dashboard() {
  const source = useRemoteList<SourceFile>(API_ROUTES.source);
  const destination = useRemoteList<DestinationFile>(API_ROUTES.destination);
  const log = useTransferLog();
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(() => new Set());
  const { reload: reloadDestination } = destination;

  const handleTransferFinished = useCallback(() => {
    setSelectedIds(new Set());
    reloadDestination();
  }, [reloadDestination]);

  const { transfer, isTransferring, statusByFileId } = useTransfer({
    addEntry: log.addEntry,
    onFinished: handleTransferFinished,
  });

  const validSelectedIds = useMemo(() => {
    const availableIds = new Set(source.items.map((file) => file.id));
    return [...selectedIds].filter((id) => availableIds.has(id));
  }, [selectedIds, source.items]);

  const hasTransferableFiles = source.items.some((file) => file.isTransferable);

  const toggleFile = useCallback((fileId: string) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(fileId)) {
        next.delete(fileId);
      } else {
        next.add(fileId);
      }
      return next;
    });
  }, []);

  const toggleAll = useCallback((files: SourceFile[], shouldSelect: boolean) => {
    setSelectedIds(shouldSelect ? new Set(files.map((file) => file.id)) : new Set());
  }, []);

  const sourceActions = (
    <>
      <Button variant="ghost" onClick={source.reload} disabled={source.isLoading || isTransferring}>
        Atualizar
      </Button>
      <Button
        onClick={() => transfer(validSelectedIds)}
        disabled={isTransferring || validSelectedIds.length === 0}
      >
        Copiar selecionados ({validSelectedIds.length})
      </Button>
      <Button
        variant="primary"
        onClick={() => transfer(null)}
        disabled={isTransferring || source.isLoading || !hasTransferableFiles}
      >
        {isTransferring ? "Copiando..." : "Copiar todos"}
      </Button>
    </>
  );

  const destinationActions = (
    <Button variant="ghost" onClick={destination.reload} disabled={destination.isLoading}>
      Atualizar
    </Button>
  );

  return (
    <div className="dashboard">
      <div className="dashboard__panels">
        <FilePanel
          title="Origem · Google Drive"
          subtitle={`${source.items.length} arquivo(s) na pasta`}
          actions={sourceActions}
          isLoading={source.isLoading}
          error={source.error}
          isEmpty={source.items.length === 0}
          emptyMessage="A pasta de origem está vazia."
        >
          <SourceFileTable
            files={source.items}
            selectedIds={selectedIds}
            statusByFileId={statusByFileId}
            onToggle={toggleFile}
            onToggleAll={toggleAll}
            isDisabled={isTransferring}
          />
        </FilePanel>

        <FilePanel
          title="Destino · Azure Blob Storage"
          subtitle={`${destination.items.length} blob(s) no contêiner`}
          actions={destinationActions}
          isLoading={destination.isLoading}
          error={destination.error}
          isEmpty={destination.items.length === 0}
          emptyMessage="O contêiner ainda não possui arquivos."
        >
          <DestinationFileTable files={destination.items} />
        </FilePanel>
      </div>

      <TransferConsole entries={log.entries} onClear={log.clear} />
    </div>
  );
}
