import "server-only";

import { ConfigurationError } from "@/lib/errors/appErrors";

const CONTAINER_NAME_PATTERN = /^(?=.{3,63}$)[a-z0-9]+(-[a-z0-9]+)*$/;
const DRIVE_FOLDER_ID_PATTERN = /^[A-Za-z0-9_-]{10,}$/;

function readOptional(name) {
  const value = process.env[name];
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function readRequired(name) {
  const value = readOptional(name);
  if (!value) {
    throw new ConfigurationError(`A variável de ambiente ${name} não foi definida.`);
  }
  return value;
}

function decodeServiceAccount(base64Value) {
  try {
    const json = Buffer.from(base64Value, "base64").toString("utf8");
    const credentials = JSON.parse(json);

    if (!credentials.client_email || !credentials.private_key) {
      throw new Error("campos client_email/private_key ausentes");
    }

    return credentials;
  } catch (error) {
    throw new ConfigurationError(
      `GOOGLE_SERVICE_ACCOUNT_BASE64 é inválida: ${error.message}.`,
    );
  }
}

/**
 * Lê e valida as configurações do Google Drive.
 * @returns {{ folderId: string, credentials: { client_email: string, private_key: string } }}
 */
export function getGoogleConfig() {
  const folderId = readRequired("GOOGLE_DRIVE_FOLDER_ID");

  if (!DRIVE_FOLDER_ID_PATTERN.test(folderId)) {
    throw new ConfigurationError("GOOGLE_DRIVE_FOLDER_ID possui um formato inválido.");
  }

  return {
    folderId,
    credentials: decodeServiceAccount(readRequired("GOOGLE_SERVICE_ACCOUNT_BASE64")),
  };
}

/**
 * Lê e valida as configurações do Azure Blob Storage.
 * @returns {{ connectionString: string | null, sasUrl: string | null, containerName: string }}
 */
export function getAzureConfig() {
  const connectionString = readOptional("AZURE_STORAGE_CONNECTION_STRING");
  const sasUrl = readOptional("AZURE_STORAGE_SAS_URL");
  const containerName = readRequired("AZURE_STORAGE_CONTAINER_NAME");

  if (!connectionString && !sasUrl) {
    throw new ConfigurationError(
      "Defina AZURE_STORAGE_CONNECTION_STRING ou AZURE_STORAGE_SAS_URL.",
    );
  }

  if (!CONTAINER_NAME_PATTERN.test(containerName)) {
    throw new ConfigurationError(
      "AZURE_STORAGE_CONTAINER_NAME deve ter de 3 a 63 caracteres: letras minúsculas, números e hífens.",
    );
  }

  return { connectionString, sasUrl, containerName };
}
