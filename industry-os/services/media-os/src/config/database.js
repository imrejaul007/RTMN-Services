/**
 * Media OS - Winston Logger Configuration
 * Structured logging with file rotation
 */

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const config = require('./index');

// Custom format for structured logging
const structuredFormat = winston.format.printf(({ level, message, timestamp, ...metadata }) => {
  let log = {
    timestamp,
    level,
    service: 'media-os',
    message,
    ...metadata
  };
  return JSON.stringify(log);
});

// Console format with colors
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

// File format (JSON for machine parsing)
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  structuredFormat
);

// Create transports array
const transports = [
  // Console transport
  new winston.transports.Console({
    level: config.LOG_LEVEL,
    format: config.NODE_ENV === 'production' ? fileFormat : consoleFormat,
  }),
];

// Add file transports in production or if LOG_DIR is set
if (config.NODE_ENV === 'production' || process.env.LOG_TO_FILE) {
  // Error log - only errors
  transports.push(
    new DailyRotateFile({
      filename: path.join(config.LOG_DIR, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      format: fileFormat,
      maxSize: '20m',
      maxFiles: '30d',
      compress: true,
    })
  );

  // Combined log
  transports.push(
    new DailyRotateFile({
      filename: path.join(config.LOG_DIR, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      format: fileFormat,
      maxSize: '50m',
      maxFiles: '14d',
      compress: true,
    })
  );

  // Access log - HTTP requests
  transports.push(
    new DailyRotateFile({
      filename: path.join(config.LOG_DIR, 'access-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      format: fileFormat,
      maxSize: '100m',
      maxFiles: '7d',
      compress: true,
    })
  );
}

// Create logger instance
const logger = winston.createLogger({
  level: config.LOG_LEVEL,
  defaultMeta: { service: 'media-os' },
  transports,
  exitOnError: false,
});

// Create child logger for specific components
logger.child = (metadata) => {
  return winston.createLogger({
    level: config.LOG_LEVEL,
    defaultMeta: { service: 'media-os', ...metadata },
    transports: logger.transports,
    exitOnError: false,
  });
};

// Stream for Morgan HTTP logger
logger.stream = {
  write: (message) => {
    logger.info(message.trim(), { type: 'http' });
  },
};

module.exports = logger;
