/**
 * HOJAI Embedding Service - Logger Utility
 * Version: 1.0.0 | Date: May 30, 2026
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  event: string;
  message: string;
  [key: string]: unknown;
}

class Logger {
  private serviceName: string;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  private formatLog(level: LogLevel, event: string, data?: Record<string, unknown>): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      service: this.serviceName,
      event,
      message: this.getMessage(level, event, data),
      ...(data || {}),
    };
  }

  private getMessage(level: LogLevel, event: string, data?: Record<string, unknown>): string {
    const base = `[${this.serviceName}] ${event}`;
    if (data && Object.keys(data).length > 0) {
      const dataStr = Object.entries(data)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
        .join(' ');
      return `${base} ${dataStr}`;
    }
    return base;
  }

  private output(entry: LogEntry): void {
    const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}]`;
    const output = `${prefix} ${entry.message}`;

    switch (entry.level) {
      case 'error':
        console.error(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      default:
        console.log(output);
    }

    // Also output structured JSON for log aggregation
    if (process.env['NODE_ENV'] === 'production') {
      console.log(JSON.stringify(entry));
    }
  }

  debug(event: string, data?: Record<string, unknown>): void {
    this.output(this.formatLog('debug', event, data));
  }

  info(event: string, data?: Record<string, unknown>): void {
    this.output(this.formatLog('info', event, data));
  }

  warn(event: string, data?: Record<string, unknown>): void {
    this.output(this.formatLog('warn', event, data));
  }

  error(event: string, data?: Record<string, unknown>): void {
    this.output(this.formatLog('error', event, data));
  }
}

export function createLogger(serviceName: string): Logger {
  return new Logger(serviceName);
}

export type { Logger };
