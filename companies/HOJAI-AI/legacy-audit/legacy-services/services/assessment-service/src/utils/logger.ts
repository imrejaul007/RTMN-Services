/**
 * Logger Utility
 *
 * Structured logging with levels, formatting, and context support.
 */

export enum LogLevel {
  Debug = 0,
  Info = 1,
  Warn = 2,
  Error = 3,
  Fatal = 4
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: Record<string, unknown>;
  error?: {
    message: string;
    stack?: string;
  };
}

class Logger {
  private serviceName: string;
  private minLevel: LogLevel;
  private isProduction: boolean;

  constructor() {
    this.serviceName = process.env.SERVICE_NAME || 'hojai-assessment-service';
    this.minLevel = this.parseLogLevel(process.env.LOG_LEVEL || 'info');
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  private parseLogLevel(level: string): LogLevel {
    const levels: Record<string, LogLevel> = {
      debug: LogLevel.Debug,
      info: LogLevel.Info,
      warn: LogLevel.Warn,
      error: LogLevel.Error,
      fatal: LogLevel.Fatal
    };
    return levels[level.toLowerCase()] || LogLevel.Info;
  }

  private formatEntry(entry: LogEntry): string {
    const base = {
      service: this.serviceName,
      timestamp: entry.timestamp,
      level: entry.level,
      message: entry.message,
      ...entry.context
    };

    if (entry.error) {
      return JSON.stringify({ ...base, error: entry.error });
    }

    return JSON.stringify(base);
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error): void {
    if (level < this.minLevel) {
      return;
    }

    const levelNames: Record<LogLevel, string> = {
      [LogLevel.Debug]: 'DEBUG',
      [LogLevel.Info]: 'INFO',
      [LogLevel.Warn]: 'WARN',
      [LogLevel.Error]: 'ERROR',
      [LogLevel.Fatal]: 'FATAL'
    };

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: levelNames[level],
      message,
      context: this.sanitizeContext(context)
    };

    if (error) {
      entry.error = {
        message: error.message,
        stack: this.isProduction ? undefined : error.stack
      };
    }

    // Output to console in production, or with colors in development
    if (this.isProduction) {
      console.log(this.formatEntry(entry));
    } else {
      this.colorLog(level, message, context, error);
    }
  }

  private sanitizeContext(context?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!context) return undefined;

    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(context)) {
      // Redact sensitive fields
      if (this.isSensitive(key)) {
        sanitized[key] = '[REDACTED]';
      } else if (value instanceof Error) {
        sanitized[key] = {
          message: value.message,
          name: value.name
        };
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeContext(value as Record<string, unknown>);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  private isSensitive(key: string): boolean {
    const sensitiveFields = [
      'password',
      'secret',
      'token',
      'apiKey',
      'apikey',
      'authorization',
      'cookie',
      'session',
      'ssn',
      'creditCard',
      'cvv'
    ];

    const lowerKey = key.toLowerCase();
    return sensitiveFields.some(field => lowerKey.includes(field));
  }

  private colorLog(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error): void {
    const colors: Record<LogLevel, string> = {
      [LogLevel.Debug]: '\x1b[36m', // Cyan
      [LogLevel.Info]: '\x1b[32m',  // Green
      [LogLevel.Warn]: '\x1b[33m',  // Yellow
      [LogLevel.Error]: '\x1b[31m', // Red
      [LogLevel.Fatal]: '\x1b[35m'  // Magenta
    };

    const reset = '\x1b[0m';
    const color = colors[level];
    const levelNames: Record<LogLevel, string> = {
      [LogLevel.Debug]: 'DEBUG',
      [LogLevel.Info]: 'INFO ',
      [LogLevel.Warn]: 'WARN ',
      [LogLevel.Error]: 'ERROR',
      [LogLevel.Fatal]: 'FATAL'
    };

    const timestamp = new Date().toISOString();
    let logLine = `${color}[${timestamp}] [${levelNames[level]}] [${this.serviceName}]${reset} ${message}`;

    if (context && Object.keys(context).length > 0) {
      logLine += ` ${JSON.stringify(context)}`;
    }

    console.log(logLine);

    if (error) {
      console.error(`${color}[${timestamp}] [ERROR] [${this.serviceName}]${reset} ${error.message}`);
      if (error.stack) {
        console.error(error.stack);
      }
    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.Debug, message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.Info, message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.Warn, message, context);
  }

  error(message: string, context?: Record<string, unknown>): void;
  error(message: string, error: Error): void;
  error(message: string, contextOrError?: Record<string, unknown> | Error, error?: Error): void {
    if (contextOrError instanceof Error) {
      this.log(LogLevel.Error, message, undefined, contextOrError);
    } else {
      this.log(LogLevel.Error, message, contextOrError, error);
    }
  }

  fatal(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.Fatal, message, context);
  }

  /**
   * Create a child logger with additional context
   */
  child(additionalContext: Record<string, unknown>): ChildLogger {
    return new ChildLogger(this, additionalContext);
  }
}

class ChildLogger {
  private parent: Logger;
  private context: Record<string, unknown>;

  constructor(parent: Logger, context: Record<string, unknown>) {
    this.parent = parent;
    this.context = context;
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.parent.debug(message, { ...this.context, ...context });
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.parent.info(message, { ...this.context, ...context });
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.parent.warn(message, { ...this.context, ...context });
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.parent.error(message, { ...this.context, ...context });
  }

  fatal(message: string, context?: Record<string, unknown>): void {
    this.parent.fatal(message, { ...this.context, ...context });
  }
}

export const logger = new Logger();
export default logger;
