/**
 * GENIE Business Intelligence Service - Logger Utility
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  data?: Record<string, unknown>;
}

export function createLogger(serviceName: string) {
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

  return {
    debug: (message: string, data?: Record<string, unknown>) => console.debug(formatLogEntry('debug', message, data)),
    info: (message: string, data?: Record<string, unknown>) => console.info(formatLogEntry('info', message, data)),
    warn: (message: string, data?: Record<string, unknown>) => console.warn(formatLogEntry('warn', message, data)),
    error: (message: string, data?: Record<string, unknown>) => console.error(formatLogEntry('error', message, data)),
  };
}
