/**
 * Simple logger for Feedback Service
 */

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const SERVICE_NAME = 'rez-feedback-service';

function formatMessage(level: string, message: string, meta?: any): string {
  const timestamp = new Date().toISOString();
  let log = `${timestamp} [${level}] ${message}`;
  if (meta) {
    if (typeof meta === 'object') {
      log += ' ' + JSON.stringify(meta);
    } else {
      log += ' ' + meta;
    }
  }
  return log;
}

export const logger = {
  info: (message: string, meta?: any) => {
    if (LOG_LEVEL === 'debug' || LOG_LEVEL === 'info') {
      console.log(formatMessage('INFO', message, meta));
    }
  },
  warn: (message: string, meta?: any) => {
    console.warn(formatMessage('WARN', message, meta));
  },
  error: (message: string, meta?: any) => {
    console.error(formatMessage('ERROR', message, meta));
  },
  debug: (message: string, meta?: any) => {
    if (LOG_LEVEL === 'debug') {
      console.log(formatMessage('DEBUG', message, meta));
    }
  },
};
