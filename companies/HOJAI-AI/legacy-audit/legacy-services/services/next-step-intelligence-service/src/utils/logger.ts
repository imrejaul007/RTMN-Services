import winston from 'winston';
import path from 'path';

// ============================================
// LOG LEVELS
// ============================================

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// ============================================
// COLORS
// ============================================

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(colors);

// ============================================
// FORMAT
// ============================================

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]`;

    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }

    if (message) {
      log += ` ${typeof message === 'object' ? JSON.stringify(message) : message}`;
    }

    if (stack) {
      log += `\n${stack}`;
    }

    return log;
  })
);

const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
    let log = `${timestamp} [${level}]`;

    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }

    if (message) {
      log += ` ${typeof message === 'object' ? JSON.stringify(message) : message}`;
    }

    if (stack) {
      log += `\n${stack}`;
    }

    return log;
  })
);

// ============================================
// TRANSPORTS
// ============================================

const transports: winston.transport[] = [
  // Console transport for development
  new winston.transports.Console({
    format: consoleFormat,
    level: process.env.LOG_LEVEL || 'debug',
  }),
];

// File transport for errors
transports.push(
  new winston.transports.File({
    filename: path.join(process.env.LOG_DIR || './logs', 'error.log'),
    level: 'error',
    format: logFormat,
    maxsize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5,
  })
);

// File transport for all logs
transports.push(
  new winston.transports.File({
    filename: path.join(process.env.LOG_DIR || './logs', 'combined.log'),
    format: logFormat,
    maxsize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5,
  })
);

// HTTP request log
if (process.env.NODE_ENV === 'production') {
  transports.push(
    new winston.transports.File({
      filename: path.join(process.env.LOG_DIR || './logs', 'http.log'),
      level: 'http',
      format: logFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    })
  );
}

// ============================================
// CREATE LOGGER
// ============================================

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'debug',
  levels,
  format: logFormat,
  transports,
  exitOnError: false,
});

// ============================================
// STREAM FOR MORGAN (HTTP LOGGER)
// ============================================

export const httpLogStream = {
  write: (message: string): void => {
    logger.http(message.trim());
  },
};

// ============================================
// HELPER METHODS
// ============================================

export const createChildLogger = (context: Record<string, unknown>): winston.Logger => {
  return logger.child(context);
};

// ============================================
// PREDEFINED LOGGERS
// ============================================

export const serviceLogger = createChildLogger({ service: 'next-step-intelligence' });
export const dbLogger = createChildLogger({ component: 'database' });
export const schedulerLogger = createChildLogger({ component: 'scheduler' });
export const extractionLogger = createChildLogger({ component: 'extraction' });
export const reminderLogger = createChildLogger({ component: 'reminder' });
