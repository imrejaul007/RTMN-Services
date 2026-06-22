/**
 * Logger Utility - Simple structured logging
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: Record<string, unknown>;
  service?: string;
}

export class Logger {
  private serviceName: string;
  private minLevel: LogLevel;

  constructor(serviceName: string = 'app') {
    this.serviceName = serviceName;
    this.minLevel = this.getLogLevel();
  }

  private getLogLevel(): LogLevel {
    const envLevel = process.env.LOG_LEVEL?.toUpperCase();
    switch (envLevel) {
      case 'DEBUG':
        return LogLevel.DEBUG;
      case 'INFO':
        return LogLevel.INFO;
      case 'WARN':
        return LogLevel.WARN;
      case 'ERROR':
        return LogLevel.ERROR;
      default:
        return process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG;
    }
  }

  private formatLogEntry(level: string, message: string, context?: Record<string, unknown>): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      service: this.serviceName,
    };
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.minLevel;
  }

  private output(entry: LogEntry): void {
    const output = JSON.stringify(entry);
    const level = entry.level;

    if (level === 'ERROR') {
      console.error(output);
    } else if (level === 'WARN') {
      console.warn(output);
    } else {
      console.log(output);
    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      this.output(this.formatLogEntry('DEBUG', message, context));
    }
  }

  info(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog(LogLevel.INFO)) {
      this.output(this.formatLogEntry('INFO', message, context));
    }
  }

  warn(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog(LogLevel.WARN)) {
      this.output(this.formatLogEntry('WARN', message, context));
    }
  }

  error(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      this.output(this.formatLogEntry('ERROR', message, context));
    }
  }

  logRequest(req: {
    method: string;
    url: string;
    ip?: string;
    headers?: Record<string, string>;
  }, res: {
    statusCode: number;
  }, durationMs: number): void {
    this.info('HTTP Request', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      durationMs,
      ip: req.ip,
      userAgent: req.headers?.['user-agent'],
    });
  }

  logError(error: Error, context?: Record<string, unknown>): void {
    this.error('Error occurred', {
      error: error.message,
      stack: error.stack,
      ...context,
    });
  }

  logMetric(name: string, value: number, unit?: string): void {
    this.info('Metric', {
      metric: name,
      value,
      unit,
    });
  }
}

// Default logger instance
export const logger = new Logger('rez-invoice-ocr');
