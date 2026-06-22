import { v4 as uuidv4 } from 'uuid';

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  requestId?: string;
  message: string;
  data?: unknown;
}

class Logger {
  private serviceName: string;
  private requestId?: string;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  setRequestId(requestId: string): void {
    this.requestId = requestId;
  }

  clearRequestId(): void {
    this.requestId = undefined;
  }

  private log(level: LogLevel, message: string, data?: unknown): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.serviceName,
      requestId: this.requestId,
      message,
      data,
    };

    const logString = `[${entry.timestamp}] [${entry.level}] [${entry.service}]${entry.requestId ? ` [${entry.requestId}]` : ''}: ${message}`;

    switch (level) {
      case LogLevel.DEBUG:
      case LogLevel.INFO:
        console.log(logString, data ? JSON.stringify(data, null, 2) : '');
        break;
      case LogLevel.WARN:
        console.warn(logString, data ? JSON.stringify(data, null, 2) : '');
        break;
      case LogLevel.ERROR:
        console.error(logString, data ? JSON.stringify(data, null, 2) : '');
        break;
    }
  }

  debug(message: string, data?: unknown): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  info(message: string, data?: unknown): void {
    this.log(LogLevel.INFO, message, data);
  }

  warn(message: string, data?: unknown): void {
    this.log(LogLevel.WARN, message, data);
  }

  error(message: string, data?: unknown): void {
    this.log(LogLevel.ERROR, message, data);
  }
}

export const logger = new Logger('sutar-multi-agent-evaluator');

export function generateRequestId(): string {
  return uuidv4();
}

export function createScopedLogger(scope: string): Logger {
  return new Logger(`sutar-multi-agent-evaluator:${scope}`);
}
