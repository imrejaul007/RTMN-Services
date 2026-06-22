/**
 * GENIE Relationship Service - Logger Utility
 * Version: 1.0.0 | Date: May 30, 2026
 * Purpose: Structured JSON logging
 */

export interface LogLevel {
  info: (event: string, data?: Record<string, unknown>) => void;
  warn: (event: string, data?: Record<string, unknown>) => void;
  error: (event: string, data?: Record<string, unknown>) => void;
  debug: (event: string, data?: Record<string, unknown>) => void;
}

/**
 * Create a structured logger for a service
 */
export function createLogger(service: string): LogLevel {
  return {
    info: (event: string, data?: Record<string, unknown>) => {
      console.log(
        JSON.stringify({
          level: 'info',
          service,
          event,
          timestamp: new Date().toISOString(),
          ...data,
        })
      );
    },

    warn: (event: string, data?: Record<string, unknown>) => {
      console.warn(
        JSON.stringify({
          level: 'warn',
          service,
          event,
          timestamp: new Date().toISOString(),
          ...data,
        })
      );
    },

    error: (event: string, data?: Record<string, unknown>) => {
      console.error(
        JSON.stringify({
          level: 'error',
          service,
          event,
          timestamp: new Date().toISOString(),
          ...data,
        })
      );
    },

    debug: (event: string, data?: Record<string, unknown>) => {
      if (process.env.NODE_ENV === 'development') {
        console.log(
          JSON.stringify({
            level: 'debug',
            service,
            event,
            timestamp: new Date().toISOString(),
            ...data,
          })
        );
      }
    },
  };
}

export default createLogger;
