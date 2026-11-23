import "server-only";

const PREFIX = "[drive-to-blob]";

function timestamp() {
  return new Date().toISOString();
}

/**
 * Logger de console usado para registrar o status de cada transferência.
 * Nunca registra credenciais, apenas nomes e identificadores de arquivos.
 */
export const transferLogger = {
  info(message) {
    console.log(`${PREFIX} ${timestamp()} INFO    ${message}`);
  },
  success(fileName, destination) {
    console.log(`${PREFIX} ${timestamp()} SUCESSO "${fileName}" -> ${destination}`);
  },
  skipped(fileName, reason) {
    console.warn(`${PREFIX} ${timestamp()} IGNORADO "${fileName}": ${reason}`);
  },
  failure(fileName, reason) {
    console.error(`${PREFIX} ${timestamp()} ERRO    "${fileName}": ${reason}`);
  },
};
