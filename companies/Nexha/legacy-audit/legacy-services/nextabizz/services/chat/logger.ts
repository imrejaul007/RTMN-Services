import { logger } from '../../shared/logger';
// Shared logger for NextaBiZ services

const isDev = process.env.NODE_ENV !== 'production';

export const logger = {
  info: (message: string, meta?: Record<string, unknown>) => {
    if (isDev) logger.info(`[NextaBiZ] ${message}`, meta ?? '');
  },
  warn: (message: string, meta?: Record<string, unknown>) => {
    logger.warn(`[NextaBiZ] ${message}`, meta ?? '');
  },
  error: (message: string, meta?: Record<string, unknown>) => {
    logger.error(`[NextaBiZ] ${message}`, meta ?? '');
  },
};
