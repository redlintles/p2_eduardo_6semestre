"use client";

import { useEffect, useRef } from "react";

import { Button } from "@/components/Button/Button";
import type { LogEntry } from "@/hooks/useTransferLog";
import { formatTime } from "@/lib/client/formatters";

interface TransferConsoleProps {
  entries: LogEntry[];
  onClear: () => void;
}

/** Console que exibe o status de cada transferência (sucesso, ignorado ou erro). */
export function TransferConsole({ entries, onClear }: TransferConsoleProps) {
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const output = outputRef.current;
    if (output) {
      output.scrollTop = output.scrollHeight;
    }
  }, [entries]);

  return (
    <section className="transfer-console">
      <header className="transfer-console__header">
        <h2 className="transfer-console__title">Console de transferências</h2>
        <Button variant="inverse" onClick={onClear} disabled={entries.length === 0}>
          Limpar
        </Button>
      </header>

      <div ref={outputRef} className="transfer-console__output" role="log" aria-live="polite">
        {entries.length === 0 ? (
          <p className="transfer-console__placeholder">Nenhuma transferência executada ainda.</p>
        ) : (
          entries.map((entry) => (
            <p key={entry.id} className={`transfer-console__line transfer-console__line--${entry.level}`}>
              <time className="transfer-console__time">{formatTime(entry.createdAt)}</time>
              <span className="transfer-console__text">{entry.text}</span>
            </p>
          ))
        )}
      </div>
    </section>
  );
}
