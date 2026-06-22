/**
 * PRODFLOW - Winston Logger Configuration
 * Production-ready structured logging
 */

import winston from 'winston';
import path from 'path';

// Environment-based configuration
const logLevel = process.env.LOG_LEVEL || 'info';
const logsDir = process.env.LOGS_DIR || 'logs';

// Custom format for structured logging
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
    return `${timestamp} [${level.toUpperCase()}] ${message} ${metaStr}`;
  })
);

// JSON format for production
const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logger instance
export const logger = winston.createLogger({
  level: logLevel,
  format: process.env.NODE_ENV === 'production' ? jsonFormat : logFormat,
  defaultMeta: { service: 'PRODFLOW' },
  transports: [
    // Console transport for all environments
    new winston.transports.Console({
      handleExceptions: true,
      handleRejections: true
    })
  ],
  exitOnError: false
});

// Add file transports in production
if (process.env.NODE_ENV === 'production') {
  // Error log
  logger.add(new winston.transports.File({
    filename: path.join(logsDir, 'error.log'),
    level: 'error',
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }));

  // Combined log
  logger.add(new winston.transports.File({
    filename: path.join(logsDir, 'combined.log'),
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }));
}

// Graceful shutdown handler
process.on('SIGTERM', () => {
  logger.info('SIGTERM received - closing logger');
  logger.end();
});

process.on('SIGINT', () => {
  logger.info('SIGINT received - closing logger');
  logger.end();
});

export default logger;
