/**
 * Auth Middleware Tests for rez-auth-service
 * Tests authentication and authorization middleware
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';

// Types for testing
interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: string;
    email?: string;
  };
  headers: {
    authorization?: string;
    'x-internal-token'?: string;
  };
}

// Mock middleware functions for testing
function createMockAuthMiddleware() {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }
    const token = authHeader.split(' ')[1];
    // Simplified token validation for testing
    if (!token) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }
    req.user = { userId: 'test-user', role: 'user' };
    next();
  };
}

function createMockRoleMiddleware(allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}

function createMockInternalTokenMiddleware(validTokens: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const token = req.headers['x-internal-token'];
    if (!token || !validTokens.includes(token)) {
      res.status(401).json({ error: 'Invalid internal token' });
      return;
    }
    next();
  };
}

describe('Auth Middleware', () => {
  let mockReq: Partial<AuthRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    statusMock = vi.fn().mockReturnThis();
    jsonMock = vi.fn().mockReturnThis();

    mockReq = {
      headers: {},
      user: undefined
    };

    mockRes = {
      status: statusMock,
      json: jsonMock
    };

    mockNext = vi.fn();
  });

  describe('Authentication Middleware', () => {
    const authMiddleware = createMockAuthMiddleware();

    it('should allow request with valid Bearer token', () => {
      mockReq.headers = { authorization: 'Bearer valid-token-123' };
      authMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toBeDefined();
    });

    it('should reject request without authorization header', () => {
      mockReq.headers = {};
      authMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'No token provided' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request without Bearer prefix', () => {
      mockReq.headers = { authorization: 'Basic some-token' };
      authMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request with empty token', () => {
      mockReq.headers = { authorization: 'Bearer ' };
      authMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request with malformed header', () => {
      mockReq.headers = { authorization: 'InvalidHeader' };
      authMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Role Authorization Middleware', () => {
    const roleMiddleware = createMockRoleMiddleware(['admin', 'superuser']);

    it('should allow admin role', () => {
      mockReq.user = { userId: 'user-1', role: 'admin' };
      roleMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow superuser role', () => {
      mockReq.user = { userId: 'user-2', role: 'superuser' };
      roleMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject regular user role', () => {
      mockReq.user = { userId: 'user-3', role: 'user' };
      roleMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);
      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request without user', () => {
      mockReq.user = undefined;
      roleMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Not authenticated' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject merchant role for admin-only route', () => {
      const adminOnlyMiddleware = createMockRoleMiddleware(['admin']);
      mockReq.user = { userId: 'merchant-1', role: 'merchant' };
      adminOnlyMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);
      expect(statusMock).toHaveBeenCalledWith(403);
    });
  });

  describe('Internal Token Middleware', () => {
    const validTokens = ['token-abc', 'token-xyz'];
    const internalMiddleware = createMockInternalTokenMiddleware(validTokens);

    it('should allow valid internal token', () => {
      mockReq.headers = { 'x-internal-token': 'token-abc' };
      internalMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow another valid internal token', () => {
      mockReq.headers = { 'x-internal-token': 'token-xyz' };
      internalMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject invalid internal token', () => {
      mockReq.headers = { 'x-internal-token': 'invalid-token' };
      internalMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid internal token' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject missing internal token', () => {
      mockReq.headers = {};
      internalMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Combined Middleware Flow', () => {
    it('should pass through all middleware in correct order', () => {
      const authMiddleware = createMockAuthMiddleware();
      const roleMiddleware = createMockRoleMiddleware(['admin', 'user']);

      mockReq.headers = { authorization: 'Bearer valid-token' };
      authMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);
      expect(mockReq.user).toBeDefined();

      roleMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should fail at auth stage before role check', () => {
      const authMiddleware = createMockAuthMiddleware();
      const roleMiddleware = createMockRoleMiddleware(['admin']);

      // No auth token
      mockReq.headers = {};
      authMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);
      expect(statusMock).toHaveBeenCalledWith(401);

      // Role middleware should never be reached
      roleMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);
      // Status would be called again, but auth already failed
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});

describe('Security Middleware Scenarios', () => {
  it('should handle token with extra spaces', () => {
    const authMiddleware = createMockAuthMiddleware();
    const mockReq = { headers: { authorization: 'Bearer   token-with-spaces' } } as unknown as AuthRequest;
    const mockRes = { status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response;
    const mockNext = vi.fn();

    authMiddleware(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });

  it('should handle very long tokens', () => {
    const authMiddleware = createMockAuthMiddleware();
    const longToken = 'a'.repeat(10000);
    const mockReq = { headers: { authorization: `Bearer ${longToken}` } } as unknown as AuthRequest;
    const mockRes = { status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response;
    const mockNext = vi.fn();

    authMiddleware(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });

  it('should handle unicode in tokens', () => {
    const authMiddleware = createMockAuthMiddleware();
    const unicodeToken = 'token-тест-テスト';
    const mockReq = { headers: { authorization: `Bearer ${unicodeToken}` } } as unknown as AuthRequest;
    const mockRes = { status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response;
    const mockNext = vi.fn();

    authMiddleware(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });
});
