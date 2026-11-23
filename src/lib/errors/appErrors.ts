/**
 * Erro base da aplicação. A mensagem é segura para ser exibida ao usuário;
 * detalhes internos ficam apenas no log do servidor.
 */
export class AppError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
  }
}

export class ConfigurationError extends AppError {
  constructor(message: string) {
    super(message, 500);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class SourceFolderAccessError extends AppError {
  constructor(serviceAccountEmail: string) {
    super(
      `A pasta de origem não foi encontrada ou não foi compartilhada com ${serviceAccountEmail}. ` +
        "Compartilhe a pasta com esse e-mail como Leitor.",
      404,
    );
  }
}

export class ExternalServiceError extends AppError {
  constructor(serviceName: string, cause: unknown) {
    super(`Falha na comunicação com ${serviceName}.`, 502);
    this.cause = cause;
  }
}
