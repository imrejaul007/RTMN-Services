/**
 * Logger
 */
import winston from 'winston';
const { combine, timestamp, printf, colorize } = winston.format;
const logFormat = printf(({ level, message, timestamp }) => `${timestamp} [${level}]: ${message}`);

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(timestamp({ format: 'HH:mm:ss' }), logFormat),
  transports: [new winston.transports.Console({ format: combine(colorize(), logFormat) })]
});
export default logger;
