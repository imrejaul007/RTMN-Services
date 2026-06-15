import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
export const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) { res.status(err.statusCode).json({ success: false, error: { code: err.code, message: err.message }, timestamp: new Date().toISOString() }); return; }
  logger.error(`[${req.method} ${req.path}] ${err.message}`);
  res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' }, timestamp: new Date().toISOString() });
};
export const notFoundHandler = (req: Request, res: Response) => { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` }, timestamp: new Date().toISOString() }); };
