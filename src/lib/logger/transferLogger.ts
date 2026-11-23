import "server-only";

const PREFIX = "[drive-to-blob]";

function timestamp(): string {
  return new Date().toISOString();
}

/**
 * Logger de console usado para registrar o status de cada transferência.
 * Nunca registra credenciais, apenas nomes e identificadores de arquivos.
 */
export const transferLogger = {
  info(message: string): void {
    console.log(`${PREFIX} ${timestamp()} INFO     ${message}`);
  },
  success(fileName: string, destination: string): void {
    console.log(`${PREFIX} ${timestamp()} SUCESSO  "${fileName}" -> ${destination}`);
  },
  skipped(fileName: string, reason: string): void {
    console.warn(`${PREFIX} ${timestamp()} IGNORADO "${fileName}": ${reason}`);
  },
  failure(fileName: string, reason: string): void {
    console.error(`${PREFIX} ${timestamp()} ERRO     "${fileName}": ${reason}`);
  },
};
