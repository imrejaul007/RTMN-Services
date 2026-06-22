/**
 * PRODFLOW - Authentication Middleware
 * JWT-based authentication
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../utils/config';
import { logger } from '../utils/logger';

// ============================================
// TYPES
// ============================================

export interface AuthPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userEmail?: string;
  userRole?: string;
}

// ============================================
// AUTHENTICATE MIDDLEWARE
// ============================================

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({
        success: false,
        error: 'No authorization header provided'
      });
      return;
    }

    // Extract token
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      res.status(401).json({
        success: false,
        error: 'Invalid authorization header format'
      });
      return;
    }

    const token = parts[1];

    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret) as AuthPayload;

    // Attach user info to request
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    req.userRole = decoded.role;

    logger.debug('User authenticated', { userId: decoded.userId, email: decoded.email });

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        error: 'Token has expired'
      });
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
      return;
    }

    logger.error('Authentication error', { error });
    res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
}

// ============================================
// GENERATE TOKEN
// ============================================

export function generateToken(payload: Omit<AuthPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn
  });
}

export function generateRefreshToken(payload: Omit<AuthPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.refreshExpiresIn
  });
}

// ============================================
// INTERNAL SERVICE AUTH
// ============================================

export function authenticateInternal(req: Request, res: Response, next: NextFunction): void {
  const internalToken = req.headers['x-internal-token'];

  if (internalToken !== config.security.internalToken) {
    res.status(403).json({
      success: false,
      error: 'Invalid internal service token'
    });
    return;
  }

  next();
}

export default {
  authenticate,
  authenticateInternal,
  generateToken,
  generateRefreshToken
};
