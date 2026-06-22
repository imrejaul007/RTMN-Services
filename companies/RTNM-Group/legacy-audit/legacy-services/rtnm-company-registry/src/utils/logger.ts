import winston from 'winston';
import { config } from '../config';

const { combine, timestamp, printf, colorize, json, errors } = winston.format;

// Custom log format
const logFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
  let log = `${timestamp} [${level}]: ${message}`;

  if (Object.keys(metadata).length > 0) {
    log += ` ${JSON.stringify(metadata)}`;
  }

  if (stack) {
    log += `\n${stack}`;
  }

  return log;
});

// Development format
const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  logFormat
);

// Production format
const prodFormat = combine(
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  json()
);

// Select format based on environment
const selectedFormat = config.nodeEnv === 'production' ? prodFormat : devFormat;

// Create logger instance
const logger = winston.createLogger({
  level: config.logging.level,
  format: selectedFormat,
  defaultMeta: { service: 'rtnm-company-registry' },
  transports: [
    // Console transport
    new winston.transports.Console(),
  ],
  exitOnError: false,
});

// Create stream for Morgan HTTP logging (if needed)
logger.stream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

export default logger;