/**
 * Logger
 */
import winston from 'winston';
const { combine, timestamp, printf, colorize, errors } = winston.format;
const logFormat = printf(({ level, message, timestamp, ...meta }) =>
  `${timestamp} [${level}]: ${message}${Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : ''}`
);

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(errors({ stack: true }), timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), logFormat),
  transports: [new winston.transports.Console({
    format: combine(colorize(), timestamp({ format: 'HH:mm:ss' }), logFormat)
  })]
});

export default logger;
