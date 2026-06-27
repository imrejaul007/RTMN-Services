/**
 * HOJAI SiteOS - Widget Intelligence Logger
 * Structured logging with Pino
 */

import pino from 'pino';

const logLevel = process.env.LOG_LEVEL || 'info';
const prettyPrint = process.env.NODE_ENV !== 'production';

export const logger = pino({
  level: logLevel,
  transport: prettyPrint
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  base: {
    service: 'widget-intelligence',
    version: '1.0.0',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export default logger;