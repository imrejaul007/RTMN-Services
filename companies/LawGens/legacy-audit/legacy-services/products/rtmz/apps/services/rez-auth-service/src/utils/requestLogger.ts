import { logger } from '../config/logger';

export function createRequestLogger(req: { method: string; path: string; ip: string }, traceId: string) {
  return {
    info: (message: string, meta?: Record<string, unknown>) =>
      logger.info(message, { ...meta, requestId: traceId, method: req.method, path: req.path, ip: req.ip }),
    warn: (message: string, meta?: Record<string, unknown>) =>
      logger.warn(message, { ...meta, requestId: traceId, method: req.method, path: req.path, ip: req.ip }),
    error: (message: string, meta?: Record<string, unknown>) =>
      logger.error(message, { ...meta, requestId: traceId, method: req.method, path: req.path, ip: req.ip }),
    debug: (message: string, meta?: Record<string, unknown>) =>
      logger.debug(message, { ...meta, requestId: traceId, method: req.method, path: req.path, ip: req.ip }),
  };
}
