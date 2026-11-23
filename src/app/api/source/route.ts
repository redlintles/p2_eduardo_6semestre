import { jsonError, jsonSuccess } from "@/lib/http/apiResponse";
import { listSourceFiles } from "@/services/driveService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/source — lista os arquivos da pasta do Google Drive. */
export async function GET() {
  try {
    return jsonSuccess(await listSourceFiles());
  } catch (error) {
    return jsonError(error);
  }
}
