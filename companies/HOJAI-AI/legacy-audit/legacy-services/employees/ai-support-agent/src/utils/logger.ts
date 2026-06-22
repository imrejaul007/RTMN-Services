/**
 * HOJAI AI Support Agent - Logger Utility
 * Version: 1.0.0 | Date: May 30, 2026
 * Purpose: Structured logging with context and correlation
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  context?: Record<string, unknown>;
  error?: {
    message: string;
    stack?: string;
    name?: string;
  };
}

interface Logger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>, error?: Error): void;
  fatal(message: string, context?: Record<string, unknown>, error?: Error): void;
}

function formatLogEntry(entry: LogEntry): string {
  const contextStr = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
  const errorStr = entry.error ? ` [ERROR: ${entry.error.message}]` : '';
  return `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.service}] ${entry.message}${contextStr}${errorStr}`;
}

function createLogger(serviceName: string, minLevel: LogLevel = 'info'): Logger {
  const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'fatal'];
  const minLevelIndex = levels.indexOf(minLevel);

  function shouldLog(level: LogLevel): boolean {
    return levels.indexOf(level) >= minLevelIndex;
  }

  function log(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error): void {
    if (!shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: serviceName,
      message,
      context,
    };

    if (error) {
      entry.error = {
        message: error.message,
        stack: error.stack,
        name: error.name,
      };
    }

    const formatted = formatLogEntry(entry);

    switch (level) {
      case 'debug':
        console.debug(formatted);
        break;
      case 'info':
        console.info(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      case 'error':
      case 'fatal':
        console.error(formatted);
        break;
    }

    // In production, you would send to your logging service
    // Example: sendToLogService(entry);
  }

  return {
    debug: (message: string, context?: Record<string, unknown>) => log('debug', message, context),
    info: (message: string, context?: Record<string, unknown>) => log('info', message, context),
    warn: (message: string, context?: Record<string, unknown>) => log('warn', message, context),
    error: (message: string, context?: Record<string, unknown>, error?: Error) => log('error', message, context, error),
    fatal: (message: string, context?: Record<string, unknown>, error?: Error) => log('fatal', message, context, error),
  };
}

export { createLogger };
export type { Logger, LogLevel, LogEntry };
