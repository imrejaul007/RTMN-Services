/**
 * Audit Routes
 * Audit log endpoints
 */

import { Router, Request, Response } from 'express';
import { auditStore, AuditAction, AuditEntityType, AuditSearchParams } from '../models/Audit';
import { AuditLogger } from '../services/auditLogger';
import { logger } from '../index';

const router = Router();
const auditLogger = new AuditLogger(logger);

// Get audit logs
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      startDate,
      endDate,
      action,
      entityType,
      entityId,
      userId,
      actorId,
      status,
      limit,
      offset
    } = req.query;

    const params: AuditSearchParams = {};

    if (startDate) params.startDate = new Date(startDate as string);
    if (endDate) params.endDate = new Date(endDate as string);
    if (action) params.action = action as AuditAction;
    if (entityType) params.entityType = entityType as AuditEntityType;
    if (entityId) params.entityId = entityId as string;
    if (userId) params.userId = userId as string;
    if (actorId) params.actorId = actorId as string;
    if (status) params.status = status as 'success' | 'failure' | 'pending';
    if (limit) params.limit = parseInt(limit as string);
    if (offset) params.offset = parseInt(offset as string);

    const logs = auditStore.search(params);

    res.json({
      logs,
      count: logs.length,
      params
    });
  } catch (error) {
    logger.error('Error fetching audit logs', { error, requestId: req.headers['x-request-id'] });
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// Get audit log by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const log = auditStore.getLogById(id);

    if (!log) {
      return res.status(404).json({ error: 'Audit log not found' });
    }

    res.json({ log });
  } catch (error) {
    logger.error('Error fetching audit log', { error, requestId: req.headers['x-request-id'] });
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
});

// Get audit logs for specific entity
router.get('/entity/:entityId', async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params;
    const logs = auditStore.getLogsByEntity(entityId);

    res.json({
      logs,
      count: logs.length,
      entityId
    });
  } catch (error) {
    logger.error('Error fetching entity audit logs', { error, requestId: req.headers['x-request-id'] });
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// Get audit logs for specific user
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const logs = auditStore.getLogsByUser(userId);

    res.json({
      logs,
      count: logs.length,
      userId
    });
  } catch (error) {
    logger.error('Error fetching user audit logs', { error, requestId: req.headers['x-request-id'] });
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// Get audit logs by action type
router.get('/action/:action', async (req: Request, res: Response) => {
  try {
    const { action } = req.params;

    if (!Object.values(AuditAction).includes(action as AuditAction)) {
      return res.status(400).json({
        error: 'Invalid audit action',
        validActions: Object.values(AuditAction)
      });
    }

    const logs = auditStore.getLogsByAction(action as AuditAction);

    res.json({
      logs,
      count: logs.length,
      action
    });
  } catch (error) {
    logger.error('Error fetching audit logs by action', { error, requestId: req.headers['x-request-id'] });
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// Get audit statistics
router.get('/stats/summary', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const params: { startDate?: Date; endDate?: Date } = {};
    if (startDate) params.startDate = new Date(startDate as string);
    if (endDate) params.endDate = new Date(endDate as string);

    const stats = auditStore.getStatistics(params.startDate, params.endDate);

    res.json({
      stats,
      period: {
        startDate: params.startDate || 'all time',
        endDate: params.endDate || 'all time'
      }
    });
  } catch (error) {
    logger.error('Error fetching audit stats', { error, requestId: req.headers['x-request-id'] });
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Export audit logs for a user (GDPR compliance)
router.get('/export/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const logs = auditStore.exportUserLogs(userId);

    // Log the export
    auditLogger.logAction(
      AuditAction.DATA_ACCESSED,
      AuditEntityType.SYSTEM,
      'EXPORT',
      userId,
      'SYSTEM',
      'service',
      { action: 'export_user_audit_logs', logCount: logs.length },
      'success',
      req.headers['x-request-id'] as string
    );

    res.json({
      userId,
      exportedAt: new Date().toISOString(),
      logCount: logs.length,
      logs: logs.map(log => ({
        id: log.id,
        timestamp: log.timestamp,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        status: log.status
      }))
    });
  } catch (error) {
    logger.error('Error exporting user audit logs', { error, requestId: req.headers['x-request-id'] });
    res.status(500).json({ error: 'Failed to export audit logs' });
  }
});

// Manual audit log creation (for testing)
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      action,
      entityType,
      entityId,
      userId,
      actorId,
      actorType,
      ipAddress,
      userAgent,
      requestId,
      previousState,
      newState,
      metadata,
      status
    } = req.body;

    if (!action || !entityType || !entityId) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['action', 'entityType', 'entityId']
      });
    }

    const log = auditLogger.logAction(
      action,
      entityType,
      entityId,
      userId,
      actorId || 'SYSTEM',
      actorType || 'service',
      metadata,
      status || 'success',
      requestId
    );

    res.status(201).json({
      success: true,
      log
    });
  } catch (error) {
    logger.error('Error creating audit log', { error, requestId: req.headers['x-request-id'] });
    res.status(500).json({ error: 'Failed to create audit log' });
  }
});

// Cleanup expired logs (admin only)
router.post('/cleanup', async (req: Request, res: Response) => {
  try {
    const deletedCount = auditStore.cleanupExpiredLogs();

    // Log cleanup
    auditLogger.logAction(
      AuditAction.SYSTEM_ERROR,
      AuditEntityType.SYSTEM,
      'CLEANUP',
      undefined,
      'SYSTEM',
      'service',
      { action: 'cleanup_expired_logs', deletedCount },
      'success',
      req.headers['x-request-id'] as string
    );

    res.json({
      success: true,
      deletedCount,
      message: `Cleaned up ${deletedCount} expired audit logs`
    });
  } catch (error) {
    logger.error('Error cleaning up audit logs', { error, requestId: req.headers['x-request-id'] });
    res.status(500).json({ error: 'Failed to cleanup audit logs' });
  }
});

// Get all action types
router.get('/metadata/actions', async (req: Request, res: Response) => {
  res.json({
    actions: Object.values(AuditAction),
    entityTypes: Object.values(AuditEntityType)
  });
});

export default router;
