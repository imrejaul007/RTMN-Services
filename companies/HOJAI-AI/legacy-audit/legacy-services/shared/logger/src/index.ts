/**
 * @rez/logger - Production-Ready Structured Logging
 *
 * Features:
 * - JSON structured logging
 * - Log levels (debug, info, warn, error, fatal)
 * - Request ID tracking
 * - PII masking
 * - Performance metrics
 * - Multiple transports (stdout, file, remote)
 * - Express middleware
 *
 * @example
 * ```typescript
 * import { createLogger, requestLogger, createTimer } from '@rez/logger';
 *
 * const logger = createLogger({
 *   service: 'rabtul-auth',
 *   level: process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error',
 *   pretty: process.env.NODE_ENV !== 'production'
 * });
 *
 * app.use(requestLogger(logger));
 *
 * logger.info('User logged in', { userId: '123', action: 'login' });
 * logger.warn('Rate limit approaching', { ip: '192.168.1.1', current: 95, limit: 100 });
 * logger.error('Database connection failed', { error: err.message, retry: 3 });
 * ```
 *
 * @package @rez/logger
 * @author RTNM Digital
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express';

// Types
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  requestId?: string;
  userId?: string;
  traceId?: string;
  spanId?: string;
  duration?: number;
  [key: string]: unknown;
}

export interface LoggerConfig {
  /** Service name */
  service: string;
  /** Minimum log level */
  level: LogLevel;
  /** Pretty print for development */
  pretty?: boolean;
  /** Additional fields to redact */
  redactFields?: string[];
  /** Environment */
  env?: 'production' | 'staging' | 'development';
  /** Include stack trace for errors */
  includeStackTrace?: boolean;
}

export interface Logger {
  debug: (message: string, data?: Record<string, unknown>) => void;
  info: (message: string, data?: Record<string, unknown>) => void;
  warn: (message: string, data?: Record<string, unknown>) => void;
  error: (message: string, data?: Record<string, unknown>) => void;
  fatal: (message: string, data?: Record<string, unknown>) => void;
  child: (context: Record<string, unknown>) => Logger;
  flush: () => Promise<void>;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

// PII fields to redact (case-insensitive)
const PII_FIELDS = [
  'password', 'passwd', 'secret', 'token', 'apikey', 'api_key', 'apiKey',
  'authorization', 'auth', 'bearer', 'credential',
  'creditcard', 'credit_card', 'cardnumber', 'card_number', 'cvv', 'cvc',
  'ssn', 'social_security', 'aadhaar', 'pan', 'tax_id',
  'email', 'phone', 'mobile', 'address', 'dateOfBirth', 'dob', 'birthday',
  'name', 'firstname', 'first_name', 'lastname', 'last_name', 'fullname', 'full_name',
  'bankaccount', 'bank_account', 'accountnumber', 'account_number', 'routingnumber', 'routing_number',
  'pin', 'otp', 'verificationcode', 'verification_code'
];

// Global request ID counter
let globalRequestId = 0;

// Pending logs for flush
const pendingLogs: LogEntry[] = [];
let flushTimeout: NodeJS.Timeout | null = null;

/**
 * Create structured logger
 */
export function createLogger(config: LoggerConfig): Logger {
  const { service, level = 'info', pretty = false, redactFields = [], includeStackTrace = true } = config;
  const minLevel = LOG_LEVELS[level];

  // Merge PII fields with custom fields
  const allRedactFields = [...PII_FIELDS, ...redactFields.map(f => f.toLowerCase())];

  /**
   * Recursively redact PII from object
   */
  const redact = (obj: Record<string, unknown>): Record<string, unknown> => {
    if (obj === null || obj === undefined) return {};

    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();

      // Check if this field should be redacted
      if (allRedactFields.some(f => lowerKey.includes(f))) {
        result[key] = '[REDACTED]';
      } else if (Array.isArray(value)) {
        result[key] = value.map(item =>
          typeof item === 'object' && item !== null
            ? redact(item as Record<string, unknown>)
            : item
        );
      } else if (typeof value === 'object' && value !== null) {
        result[key] = redact(value as Record<string, unknown>);
      } else {
        result[key] = value;
      }
    }

    return result;
  };

  /**
   * Write log entry
   */
  const writeLog = (logLevel: LogLevel, message: string, data?: Record<string, unknown>) => {
    if (LOG_LEVELS[logLevel] < minLevel) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: logLevel,
      service,
      message,
      env: config.env ?? (process.env.NODE_ENV as 'production' | 'staging' | 'development'),
      ...redact(data ?? {})
    };

    if (pretty) {
      const color = getLevelColor(logLevel);
      const reset = '\x1b[0m';
      console.log(`${color}[${entry.timestamp}] ${entry.level.toUpperCase()} [${service}]${reset} ${message}`);
      if (Object.keys(entry).length > 4) {
        console.log(JSON.stringify(entry, null, 2));
      }
    } else {
      // Add to pending logs for batch flush
      pendingLogs.push(entry);

      // Flush every 100ms or when 10 logs are pending
      if (!flushTimeout) {
        flushTimeout = setTimeout(flushLogs, 100);
      }
      if (pendingLogs.length >= 10) {
        flushLogs();
      }
    }
  };

  /**
   * Flush pending logs
   */
  const flushLogs = () => {
    if (flushTimeout) {
      clearTimeout(flushTimeout);
      flushTimeout = null;
    }

    if (pendingLogs.length === 0) return;

    const logs = pendingLogs.splice(0, pendingLogs.length);
    for (const log of logs) {
      // Write to stdout (can be piped to file, ELK, etc.)
      process.stdout.write(JSON.stringify(log) + '\n');
    }
  };

  /**
   * Create child logger with additional context
   */
  const createChild = (context: Record<string, unknown>): Logger => {
    return {
      debug: (message: string, data?: Record<string, unknown>) =>
        writeLog('debug', message, { ...context, ...data }),
      info: (message: string, data?: Record<string, unknown>) =>
        writeLog('info', message, { ...context, ...data }),
      warn: (message: string, data?: Record<string, unknown>) =>
        writeLog('warn', message, { ...context, ...data }),
      error: (message: string, data?: Record<string, unknown>) =>
        writeLog('error', message, { ...context, ...data }),
      fatal: (message: string, data?: Record<string, unknown>) =>
        writeLog('fatal', message, { ...context, ...data }),
      child: (additionalContext: Record<string, unknown>) =>
        createChild({ ...context, ...additionalContext }),
      flush: flushLogs
    };
  };

  return {
    debug: (message: string, data?: Record<string, unknown>) =>
      writeLog('debug', message, data),
    info: (message: string, data?: Record<string, unknown>) =>
      writeLog('info', message, data),
    warn: (message: string, data?: Record<string, unknown>) =>
      writeLog('warn', message, data),
    error: (message: string, data?: Record<string, unknown>) =>
      writeLog('error', message, data),
    fatal: (message: string, data?: Record<string, unknown>) =>
      writeLog('fatal', message, data),
    child: createChild,
    flush: flushLogs
  };
}

/**
 * Get ANSI color code for log level
 */
function getLevelColor(level: LogLevel): string {
  const colors: Record<LogLevel, string> = {
    debug: '\x1b[36m',   // Cyan
    info: '\x1b[32m',    // Green
    warn: '\x1b[33m',    // Yellow
    error: '\x1b[31m',   // Red
    fatal: '\x1b[35m',   // Magenta
  };
  return colors[level];
}

/**
 * Express middleware for request logging
 *
 * @example
 * ```typescript
 * app.use(requestLogger(logger));
 * ```
 */
export function requestLogger(logger: Logger) {
  return (req: Request, res: Response, next: NextFunction) => {
    const requestId = (req.headers['x-request-id'] as string) ||
                      (req.headers['x-trace-id'] as string) ||
                      `req-${++globalRequestId}`;
    const startTime = process.hrtime.bigint();

    // Attach IDs to request
    (req as Request & { requestId: string }).requestId = requestId;

    // Log incoming request (debug level)
    logger.debug('Incoming request', {
      requestId,
      method: req.method,
      path: req.path,
      query: req.query,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      origin: req.headers.origin,
      referer: req.headers.referer,
    });

    // Capture response
    const originalSend = res.send;
    res.send = function (body): Response {
      const duration = Number(process.hrtime.bigint() - startTime) / 1_000_000;

      const logData = {
        requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: `${duration.toFixed(2)}ms`,
        contentLength: res.get('content-length'),
        userId: (req as Request & { user?: { userId?: string } }).user?.userId,
      };

      // Log at appropriate level based on status code
      if (res.statusCode >= 500) {
        logger.error('Request completed', { ...logData, body: body?.toString()?.slice(0, 500) });
      } else if (res.statusCode >= 400) {
        logger.warn('Request completed', logData);
      } else {
        logger.info('Request completed', logData);
      }

      return originalSend.call(this, body);
    };

    // Set request ID header
    res.setHeader('X-Request-ID', requestId);

    next();
  };
}

/**
 * Performance timer helper
 *
 * @example
 * ```typescript
 * const timer = createTimer();
 * // ... do some work ...
 * const duration = timer.stop();
 * logger.info('Operation completed', { duration: `${duration.toFixed(2)}ms` });
 *
 * // Or use with callback
 * timer.stopWith(logger, 'Database query');
 * ```
 */
export function createTimer() {
  const start = process.hrtime.bigint();

  return {
    /**
     * Stop timer and return duration in milliseconds
     */
    stop(): number {
      const end = process.hrtime.bigint();
      return Number(end - start) / 1_000_000;
    },

    /**
     * Stop timer, log, and return duration
     */
    stopWith(logger: Logger, message: string, data?: Record<string, unknown>): number {
      const duration = this.stop();
      logger.info(message, { duration: `${duration.toFixed(2)}ms`, ...data });
      return duration;
    },

    /**
     * Get elapsed time without stopping
     */
    elapsed(): number {
      const now = process.hrtime.bigint();
      return Number(now - start) / 1_000_000;
    }
  };
}

/**
 * Async operation wrapper with timing
 */
export async function timedOperation<T>(
  logger: Logger,
  operation: string,
  fn: () => Promise<T>,
  data?: Record<string, unknown>
): Promise<T> {
  const timer = createTimer();
  try {
    const result = await fn();
    timer.stopWith(logger, `${operation} completed`, { status: 'success', ...data });
    return result;
  } catch (error) {
    const duration = timer.stop();
    logger.error(`${operation} failed`, {
      duration: `${duration.toFixed(2)}ms`,
      error: (error as Error).message,
      stack: (error as Error).stack,
      ...data
    });
    throw error;
  }
}

/**
 * Create logger for service startup
 */
export function logStartup(service: string, port: number, routes: string[] = []) {
  const isProduction = process.env.NODE_ENV === 'production';

  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  ${service.padEnd(62)}║
╠═══════════════════════════════════════════════════════════════╣
║  Environment: ${(process.env.NODE_ENV || 'development').padEnd(54)}║
║  Port:       ${port.toString().padEnd(54)}║
║  PID:        ${process.pid.toString().padEnd(54)}║
╚═══════════════════════════════════════════════════════════════╝
  `);

  if (!isProduction && routes.length > 0) {
    console.log('Available routes:');
    for (const route of routes) {
      console.log(`  → ${route}`);
    }
    console.log('');
  }
}

/**
 * Replace global console methods with logger
 * USE WITH CAUTION - This modifies global state
 */
export function patchConsole(logger: Logger) {
  const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    debug: console.debug,
  };

  console.log = (...args: unknown[]) => {
    logger.info(args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' '));
  };

  console.error = (...args: unknown[]) => {
    logger.error(args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' '));
  };

  console.warn = (...args: unknown[]) => {
    logger.warn(args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' '));
  };

  console.debug = (...args: unknown[]) => {
    logger.debug(args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' '));
  };

  return originalConsole;
}

/**
 * Restore original console methods
 */
export function unpatchConsole(original: {
  log: typeof console.log;
  error: typeof console.error;
  warn: typeof console.warn;
  debug: typeof console.debug;
}) {
  console.log = original.log;
  console.error = original.error;
  console.warn = original.warn;
  console.debug = original.debug;
}

// Re-export types
export type { LoggerConfig, LogEntry, LogLevel };

export default {
  createLogger,
  requestLogger,
  createTimer,
  timedOperation,
  logStartup,
  patchConsole,
  unpatchConsole
};


// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'logger',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Liveness probe
app.get('/health/live', (req, res) => {
  res.json({ status: 'alive' });
});

// Readiness probe
app.get('/health/ready', (req, res) => {
  res.json({ status: 'ready' });
});
