/**
 * Winston logger utility for AdBazaar Services
 */

import winston from 'winston';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, ...context }) => {
    let log = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    if (Object.keys(context).length > 0) {
      log += ` ${JSON.stringify(context)}`;
    }
    return log;
  })
);

const logger = winston.createLogger({
  level: (process.env.LOG_LEVEL as LogLevel) || 'info',
  format: logFormat,
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

// HTTP request logging helper
logger.httpRequest = (method: string, path: string, statusCode: number, durationMs: number) => {
  const level: LogLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
  const logLevel = logger.level as LogLevel;
  if (getLevelPriority(level) >= getLevelPriority(logLevel)) {
    logger.log(level, `${method} ${path} ${statusCode} ${durationMs}ms`);
  }
};

function getLevelPriority(level: LogLevel): number {
  const priorities: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };
  return priorities[level];
}

export default logger;
export { LogLevel };