"use client";

import { useCallback, useEffect, useState } from "react";

import { apiClient } from "@/lib/client/apiClient";

interface RemoteListState<T> {
  items: T[];
  isLoading: boolean;
  error: string | null;
}

export interface RemoteList<T> extends RemoteListState<T> {
  reload: () => void;
}

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Erro desconhecido.";
}

/** Busca uma lista na API e expõe estado de carregamento, erro e recarga. */
export function useRemoteList<T>(endpoint: string): RemoteList<T> {
  const [state, setState] = useState<RemoteListState<T>>({
    items: [],
    isLoading: true,
    error: null,
  });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    apiClient
      .get<T[]>(endpoint, { signal: controller.signal })
      .then((items) => setState({ items, isLoading: false, error: null }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setState((previous) => ({ ...previous, isLoading: false, error: toMessage(error) }));
        }
      });

    return () => controller.abort();
  }, [endpoint, reloadKey]);

  const reload = useCallback(() => {
    setState((previous) => ({ ...previous, isLoading: true, error: null }));
    setReloadKey((key) => key + 1);
  }, []);

  return { ...state, reload };
}
