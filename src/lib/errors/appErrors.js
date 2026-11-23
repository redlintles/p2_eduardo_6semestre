/**
 * Erro base da aplicação. A mensagem é segura para ser exibida ao usuário;
 * detalhes internos ficam apenas no log do servidor.
 */
export class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
  }
}

export class ConfigurationError extends AppError {
  constructor(message) {
    super(message, 500);
  }
}

export class ValidationError extends AppError {
  constructor(message) {
    super(message, 400);
  }
}

export class ExternalServiceError extends AppError {
  constructor(serviceName, cause) {
    super(`Falha na comunicação com ${serviceName}.`, 502);
    this.cause = cause;
  }
}
