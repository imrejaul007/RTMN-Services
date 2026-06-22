import winston from 'winston';
import path from 'path';

// Log levels configuration
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

// Color scheme for development
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue'
};

winston.addColors(colors);

// Format for development
const devFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

// Format for production
const prodFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    return JSON.stringify({
      timestamp,
      level,
      message,
      ...meta
    });
  })
);

// Determine log level from environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  return env === 'development' ? 'debug' : 'info';
};

// Create transports array
const transports: winston.transport[] = [
  // Console transport
  new winston.transports.Console({
    format: process.env.NODE_ENV === 'production' ? prodFormat : devFormat
  })
];

// Add file transport for errors in production
if (process.env.NODE_ENV === 'production') {
  transports.push(
    new winston.transports.File({
      filename: path.join(process.env.LOG_DIR || 'logs', 'error.log'),
      level: 'error',
      format: prodFormat
    }),
    new winston.transports.File({
      filename: path.join(process.env.LOG_DIR || 'logs', 'combined.log'),
      format: prodFormat
    })
  );
}

// Create the logger instance
export const logger = winston.createLogger({
  level: level(),
  levels,
  format: devFormat,
  transports,
  exitOnError: false
});

// Create a stream object for Morgan HTTP logging (if needed)
export const logStream = {
  write: (message: string) => {
    logger.http(message.trim());
  }
};

// ============================================================================
// LOGGING HELPERS
// ============================================================================

export const logRequest = (req: {
  method: string;
  url: string;
  ip?: string;
  headers?: Record<string, string>;
}) => {
  logger.http(`${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.headers?.['user-agent']
  });
};

export const logError = (error: Error, context?: Record<string, unknown>) => {
  logger.error(error.message, {
    stack: error.stack,
    ...context
  });
};

export const logInfo = (message: string, meta?: Record<string, unknown>) => {
  logger.info(message, meta);
};

export const logWarning = (message: string, meta?: Record<string, unknown>) => {
  logger.warn(message, meta);
};

export const logDebug = (message: string, meta?: Record<string, unknown>) => {
  logger.debug(message, meta);
};

// ============================================================================
// PERFORMANCE LOGGING
// ============================================================================

export const measureExecutionTime = async <T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> => {
  const start = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - start;
    logger.info(`[PERF] ${operation} completed`, {
      duration: `${duration}ms`
    });
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    logger.error(`[PERF] ${operation} failed`, {
      duration: `${duration}ms`,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
};

// ============================================================================
// AUDIT LOGGING
// ============================================================================

export interface AuditLogEntry {
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ip?: string;
}

export const auditLog = (entry: AuditLogEntry) => {
  logger.info(`[AUDIT] ${entry.action}`, {
    userId: entry.userId,
    resource: entry.resource,
    resourceId: entry.resourceId,
    details: entry.details,
    ip: entry.ip,
    timestamp: new Date().toISOString()
  });
};

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default logger;
