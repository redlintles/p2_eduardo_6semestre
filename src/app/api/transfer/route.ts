import { ValidationError } from "@/lib/errors/appErrors";
import { jsonError, jsonSuccess } from "@/lib/http/apiResponse";
import { transferFiles } from "@/services/transferService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_FILE_IDS = 500;
const FILE_ID_PATTERN = /^[A-Za-z0-9_-]{10,200}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidFileIdList(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.length <= MAX_FILE_IDS &&
    value.every((id) => typeof id === "string" && FILE_ID_PATTERN.test(id))
  );
}

/**
 * Valida o corpo da requisição.
 * Formato aceito: { "fileIds": ["id1", "id2"] } ou corpo vazio (todos os arquivos).
 */
async function parseFileIds(request: Request): Promise<string[] | null> {
  const rawBody = await request.text();
  if (rawBody.trim() === "") {
    return null;
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    throw new ValidationError("O corpo da requisição deve ser um JSON válido.");
  }

  if (!isRecord(body)) {
    throw new ValidationError("O corpo da requisição deve ser um objeto JSON.");
  }

  const { fileIds } = body;
  if (fileIds === undefined || fileIds === null) {
    return null;
  }

  if (!isValidFileIdList(fileIds)) {
    throw new ValidationError("fileIds deve ser uma lista de IDs válidos do Google Drive.");
  }

  return [...new Set(fileIds)];
}

/** POST /api/transfer — copia os arquivos do Drive para o Blob Storage. */
export async function POST(request: Request) {
  try {
    const fileIds = await parseFileIds(request);
    return jsonSuccess(await transferFiles(fileIds));
  } catch (error) {
    return jsonError(error);
  }
}
