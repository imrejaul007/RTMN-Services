export class AppError extends Error {
  constructor(public message: string, public statusCode: number = 500, public code: string = 'INTERNAL_ERROR') {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') { super(`${resource} not found`, 404, 'NOT_FOUND'); }
}

export class ValidationError extends AppError {
  constructor(message: string) { super(message, 400, 'VALIDATION_ERROR'); }
}

export class ConflictError extends AppError {
  constructor(message: string) { super(message, 409, 'CONFLICT'); }
}
