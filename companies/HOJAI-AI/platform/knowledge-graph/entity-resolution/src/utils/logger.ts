/**
 * Logger utility using Winston
 */

import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'entity-resolution' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

// For testing, allow silent logging
export function setLoggerLevel(level: string): void {
  logger.level = level;
}

export function silenceLogger(): void {
  logger.transports.forEach((t) => {
    (t as winston.transports.Console).silent = true;
  });
}