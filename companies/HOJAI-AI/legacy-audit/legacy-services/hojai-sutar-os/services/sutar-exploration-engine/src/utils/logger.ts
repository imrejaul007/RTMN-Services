// ============================================================================
// SUTAR Exploration Engine - Logging Utilities
// ============================================================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  requestId?: string;
  service?: string;
  duration?: number;
  metadata?: Record<string, unknown>;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const CURRENT_LEVEL = (process.env.LOG_LEVEL as LogLevel) || 'info';

export class Logger {
  private service: string;

  constructor(service: string = 'sutar-exploration-engine') {
    this.service = service;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[CURRENT_LEVEL];
  }

  private formatEntry(entry: Omit<LogEntry, 'timestamp' | 'service'>): string {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      service: this.service,
      ...entry,
    });
  }

  debug(message: string, metadata?: Record<string, unknown>, requestId?: string): void {
    if (!this.shouldLog('debug')) return;
    console.log(this.formatEntry({ level: 'debug', message, requestId, metadata }));
  }

  info(message: string, metadata?: Record<string, unknown>, requestId?: string): void {
    if (!this.shouldLog('info')) return;
    console.log(this.formatEntry({ level: 'info', message, requestId, metadata }));
  }

  warn(message: string, metadata?: Record<string, unknown>, requestId?: string): void {
    if (!this.shouldLog('warn')) return;
    console.warn(this.formatEntry({ level: 'warn', message, requestId, metadata }));
  }

  error(message: string, error?: Error, requestId?: string): void {
    if (!this.shouldLog('error')) return;
    console.error(this.formatEntry({
      level: 'error',
      message,
      requestId,
      metadata: error ? { error: error.message, stack: error.stack } : undefined,
    }));
  }

  logRequest(method: string, path: string, status: number, duration: number, requestId?: string, ip?: string): void {
    const level: LogLevel = status >= 400 ? 'error' : 'info';
    if (!this.shouldLog(level)) return;

    console.log(this.formatEntry({
      level,
      message: `${method} ${path} ${status}`,
      requestId,
      duration,
      metadata: { ip, status },
    }));
  }
}

// Singleton instance
export const logger = new Logger();
