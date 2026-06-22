/**
 * GENIE Sync Service - Logger Utility
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export function createLogger(serviceName: string) {
  const format = (level: LogLevel, message: string, data?: Record<string, unknown>) => {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      service: serviceName,
      message,
      ...(data && { data }),
    });
  };

  return {
    debug: (message: string, data?: Record<string, unknown>) => console.debug(format('debug', message, data)),
    info: (message: string, data?: Record<string, unknown>) => console.info(format('info', message, data)),
    warn: (message: string, data?: Record<string, unknown>) => console.warn(format('warn', message, data)),
    error: (message: string, data?: Record<string, unknown>) => console.error(format('error', message, data)),
  };
}
