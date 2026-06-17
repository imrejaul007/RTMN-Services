import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  tenantId?: string;
  userId?: string;
}

interface JwtPayload {
  tenantId: string;
  userId: string;
  iat?: number;
  exp?: number;
}

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    // Allow unauthenticated requests but require tenantId in body/query for multi-tenancy
    const tenantId = req.query.tenantId as string || req.body?.tenantId;
    if (!tenantId) {
      res.status(401).json({ error: 'Authorization header or tenantId required' });
      return;
    }
    req.tenantId = tenantId;
    next();
    return;
  }

  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : authHeader;

  try {
    const secret = process.env.JWT_SECRET || 'default-secret';
    const decoded = jwt.verify(token, secret) as JwtPayload;
    req.tenantId = decoded.tenantId;
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const requireTenantId = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const tenantId = req.tenantId || req.query.tenantId as string;

  if (!tenantId) {
    res.status(400).json({ error: 'tenantId is required' });
    return;
  }

  req.tenantId = tenantId;
  next();
};
