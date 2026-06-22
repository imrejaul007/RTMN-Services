/**
 * Hojai LLM Adapter - Custom Error Classes
 *
 * Provides structured error handling for all LLM operations
 */

// ============================================================================
// BASE ERROR CLASS
// ============================================================================

/**
 * Base error class for all LLM-related errors
 */
export class LLMError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isRetryable: boolean;
  public readonly originalError?: Error;
  public readonly metadata?: Record<string, unknown>;

  constructor(
    message: string,
    options: {
      code?: string;
      statusCode?: number;
      isRetryable?: boolean;
      originalError?: Error;
      metadata?: Record<string, unknown>;
    } = {}
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = options.code || 'LLM_ERROR';
    this.statusCode = options.statusCode || 500;
    this.isRetryable = options.isRetryable ?? false;
    this.originalError = options.originalError;
    this.metadata = options.metadata;

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      isRetryable: this.isRetryable,
      metadata: this.metadata,
      stack: this.stack
    };
  }
}

// ============================================================================
// PROVIDER-SPECIFIC ERRORS
// ============================================================================

/**
 * Authentication error with API provider
 */
export class AuthenticationError extends LLMError {
  constructor(message: string, originalError?: Error) {
    super(message, {
      code: 'AUTHENTICATION_ERROR',
      statusCode: 401,
      isRetryable: false,
      originalError
    });
  }
}

/**
 * Rate limit exceeded error
 */
export class RateLimitError extends LLMError {
  public readonly retryAfterMs?: number;
  public readonly limitType?: 'tokens' | 'requests' | 'time';

  constructor(
    message: string,
    options: {
      retryAfterMs?: number;
      limitType?: 'tokens' | 'requests' | 'time';
      originalError?: Error;
    } = {}
  ) {
    super(message, {
      code: 'RATE_LIMIT_ERROR',
      statusCode: 429,
      isRetryable: true,
      originalError: options.originalError,
      metadata: {
        retryAfterMs: options.retryAfterMs,
        limitType: options.limitType
      }
    });
    this.retryAfterMs = options.retryAfterMs;
    this.limitType = options.limitType;
  }
}

/**
 * Token limit exceeded error
 */
export class TokenLimitError extends LLMError {
  public readonly inputTokens: number;
  public readonly maxTokens: number;

  constructor(
    message: string,
    options: {
      inputTokens: number;
      maxTokens: number;
      originalError?: Error;
    }
  ) {
    super(message, {
      code: 'TOKEN_LIMIT_ERROR',
      statusCode: 400,
      isRetryable: false,
      originalError: options.originalError,
      metadata: {
        inputTokens: options.inputTokens,
        maxTokens: options.maxTokens
      }
    });
    this.inputTokens = options.inputTokens;
    this.maxTokens = options.maxTokens;
  }
}

/**
 * Model not available or not found error
 */
export class ModelNotFoundError extends LLMError {
  public readonly model: string;
  public readonly provider: string;

  constructor(
    model: string,
    provider: string,
    originalError?: Error
  ) {
    super(`Model '${model}' not available from provider '${provider}'`, {
      code: 'MODEL_NOT_FOUND',
      statusCode: 404,
      isRetryable: false,
      originalError,
      metadata: { model, provider }
    });
    this.model = model;
    this.provider = provider;
  }
}

/**
 * Context window exceeded error
 */
export class ContextWindowError extends LLMError {
  public readonly contextTokens: number;
  public readonly maxContext: number;

  constructor(
    contextTokens: number,
    maxContext: number,
    originalError?: Error
  ) {
    super(
      `Context window exceeded: ${contextTokens} tokens > ${maxContext} max`,
      {
        code: 'CONTEXT_WINDOW_ERROR',
        statusCode: 400,
        isRetryable: false,
        originalError,
        metadata: { contextTokens, maxContext }
      }
    );
    this.contextTokens = contextTokens;
    this.maxContext = maxContext;
  }
}

// ============================================================================
// REQUEST/RESPONSE ERRORS
// ============================================================================

/**
 * Invalid request error
 */
export class InvalidRequestError extends LLMError {
  public readonly validationErrors?: z.ZodError;

  constructor(
    message: string,
    options: {
      validationErrors?: z.ZodError;
      originalError?: Error;
    } = {}
  ) {
    super(message, {
      code: 'INVALID_REQUEST',
      statusCode: 400,
      isRetryable: false,
      originalError: options.originalError,
      metadata: {
        validationErrors: options.validationErrors?.errors
      }
    });
    this.validationErrors = options.validationErrors;
  }
}

/**
 * Empty response error
 */
export class EmptyResponseError extends LLMError {
  constructor(originalError?: Error) {
    super('LLM returned empty response', {
      code: 'EMPTY_RESPONSE',
      statusCode: 500,
      isRetryable: true,
      originalError
    });
  }
}

/**
 * Response parsing error
 */
export class ResponseParseError extends LLMError {
  public readonly rawResponse?: string;

  constructor(
    message: string,
    options: {
      rawResponse?: string;
      originalError?: Error;
    } = {}
  ) {
    super(message, {
      code: 'RESPONSE_PARSE_ERROR',
      statusCode: 500,
      isRetryable: false,
      originalError: options.originalError,
      metadata: { rawResponse: options.rawResponse }
    });
    this.rawResponse = options.rawResponse;
  }
}

/**
 * Streaming error
 */
export class StreamingError extends LLMError {
  public readonly chunksReceived: number;

  constructor(
    message: string,
    options: {
      chunksReceived?: number;
      originalError?: Error;
    } = {}
  ) {
    super(message, {
      code: 'STREAMING_ERROR',
      statusCode: 500,
      isRetryable: false,
      originalError: options.originalError,
      metadata: { chunksReceived: options.chunksReceived }
    });
    this.chunksReceived = options.chunksReceived ?? 0;
  }
}

/**
 * Timeout error
 */
export class TimeoutError extends LLMError {
  public readonly timeoutMs: number;
  public readonly operation?: string;

  constructor(
    timeoutMs: number,
    options: {
      operation?: string;
      originalError?: Error;
    } = {}
  ) {
    super(`Operation timed out after ${timeoutMs}ms`, {
      code: 'TIMEOUT_ERROR',
      statusCode: 504,
      isRetryable: true,
      originalError: options.originalError,
      metadata: { timeoutMs, operation: options.operation }
    });
    this.timeoutMs = timeoutMs;
    this.operation = options.operation;
  }
}

/**
 * Retry exhausted error
 */
export class RetryExhaustedError extends LLMError {
  public readonly attempts: number;
  public readonly lastError?: Error;

  constructor(
    attempts: number,
    lastError?: Error
  ) {
    super(`Failed after ${attempts} retry attempts`, {
      code: 'RETRY_EXHAUSTED',
      statusCode: 500,
      isRetryable: false,
      originalError: lastError,
      metadata: { attempts }
    });
    this.attempts = attempts;
    this.lastError = lastError;
  }
}

// ============================================================================
// SYSTEM ERRORS
// ============================================================================

/**
 * Provider unavailable error
 */
export class ProviderUnavailableError extends LLMError {
  public readonly provider: string;
  public readonly lastChecked?: Date;

  constructor(
    provider: string,
    options: {
      lastChecked?: Date;
      originalError?: Error;
    } = {}
  ) {
    super(`Provider '${provider}' is currently unavailable`, {
      code: 'PROVIDER_UNAVAILABLE',
      statusCode: 503,
      isRetryable: true,
      originalError: options.originalError,
      metadata: {
        provider,
        lastChecked: options.lastChecked?.toISOString()
      }
    });
    this.provider = provider;
    this.lastChecked = options.lastChecked;
  }
}

/**
 * Configuration error
 */
export class ConfigurationError extends LLMError {
  public readonly configKey?: string;

  constructor(
    message: string,
    options: {
      configKey?: string;
      originalError?: Error;
    } = {}
  ) {
    super(message, {
      code: 'CONFIGURATION_ERROR',
      statusCode: 500,
      isRetryable: false,
      originalError: options.originalError,
      metadata: { configKey: options.configKey }
    });
    this.configKey = options.configKey;
  }
}

// ============================================================================
// ERROR UTILITIES
// ============================================================================

import { z } from 'zod';

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof LLMError) {
    return error.isRetryable;
  }
  if (error instanceof Error) {
    // Network errors are typically retryable
    if (error.message.includes('ECONNREFUSED') ||
        error.message.includes('ETIMEDOUT') ||
        error.message.includes('network')) {
      return true;
    }
  }
  return false;
}

/**
 * Get error message for logging
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof LLMError) {
    return `[${error.code}] ${error.message}`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * Wrap async function with error handling
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  options: {
    errorClass?: new (message: string, error?: Error) => LLMError;
    errorMessage?: string;
    metadata?: Record<string, unknown>;
  } = {}
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof LLMError) {
      throw error;
    }
    const errorClass = options.errorClass || LLMError;
    const message = options.errorMessage || (error instanceof Error ? error.message : 'Unknown error');
    const err = error instanceof Error ? error : new Error(String(error));

    // Create a new error instance with proper error object
    const newError = Object.assign(
      Object.create(errorClass.prototype),
      new Error(message, { cause: err }),
      {
        code: 'LLM_ERROR',
        statusCode: 500,
        isRetryable: false,
        originalError: err,
        metadata: options.metadata
      }
    );

    throw newError;
  }
}

/**
 * Sleep utility for retries
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    onRetry?: (attempt: number, error: Error) => void;
  } = {}
): Promise<T> {
  const maxAttempts = options.maxAttempts || 3;
  const baseDelayMs = options.baseDelayMs || 1000;
  const maxDelayMs = options.maxDelayMs || 30000;

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxAttempts || !isRetryableError(lastError)) {
        throw lastError;
      }

      // Exponential backoff with jitter
      const delay = Math.min(
        baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * 1000,
        maxDelayMs
      );

      options.onRetry?.(attempt, lastError);
      await sleep(delay);
    }
  }

  throw lastError;
}
