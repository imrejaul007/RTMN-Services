import winston from 'winston';
import path from 'path';

// Log levels configuration
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

// Color configuration for console
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue'
};

winston.addColors(colors);

// Custom format for production
const productionFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Custom format for development
const developmentFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;

    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }

    return msg;
  })
);

// Determine environment
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

// Create transports array
const transports: winston.transport[] = [
  // Console transport
  new winston.transports.Console({
    level: isProduction ? 'info' : isDevelopment ? 'debug' : 'info',
    format: isProduction ? productionFormat : developmentFormat
  })
];

// Add file transports in production
if (isProduction) {
  // Error log
  transports.push(
    new winston.transports.File({
      filename: path.join(process.env.LOG_DIR || '/var/log/incident-service', 'error.log'),
      level: 'error',
      format: productionFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5
    })
  );

  // Combined log
  transports.push(
    new winston.transports.File({
      filename: path.join(process.env.LOG_DIR || '/var/log/incident-service', 'combined.log'),
      format: productionFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10
    })
  );
}

// Create the logger instance
export const logger = winston.createLogger({
  level: isProduction ? 'info' : isDevelopment ? 'debug' : 'info',
  levels: logLevels,
  defaultMeta: {
    service: 'incident-management-service',
    version: process.env.npm_package_version || '1.0.0'
  },
  transports
});

// Audit logger for compliance tracking
export const auditLogger = winston.createLogger({
  level: 'info',
  levels: logLevels,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'incident-management-service',
    type: 'audit'
  },
  transports: [
    // Always log to file for audit trail
    new winston.transports.File({
      filename: path.join(process.env.LOG_DIR || '/var/log/incident-service', 'audit.log'),
      format: productionFormat,
      maxsize: 50 * 1024 * 1024, // 50MB
      maxFiles: 30
    })
  ]
});

// ==================== HELPER METHODS ====================

/**
 * Log incident-related events
 */
export const logIncidentEvent = (
  event: 'created' | 'updated' | 'resolved' | 'escalated' | 'closed',
  incidentId: string,
  details?: Record<string, unknown>
): void => {
  const eventMessages = {
    created: 'Incident created',
    updated: 'Incident updated',
    resolved: 'Incident resolved',
    escalated: 'Incident escalated',
    closed: 'Incident closed'
  };

  logger.info(`${eventMessages[event]}: ${incidentId}`, {
    event,
    incidentId,
    ...details
  });

  auditLogger.info(`Incident ${event}`, {
    event,
    incidentId,
    ...details,
    timestamp: new Date().toISOString()
  });
};

/**
 * Log safeguarding-related events
 */
export const logSafeguardingEvent = (
  event: 'concern_raised' | 'risk_assessed' | 'authorities_notified' | 'plan_created' | 'resolved',
  concernId: string,
  details?: Record<string, unknown>
): void => {
  const eventMessages = {
    concern_raised: 'Safeguarding concern raised',
    risk_assessed: 'Risk assessed for concern',
    authorities_notified: 'Authorities notified',
    plan_created: 'Protection plan created',
    resolved: 'Safeguarding concern resolved'
  };

  logger.info(`${eventMessages[event]}: ${concernId}`, {
    event,
    concernId,
    ...details
  });

  auditLogger.info(`Safeguarding ${event}`, {
    event,
    concernId,
    ...details,
    timestamp: new Date().toISOString()
  });
};

/**
 * Log compliance-related events
 */
export const logComplianceEvent = (
  event: 'regulatory_report' | 'investigation_started' | 'investigation_completed' | 'documentation_added',
  referenceId: string,
  details?: Record<string, unknown>
): void => {
  const eventMessages = {
    regulatory_report: 'Regulatory report submitted',
    investigation_started: 'Investigation started',
    investigation_completed: 'Investigation completed',
    documentation_added: 'Documentation added'
  };

  logger.info(`${eventMessages[event]}: ${referenceId}`, {
    event,
    referenceId,
    ...details
  });

  auditLogger.info(`Compliance ${event}`, {
    event,
    referenceId,
    ...details,
    timestamp: new Date().toISOString()
  });
};

/**
 * Log security-related events
 */
export const logSecurityEvent = (
  event: 'auth_failure' | 'unauthorized_access' | 'data_breach' | 'rate_limit_exceeded',
  details: Record<string, unknown>
): void => {
  const eventMessages = {
    auth_failure: 'Authentication failure',
    unauthorized_access: 'Unauthorized access attempt',
    data_breach: 'Potential data breach detected',
    rate_limit_exceeded: 'Rate limit exceeded'
  };

  logger.warn(`${eventMessages[event]}`, {
    event,
    ...details
  });

  auditLogger.warn(`Security ${event}`, {
    event,
    ...details,
    timestamp: new Date().toISOString()
  });
};

/**
 * Log performance metrics
 */
export const logPerformanceMetric = (
  operation: string,
  durationMs: number,
  metadata?: Record<string, unknown>
): void => {
  const logData = {
    operation,
    durationMs,
    ...metadata
  };

  if (durationMs > 5000) {
    // Log slow operations at warn level
    logger.warn(`Slow operation detected: ${operation}`, logData);
  } else {
    logger.debug(`Operation completed: ${operation}`, logData);
  }
};

// Export default logger
export default logger;
