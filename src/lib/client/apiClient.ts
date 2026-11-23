import type { ApiResponse } from "@/types/api";

/**
 * Cliente HTTP mínimo para as rotas internas. Toda resposta da API segue
 * o formato definido em ApiResponse.
 */
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  const response = await fetch(endpoint, { ...options, headers });
  const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null;

  if (!response.ok || !payload?.ok) {
    const message = payload && !payload.ok ? payload.error : null;
    throw new Error(message ?? `Falha na requisição (HTTP ${response.status}).`);
  }

  return payload.data;
}

export const apiClient = {
  get: <T>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: "GET" }),
  post: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: "POST", body: JSON.stringify(body ?? {}) }),
};

export const API_ROUTES = {
  source: "/api/source",
  destination: "/api/destination",
  transfer: "/api/transfer",
} as const;
