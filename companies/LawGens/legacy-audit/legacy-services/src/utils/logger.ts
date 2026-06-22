/**
 * LawGens Logger
 * Winston-based logging for legal AI platform
 */

import winston from 'winston';
import path from 'path';
import config from '../config';

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `[${timestamp}] ${level}: ${message} ${metaStr}`;
  })
);

// Custom format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create transports
const transports: winston.transport[] = [
  new winston.transports.Console({
    format: consoleFormat,
    level: config.logging.level,
  }),
];

// Add file transport in production or if path is specified
if (config.nodeEnv === 'production' || config.logging.filePath) {
  // Ensure log directory exists
  const logDir = path.dirname(config.logging.filePath);

  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: config.logging.filePath,
      format: fileFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    })
  );
}

// Create logger instance
export const logger = winston.createLogger({
  level: config.logging.level,
  format: fileFormat,
  defaultMeta: {
    service: config.serviceName,
    version: config.apiVersion,
    env: config.nodeEnv,
  },
  transports,
  exitOnError: false,
});

// Stream for Morgan HTTP logging (if used)
export const logStream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

// Helper methods for specific log types
export const logAudit = (action: string, details: Record<string, any>) => {
  logger.info(`AUDIT: ${action}`, { ...details, audit: true, timestamp: new Date().toISOString() });
};

export const logSecurity = (event: string, details: Record<string, any>) => {
  logger.warn(`SECURITY: ${event}`, { ...details, security: true, timestamp: new Date().toISOString() });
};

export const logLegalAction = (action: string, details: Record<string, any>) => {
  logger.info(`LEGAL: ${action}`, { ...details, legal: true, timestamp: new Date().toISOString() });
};

export const logCompliance = (regulation: string, status: string, details: Record<string, any>) => {
  logger.info(`COMPLIANCE [${regulation}]: ${status}`, { ...details, compliance: true, timestamp: new Date().toISOString() });
};

export default logger;