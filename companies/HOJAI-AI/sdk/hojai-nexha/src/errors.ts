/**
 * HOJAI Nexha SDK — Typed Error Hierarchy
 * 18 error classes, all errors inherit from NexhaError
 */

export class NexhaError extends Error {
  readonly code: string;
  readonly statusCode?: number;
  readonly retryable: boolean;
  constructor(message: string, code: string, opts?: { statusCode?: number; retryable?: boolean }) {
    super(message);
    this.name = "NexhaError";
    this.code = code;
    this.statusCode = opts?.statusCode;
    this.retryable = opts?.retryable ?? false;
  }
}

export class NexhaAuthError extends NexhaError {
  constructor(message: string, opts?: { statusCode?: number }) {
    super(message, "AUTH_ERROR", { ...opts, retryable: false });
    this.name = "NexhaAuthError";
  }
}

export class NexhaInvalidKeyError extends NexhaAuthError {
  constructor(message = "Invalid API key", opts?: { statusCode?: number }) {
    super(message, { statusCode: opts?.statusCode });
    this.name = "NexhaInvalidKeyError";
  }
}

export class NexhaInsufficientScopeError extends NexhaAuthError {
  constructor(message = "API key lacks required scope", opts?: { statusCode?: number }) {
    super(message, { statusCode: 403 });
    this.name = "NexhaInsufficientScopeError";
  }
}

export class NexhaRateLimitError extends NexhaError {
  readonly retryAfterMs?: number;
  readonly limit?: number;
  readonly remaining?: number;
  constructor(message = "Rate limit exceeded", opts?: { statusCode?: number; retryAfterMs?: number; limit?: number; remaining?: number }) {
    super(message, "RATE_LIMIT", { ...opts, retryable: true });
    this.name = "NexhaRateLimitError";
    this.retryAfterMs = opts?.retryAfterMs;
    this.limit = opts?.limit;
    this.remaining = opts?.remaining;
  }
}

export class NexhaNotFoundError extends NexhaError {
  constructor(resource: string, opts?: { statusCode?: number }) {
    super(`${resource} not found`, "NOT_FOUND", { ...opts, retryable: false });
    this.name = "NexhaNotFoundError";
  }
}

export class NexhaValidationError extends NexhaError {
  readonly fields?: Record<string, string[]>;
  constructor(message = "Validation failed", fields?: Record<string, string[]>, opts?: { statusCode?: number }) {
    super(message, "VALIDATION_ERROR", { ...opts, retryable: false });
    this.name = "NexhaValidationError";
    this.fields = fields;
  }
}

export class NexhaServerError extends NexhaError {
  constructor(message = "Internal server error", statusCode = 500, opts?: { retryable?: boolean }) {
    super(message, "SERVER_ERROR", { statusCode, retryable: opts?.retryable ?? statusCode >= 500 });
    this.name = "NexhaServerError";
  }
}

export class NexhaTimeoutError extends NexhaError {
  constructor(ms: number) {
    super(`Request timed out after ${ms}ms`, "TIMEOUT", { retryable: true });
    this.name = "NexhaTimeoutError";
  }
}

export class NexhaConnectionError extends NexhaError {
  constructor(message: string) {
    super(message, "CONNECTION_ERROR", { retryable: true });
    this.name = "NexhaConnectionError";
  }
}

export class NexhaCircuitOpenError extends NexhaError {
  readonly serviceName: string;
  readonly retryMs: number;
  constructor(serviceName: string, retryMs: number) {
    super(
      `Circuit breaker OPEN for "${serviceName}". Retry in ${Math.ceil(retryMs / 1000)}s`,
      "CIRCUIT_OPEN",
      { retryable: true }
    );
    this.name = "NexhaCircuitOpenError";
    this.serviceName = serviceName;
    this.retryMs = retryMs;
  }
}

export class NexhaConfigError extends NexhaError {
  constructor(message: string) {
    super(message, "CONFIG_ERROR", { retryable: false });
    this.name = "NexhaConfigError";
  }
}

export class NexhaAbortError extends NexhaError {
  constructor(message = "Request aborted") {
    super(message, "ABORT_ERROR", { retryable: false });
    this.name = "NexhaAbortError";
  }
}

export function isRetryable(error: unknown): boolean {
  if (error instanceof NexhaError) return error.retryable;
  if (error instanceof TypeError || error instanceof ReferenceError) return false;
  return true;
}

export function isAuthError(error: unknown): error is NexhaAuthError {
  return error instanceof NexhaAuthError;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof NexhaError) return `[${error.code}] ${error.message}`;
  if (error instanceof Error) return error.message;
  return String(error);
}

export function parseRetryAfter(value: string | null): number {
  if (!value) return 0;
  const n = parseInt(value, 10);
  return isNaN(n) ? 0 : n * 1000;
}
