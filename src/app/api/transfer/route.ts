import { ValidationError } from "@/lib/errors/appErrors";
import { jsonError, jsonSuccess } from "@/lib/http/apiResponse";
import { transferFiles } from "@/services/transferService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_FILE_IDS = 500;
const FILE_ID_PATTERN = /^[A-Za-z0-9_-]{10,200}$/;

/**
 * Valida o corpo da requisição.
 * Formato aceito: { "fileIds": ["id1", "id2"] } ou corpo vazio (todos os arquivos).
 * @returns {Promise<string[] | null>}
 */
async function parseFileIds(request) {
  const rawBody = await request.text();
  if (rawBody.trim() === "") {
    return null;
  }

  let body;
  try {
    body = JSON.parse(rawBody);
  } catch {
    throw new ValidationError("O corpo da requisição deve ser um JSON válido.");
  }

  if (body?.fileIds === undefined || body.fileIds === null) {
    return null;
  }

  const { fileIds } = body;
  const isValidList =
    Array.isArray(fileIds) &&
    fileIds.length > 0 &&
    fileIds.length <= MAX_FILE_IDS &&
    fileIds.every((id) => typeof id === "string" && FILE_ID_PATTERN.test(id));

  if (!isValidList) {
    throw new ValidationError("fileIds deve ser uma lista de IDs válidos do Google Drive.");
  }

  return [...new Set(fileIds)];
}

/** POST /api/transfer — copia os arquivos do Drive para o Blob Storage. */
export async function POST(request) {
  try {
    const fileIds = await parseFileIds(request);
    return jsonSuccess(await transferFiles(fileIds));
  } catch (error) {
    return jsonError(error);
  }
}
