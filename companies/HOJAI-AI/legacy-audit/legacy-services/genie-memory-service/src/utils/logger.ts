/**
 * GENIE Memory Service - Logger Utility
 * Version: 1.0.0 | Date: May 31, 2026
 * Purpose: Structured logging for the memory service
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  data?: Record<string, unknown>;
}

interface Logger {
  debug(message: string, data?: Record<string, unknown>): void;
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
}

/**
 * Create a logger instance for a specific service
 */
export function createLogger(serviceName: string): Logger {
  const formatLogEntry = (level: LogLevel, message: string, data?: Record<string, unknown>): string => {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: serviceName,
      message,
      ...(data && { data }),
    };
    return JSON.stringify(entry);
  };

  const log = (level: LogLevel, message: string, data?: Record<string, unknown>): void => {
    const formatted = formatLogEntry(level, message, data);

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
        console.error(formatted);
        break;
    }
  };

  return {
    debug: (message: string, data?: Record<string, unknown>) => log('debug', message, data),
    info: (message: string, data?: Record<string, unknown>) => log('info', message, data),
    warn: (message: string, data?: Record<string, unknown>) => log('warn', message, data),
    error: (message: string, data?: Record<string, unknown>) => log('error', message, data),
  };
}

export default createLogger;
