/**
 * Leitura segura de propriedades de erros vindos das SDKs do Google e do Azure,
 * que não compartilham uma hierarquia de classes comum.
 */
interface ErrorLike {
  code?: unknown;
  status?: unknown;
  statusCode?: unknown;
  message?: unknown;
  response?: { status?: unknown };
}

const HTTP_STATUS_PATTERN = /^\d{3}$/;

function toErrorLike(error: unknown): ErrorLike {
  return typeof error === "object" && error !== null ? (error as ErrorLike) : {};
}

function toHttpStatus(value: unknown): number | undefined {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string" && HTTP_STATUS_PATTERN.test(value)) {
    return Number(value);
  }
  return undefined;
}

/** Retorna o status HTTP associado ao erro, se houver. */
export function getHttpStatus(error: unknown): number | undefined {
  const { statusCode, status, response, code } = toErrorLike(error);

  for (const candidate of [statusCode, status, response?.status, code]) {
    const httpStatus = toHttpStatus(candidate);
    if (httpStatus !== undefined) {
      return httpStatus;
    }
  }
  return undefined;
}

/** Retorna o código textual do erro (ex.: "BlobAlreadyExists"), se houver. */
export function getErrorCode(error: unknown): string | undefined {
  const { code } = toErrorLike(error);
  return typeof code === "string" && !HTTP_STATUS_PATTERN.test(code) ? code : undefined;
}

export function getErrorMessage(error: unknown): string {
  const { message } = toErrorLike(error);
  return typeof message === "string" && message !== "" ? message : "Erro desconhecido";
}
