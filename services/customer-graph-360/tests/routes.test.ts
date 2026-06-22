import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Mock config before importing middleware
jest.mock('../src/config/index', () => ({
  config: {
    port: 4808,
    nodeEnv: 'test',
    mongodbUri: 'mongodb://localhost:27017/test',
    redisUrl: 'redis://localhost:6379',
    jwtSecret: 'test-secret-key',
    logLevel: 'error',
  },
}));

import {
  authMiddleware,
  optionalAuthMiddleware,
  requireRole,
  generateToken,
  AuthenticatedRequest,
} from '../src/middleware/auth.middleware';

describe('Auth Middleware', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    nextFunction = jest.fn();
  });

  describe('authMiddleware', () => {
    it('should reject request without authorization header', () => {
      authMiddleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'No authorization header provided',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should reject request with invalid authorization format', () => {
      mockRequest.headers = { authorization: 'InvalidFormat' };

      authMiddleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid authorization format. Use: Bearer <token>',
      });
    });

    it('should reject request with invalid token', () => {
      mockRequest.headers = { authorization: 'Bearer invalid-token' };

      authMiddleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid token',
      });
    });

    it('should accept valid token', () => {
      const token = generateToken({ userId: 'user123', email: 'test@example.com' });
      mockRequest.headers = { authorization: `Bearer ${token}` };

      authMiddleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect((mockRequest as AuthenticatedRequest).user).toBeDefined();
      expect((mockRequest as AuthenticatedRequest).user?.userId).toBe('user123');
    });

    it('should reject expired token', () => {
      const expiredToken = jwt.sign(
        { userId: 'user123' },
        'test-secret-key',
        { expiresIn: '-1h' }
      );
      mockRequest.headers = { authorization: `Bearer ${expiredToken}` };

      authMiddleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Token has expired',
      });
    });
  });

  describe('optionalAuthMiddleware', () => {
    it('should call next without token', () => {
      optionalAuthMiddleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect((mockRequest as AuthenticatedRequest).user).toBeUndefined();
    });

    it('should accept valid token', () => {
      const token = generateToken({ userId: 'user123' });
      mockRequest.headers = { authorization: `Bearer ${token}` };

      optionalAuthMiddleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect((mockRequest as AuthenticatedRequest).user?.userId).toBe('user123');
    });

    it('should continue with invalid token (optional)', () => {
      mockRequest.headers = { authorization: 'Bearer invalid-token' };

      optionalAuthMiddleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect((mockRequest as AuthenticatedRequest).user).toBeUndefined();
    });
  });

  describe('requireRole', () => {
    it('should reject if not authenticated', () => {
      const middleware = requireRole('admin');

      middleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Not authenticated',
      });
    });

    it('should reject if user does not have required role', () => {
      mockRequest.user = { userId: 'user123', role: 'user', iat: 0, exp: 0 };
      const middleware = requireRole('admin');

      middleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Insufficient permissions',
      });
    });

    it('should allow user with required role', () => {
      mockRequest.user = { userId: 'user123', role: 'admin', iat: 0, exp: 0 };
      const middleware = requireRole('admin');

      middleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should allow user with any of multiple roles', () => {
      mockRequest.user = { userId: 'user123', role: 'moderator', iat: 0, exp: 0 };
      const middleware = requireRole('admin', 'moderator');

      middleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe('generateToken', () => {
    it('should generate valid JWT token', () => {
      const token = generateToken({
        userId: 'user123',
        email: 'test@example.com',
        role: 'admin',
      });

      const decoded = jwt.verify(token, 'test-secret-key') as {
        userId: string;
        email: string;
        role: string;
      };

      expect(decoded.userId).toBe('user123');
      expect(decoded.email).toBe('test@example.com');
      expect(decoded.role).toBe('admin');
    });
  });
});