import "server-only";

import { BlobServiceClient } from "@azure/storage-blob";

import { getAzureConfig } from "@/lib/config/env";

let cachedContainer = null;

function createServiceClient({ connectionString, sasUrl }) {
  if (connectionString) {
    return BlobServiceClient.fromConnectionString(connectionString);
  }
  return new BlobServiceClient(sasUrl);
}

/**
 * Retorna o cliente do contêiner de destino, autenticado pela
 * Connection String (preferencial) ou pela SAS URL.
 * @returns {import("@azure/storage-blob").ContainerClient}
 */
export function getContainerClient() {
  if (cachedContainer) {
    return cachedContainer;
  }

  const config = getAzureConfig();
  cachedContainer = createServiceClient(config).getContainerClient(config.containerName);
  return cachedContainer;
}

/**
 * Garante que o contêiner exista. Ele é criado privado (sem acesso público).
 */
export async function ensureContainerExists() {
  await getContainerClient().createIfNotExists();
}
