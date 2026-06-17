/**
 * Audit Logger Service
 * Handles audit trail logging
 */

import { AuditAction, AuditEntityType, AuditLog } from '../models/Audit';
import { auditStore } from '../models/Audit';
import winston from 'winston';

export interface LogParams {
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  userId?: string;
  actorId: string;
  actorType: 'user' | 'system' | 'service';
  metadata?: Record<string, unknown>;
  status: 'success' | 'failure' | 'pending';
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
  errorMessage?: string;
}

export class AuditLogger {
  private logger: winston.Logger;

  constructor(logger?: winston.Logger) {
    this.logger = logger || winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console()
      ]
    });
  }

  /**
   * Log an audit action
   */
  logAction(
    action: AuditAction,
    entityType: AuditEntityType,
    entityId: string,
    userId: string | undefined,
    actorId: string,
    actorType: 'user' | 'system' | 'service',
    metadata?: Record<string, unknown>,
    status: 'success' | 'failure' | 'pending' = 'success',
    requestId?: string
  ): AuditLog {
    // Create audit log entry
    const log = auditStore.createLog({
      action,
      entityType,
      entityId,
      userId,
      actorId,
      actorType,
      requestId,
      metadata,
      status,
      errorMessage: status === 'failure' ? metadata?.error as string : undefined
    });

    // Log to Winston
    this.logger.info('Audit event', {
      auditId: log.id,
      action,
      entityType,
      entityId,
      userId,
      actorId,
      status
    });

    return log;
  }

  /**
   * Log data access
   */
  logDataAccess(
    entityId: string,
    entityType: AuditEntityType,
    userId: string,
    accessedBy: string,
    accessType: 'read' | 'write' | 'delete',
    requestId?: string
  ): AuditLog {
    return this.logAction(
      AuditAction.DATA_ACCESSED,
      entityType,
      entityId,
      userId,
      accessedBy,
      'user',
      { accessType },
      'success',
      requestId
    );
  }

  /**
   * Log error event
   */
  logError(
    actorId: string,
    context: string,
    error: unknown,
    requestId?: string
  ): AuditLog {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    return auditStore.createLog({
      action: AuditAction.SYSTEM_ERROR,
      entityType: AuditEntityType.SYSTEM,
      entityId: 'SYSTEM',
      actorId,
      actorType: 'system',
      requestId,
      metadata: { context, stack: errorStack },
      status: 'failure',
      errorMessage
    });
  }

  /**
   * Log compliance violation
   */
  logViolation(
    violationId: string,
    ruleId: string,
    entityId: string,
    entityType: AuditEntityType,
    severity: string,
    description: string,
    detectedBy: string = 'SYSTEM'
  ): AuditLog {
    return this.logAction(
      AuditAction.VIOLATION_DETECTED,
      entityType,
      entityId,
      undefined,
      detectedBy,
      'system',
      {
        violationId,
        ruleId,
        severity,
        description
      },
      'failure'
    );
  }

  /**
   * Log access granted/denied
   */
  logAccess(
    userId: string,
    resource: string,
    action: string,
    granted: boolean,
    actorId: string = 'SYSTEM',
    reason?: string
  ): AuditLog {
    return this.logAction(
      granted ? AuditAction.ACCESS_GRANTED : AuditAction.ACCESS_DENIED,
      AuditEntityType.USER,
      userId,
      userId,
      actorId,
      'system',
      { resource, action, reason },
      granted ? 'success' : 'failure'
    );
  }

  /**
   * Log configuration change
   */
  logConfigChange(
    configKey: string,
    oldValue: unknown,
    newValue: unknown,
    changedBy: string
  ): AuditLog {
    return this.logAction(
      AuditAction.CONFIG_CHANGED,
      AuditEntityType.SYSTEM,
      'CONFIG',
      undefined,
      changedBy,
      'user',
      {
        configKey,
        oldValue,
        newValue
      },
      'success'
    );
  }

  /**
   * Get audit trail for a specific entity
   */
  getEntityAuditTrail(entityId: string): AuditLog[] {
    return auditStore.getLogsByEntity(entityId);
  }

  /**
   * Get audit trail for a specific user
   */
  getUserAuditTrail(userId: string): AuditLog[] {
    return auditStore.getLogsByUser(userId);
  }

  /**
   * Search audit logs
   */
  search(params: {
    startDate?: Date;
    endDate?: Date;
    action?: AuditAction;
    entityType?: AuditEntityType;
    entityId?: string;
    userId?: string;
    actorId?: string;
    status?: 'success' | 'failure' | 'pending';
    limit?: number;
    offset?: number;
  }): AuditLog[] {
    return auditStore.search(params);
  }

  /**
   * Export user data for GDPR compliance
   */
  exportUserData(userId: string): AuditLog[] {
    return auditStore.exportUserLogs(userId);
  }
}

export const auditLogger = new AuditLogger();
