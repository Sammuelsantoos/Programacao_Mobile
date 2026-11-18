export class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Recurso não encontrado') { super(message, 404); }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflito de dados') { super(message, 409); }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Não autorizado') { super(message, 401); }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Seu perfil não tem permissão para esta operação') { super(message, 403); }
}

export class BusinessError extends AppError {
  constructor(message) { super(message, 400); }
}
