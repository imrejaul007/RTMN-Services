import winston from 'winston';
import config from '../config';

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

// Custom log format
const logFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;

  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }

  return msg;
});

// JSON format for production
const jsonLogFormat = combine(
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  json()
);

// Console format for development
const consoleLogFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  logFormat
);

// Determine log format based on environment
const logLevel = config.logging.level || 'info';
const isProduction = config.nodeEnv === 'production';
const isDevelopment = config.nodeEnv === 'development';

// Create the logger instance
const logger = winston.createLogger({
  level: logLevel,
  defaultMeta: {
    service: config.service.name,
    version: config.service.version,
  },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: isProduction ? jsonLogFormat : consoleLogFormat,
      handleExceptions: true,
      handleRejections: true,
    }),
  ],
  exitOnError: false,
  exceptionHandlers: [
    new winston.transports.Console({
      format: isProduction ? jsonLogFormat : consoleLogFormat,
    }),
  ],
  rejectionHandlers: [
    new winston.transports.Console({
      format: isProduction ? jsonLogFormat : consoleLogFormat,
    }),
  ],
});

// Add file transports in production
if (isProduction) {
  logger.add(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: jsonLogFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );

  logger.add(
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: jsonLogFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

// Create child logger with additional context
export function createChildLogger(context: Record<string, unknown>): winston.Logger {
  return logger.child(context);
}

// Helper methods for structured logging
export const logInfo = (message: string, metadata?: Record<string, unknown>): void => {
  logger.info(message, metadata);
};

export const logError = (message: string, error?: Error | unknown, metadata?: Record<string, unknown>): void => {
  if (error instanceof Error) {
    logger.error(message, { ...metadata, error: error.message, stack: error.stack });
  } else {
    logger.error(message, { ...metadata, error });
  }
};

export const logWarn = (message: string, metadata?: Record<string, unknown>): void => {
  logger.warn(message, metadata);
};

export const logDebug = (message: string, metadata?: Record<string, unknown>): void => {
  logger.debug(message, metadata);
};

export default logger;
