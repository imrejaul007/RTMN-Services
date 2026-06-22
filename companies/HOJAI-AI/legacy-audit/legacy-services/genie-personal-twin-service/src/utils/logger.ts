/**
 * Logger Utility
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export function createLogger(serviceName: string) {
  const format = (level: LogLevel, message: string, data?: Record<string, unknown>) =>
    JSON.stringify({ timestamp: new Date().toISOString(), level, service: serviceName, message, ...(data && { data }) );

  return {
    debug: (m: string, d?: Record<string, unknown>) => console.debug(format('debug', m, d)),
    info: (m: string, d?: Record<string, unknown>) => console.info(format('info', m, d)),
    warn: (m: string, d?: Record<string, unknown>) => console.warn(format('warn', m, d)),
    error: (m: string, d?: Record<string, unknown>) => console.error(format('error', m, d)),
  };
}
