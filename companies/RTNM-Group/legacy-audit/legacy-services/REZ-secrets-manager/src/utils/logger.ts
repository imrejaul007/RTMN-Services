import winston from 'winston';
import path from 'path';

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

// Custom log format
const logFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;

  if (Object.keys(metadata).length > 0 && metadata.stack) {
    msg += `\n${metadata.stack}`;
  } else if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }

  return msg;
});

// Development format with colors
const devFormat = combine(
  colorize(),
  errors({ stack: true }),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  logFormat
);

// Production format in JSON
const prodFormat = combine(
  errors({ stack: true }),
  timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
  json()
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'REZ-secrets-manager' },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'production' ? prodFormat : devFormat
    }),

    // File transport for errors
    new winston.transports.File({
      filename: path.join(process.env.LOG_DIR || './logs', 'error.log'),
      level: 'error',
      format: prodFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),

    // File transport for all logs
    new winston.transports.File({
      filename: path.join(process.env.LOG_DIR || './logs', 'combined.log'),
      format: prodFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),

    // Audit log transport
    new winston.transports.File({
      filename: path.join(process.env.LOG_DIR || './logs', 'audit.log'),
      format: prodFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 10
    })
  ],
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(process.env.LOG_DIR || './logs', 'exceptions.log'),
      format: prodFormat
    })
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(process.env.LOG_DIR || './logs', 'rejections.log'),
      format: prodFormat
    })
  ]
});

// Create child logger for audit events
export const auditLogger = logger.child({}, { redact: ['password', 'secret', 'token', 'key'] });

// Convenience methods
export const createLogger = (module: string) => {
  return {
    debug: (message: string, meta?: Record<string, unknown>) => logger.debug(message, { module, ...meta }),
    info: (message: string, meta?: Record<string, unknown>) => logger.info(message, { module, ...meta }),
    warn: (message: string, meta?: Record<string, unknown>) => logger.warn(message, { module, ...meta }),
    error: (message: string, meta?: Record<string, unknown>) => logger.error(message, { module, ...meta })
  };
};

export default logger;
