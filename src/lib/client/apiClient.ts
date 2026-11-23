/**
 * Cliente HTTP mínimo para as rotas internas. Toda resposta da API segue
 * o formato { ok: boolean, data?: any, error?: string }.
 */
async function request(endpoint, options = {}) {
  const response = await fetch(endpoint, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.error ?? `Falha na requisição (HTTP ${response.status}).`);
  }

  return payload.data;
}

export const apiClient = {
  get: (endpoint, options) => request(endpoint, { ...options, method: "GET" }),
  post: (endpoint, body, options) =>
    request(endpoint, { ...options, method: "POST", body: JSON.stringify(body ?? {}) }),
};

export const API_ROUTES = Object.freeze({
  source: "/api/source",
  destination: "/api/destination",
  transfer: "/api/transfer",
});
