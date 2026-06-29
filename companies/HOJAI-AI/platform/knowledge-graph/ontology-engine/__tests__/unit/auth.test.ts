/**
 * Unit tests for Authentication Middleware
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateToken, verifyToken, requireAuth, requireRoles } from '../../src/middleware/auth.js';
import type { Request, Response, NextFunction } from 'express';

// Mock jwt
vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn().mockReturnValue('mock-token'),
    verify: vi.fn()
  }
}));

import jwt from 'jsonwebtoken';

const mockJwt = jwt as ReturnType<typeof vi.fn> & {
  sign: ReturnType<typeof vi.fn>;
  verify: ReturnType<typeof vi.fn>;
};

describe('Authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('generateToken', () => {
    it('should generate a JWT token', () => {
      const payload = {
        sub: 'user-123',
        type: 'user' as const,
        roles: ['admin']
      };

      const token = generateToken(payload);

      expect(token).toBe('mock-token');
      expect(mockJwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 'user-123',
          type: 'user',
          roles: ['admin']
        }),
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should include expiration', () => {
      const payload = {
        sub: 'user-123',
        type: 'user' as const,
        roles: []
      };

      generateToken(payload);

      expect(mockJwt.sign).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(String),
        expect.objectContaining({
          expiresIn: expect.any(String)
        })
      );
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      mockJwt.verify.mockReturnValueOnce({
        sub: 'user-123',
        type: 'user',
        roles: ['admin'],
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      });

      const result = verifyToken('valid-token');

      expect(result).toBeDefined();
      expect(result?.sub).toBe('user-123');
    });

    it('should return null for invalid token', () => {
      mockJwt.verify.mockImplementationOnce(() => {
        throw new Error('Invalid token');
      });

      const result = verifyToken('invalid-token');

      expect(result).toBeNull();
    });
  });

  describe('requireAuth middleware', () => {
    it('should reject request without authorization header', () => {
      const req = { headers: {} } as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      } as unknown as Response;
      const next = vi.fn();

      requireAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'No authorization header provided' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request with invalid authorization format', () => {
      const req = { headers: { authorization: 'InvalidFormat token' } } as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      } as unknown as Response;
      const next = vi.fn();

      requireAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid authorization format. Use: Bearer <token>'
      });
    });

    it('should reject request with invalid token', () => {
      const req = { headers: { authorization: 'Bearer invalid-token' } } as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      } as unknown as Response;
      const next = vi.fn();

      mockJwt.verify.mockImplementationOnce(() => {
        throw new Error('Invalid token');
      });

      requireAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
    });

    it('should allow request with valid token', () => {
      const mockPayload = {
        sub: 'user-123',
        type: 'user',
        roles: ['admin'],
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      };

      const req = { headers: { authorization: 'Bearer valid-token' } } as Request & { user?: unknown };
      const res = {} as Response;
      const next = vi.fn();

      mockJwt.verify.mockReturnValueOnce(mockPayload);

      requireAuth(req, res, next);

      expect(req.user).toBeDefined();
      expect((req as { user?: { sub: string } }).user?.sub).toBe('user-123');
      expect(next).toHaveBeenCalled();
    });
  });

  describe('requireRoles middleware', () => {
    it('should reject request without user', () => {
      const req = {} as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      } as unknown as Response;
      const next = vi.fn();

      const middleware = requireRoles('admin');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Not authenticated' });
    });

    it('should reject request without required role', () => {
      const req = {
        user: {
          sub: 'user-123',
          type: 'user',
          roles: ['user']
        }
      } as Request & { user: { sub: string; type: string; roles: string[] } };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      } as unknown as Response;
      const next = vi.fn();

      const middleware = requireRoles('admin');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Insufficient permissions',
          required: ['admin'],
          current: ['user']
        })
      );
    });

    it('should allow request with required role', () => {
      const req = {
        user: {
          sub: 'user-123',
          type: 'user',
          roles: ['admin', 'editor']
        }
      } as Request & { user: { sub: string; type: string; roles: string[] } };
      const res = {} as Response;
      const next = vi.fn();

      const middleware = requireRoles('admin');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should allow request with any of multiple required roles', () => {
      const req = {
        user: {
          sub: 'user-123',
          type: 'user',
          roles: ['editor']
        }
      } as Request & { user: { sub: string; type: string; roles: string[] } };
      const res = {} as Response;
      const next = vi.fn();

      const middleware = requireRoles('admin', 'editor');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});
