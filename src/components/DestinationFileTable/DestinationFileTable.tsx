import { formatBytes, formatDate } from "@/lib/client/formatters";
import type { DestinationFile } from "@/types/transfer";

interface DestinationFileTableProps {
  files: DestinationFile[];
}

/** Tabela dos blobs presentes no contêiner de destino. */
export function DestinationFileTable({ files }: DestinationFileTableProps) {
  return (
    <table className="file-table">
      <thead className="file-table__head">
        <tr>
          <th className="file-table__heading">Nome do blob</th>
          <th className="file-table__heading file-table__heading--numeric">Tamanho</th>
          <th className="file-table__heading">Modificado</th>
        </tr>
      </thead>
      <tbody>
        {files.map((file) => (
          <tr key={file.name} className="file-table__row">
            <td className="file-table__cell file-table__cell--name" title={file.name}>
              {file.name}
              {file.contentType && <span className="file-table__hint">{file.contentType}</span>}
            </td>
            <td className="file-table__cell file-table__cell--numeric">{formatBytes(file.size)}</td>
            <td className="file-table__cell">{formatDate(file.modifiedAt)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
