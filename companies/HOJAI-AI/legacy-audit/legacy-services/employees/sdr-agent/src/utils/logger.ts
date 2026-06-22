// ============================================
// HOJAI AI - SDR Agent Logger Utility
// ============================================

import winston from 'winston';
import crypto from 'crypto';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Custom format for logs
const logFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;

  // Add metadata if present
  if (Object.keys(metadata).length > 0 && metadata.stack === undefined) {
    msg += ` ${JSON.stringify(metadata)}`;
  }

  // Add stack trace for errors
  if (metadata.stack) {
    msg += `\n${metadata.stack}`;
  }

  return msg;
});

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat
  ),
  transports: [
    // Console transport with colors
    new winston.transports.Console({
      format: combine(
        colorize({ all: true }),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat
      )
    })
  ],
  defaultMeta: {
    service: 'sdr-agent',
    version: '1.0.0'
  }
});

// Add file transports in production
if (process.env.NODE_ENV === 'production') {
  logger.add(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  );

  logger.add(
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  );
}

// Security: Redact sensitive data in logs
const sensitiveFields = [
  'password',
  'token',
  'apiKey',
  'api_key',
  'secret',
  'authorization',
  'cookie',
  'sessionId',
  'ssn',
  'creditCard'
];

export function redactSensitiveData(obj: Record<string, unknown>): Record<string, unknown> {
  const redacted = { ...obj };

  for (const key of Object.keys(redacted)) {
    const lowerKey = key.toLowerCase();

    if (sensitiveFields.some(field => lowerKey.includes(field.toLowerCase()))) {
      redacted[key] = '[REDACTED]';
    } else if (typeof redacted[key] === 'object' && redacted[key] !== null) {
      redacted[key] = redactSensitiveData(redacted[key] as Record<string, unknown>);
    }
  }

  return redacted;
}

// Generate correlation ID for request tracing
export function generateCorrelationId(): string {
  return crypto.randomUUID();
}

// Structured logging helpers
export const logRequest = (
  method: string,
  path: string,
  statusCode: number,
  durationMs: number,
  metadata?: Record<string, unknown>
) => {
  logger.info(`${method} ${path} ${statusCode} ${durationMs}ms`, {
    type: 'http_request',
    method,
    path,
    statusCode,
    durationMs,
    ...metadata
  });
};

export const logError = (
  context: string,
  error: Error | unknown,
  metadata?: Record<string, unknown>
) => {
  const errorInfo = {
    type: 'error',
    context,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    ...metadata
  };

  logger.error(`Error in ${context}`, redactSensitiveData(errorInfo));
};

export const logMetric = (
  metric: string,
  value: number,
  metadata?: Record<string, unknown>
) => {
  logger.info(`Metric: ${metric}`, {
    type: 'metric',
    metric,
    value,
    ...metadata
  });
};

export default logger;
