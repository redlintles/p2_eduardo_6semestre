import { jsonError, jsonSuccess } from "@/lib/http/apiResponse";
import { listDestinationFiles } from "@/services/blobService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/destination — lista os blobs do contêiner do Azure. */
export async function GET() {
  try {
    return jsonSuccess(await listDestinationFiles());
  } catch (error) {
    return jsonError(error);
  }
}
