import "server-only";

import { NextResponse } from "next/server";

import { AppError } from "@/lib/errors/appErrors";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export function jsonSuccess(data, status = 200) {
  return NextResponse.json({ ok: true, data }, { status, headers: NO_STORE_HEADERS });
}

/**
 * Converte qualquer erro em uma resposta JSON. Erros conhecidos expõem apenas
 * sua mensagem pública; erros inesperados retornam uma mensagem genérica.
 */
export function jsonError(error) {
  console.error("[drive-to-blob]", error?.cause ?? error);

  const isKnown = error instanceof AppError;
  const status = isKnown ? error.statusCode : 500;
  const message = isKnown ? error.message : "Erro interno do servidor.";

  return NextResponse.json({ ok: false, error: message }, { status, headers: NO_STORE_HEADERS });
}
