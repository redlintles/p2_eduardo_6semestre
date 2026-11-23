"use client";

import { useCallback, useRef, useState } from "react";

export const LOG_LEVELS = Object.freeze({
  info: "info",
  success: "success",
  skipped: "skipped",
  error: "error",
});

/**
 * Mantém as linhas exibidas no console de transferências da interface.
 */
export function useTransferLog() {
  const [entries, setEntries] = useState([]);
  const nextId = useRef(0);

  const addEntry = useCallback((level, text) => {
    nextId.current += 1;
    const entry = { id: nextId.current, level, text, createdAt: new Date() };
    setEntries((previous) => [...previous, entry]);
  }, []);

  const clear = useCallback(() => setEntries([]), []);

  return { entries, addEntry, clear };
}
