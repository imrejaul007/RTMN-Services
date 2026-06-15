// Custom error classes for economy service

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR',
    public details?: any
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
    this.name = this.constructor.name;
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class InsufficientFundsError extends AppError {
  constructor(required: number, available: number) {
    super(
      `Insufficient funds: required ${required}, available ${available}`,
      402,
      'INSUFFICIENT_FUNDS',
      { required, available }
    );
  }
}

export class FrozenAccountError extends AppError {
  constructor(accountId: string) {
    super(`Account ${accountId} is frozen`, 423, 'ACCOUNT_FROZEN');
  }
}

export class LedgerImbalanceError extends AppError {
  constructor(transactionId: string) {
    super(
      `Ledger entries do not balance for transaction ${transactionId}`,
      500,
      'LEDGER_IMBALANCE'
    );
  }
}
