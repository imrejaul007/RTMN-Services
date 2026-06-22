import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// LOG LEVELS
// ============================================================================

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
  trace: 5
};

// ============================================================================
// LOG COLORS
// ============================================================================

const LOG_COLORS = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
  trace: 'gray'
};

winston.addColors(LOG_COLORS);

// ============================================================================
// FORMATTERS
// ============================================================================

/**
 * Custom format for console output
 */
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    const requestId = (meta as Record<string, unknown>).requestId as string | undefined;
    const requestIdStr = requestId ? `[${requestId}] ` : '';
    return `${timestamp} [${level}] ${requestIdStr}${message}${metaStr}`;
  })
);

/**
 * Custom format for JSON output (production)
 */
const jsonFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

/**
 * Custom format for file output
 */
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// ============================================================================
// TRANSPORTS
// ============================================================================

const transports: winston.transport[] = [];

// Console transport (always included in development)
if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
      level: process.env.LOG_LEVEL || 'debug'
    })
  );
}

// File transport for all logs
transports.push(
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    format: fileFormat,
    maxsize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5,
    tailable: true
  })
);

// File transport for all logs
transports.push(
  new winston.transports.File({
    filename: 'logs/combined.log',
    format: fileFormat,
    maxsize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5,
    tailable: true
  })
);

// File transport for HTTP logs
transports.push(
  new winston.transports.File({
    filename: 'logs/http.log',
    level: 'http',
    format: fileFormat,
    maxsize: 10 * 1024 * 1024, // 10MB
    maxFiles: 3,
    tailable: true
  })
);

// ============================================================================
// LOGGER INSTANCE
// ============================================================================

const logger = winston.createLogger({
  levels: LOG_LEVELS,
  transports,
  exitOnError: false,
  handleExceptions: true,
  handleRejections: true
});

// ============================================================================
// REQUEST CONTEXT
// ============================================================================

interface RequestContext {
  requestId: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  method?: string;
  url?: string;
}

let currentRequestContext: RequestContext | null = null;

/**
 * Set request context for logging
 */
export function setRequestContext(context: Partial<RequestContext>): void {
  currentRequestContext = {
    requestId: context.requestId || uuidv4(),
    userId: context.userId,
    ip: context.ip,
    userAgent: context.userAgent,
    method: context.method,
    url: context.url
  };
}

/**
 * Clear request context
 */
export function clearRequestContext(): void {
  currentRequestContext = null;
}

/**
 * Get current request context
 */
export function getRequestContext(): RequestContext | null {
  return currentRequestContext;
}

/**
 * Get request ID from context
 */
export function getRequestId(): string {
  return currentRequestContext?.requestId || uuidv4();
}

// ============================================================================
// WRAPPER METHODS WITH REQUEST CONTEXT
// ============================================================================

/**
 * Log error with request context
 */
function logWithContext(
  level: 'error' | 'warn' | 'info' | 'http' | 'debug' | 'trace',
  message: string,
  meta?: Record<string, unknown>
): void {
  const contextMeta = {
    ...(currentRequestContext || {}),
    ...meta
  };

  // Add requestId to top level for easy searching
  const enrichedMeta = {
    ...contextMeta,
    requestId: contextMeta.requestId || getRequestId()
  };

  logger.log(level, message, enrichedMeta);
}

// ============================================================================
// ENHANCED LOGGER
// ============================================================================

export const enhancedLogger = {
  /**
   * Log error message
   */
  error(message: string, meta?: Record<string, unknown>): void {
    logWithContext('error', message, meta);
  },

  /**
   * Log warning message
   */
  warn(message: string, meta?: Record<string, unknown>): void {
    logWithContext('warn', message, meta);
  },

  /**
   * Log info message
   */
  info(message: string, meta?: Record<string, unknown>): void {
    logWithContext('info', message, meta);
  },

  /**
   * Log HTTP request
   */
  http(message: string, meta?: Record<string, unknown>): void {
    logWithContext('http', message, meta);
  },

  /**
   * Log debug message
   */
  debug(message: string, meta?: Record<string, unknown>): void {
    logWithContext('debug', message, meta);
  },

  /**
   * Log trace message
   */
  trace(message: string, meta?: Record<string, unknown>): void {
    logWithContext('trace', message, meta);
  },

  /**
   * Log with custom level
   */
  log(level: 'error' | 'warn' | 'info' | 'http' | 'debug' | 'trace', message: string, meta?: Record<string, unknown>): void {
    logWithContext(level, message, meta);
  },

  /**
   * Create child logger with default metadata
   */
  child(defaultMeta: Record<string, unknown>): typeof enhancedLogger {
    return {
      error(message: string, meta?: Record<string, unknown>): void {
        logWithContext('error', message, { ...defaultMeta, ...meta });
      },
      warn(message: string, meta?: Record<string, unknown>): void {
        logWithContext('warn', message, { ...defaultMeta, ...meta });
      },
      info(message: string, meta?: Record<string, unknown>): void {
        logWithContext('info', message, { ...defaultMeta, ...meta });
      },
      http(message: string, meta?: Record<string, unknown>): void {
        logWithContext('http', message, { ...defaultMeta, ...meta });
      },
      debug(message: string, meta?: Record<string, unknown>): void {
        logWithContext('debug', message, { ...defaultMeta, ...meta });
      },
      trace(message: string, meta?: Record<string, unknown>): void {
        logWithContext('trace', message, { ...defaultMeta, ...meta });
      },
      log(level: 'error' | 'warn' | 'info' | 'http' | 'debug' | 'trace', message: string, meta?: Record<string, unknown>): void {
        logWithContext(level, message, { ...defaultMeta, ...meta });
      },
      child: () => {
        throw new Error('Cannot create nested child loggers');
      },
      setRequestContext: () => {
        throw new Error('Cannot set context on child logger');
      },
      clearRequestContext: () => {
        throw new Error('Cannot clear context on child logger');
      },
      getRequestId: () => {
        return (defaultMeta.requestId as string) || getRequestId();
      }
    };
  },

  /**
   * Set request context
   */
  setRequestContext,

  /**
   * Clear request context
   */
  clearRequestContext,

  /**
   * Get current request ID
   */
  getRequestId
};

// ============================================================================
// SERVICE-SPECIFIC LOGGING HELPERS
// ============================================================================

export interface ServiceLogger {
  service: string;
  error: (operation: string, message: string, meta?: Record<string, unknown>) => void;
  info: (operation: string, message: string, meta?: Record<string, unknown>) => void;
  debug: (operation: string, message: string, meta?: Record<string, unknown>) => void;
  warn: (operation: string, message: string, meta?: Record<string, unknown>) => void;
}

/**
 * Create a service-specific logger
 */
export function createServiceLogger(serviceName: string): ServiceLogger {
  return {
    service: serviceName,
    error(operation: string, message: string, meta?: Record<string, unknown>): void {
      enhancedLogger.error(`[${serviceName}] ${operation}: ${message}`, {
        service: serviceName,
        operation,
        ...meta
      });
    },
    info(operation: string, message: string, meta?: Record<string, unknown>): void {
      enhancedLogger.info(`[${serviceName}] ${operation}: ${message}`, {
        service: serviceName,
        operation,
        ...meta
      });
    },
    debug(operation: string, message: string, meta?: Record<string, unknown>): void {
      enhancedLogger.debug(`[${serviceName}] ${operation}: ${message}`, {
        service: serviceName,
        operation,
        ...meta
      });
    },
    warn(operation: string, message: string, meta?: Record<string, unknown>): void {
      enhancedLogger.warn(`[${serviceName}] ${operation}: ${message}`, {
        service: serviceName,
        operation,
        ...meta
      });
    }
  };
}

// ============================================================================
// AUDIT LOGGING
// ============================================================================

export interface AuditLogEntry {
  timestamp: string;
  action: string;
  userId?: string;
  resourceType?: string;
  resourceId?: string;
  changes?: Record<string, { old: unknown; new: unknown }>;
  metadata?: Record<string, unknown>;
  success: boolean;
  error?: string;
}

/**
 * Log audit event
 */
export function auditLog(entry: Omit<AuditLogEntry, 'timestamp'>): void {
  const fullEntry: AuditLogEntry = {
    timestamp: new Date().toISOString(),
    ...entry
  };

  const level = entry.success ? 'info' : 'error';
  const message = `[AUDIT] ${entry.action}`;

  logger.log(level, message, fullEntry);
}

/**
 * Log data access
 */
export function logDataAccess(
  action: 'create' | 'read' | 'update' | 'delete',
  resourceType: string,
  resourceId: string,
  userId?: string,
  metadata?: Record<string, unknown>
): void {
  auditLog({
    action: `data_access.${action}`,
    userId,
    resourceType,
    resourceId,
    metadata,
    success: true
  });
}

/**
 * Log authentication event
 */
export function logAuth(
  action: 'login' | 'logout' | 'token_refresh' | 'password_change',
  userId: string,
  success: boolean,
  metadata?: Record<string, unknown>
): void {
  auditLog({
    action: `auth.${action}`,
    userId,
    success,
    metadata,
    error: metadata?.error as string | undefined
  });
}

/**
 * Log business event
 */
export function logBusinessEvent(
  event: string,
  userId?: string,
  metadata?: Record<string, unknown>
): void {
  auditLog({
    action: `business.${event}`,
    userId,
    success: true,
    metadata
  });
}

// ============================================================================
// PERFORMANCE LOGGING
// ============================================================================

interface PerformanceMarker {
  startTime: number;
  label: string;
  metadata?: Record<string, unknown>;
}

/**
 * Start performance measurement
 */
export function startPerformance(label: string, metadata?: Record<string, unknown>): PerformanceMarker {
  return {
    startTime: Date.now(),
    label,
    metadata
  };
}

/**
 * End performance measurement and log
 */
export function endPerformance(marker: PerformanceMarker): number {
  const duration = Date.now() - marker.startTime;

  const level = duration > 1000 ? 'warn' : 'debug';

  logger.log(level, `[PERF] ${marker.label} completed`, {
    duration,
    label: marker.label,
    ...marker.metadata
  });

  return duration;
}

/**
 * Time a function execution
 */
export async function timeFunction<T>(
  label: string,
  fn: () => Promise<T>,
  metadata?: Record<string, unknown>
): Promise<{ result: T; duration: number }> {
  const marker = startPerformance(label, metadata);

  try {
    const result = await fn();
    const duration = endPerformance(marker);
    return { result, duration };
  } catch (error) {
    endPerformance(marker);
    throw error;
  }
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

// Re-export logger with enhanced methods
export { logger };

// Create a default service logger for the module
const moduleLogger = createServiceLogger('PreVisitIntelligenceService');

export default logger;
