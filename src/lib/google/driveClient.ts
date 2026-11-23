import "server-only";

import { auth, drive, type drive_v3 } from "@googleapis/drive";

import { getGoogleConfig } from "@/lib/config/env";

const READ_ONLY_SCOPE = "https://www.googleapis.com/auth/drive.readonly";

let cachedClient: drive_v3.Drive | null = null;

/**
 * Cria (uma única vez por instância) o cliente autenticado do Google Drive
 * usando a Service Account com escopo somente leitura.
 */
export function getDriveClient(): drive_v3.Drive {
  if (cachedClient) {
    return cachedClient;
  }

  const { credentials } = getGoogleConfig();
  const jwt = new auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: [READ_ONLY_SCOPE],
  });

  cachedClient = drive({ version: "v3", auth: jwt });
  return cachedClient;
}
