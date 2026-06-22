/**
 * Logging and Error Handling Middleware
 */
import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()]
});

/**
 * Request logging middleware
 */
export function loggingMiddleware(req, res, next) {
  const startTime = Date.now();
  const requestId = req.headers['x-request-id'] || uuidv4();
  
  // Attach request ID to request
  req.requestId = requestId;
  
  // Log request start
  logger.info({
    type: 'request_start',
    requestId,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });
  
  // Capture response
  const originalSend = res.send;
  res.send = function(body) {
    const duration = Date.now() - startTime;
    
    logger.info({
      type: 'request_complete',
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      userId: req.user?.sub
    });
    
    return originalSend.call(this, body);
  };
  
  next();
}

/**
 * Global error handler
 */
export function errorHandler(err, req, res, next) {
  const requestId = req.requestId || uuidv4();
  
  logger.error({
    type: 'error',
    requestId,
    error: err.message,
    stack: err.stack,
    method: req.method,
    path: req.path,
    userId: req.user?.sub
  });
  
  // Don't expose internal errors in production
  const isDev = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    requestId,
    ...(isDev && { stack: err.stack })
  });
}

/**
 * Not found handler
 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
    method: req.method
  });
}

export { logger };
export default { loggingMiddleware, errorHandler, notFoundHandler, logger };
