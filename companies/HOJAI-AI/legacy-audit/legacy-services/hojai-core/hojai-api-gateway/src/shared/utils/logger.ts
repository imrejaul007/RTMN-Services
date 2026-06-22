/**
 * Logger Utility
 * Structured JSON logging for HOJAI services
 */

interface LogData {
  [key: string]: unknown;
}

interface Logger {
  info: (event: string, data?: LogData) => void;
  error: (event: string, data?: LogData) => void;
  warn: (event: string, data?: LogData) => void;
  debug: (event: string, data?: LogData) => void;
}

export function createLogger(service: string): Logger {
  const formatLog = (level: string, event: string, data?: LogData) => {
    const log = {
      level,
      service,
      event,
      timestamp: new Date().toISOString(),
      ...data
    };
    return JSON.stringify(log);
  };

  return {
    info: (event: string, data?: LogData) => {
      console.log(formatLog('info', event, data));
    },
    error: (event: string, data?: LogData) => {
      console.error(formatLog('error', event, data));
    },
    warn: (event: string, data?: LogData) => {
      console.warn(formatLog('warn', event, data));
    },
    debug: (event: string, data?: LogData) => {
      if (process.env.NODE_ENV === 'development') {
        console.log(formatLog('debug', event, data));
      }
    }
  };
}

export default { createLogger };
