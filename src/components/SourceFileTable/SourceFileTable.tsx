import { StatusBadge, type BadgeStatus } from "@/components/StatusBadge/StatusBadge";
import type { FileStatusMap } from "@/hooks/useTransfer";
import { formatBytes, formatDate } from "@/lib/client/formatters";
import type { SourceFile } from "@/types/transfer";

interface SourceFileTableProps {
  files: SourceFile[];
  selectedIds: ReadonlySet<string>;
  statusByFileId: FileStatusMap;
  onToggle: (fileId: string) => void;
  onToggleAll: (files: SourceFile[], shouldSelect: boolean) => void;
  isDisabled: boolean;
}

function resolveStatus(file: SourceFile, statusByFileId: FileStatusMap): BadgeStatus {
  if (!file.isTransferable) {
    return "unsupported";
  }
  return statusByFileId[file.id] ?? "idle";
}

/** Tabela dos arquivos do Google Drive com seleção por checkbox. */
export function SourceFileTable({
  files,
  selectedIds,
  statusByFileId,
  onToggle,
  onToggleAll,
  isDisabled,
}: SourceFileTableProps) {
  const transferableFiles = files.filter((file) => file.isTransferable);
  const isAllSelected =
    transferableFiles.length > 0 && transferableFiles.every((file) => selectedIds.has(file.id));

  return (
    <table className="file-table">
      <thead className="file-table__head">
        <tr>
          <th className="file-table__heading file-table__heading--checkbox">
            <input
              type="checkbox"
              className="file-table__checkbox"
              aria-label="Selecionar todos os arquivos"
              checked={isAllSelected}
              disabled={isDisabled || transferableFiles.length === 0}
              onChange={() => onToggleAll(transferableFiles, !isAllSelected)}
            />
          </th>
          <th className="file-table__heading">Nome</th>
          <th className="file-table__heading file-table__heading--numeric">Tamanho</th>
          <th className="file-table__heading">Modificado</th>
          <th className="file-table__heading">Status</th>
        </tr>
      </thead>
      <tbody>
        {files.map((file) => {
          const isSelected = selectedIds.has(file.id);
          const rowClass = isSelected ? "file-table__row file-table__row--selected" : "file-table__row";

          return (
            <tr key={file.id} className={rowClass}>
              <td className="file-table__cell file-table__cell--checkbox">
                <input
                  type="checkbox"
                  className="file-table__checkbox"
                  aria-label={`Selecionar ${file.name}`}
                  checked={isSelected}
                  disabled={isDisabled || !file.isTransferable}
                  onChange={() => onToggle(file.id)}
                />
              </td>
              <td className="file-table__cell file-table__cell--name" title={file.name}>
                {file.name}
                {file.targetName !== file.name && (
                  <span className="file-table__hint">salvo como {file.targetName}</span>
                )}
              </td>
              <td className="file-table__cell file-table__cell--numeric">{formatBytes(file.size)}</td>
              <td className="file-table__cell">{formatDate(file.modifiedAt)}</td>
              <td className="file-table__cell">
                <StatusBadge status={resolveStatus(file, statusByFileId)} />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
