import { Request, Response, NextFunction } from 'express';
import { LogLevel, LogEntry } from '../types/index.js';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

export function log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
  if (!shouldLog(level)) return;

  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    context,
  };

  const logMessage = context
    ? `[${entry.timestamp}] [${level.toUpperCase()}] ${message} ${JSON.stringify(context)}`
    : `[${entry.timestamp}] [${level.toUpperCase()}] ${message}`;

  switch (level) {
    case 'error':
      console.error(logMessage);
      break;
    case 'warn':
      console.warn(logMessage);
      break;
    default:
      console.log(logMessage);
  }
}

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Attach request ID to request object
  (req as Request & { requestId: string }).requestId = requestId;

  // Log request
  log('info', `${req.method} ${req.path} started`, {
    requestId,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });

  // Capture response
  const originalSend = res.send;
  res.send = function (body) {
    const duration = Date.now() - startTime;
    const logLevel: LogLevel = res.statusCode >= 400 ? 'error' : 'info';

    log(logLevel, `${req.method} ${req.path} completed`, {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    });

    return originalSend.call(this, body);
  };

  next();
}

export function errorLogger(
  err: Error & { statusCode?: number; code?: string },
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId = (req as Request & { requestId?: string }).requestId || 'unknown';

  log('error', `Request error: ${err.message}`, {
    requestId,
    method: req.method,
    path: req.path,
    stack: err.stack,
    code: err.code,
    statusCode: err.statusCode || 500,
  });

  next(err);
}
