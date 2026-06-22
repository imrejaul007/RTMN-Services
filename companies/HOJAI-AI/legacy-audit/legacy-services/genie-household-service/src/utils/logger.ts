/**
 * Logger Utility
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  action: string;
  [key: string]: unknown;
}

class Logger {
  private serviceName: string;
  private minLevel: LogLevel;
  private readonly levels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor(serviceName: string, minLevel: LogLevel = 'info') {
    this.serviceName = serviceName;
    this.minLevel = minLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levels[level] >= this.levels[this.minLevel];
  }

  private formatLog(level: LogLevel, action: string, data?: Record<string, unknown>): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      service: this.serviceName,
      action,
      ...data,
    };
  }

  private output(entry: LogEntry): void {
    const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.service}]`;
    const message = Object.keys(entry)
      .filter((k) => k !== 'timestamp' && k !== 'level' && k !== 'service')
      .map((k) => `${k}=${JSON.stringify(entry[k])}`)
      .join(' ');

    switch (entry.level) {
      case 'error':
        console.error(prefix, message);
        break;
      case 'warn':
        console.warn(prefix, message);
        break;
      default:
        console.log(prefix, message);
    }
  }

  debug(action: string, data?: Record<string, unknown>): void {
    if (this.shouldLog('debug')) this.output(this.formatLog('debug', action, data));
  }

  info(action: string, data?: Record<string, unknown>): void {
    if (this.shouldLog('info')) this.output(this.formatLog('info', action, data));
  }

  warn(action: string, data?: Record<string, unknown>): void {
    if (this.shouldLog('warn')) this.output(this.formatLog('warn', action, data));
  }

  error(action: string, data?: Record<string, unknown>): void {
    if (this.shouldLog('error')) this.output(this.formatLog('error', action, data));
  }
}

export function createLogger(serviceName: string, minLevel?: LogLevel): Logger {
  return new Logger(serviceName, minLevel);
}
