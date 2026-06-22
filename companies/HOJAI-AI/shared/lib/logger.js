/**
 * RTMN Shared Logger Module
 *
 * Structured logging using winston. Standardizes log format across all HOJAI AI services.
 *
 * Usage:
 *   import { createLogger } from '@rtmn/shared/lib/logger';
 *   const logger = createLogger('my-service');
 *   logger.info({ userId }, 'User logged in');
 */

import winston from 'winston';

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Create a logger instance for a specific service
 * @param {string} serviceName - Name of the service (added to all logs)
 * @returns {winston.Logger}
 */
export function createLogger(serviceName) {
  return winston.createLogger({
    level: LOG_LEVEL,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      NODE_ENV === 'production'
        ? winston.format.json()
        : winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
    ),
    defaultMeta: { service: serviceName },
    transports: [
      new winston.transports.Console()
    ]
  });
}

/**
 * Default logger (for shared lib internal use)
 */
export const logger = createLogger('shared');

export default { createLogger, logger };
