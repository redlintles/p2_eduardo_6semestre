"use client";

import { useCallback, useRef, useState } from "react";

export type LogLevel = "info" | "success" | "skipped" | "error";

export interface LogEntry {
  id: number;
  level: LogLevel;
  text: string;
  createdAt: Date;
}

export type AddLogEntry = (level: LogLevel, text: string) => void;

export interface TransferLog {
  entries: LogEntry[];
  addEntry: AddLogEntry;
  clear: () => void;
}

/** Mantém as linhas exibidas no console de transferências da interface. */
export function useTransferLog(): TransferLog {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const nextId = useRef(0);

  const addEntry = useCallback<AddLogEntry>((level, text) => {
    nextId.current += 1;
    const entry: LogEntry = { id: nextId.current, level, text, createdAt: new Date() };
    setEntries((previous) => [...previous, entry]);
  }, []);

  const clear = useCallback(() => setEntries([]), []);

  return { entries, addEntry, clear };
}
