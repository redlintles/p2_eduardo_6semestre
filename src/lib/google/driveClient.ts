import "server-only";

import { drive } from "@googleapis/drive";
import { JWT } from "google-auth-library";

import { getGoogleConfig } from "@/lib/config/env";

const READ_ONLY_SCOPE = "https://www.googleapis.com/auth/drive.readonly";

let cachedClient = null;

/**
 * Cria (uma única vez por instância) o cliente autenticado do Google Drive
 * usando a Service Account com escopo somente leitura.
 */
export function getDriveClient() {
  if (cachedClient) {
    return cachedClient;
  }

  const { credentials } = getGoogleConfig();
  const auth = new JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: [READ_ONLY_SCOPE],
  });

  cachedClient = drive({ version: "v3", auth });
  return cachedClient;
}
