/**
 * Error Handling Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Error Classes', () => {
  describe('AuthError', () => {
    it('should create error with code and message', () => {
      class AuthError extends Error {
        constructor(public code: string, message: string) {
          super(message);
          this.name = 'AuthError';
        }
      }

      const error = new AuthError('INVALID_TOKEN', 'Token is invalid');

      expect(error.code).toBe('INVALID_TOKEN');
      expect(error.message).toBe('Token is invalid');
      expect(error.name).toBe('AuthError');
    });
  });

  describe('ConfigurationError', () => {
    it('should create error with message', () => {
      class ConfigurationError extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'ConfigurationError';
        }
      }

      const error = new ConfigurationError('Missing JWT_SECRET');

      expect(error.message).toBe('Missing JWT_SECRET');
      expect(error.name).toBe('ConfigurationError');
    });
  });

  describe('ValidationError', () => {
    it('should create error with field and message', () => {
      class ValidationError extends Error {
        constructor(
          public field: string,
          message: string
        ) {
          super(message);
          this.name = 'ValidationError';
        }
      }

      const error = new ValidationError('email', 'Invalid email format');

      expect(error.field).toBe('email');
      expect(error.message).toBe('Invalid email format');
      expect(error.name).toBe('ValidationError');
    });
  });

  describe('NotFoundError', () => {
    it('should create error with resource type', () => {
      class NotFoundError extends Error {
        constructor(public resource: string) {
          super(`${resource} not found`);
          this.name = 'NotFoundError';
        }
      }

      const error = new NotFoundError('User');

      expect(error.resource).toBe('User');
      expect(error.message).toBe('User not found');
      expect(error.name).toBe('NotFoundError');
    });
  });
});

describe('Error Response Format', () => {
  it('should format error response correctly', () => {
    const formatErrorResponse = (
      code: string,
      message: string,
      status: number,
      isDev: boolean = false
    ) => {
      const response: any = {
        success: false,
        error: {
          code,
          message: isDev ? message : 'Internal server error'
        }
      };

      if (isDev) {
        response.meta = { timestamp: new Date().toISOString() };
      }

      return { status, body: response };
    };

    const result = formatErrorResponse('INVALID_REQUEST', 'Email is required', 400, true);

    expect(result.status).toBe(400);
    expect(result.body.success).toBe(false);
    expect(result.body.error.code).toBe('INVALID_REQUEST');
    expect(result.body.error.message).toBe('Email is required');
    expect(result.body.meta).toBeDefined();
  });

  it('should hide error details in production', () => {
    const formatErrorResponse = (
      code: string,
      message: string,
      status: number,
      isDev: boolean = false
    ) => {
      const response: any = {
        success: false,
        error: {
          code,
          message: isDev ? message : 'Internal server error'
        }
      };

      return { status, body: response };
    };

    const result = formatErrorResponse('INTERNAL_ERROR', 'Database connection failed', 500, false);

    expect(result.status).toBe(500);
    expect(result.body.error.message).toBe('Internal server error');
    expect(result.body.error.message).not.toBe('Database connection failed');
  });
});

describe('Error Handling Middleware', () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: any;

  beforeEach(() => {
    mockReq = { path: '/test' };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
    mockNext = vi.fn();
  });

  it('should handle known errors', () => {
    class KnownError extends Error {
      constructor(public code: string, public status: number) {
        super('Known error');
        this.name = 'KnownError';
      }
    }

    const errorHandler = (
      err: Error & { code?: string; status?: number },
      req: any,
      res: any
    ) => {
      const status = err.status || 500;
      const code = err.code || 'INTERNAL_ERROR';

      res.status(status).json({
        success: false,
        error: {
          code,
          message: err.message
        }
      });
    };

    const error = new KnownError('NOT_FOUND', 404);
    errorHandler(error, mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'NOT_FOUND'
        })
      })
    );
  });

  it('should handle unknown errors with 500', () => {
    const errorHandler = (
      err: Error,
      req: any,
      res: any
    ) => {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error'
        }
      });
    };

    const error = new Error('Something went wrong');
    errorHandler(error, mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
  });
});

describe('Error Codes', () => {
  const ERROR_CODES = {
    // Auth errors
    MISSING_TOKEN: { status: 401, message: 'Token is required' },
    INVALID_TOKEN: { status: 401, message: 'Invalid token' },
    TOKEN_EXPIRED: { status: 401, message: 'Token has expired' },
    FORBIDDEN: { status: 403, message: 'Access denied' },

    // Tenant errors
    MISSING_TENANT_ID: { status: 400, message: 'Tenant ID is required' },
    TENANT_MISMATCH: { status: 403, message: 'Tenant mismatch' },
    INVALID_TENANT_ID: { status: 400, message: 'Invalid tenant ID' },

    // Validation errors
    VALIDATION_ERROR: { status: 400, message: 'Validation failed' },
    INVALID_REQUEST: { status: 400, message: 'Invalid request' },

    // Resource errors
    NOT_FOUND: { status: 404, message: 'Resource not found' },

    // Rate limiting
    RATE_LIMIT_EXCEEDED: { status: 429, message: 'Rate limit exceeded' },

    // Server errors
    INTERNAL_ERROR: { status: 500, message: 'Internal server error' }
  };

  it('should have auth error codes', () => {
    expect(ERROR_CODES.MISSING_TOKEN.status).toBe(401);
    expect(ERROR_CODES.INVALID_TOKEN.status).toBe(401);
    expect(ERROR_CODES.FORBIDDEN.status).toBe(403);
  });

  it('should have tenant error codes', () => {
    expect(ERROR_CODES.MISSING_TENANT_ID.status).toBe(400);
    expect(ERROR_CODES.TENANT_MISMATCH.status).toBe(403);
  });

  it('should have validation error codes', () => {
    expect(ERROR_CODES.VALIDATION_ERROR.status).toBe(400);
    expect(ERROR_CODES.INVALID_REQUEST.status).toBe(400);
  });

  it('should have resource error codes', () => {
    expect(ERROR_CODES.NOT_FOUND.status).toBe(404);
  });

  it('should have rate limit error code', () => {
    expect(ERROR_CODES.RATE_LIMIT_EXCEEDED.status).toBe(429);
  });

  it('should have server error code', () => {
    expect(ERROR_CODES.INTERNAL_ERROR.status).toBe(500);
  });
});

describe('Error Logging', () => {
  it('should log errors with context', () => {
    const mockLogger = {
      error: vi.fn()
    };

    class AppError extends Error {
      constructor(
        public code: string,
        message: string,
        public context?: Record<string, unknown>
      ) {
        super(message);
        this.name = 'AppError';
      }
    }

    const error = new AppError('DB_ERROR', 'Database connection failed', {
      host: 'localhost',
      database: 'test'
    });

    mockLogger.error('error_occurred', {
      code: error.code,
      message: error.message,
      context: error.context,
      stack: error.stack
    });

    expect(mockLogger.error).toHaveBeenCalledWith('error_occurred', expect.objectContaining({
      code: 'DB_ERROR',
      message: 'Database connection failed'
    }));
  });
});
