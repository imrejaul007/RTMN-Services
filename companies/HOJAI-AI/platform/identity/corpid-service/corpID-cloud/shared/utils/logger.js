/**
 * CorpID Cloud - Logger Utility
 * Winston-based logging with structured output
 */

import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';

const { combine, timestamp, errors, json, colorize, simple } = winston.format;

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    json()
  ),
  defaultMeta: {
    service: process.env.SERVICE_NAME || 'corpID-cloud',
    version: process.env.SERVICE_VERSION || '1.0.0'
  },
  transports: [
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'production'
        ? json()
        : combine(colorize(), simple())
    }),
    // SECURITY FIX (CORPID L-2): optional file/Syslog/HTTP transport. Off by
    // default so dev environments don't pollute the working tree. Enable in
    // production by setting LOG_FILE (path), LOG_SYSLOG_HOST, or LOG_HTTP_URL.
    ...(process.env.LOG_FILE ? [new winston.transports.File({
      filename: process.env.LOG_FILE,
      maxsize: parseInt(process.env.LOG_FILE_MAXSIZE || '10485760', 10), // 10 MB
      maxFiles: parseInt(process.env.LOG_FILE_MAXFILES || '5', 10),
      tailable: true
    })] : []),
    ...(process.env.LOG_HTTP_URL ? [new winston.transports.Http({
      host: process.env.LOG_HTTP_HOST,
      port: process.env.LOG_HTTP_PORT ? parseInt(process.env.LOG_HTTP_PORT, 10) : undefined,
      path: process.env.LOG_HTTP_PATH || '/log',
      ssl: process.env.LOG_HTTP_SSL === 'true'
    })] : [])
  ]
});

function auditLog(data) {
  const event = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    ...data
  };
  logger.info('AUDIT_EVENT', event);
  return event;
}

function authAudit(action, req, result, details = {}) {
  return auditLog({
    category: 'authentication',
    action,
    actor: {
      type: req.user?.id ? 'user' : 'anonymous',
      id: req.user?.id || null,
      email: req.user?.email || req.body?.email || null,
      ip: req.ip,
      userAgent: req.headers?.['user-agent'],
      sessionId: req.user?.sessionId || null
    },
    resource: details.resource || null,
    result,
    metadata: details
  });
}

function authzAudit(action, req, result, reason = null) {
  return auditLog({
    category: 'authorization',
    action,
    actor: {
      type: req.user?.id ? 'user' : 'system',
      id: req.user?.id || null,
      role: req.user?.role || null
    },
    resource: {
      type: req.params?.resourceType || null,
      id: req.params?.resourceId || null
    },
    result,
    reason,
    metadata: {
      permissionsChecked: req.requiredPermissions || []
    }
  });
}

function dataAudit(action, req, resourceType, resourceId, changes = {}) {
  return auditLog({
    category: 'data_modification',
    action,
    actor: {
      type: req.user?.id ? 'user' : 'system',
      id: req.user?.id || null,
      email: req.user?.email || null,
      role: req.user?.role || null
    },
    resource: {
      type: resourceType,
      id: resourceId
    },
    result: 'success',
    changes
  });
}

function createRequestLogger(req, res, next) {
  req.requestId = req.headers['x-request-id'] || uuidv4();
  res.setHeader('X-Request-ID', req.requestId);
  next();
}

export { logger, auditLog, authAudit, authzAudit, dataAudit, createRequestLogger };
export default logger;
