/**
 * Error Handler - Comprehensive Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================
// ERROR TYPES
// ============================================

describe('Error Types', () => {
  // Custom Error Classes
  class AppError extends Error {
    constructor(
      message: string,
      public code: string,
      public statusCode: number = 500,
      public details?: any
    ) {
      super(message);
      this.name = this.constructor.name;
      Error.captureStackTrace(this, this.constructor);
    }
  }

  class ValidationError extends AppError {
    constructor(message: string, details?: any) {
      super(message, 'VALIDATION_ERROR', 400, details);
    }
  }

  class NotFoundError extends AppError {
    constructor(resource: string) {
      super(`${resource} not found`, 'NOT_FOUND', 404);
    }
  }

  class UnauthorizedError extends AppError {
    constructor(message: string = 'Unauthorized') {
      super(message, 'UNAUTHORIZED', 401);
    }
  }

  class ForbiddenError extends AppError {
    constructor(message: string = 'Forbidden') {
      super(message, 'FORBIDDEN', 403);
    }
  }

  class RateLimitError extends AppError {
    constructor(retryAfter?: number) {
      super('Rate limit exceeded', 'RATE_LIMIT_EXCEEDED', 429);
      if (retryAfter) {
        this.details = { retryAfter };
      }
    }
  }

  describe('Error Classes', () => {
    it('should create AppError', () => {
      const error = new AppError('Something went wrong', 'INTERNAL_ERROR', 500);
      
      expect(error.message).toBe('Something went wrong');
      expect(error.code).toBe('INTERNAL_ERROR');
      expect(error.statusCode).toBe(500);
      expect(error.name).toBe('AppError');
    });

    it('should create ValidationError', () => {
      const error = new ValidationError('Invalid input', { field: 'email' });
      
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.details?.field).toBe('email');
    });

    it('should create NotFoundError', () => {
      const error = new NotFoundError('User');
      
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('User not found');
    });

    it('should create UnauthorizedError', () => {
      const error = new UnauthorizedError();
      
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('UNAUTHORIZED');
    });

    it('should create RateLimitError with retry-after', () => {
      const error = new RateLimitError(60);
      
      expect(error.statusCode).toBe(429);
      expect(error.details?.retryAfter).toBe(60);
    });
  });

  describe('Error Serialization', () => {
    it('should serialize error to JSON', () => {
      const error = new AppError('Test error', 'TEST_ERROR', 400, { info: 'details' });
      const serialized = JSON.stringify(error, Object.keys(error));
      
      expect(serialized).toContain("message");
      expect(serialized).toContain('TEST_ERROR');
    });
  });
});

// ============================================
// ERROR HANDLING
// ============================================

describe('Error Handling', () => {
  interface ErrorResponse {
    error: {
      code: string;
      message: string;
      details?: any;
      stack?: string;
    };
    timestamp: string;
    path?: string;
  }

  const formatError = (
    error: Error,
    options: { includeStack?: boolean; path?: string } = {}
  ): ErrorResponse => {
    const response: ErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message,
      },
      timestamp: new Date().toISOString(),
    };

    if (options.path) {
      response.path = options.path;
    }

    if (options.includeStack && process.env.NODE_ENV === 'development') {
      response.error.stack = error.stack;
    }

    return response;
  };

  describe('Error Formatting', () => {
    it('should format error response', () => {
      const error = new Error('Test error');
      const response = formatError(error);

      expect(response.error.message).toBe('Test error');
      expect(response.timestamp).toBeDefined();
    });

    it('should include path when provided', () => {
      const error = new Error('Not found');
      const response = formatError(error, { path: '/api/users/123' });

      expect(response.path).toBe('/api/users/123');
    });

    it('should include stack in development', () => {
      const error = new Error('Test');
      const response = formatError(error, { includeStack: true });
      
      // Stack is only included in development
      if (process.env.NODE_ENV === 'development') {
        expect(response.error.stack).toBeDefined();
      }
    });
  });

  describe('Error Recovery', () => {
    it('should retry failed operations', async () => {
      let attempts = 0;
      const maxRetries = 3;
      
      const retry = async <T>(
        fn: () => Promise<T>,
        retries: number = maxRetries
      ): Promise<T> => {
        for (let i = 0; i < retries; i++) {
          try {
            return await fn();
          } catch (error) {
            attempts++;
            if (i === retries - 1) throw error;
          }
        }
        throw new Error('Max retries exceeded');
      };

      let callCount = 0;
      const failingFn = async () => {
        callCount++;
        if (callCount < 3) throw new Error('Fail');
        return 'success';
      };

      const result = await retry(failingFn);
      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });

    it('should give up after max retries', async () => {
      const retry = async <T>(
        fn: () => Promise<T>,
        retries: number = 2
      ): Promise<T> => {
        for (let i = 0; i < retries; i++) {
          try {
            return await fn();
          } catch (error) {
            if (i === retries - 1) throw error;
          }
        }
        throw new Error('Max retries exceeded');
      };

      const alwaysFails = async () => {
        throw new Error('Always fails');
      };

      await expect(retry(alwaysFails, 2)).rejects.toThrow('Always fails');
    });
  });

  describe('Error Boundaries', () => {
    it('should catch errors in async functions', async () => {
      const safeAsync = async <T>(
        fn: () => Promise<T>,
        fallback: T
      ): Promise<T> => {
        try {
          return await fn();
        } catch {
          return fallback;
        }
      };

      const result = await safeAsync(
        async () => { throw new Error('Fail'); },
        'fallback'
      );

      expect(result).toBe('fallback');
    });

    it('should propagate non-expected errors', async () => {
      const safeAsync = async <T>(
        fn: () => Promise<T>,
        fallback?: T
      ): Promise<T> => {
        try {
          return await fn();
        } catch (error) {
          if (fallback !== undefined) return fallback;
          throw error;
        }
      };

      await expect(
        safeAsync(async () => { throw new Error('Unexpected'); })
      ).rejects.toThrow('Unexpected');
    });
  });
});

// ============================================
// CIRCUIT BREAKER
// ============================================

describe('Circuit Breaker', () => {
  type CircuitState = 'closed' | 'open' | 'half-open';

  interface CircuitBreakerConfig {
    failureThreshold: number;
    successThreshold: number;
    timeout: number; // ms
  }

  class CircuitBreaker {
    private state: CircuitState = 'closed';
    private failures: number = 0;
    private successes: number = 0;
    private nextAttempt: number = Date.now();
    private config: CircuitBreakerConfig;

    constructor(config: CircuitBreakerConfig) {
      this.config = config;
    }

    getState(): CircuitState {
      if (this.state === 'open' && Date.now() >= this.nextAttempt) {
        this.state = 'half-open';
      }
      return this.state;
    }

    recordSuccess(): void {
      this.successes++;
      if (this.state === 'half-open' && this.successes >= this.config.successThreshold) {
        this.state = 'closed';
        this.failures = 0;
        this.successes = 0;
      }
    }

    recordFailure(): void {
      this.failures++;
      if (this.failures >= this.config.failureThreshold) {
        this.state = 'open';
        this.nextAttempt = Date.now() + this.config.timeout;
      }
    }

    async execute<T>(fn: () => Promise<T>): Promise<T> {
      if (this.getState() === 'open') {
        throw new Error('Circuit breaker is open');
      }

      try {
        const result = await fn();
        this.recordSuccess();
        return result;
      } catch (error) {
        this.recordFailure();
        throw error;
      }
    }
  }

  describe('State Transitions', () => {
    it('should start in closed state', () => {
      const cb = new CircuitBreaker({
        failureThreshold: 3,
        successThreshold: 2,
        timeout: 1000,
      });

      expect(cb.getState()).toBe('closed');
    });

    it('should transition to open after failures', () => {
      const cb = new CircuitBreaker({
        failureThreshold: 2,
        successThreshold: 1,
        timeout: 1000,
      });

      cb.recordFailure();
      expect(cb.getState()).toBe('closed');

      cb.recordFailure();
      expect(cb.getState()).toBe('open');
    });

    it('should transition to half-open after timeout', async () => {
      const cb = new CircuitBreaker({
        failureThreshold: 1,
        successThreshold: 1,
        timeout: 50,
      });

      cb.recordFailure(); // Opens immediately
      expect(cb.getState()).toBe('open');

      await new Promise(resolve => setTimeout(resolve, 100));
      expect(cb.getState()).toBe('half-open');
    });

    it('should close after success threshold in half-open', () => {
      const cb = new CircuitBreaker({
        failureThreshold: 1,
        successThreshold: 2,
        timeout: 1,
      });

      cb.recordFailure();
      cb.getState(); // Triggers half-open after timeout

      cb.recordSuccess();
      expect(cb.getState()).toBe('half-open'); // Need 2 successes

      cb.recordSuccess();
      expect(cb.getState()).toBe('closed');
    });
  });

  describe('Execution', () => {
    it('should execute when closed', async () => {
      const cb = new CircuitBreaker({
        failureThreshold: 3,
        successThreshold: 2,
        timeout: 1000,
      });

      const result = await cb.execute(async () => 'success');
      expect(result).toBe('success');
    });

    it('should throw when open', async () => {
      const cb = new CircuitBreaker({
        failureThreshold: 1,
        successThreshold: 1,
        timeout: 1000,
      });

      cb.recordFailure();

      await expect(
        cb.execute(async () => 'should not execute')
      ).rejects.toThrow('Circuit breaker is open');
    });
  });
});

// ============================================
// LOGGING
// ============================================

describe('Logging', () => {
  type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

  interface LogEntry {
    level: LogLevel;
    message: string;
    timestamp: string;
    context?: Record<string, any>;
  }

  const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    fatal: 4,
  };

  class Logger {
    private logs: LogEntry[] = [];
    private minLevel: LogLevel;

    constructor(minLevel: LogLevel = 'info') {
      this.minLevel = minLevel;
    }

    private log(level: LogLevel, message: string, context?: Record<string, any>): void {
      if (LOG_LEVELS[level] < LOG_LEVELS[this.minLevel]) {
        return;
      }

      this.logs.push({
        level,
        message,
        timestamp: new Date().toISOString(),
        context,
      });
    }

    debug(message: string, context?: Record<string, any>): void {
      this.log('debug', message, context);
    }

    info(message: string, context?: Record<string, any>): void {
      this.log('info', message, context);
    }

    warn(message: string, context?: Record<string, any>): void {
      this.log('warn', message, context);
    }

    error(message: string, context?: Record<string, any>): void {
      this.log('error', message, context);
    }

    fatal(message: string, context?: Record<string, any>): void {
      this.log('fatal', message, context);
    }

    getLogs(): LogEntry[] {
      return [...this.logs];
    }

    clear(): void {
      this.logs = [];
    }
  }

  describe('Basic Logging', () => {
    it('should log messages', () => {
      const logger = new Logger('debug');

      logger.info('Test message');
      logger.warn('Warning message');
      logger.error('Error message');

      const logs = logger.getLogs();
      expect(logs).toHaveLength(3);
      expect(logs[0].message).toBe('Test message');
      expect(logs[0].level).toBe('info');
    });

    it('should include context', () => {
      const logger = new Logger('debug');

      logger.info('User action', { userId: '123', action: 'login' });

      const log = logger.getLogs()[0];
      expect(log.context?.userId).toBe('123');
    });

    it('should respect log level', () => {
      const logger = new Logger('warn');

      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warn message');
      logger.error('Error message');

      const logs = logger.getLogs();
      expect(logs).toHaveLength(2);
      expect(logs[0].level).toBe('warn');
      expect(logs[1].level).toBe('error');
    });

    it('should include timestamp', () => {
      const logger = new Logger('info');
      logger.info('Test');

      const log = logger.getLogs()[0];
      expect(log.timestamp).toBeDefined();
      expect(new Date(log.timestamp).getTime()).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('Log Levels', () => {
    it('should order log levels correctly', () => {
      expect(LOG_LEVELS.debug).toBeLessThan(LOG_LEVELS.info);
      expect(LOG_LEVELS.info).toBeLessThan(LOG_LEVELS.warn);
      expect(LOG_LEVELS.warn).toBeLessThan(LOG_LEVELS.error);
      expect(LOG_LEVELS.error).toBeLessThan(LOG_LEVELS.fatal);
    });
  });

  describe('Structured Logging', () => {
    it('should format structured logs', () => {
      const logger = new Logger('debug');

      logger.info('Request completed', {
        method: 'GET',
        path: '/api/users',
        status: 200,
        duration: 45,
      });

      const log = logger.getLogs()[0];
      expect(log.context?.method).toBe('GET');
      expect(log.context?.status).toBe(200);
    });

    it('should handle nested context', () => {
      const logger = new Logger('debug');

      logger.error('Payment failed', {
        user: {
          id: 'user_123',
          email: 'user@example.com',
        },
        payment: {
          amount: 100,
          currency: 'USD',
        },
      });

      const log = logger.getLogs()[0];
      expect(log.context?.user.id).toBe('user_123');
      expect(log.context?.payment.amount).toBe(100);
    });
  });
});

// ============================================
// REQUEST ID TRACKING
// ============================================

describe('Request ID Tracking', () => {
  const generateRequestId = (): string => {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  };

  const isValidRequestId = (id: string): boolean => {
    return /^req_\d+_[a-z0-9]+$/.test(id);
  };

  it('should generate unique request IDs', () => {
    const id1 = generateRequestId();
    const id2 = generateRequestId();

    expect(id1).not.toBe(id2);
  });

  it('should validate request ID format', () => {
    const id = generateRequestId();
    expect(isValidRequestId(id)).toBe(true);
    expect(isValidRequestId('invalid')).toBe(false);
  });

  it('should include timestamp in request ID', () => {
    const id = generateRequestId();
    const timestamp = parseInt(id.split('_')[1]);

    expect(timestamp).toBeLessThanOrEqual(Date.now());
    expect(timestamp).toBeGreaterThan(Date.now() - 1000);
  });
});
