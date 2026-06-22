import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { IUser } from '../types';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    clinicId: string;
    role: IUser['role'];
    email: string;
  };
  clinicId?: string;
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: AuthRequest['user'];
      clinicId?: string;
    }
  }
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'No token provided',
      });
      return;
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, config.jwt.secret) as {
        id: string;
        clinicId: string;
        role: IUser['role'];
        email: string;
      };

      req.user = decoded;

      // If clinicId is in params or body, use that; otherwise use user's clinicId
      req.clinicId = req.params.clinicId || req.body.clinicId || decoded.clinicId;

      next();
    } catch (jwtError) {
      if (jwtError instanceof jwt.TokenExpiredError) {
        res.status(401).json({
          success: false,
          error: 'Token expired',
        });
        return;
      }

      if (jwtError instanceof jwt.JsonWebTokenError) {
        res.status(401).json({
          success: false,
          error: 'Invalid token',
        });
        return;
      }

      throw jwtError;
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication error',
    });
  }
};

export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, config.jwt.secret) as {
        id: string;
        clinicId: string;
        role: IUser['role'];
        email: string;
      };

      req.user = decoded;
      req.clinicId = req.params.clinicId || req.body.clinicId || decoded.clinicId;
    } catch {
      // Token is invalid, but we allow the request to continue
    }

    next();
  } catch (error) {
    next();
  }
};

export const authorize = (...roles: IUser['role'][]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated',
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: 'Not authorized to access this resource',
      });
      return;
    }

    next();
  };
};

export const generateToken = (
  payload: {
    id: string;
    clinicId: string;
    role: IUser['role'];
    email: string;
  }
): string => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
};

export const generateRefreshToken = (
  payload: {
    id: string;
    clinicId: string;
    role: IUser['role'];
    email: string;
  }
): string => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.refreshExpiresIn,
  });
};
