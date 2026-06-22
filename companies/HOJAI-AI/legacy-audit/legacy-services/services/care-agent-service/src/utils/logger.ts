export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export interface LogContext {
  sessionId?: string;
  profileId?: string;
  appointmentId?: string;
  method?: string;
  [key: string]: unknown;
}

class Logger {
  private serviceName: string;
  private minLevel: LogLevel;

  private static levelPriority: Record<LogLevel, number> = {
    [LogLevel.DEBUG]: 0,
    [LogLevel.INFO]: 1,
    [LogLevel.WARN]: 2,
    [LogLevel.ERROR]: 3,
  };

  constructor(serviceName: string = 'CareAgentService') {
    this.serviceName = serviceName;
    const envLevel = process.env.LOG_LEVEL?.toLowerCase() as LogLevel;
    this.minLevel = envLevel && Object.values(LogLevel).includes(envLevel)
      ? envLevel
      : LogLevel.INFO;
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` | ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] [${this.serviceName}] ${message}${contextStr}`;
  }

  private shouldLog(level: LogLevel): boolean {
    return Logger.levelPriority[level] >= Logger.levelPriority[this.minLevel];
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.debug(this.formatMessage(LogLevel.DEBUG, message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(this.formatMessage(LogLevel.INFO, message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage(LogLevel.WARN, message, context));
    }
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const errorDetails = error instanceof Error
        ? { message: error.message, stack: error.stack }
        : error
          ? { error: String(error) }
          : {};
      console.error(this.formatMessage(LogLevel.ERROR, message, { ...context, ...errorDetails }));
    }
  }

  startOperation(operationName: string, context?: LogContext): () => void {
    const startTime = Date.now();
    this.info(`Starting: ${operationName}`, context);
    return () => {
      const duration = Date.now() - startTime;
      this.info(`Completed: ${operationName} (${duration}ms)`, context);
    };
  }
}

export const logger = new Logger('CareAgentService');

export function createLogger(serviceName: string): Logger {
  return new Logger(serviceName);
}
