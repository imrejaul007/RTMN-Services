import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
export const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction): void => {
  logger.error('Error:', { message: err.message, path: req.path });
  res.status(500).json({ error: 'Internal server error' });
};
