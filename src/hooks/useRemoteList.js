"use client";

import { useCallback, useEffect, useState } from "react";

import { apiClient } from "@/lib/client/apiClient";

const INITIAL_STATE = { items: [], isLoading: true, error: null };

/**
 * Busca uma lista na API e expõe estado de carregamento, erro e recarga.
 * @param {string} endpoint
 */
export function useRemoteList(endpoint) {
  const [state, setState] = useState(INITIAL_STATE);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    apiClient
      .get(endpoint, { signal: controller.signal })
      .then((items) => setState({ items, isLoading: false, error: null }))
      .catch((error) => {
        if (error.name !== "AbortError") {
          setState((previous) => ({ ...previous, isLoading: false, error: error.message }));
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
