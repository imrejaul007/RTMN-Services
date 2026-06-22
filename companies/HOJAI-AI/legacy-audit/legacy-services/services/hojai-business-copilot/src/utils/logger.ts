type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  event: string;
  [key: string]: unknown;
}

class Logger {
  private serviceName: string;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  private formatMessage(level: LogLevel, event: string, data?: Record<string, unknown>): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      service: this.serviceName,
      event,
      ...data,
    };
  }

  private output(entry: LogEntry): void {
    const output = JSON.stringify(entry);
    if (entry.level === 'error') {
      console.error(output);
    } else if (entry.level === 'warn') {
      console.warn(output);
    } else {
      console.log(output);
    }
  }

  info(event: string, data?: Record<string, unknown>): void {
    this.output(this.formatMessage('info', event, data));
  }

  warn(event: string, data?: Record<string, unknown>): void {
    this.output(this.formatMessage('warn', event, data));
  }

  error(event: string, data?: Record<string, unknown>): void {
    this.output(this.formatMessage('error', event, data));
  }

  debug(event: string, data?: Record<string, unknown>): void {
    if (process.env.NODE_ENV === 'development') {
      this.output(this.formatMessage('debug', event, data));
    }
  }
}

export function createLogger(serviceName: string): Logger {
  return new Logger(serviceName);
}

// Default logger instance
export const logger = createLogger('hojai-business-copilot');
