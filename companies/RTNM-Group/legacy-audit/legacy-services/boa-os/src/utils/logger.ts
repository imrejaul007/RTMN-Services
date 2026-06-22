type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  service?: string;
  [key: string]: unknown;
}

class Logger {
  private service: string;

  constructor(service: string) {
    this.service = service;
  }

  private format(entry: LogEntry): string {
    return JSON.stringify(entry);
  }

  private log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: this.service,
      ...meta
    };
    if (level === 'error') {
      console.error(this.format(entry));
    } else {
      console.log(this.format(entry));
    }
  }

  debug(message: string, meta?: Record<string, unknown>): void { this.log('debug', message, meta); }
  info(message: string, meta?: Record<string, unknown>): void { this.log('info', message, meta); }
  warn(message: string, meta?: Record<string, unknown>): void { this.log('warn', message, meta); }
  error(message: string, meta?: Record<string, unknown>): void { this.log('error', message, meta); }
}

export function createLogger(service: string): Logger {
  return new Logger(service);
}
