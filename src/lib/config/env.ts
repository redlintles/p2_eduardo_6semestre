import "server-only";

import { ConfigurationError } from "@/lib/errors/appErrors";

const CONTAINER_NAME_PATTERN = /^(?=.{3,63}$)[a-z0-9]+(-[a-z0-9]+)*$/;
const DRIVE_FOLDER_ID_PATTERN = /^[A-Za-z0-9_-]{10,}$/;

export interface ServiceAccountCredentials {
  client_email: string;
  private_key: string;
}

export interface GoogleConfig {
  folderId: string;
  credentials: ServiceAccountCredentials;
}

export interface AzureConfig {
  connectionString: string | null;
  sasUrl: string | null;
  containerName: string;
}

function readOptional(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

function readRequired(name: string): string {
  const value = readOptional(name);
  if (!value) {
    throw new ConfigurationError(`A variável de ambiente ${name} não foi definida.`);
  }
  return value;
}

function isServiceAccountCredentials(value: unknown): value is ServiceAccountCredentials {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const { client_email: email, private_key: key } = value as Record<string, unknown>;
  return typeof email === "string" && email !== "" && typeof key === "string" && key !== "";
}

/**
 * Decodifica o JSON da Service Account e mantém apenas os campos necessários.
 */
function decodeServiceAccount(base64Value: string): ServiceAccountCredentials {
  let parsed: unknown;

  try {
    parsed = JSON.parse(Buffer.from(base64Value, "base64").toString("utf8"));
  } catch {
    throw new ConfigurationError(
      "GOOGLE_SERVICE_ACCOUNT_BASE64 é inválida: o conteúdo não é um JSON em Base64.",
    );
  }

  if (!isServiceAccountCredentials(parsed)) {
    throw new ConfigurationError(
      "GOOGLE_SERVICE_ACCOUNT_BASE64 é inválida: campos client_email/private_key ausentes.",
    );
  }

  return { client_email: parsed.client_email, private_key: parsed.private_key };
}

/** Lê e valida as configurações do Google Drive. */
export function getGoogleConfig(): GoogleConfig {
  const folderId = readRequired("GOOGLE_DRIVE_FOLDER_ID");

  if (!DRIVE_FOLDER_ID_PATTERN.test(folderId)) {
    throw new ConfigurationError("GOOGLE_DRIVE_FOLDER_ID possui um formato inválido.");
  }

  return {
    folderId,
    credentials: decodeServiceAccount(readRequired("GOOGLE_SERVICE_ACCOUNT_BASE64")),
  };
}

/** Lê e valida as configurações do Azure Blob Storage. */
export function getAzureConfig(): AzureConfig {
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
