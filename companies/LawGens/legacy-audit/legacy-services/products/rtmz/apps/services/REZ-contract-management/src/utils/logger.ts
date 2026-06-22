import winston from 'winston';

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

const logFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;

  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }

  return msg;
});

const jsonFormat = printf(({ level, message, timestamp, ...metadata }) => {
  return JSON.stringify({
    timestamp,
    level,
    message,
    ...metadata
  });
});

const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = winston.createLogger({
  level: isProduction ? 'info' : isDevelopment ? 'debug' : 'warn',
  format: isProduction
    ? combine(
        errors({ stack: true }),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        jsonFormat
      )
    : combine(
        errors({ stack: true }),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        colorize({ all: true }),
        logFormat
      ),
  defaultMeta: { service: 'rez-contract-management' },
  transports: [
    new winston.transports.Console({
      handleExceptions: true,
      handleRejections: true
    })
  ],
  exitOnError: false
});

if (process.env.LOG_FILE_PATH) {
  logger.add(new winston.transports.File({
    filename: process.env.LOG_FILE_PATH,
    level: 'info',
    format: combine(
      errors({ stack: true }),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      jsonFormat
    ),
    maxsize: 10 * 1024 * 1024,
    maxFiles: 5
  }));

  logger.add(new winston.transports.File({
    filename: `${process.env.LOG_FILE_PATH}.error`,
    level: 'error',
    format: combine(
      errors({ stack: true }),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      jsonFormat
    ),
    maxsize: 10 * 1024 * 1024,
    maxFiles: 5
  }));
}

process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
});

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', { error: error.message, stack: error.stack });
  process.exit(1);
});

export default logger;
