/**
 * Logger Utility for HOJAI Journey Intelligence Service
 * Structured logging with levels and context
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

interface LogContext {
  service?: string;
  customerId?: string;
  requestId?: string;
  duration?: number;
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  [LogLevel.DEBUG]: 0,
  [LogLevel.INFO]: 1,
  [LogLevel.WARN]: 2,
  [LogLevel.ERROR]: 3,
};

class Logger {
  private serviceName: string;
  private minLevel: LogLevel;

  constructor(serviceName: string = 'journey-intelligence', minLevel: LogLevel = LogLevel.INFO) {
    this.serviceName = serviceName;
    this.minLevel = this.parseLogLevel(process.env.LOG_LEVEL);
  }

  private parseLogLevel(level?: string): LogLevel {
    if (!level) return this.minLevel;
    const upper = level.toUpperCase() as LogLevel;
    return Object.values(LogLevel).includes(upper) ? upper : LogLevel.INFO;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.minLevel];
  }

  private formatEntry(entry: LogEntry): string {
    const base = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${this.serviceName}]`;
    const contextStr = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
    return `${base} ${entry.message}${contextStr}`;
  }

  private log(level: LogLevel, message: string, context?: LogContext): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
    };

    const formatted = this.formatEntry(entry);

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formatted);
        break;
      case LogLevel.INFO:
        console.info(formatted);
        break;
      case LogLevel.WARN:
        console.warn(formatted);
        break;
      case LogLevel.ERROR:
        console.error(formatted);
        break;
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, context?: LogContext): void {
    this.log(LogLevel.ERROR, message, context);
  }

  child(additionalContext: Partial<LogContext>): ChildLogger {
    return new ChildLogger(this, additionalContext);
  }

  withRequest(requestId: string): ChildLogger {
    return this.child({ requestId });
  }

  withCustomer(customerId: string): ChildLogger {
    return this.child({ customerId });
  }

  withService(serviceName: string): Logger {
    return new Logger(`${this.serviceName}:${serviceName}`, this.minLevel);
  }
}

class ChildLogger {
  private parent: Logger;
  private context: LogContext;

  constructor(parent: Logger, context: LogContext) {
    this.parent = parent;
    this.context = context;
  }

  debug(message: string, additionalContext?: Partial<LogContext>): void {
    this.parent.debug(message, { ...this.context, ...additionalContext });
  }

  info(message: string, additionalContext?: Partial<LogContext>): void {
    this.parent.info(message, { ...this.context, ...additionalContext });
  }

  warn(message: string, additionalContext?: Partial<LogContext>): void {
    this.parent.warn(message, { ...this.context, ...additionalContext });
  }

  error(message: string, additionalContext?: Partial<LogContext>): void {
    this.parent.error(message, { ...this.context, ...additionalContext });
  }
}

export const logger = new Logger('journey-intelligence-service');
export default logger;
