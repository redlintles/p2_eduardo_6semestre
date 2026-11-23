/**
 * Formato padrão de todas as respostas das rotas de API.
 */
export type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: string };
