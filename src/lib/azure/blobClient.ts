import "server-only";

import { BlobServiceClient, type ContainerClient } from "@azure/storage-blob";

import { getAzureConfig, type AzureConfig } from "@/lib/config/env";
import { ConfigurationError } from "@/lib/errors/appErrors";

let cachedContainer: ContainerClient | null = null;

function createServiceClient({ connectionString, sasUrl }: AzureConfig): BlobServiceClient {
  if (connectionString) {
    return BlobServiceClient.fromConnectionString(connectionString);
  }
  if (sasUrl) {
    return new BlobServiceClient(sasUrl);
  }
  throw new ConfigurationError("Nenhuma credencial do Azure foi configurada.");
}

/**
 * Retorna o cliente do contêiner de destino, autenticado pela
 * Connection String (preferencial) ou pela SAS URL.
 */
export function getContainerClient(): ContainerClient {
  if (cachedContainer) {
    return cachedContainer;
  }

  const config = getAzureConfig();
  cachedContainer = createServiceClient(config).getContainerClient(config.containerName);
  return cachedContainer;
}

/** Garante que o contêiner exista. Ele é criado privado (sem acesso público). */
export async function ensureContainerExists(): Promise<void> {
  await getContainerClient().createIfNotExists();
}
