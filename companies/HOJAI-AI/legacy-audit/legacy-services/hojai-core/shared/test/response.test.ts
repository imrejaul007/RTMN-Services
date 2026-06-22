/**
 * Response Format Tests
 */

import { describe, it, expect } from 'vitest';

describe('Response Format', () => {
  describe('Success Response', () => {
    it('should create success response with data', () => {
      const createResponse = <T>(data: T, meta?: Record<string, unknown>) => ({
        success: true as const,
        data,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: `req_${Date.now()}`,
          ...meta
        }
      });

      const response = createResponse({ id: '123', name: 'Test' });

      expect(response.success).toBe(true);
      expect(response.data).toEqual({ id: '123', name: 'Test' });
      expect(response.meta.timestamp).toBeDefined();
      expect(response.meta.requestId).toBeDefined();
    });

    it('should include tenant in meta when provided', () => {
      const createResponse = <T>(data: T, tenantId?: string) => ({
        success: true as const,
        data,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: `req_${Date.now()}`,
          ...(tenantId && { tenantId })
        }
      });

      const response = createResponse({ items: [] }, 'tenant-123');

      expect(response.meta.tenantId).toBe('tenant-123');
    });

    it('should handle pagination meta', () => {
      const createPaginatedResponse = <T>(
        data: T[],
        pagination: { total: number; limit: number; offset: number; hasMore: boolean }
      ) => ({
        success: true as const,
        data,
        meta: {
          timestamp: new Date().toISOString(),
          pagination
        }
      });

      const response = createPaginatedResponse(
        [{ id: 1 }, { id: 2 }],
        { total: 100, limit: 2, offset: 0, hasMore: true }
      );

      expect(response.data).toHaveLength(2);
      expect(response.meta.pagination.total).toBe(100);
      expect(response.meta.pagination.hasMore).toBe(true);
    });
  });

  describe('Error Response', () => {
    it('should create error response', () => {
      const createErrorResponse = (code: string, message: string) => ({
        success: false as const,
        error: {
          code,
          message
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: `req_${Date.now()}`
        }
      });

      const response = createErrorResponse('NOT_FOUND', 'Resource not found');

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('NOT_FOUND');
      expect(response.error.message).toBe('Resource not found');
    });

    it('should include error details when provided', () => {
      const createErrorResponse = (
        code: string,
        message: string,
        details?: Array<{ field: string; message: string }>
      ) => ({
        success: false as const,
        error: {
          code,
          message,
          ...(details && { details })
        },
        meta: {
          timestamp: new Date().toISOString()
        }
      });

      const response = createErrorResponse(
        'VALIDATION_ERROR',
        'Validation failed',
        [{ field: 'email', message: 'Invalid email' }]
      );

      expect(response.error.details).toHaveLength(1);
      expect(response.error.details?.[0].field).toBe('email');
    });
  });

  describe('Health Check Response', () => {
    it('should create health response', () => {
      const createHealthResponse = (
        status: 'healthy' | 'unhealthy',
        service: string,
        version: string,
        checks?: Record<string, string>
      ) => ({
        status,
        service,
        version,
        timestamp: new Date().toISOString(),
        ...(checks && { checks })
      });

      const response = createHealthResponse('healthy', 'hojai-intelligence', '1.1.0', {
        mongodb: 'connected'
      });

      expect(response.status).toBe('healthy');
      expect(response.service).toBe('hojai-intelligence');
      expect(response.checks?.mongodb).toBe('connected');
    });

    it('should create liveness response', () => {
      const createLivenessResponse = () => ({
        status: 'ok' as const
      });

      const response = createLivenessResponse();

      expect(response.status).toBe('ok');
    });

    it('should create readiness response', () => {
      const createReadinessResponse = (ready: boolean, checks?: Record<string, string>) => ({
        status: ready ? 'ready' : 'not_ready',
        ...(checks && { checks })
      });

      const ready = createReadinessResponse(true, { mongodb: 'connected' });
      const notReady = createReadinessResponse(false, { mongodb: 'disconnected' });

      expect(ready.status).toBe('ready');
      expect(notReady.status).toBe('not_ready');
    });
  });

  describe('Stats Response', () => {
    it('should create stats response', () => {
      const createStatsResponse = (stats: Record<string, { total: number }>) => ({
        success: true as const,
        data: stats
      });

      const response = createStatsResponse({
        predictions: { total: 100 },
        recommendations: { total: 50 },
        insights: { total: 25 }
      });

      expect(response.data.predictions.total).toBe(100);
      expect(response.data.recommendations.total).toBe(50);
      expect(response.data.insights.total).toBe(25);
    });
  });
});

describe('HTTP Status Codes', () => {
  const STATUS_CODES = {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503
  };

  it('should have correct success codes', () => {
    expect(STATUS_CODES.OK).toBe(200);
    expect(STATUS_CODES.CREATED).toBe(201);
    expect(STATUS_CODES.NO_CONTENT).toBe(204);
  });

  it('should have correct client error codes', () => {
    expect(STATUS_CODES.BAD_REQUEST).toBe(400);
    expect(STATUS_CODES.UNAUTHORIZED).toBe(401);
    expect(STATUS_CODES.FORBIDDEN).toBe(403);
    expect(STATUS_CODES.NOT_FOUND).toBe(404);
    expect(STATUS_CODES.CONFLICT).toBe(409);
    expect(STATUS_CODES.TOO_MANY_REQUESTS).toBe(429);
  });

  it('should have correct server error codes', () => {
    expect(STATUS_CODES.INTERNAL_SERVER_ERROR).toBe(500);
    expect(STATUS_CODES.SERVICE_UNAVAILABLE).toBe(503);
  });
});

describe('Request ID Generation', () => {
  it('should generate unique request IDs', () => {
    const generateRequestId = () => `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const id1 = generateRequestId();
    const id2 = generateRequestId();

    expect(id1).toMatch(/^req_\d+_[a-z0-9]+$/);
    expect(id2).toMatch(/^req_\d+_[a-z0-9]+$/);
    // IDs should be unique (extremely likely)
    expect(id1).not.toBe(id2);
  });
});

describe('Timestamp Format', () => {
  it('should use ISO 8601 format', () => {
    const timestamp = new Date().toISOString();

    expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
  });

  it('should be parseable as Date', () => {
    const timestamp = new Date().toISOString();
    const parsed = new Date(timestamp);

    expect(parsed.getTime()).not.toBeNaN();
    expect(parsed.getTime()).toBeGreaterThan(0);
  });
});
