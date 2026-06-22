import winston from 'winston';
import path from 'path';

// Log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Colors for different log levels
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

// Add colors to winston
winston.addColors(colors);

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;

    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }

    // Add stack trace for errors
    if (stack) {
      log += `\n${stack}`;
    }

    return log;
  })
);

// JSON format for file output
const jsonFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create transports
const transports: winston.transport[] = [
  // Console transport - only in development
  new winston.transports.Console({
    format: consoleFormat,
    silent: process.env.NODE_ENV === 'production' && !process.env.ENABLE_CONSOLE_LOG,
  }),
];

// Add file transports in production
if (process.env.NODE_ENV === 'production' || process.env.LOG_TO_FILE === 'true') {
  const logDir = process.env.LOG_DIR || path.join(process.cwd(), 'logs');

  // Error log file
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: jsonFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    })
  );

  // Combined log file
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      format: jsonFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    })
  );

  // HTTP request log
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'http.log'),
      level: 'http',
      format: jsonFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 3,
    })
  );
}

// Create the logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  levels,
  transports,
  exitOnError: false,
});

// ============================================================================
// LOGGER WRAPPER CLASS
// ============================================================================

class Logger {
  private serviceName: string;

  constructor(serviceName: string = 'care-plan-service') {
    this.serviceName = serviceName;
  }

  private formatMessage(message: string, meta?: Record<string, unknown>): string {
    return `[${this.serviceName}] ${message}`;
  }

  error(message: string, meta?: Record<string, unknown>): void {
    logger.error(this.formatMessage(message), { ...meta, service: this.serviceName });
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    logger.warn(this.formatMessage(message), { ...meta, service: this.serviceName });
  }

  info(message: string, meta?: Record<string, unknown>): void {
    logger.info(this.formatMessage(message), { ...meta, service: this.serviceName });
  }

  http(message: string, meta?: Record<string, unknown>): void {
    logger.http(this.formatMessage(message), { ...meta, service: this.serviceName });
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    logger.debug(this.formatMessage(message), { ...meta, service: this.serviceName });
  }

  // Log with timing
  timed<T>(label: string, fn: () => T | Promise<T>): T | Promise<T> {
    const start = Date.now();
    const result = fn();

    if (result instanceof Promise) {
      return result
        .then((value) => {
          const duration = Date.now() - start;
          this.info(`${label} completed`, { durationMs: duration });
          return value;
        })
        .catch((error) => {
          const duration = Date.now() - start;
          this.error(`${label} failed`, { durationMs: duration, error: error.message });
          throw error;
        });
    }

    const duration = Date.now() - start;
    this.info(`${label} completed`, { durationMs: duration });
    return result;
  }

  // Async timed wrapper
  async timedAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;
      this.info(`${label} completed`, { durationMs: duration });
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.error(`${label} failed`, { durationMs: duration, error: (error as Error).message });
      throw error;
    }
  }

  // Log request
  logRequest(req: {
    method: string;
    url: string;
    ip?: string;
    headers?: Record<string, string>;
    body?: unknown;
    params?: Record<string, string>;
    query?: Record<string, string>;
  }): void {
    this.http('Incoming request', {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.headers?.['user-agent'],
    });
  }

  // Log response
  logResponse(req: {
    method: string;
    url: string;
  }, res: {
    statusCode: number;
  }, duration: number): void {
    const level = res.statusCode >= 400 ? 'warn' : 'info';
    this[level]('Outgoing response', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      durationMs: duration,
    });
  }
}

// Create a default logger instance
export const defaultLogger = new Logger('care-plan-service');

export { Logger };
export default defaultLogger;
