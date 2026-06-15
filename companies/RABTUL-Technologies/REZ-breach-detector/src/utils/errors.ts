export class AppError extends Error { constructor(public message: string, public statusCode = 500, public code = 'INTERNAL_ERROR') { super(message); Object.setPrototypeOf(this, AppError.prototype); } }
export class NotFoundError extends AppError { constructor(r = 'Resource') { super(`${r} not found`, 404, 'NOT_FOUND'); } }
export class ValidationError extends AppError { constructor(m: string) { super(m, 400, 'VALIDATION_ERROR'); } }
