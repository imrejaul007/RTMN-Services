import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  userId?: string;
  orgId?: string;
  clientId?: string;
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'leverge-secret-key') as any;
    req.userId = decoded.userId;
    req.orgId = decoded.orgId;
    req.clientId = decoded.clientId;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};
