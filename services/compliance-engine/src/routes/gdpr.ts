/**
 * GDPR Routes
 * General Data Protection Regulation endpoints
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { auditStore, AuditAction, AuditEntityType } from '../models/Audit';
import { AuditLogger } from '../services/auditLogger';
import { logger } from '../index';

const router = Router();
const auditLogger = new AuditLogger(logger);

// Types for GDPR requests
interface GDPRRequest {
  id: string;
  userId: string;
  type: 'access' | 'erasure' | 'rectification' | 'portability' | 'restriction' | 'objection';
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  requestedAt: Date;
  completedAt?: Date;
  processedBy?: string;
  rejectionReason?: string;
  dataToDelete?: string[];
  dataToRectify?: Record<string, unknown>;
  exportedData?: Record<string, unknown>;
  notes?: string;
}

// In-memory GDPR request store
const gdprRequests: Map<string, GDPRRequest> = new Map();

// Submit GDPR request
router.post('/request', async (req: Request, res: Response) => {
  try {
    const { userId, type, dataToDelete, dataToRectify, notes } = req.body;

    if (!userId || !type) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['userId', 'type']
      });
    }

    const validTypes = ['access', 'erasure', 'rectification', 'portability', 'restriction', 'objection'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        error: 'Invalid request type',
        validTypes
      });
    }

    const id = `GDPR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const request: GDPRRequest = {
      id,
      userId,
      type,
      status: 'pending',
      requestedAt: new Date(),
      dataToDelete,
      dataToRectify,
      notes
    };

    gdprRequests.set(id, request);

    // Log the request
    auditLogger.logAction(
      AuditAction.GDPR_REQUEST_RECEIVED,
      AuditEntityType.COMPLIANCE_REQUEST,
      id,
      userId,
      'SYSTEM',
      'service',
      { requestType: type },
      'success',
      req.headers['x-request-id'] as string
    );

    res.status(201).json({
      success: true,
      request: {
        id,
        userId,
        type,
        status: 'pending',
        requestedAt: request.requestedAt
      }
    });
  } catch (error) {
    logger.error('Error creating GDPR request', { error, requestId: req.headers['x-request-id'] });
    res.status(500).json({ error: 'Failed to create GDPR request' });
  }
});

// Get GDPR request by ID
router.get('/request/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const request = gdprRequests.get(id);

    if (!request) {
      return res.status(404).json({ error: 'GDPR request not found' });
    }

    res.json({ request });
  } catch (error) {
    logger.error('Error fetching GDPR request', { error, requestId: req.headers['x-request-id'] });
    res.status(500).json({ error: 'Failed to fetch GDPR request' });
  }
});

// Get GDPR requests by user
router.get('/requests/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const userRequests = Array.from(gdprRequests.values())
      .filter(r => r.userId === userId)
      .sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());

    res.json({ requests: userRequests });
  } catch (error) {
    logger.error('Error fetching user GDPR requests', { error, requestId: req.headers['x-request-id'] });
    res.status(500).json({ error: 'Failed to fetch GDPR requests' });
  }
});

// Get all pending GDPR requests
router.get('/requests/pending', async (req: Request, res: Response) => {
  try {
    const pendingRequests = Array.from(gdprRequests.values())
      .filter(r => r.status === 'pending' || r.status === 'in_progress')
      .sort((a, b) => a.requestedAt.getTime() - b.requestedAt.getTime());

    res.json({ requests: pendingRequests });
  } catch (error) {
    logger.error('Error fetching pending GDPR requests', { error, requestId: req.headers['x-request-id'] });
    res.status(500).json({ error: 'Failed to fetch pending requests' });
  }
});

// Export user data (Data Portability)
router.post('/request/:id/export', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const request = gdprRequests.get(id);

    if (!request) {
      return res.status(404).json({ error: 'GDPR request not found' });
    }

    if (request.type !== 'access' && request.type !== 'portability') {
      return res.status(400).json({
        error: 'Export is only available for access or portability requests'
      });
    }

    // Get all audit logs for the user
    const userAuditLogs = auditStore.exportUserLogs(request.userId);

    // Collect data from various sources (simulated)
    const exportedData: Record<string, unknown> = {
      userId: request.userId,
      exportDate: new Date().toISOString(),
      gdprRequestId: id,
      auditTrail: userAuditLogs.map(log => ({
        action: log.action,
        timestamp: log.timestamp,
        entityType: log.entityType,
        entityId: log.entityId,
        status: log.status
      })),
      personalData: {
        // This would be fetched from actual user data stores
        // Using placeholder for demonstration
        exportNote: 'Personal data would be exported from all connected services'
      }
    };

    request.exportedData = exportedData;
    request.status = 'completed';
    request.completedAt = new Date();
    gdprRequests.set(id, request);

    // Log the export
    auditLogger.logAction(
      AuditAction.GDPR_DATA_EXPORTED,
      AuditEntityType.COMPLIANCE_REQUEST,
      id,
      request.userId,
      'SYSTEM',
      'service',
      { exportFormat: 'json' },
      'success',
      req.headers['x-request-id'] as string
    );

    res.json({
      success: true,
      request,
      exportedData
    });
  } catch (error) {
    logger.error('Error exporting user data', { error, requestId: req.headers['x-request-id'] });
    res.status(500).json({ error: 'Failed to export user data' });
  }
});

// Delete user data (Right to Erasure)
router.post('/request/:id/delete', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { processedBy, notes } = req.body;
    const request = gdprRequests.get(id);

    if (!request) {
      return res.status(404).json({ error: 'GDPR request not found' });
    }

    if (request.type !== 'erasure') {
      return res.status(400).json({
        error: 'Delete operation is only available for erasure requests'
      });
    }

    // Mark as in progress
    request.status = 'in_progress';
    request.processedBy = processedBy;
    request.notes = notes;
    gdprRequests.set(id, request);

    // Note: Actual deletion would be handled by calling the customerOpsBridge
    // to coordinate deletion across all connected services

    // Log the deletion initiation
    auditLogger.logAction(
      AuditAction.GDPR_DATA_DELETED,
      AuditEntityType.COMPLIANCE_REQUEST,
      id,
      request.userId,
      processedBy || 'SYSTEM',
      'service',
      { dataToDelete: request.dataToDelete },
      'pending',
      req.headers['x-request-id'] as string
    );

    res.json({
      success: true,
      request,
      message: 'Data deletion initiated. You will be notified when complete.'
    });
  } catch (error) {
    logger.error('Error initiating data deletion', { error, requestId: req.headers['x-request-id'] });
    res.status(500).json({ error: 'Failed to initiate data deletion' });
  }
});

// Complete GDPR request
router.post('/request/:id/complete', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { processedBy, notes } = req.body;
    const request = gdprRequests.get(id);

    if (!request) {
      return res.status(404).json({ error: 'GDPR request not found' });
    }

    if (request.status === 'completed') {
      return res.status(400).json({ error: 'Request already completed' });
    }

    request.status = 'completed';
    request.completedAt = new Date();
    request.processedBy = processedBy;
    if (notes) request.notes = notes;
    gdprRequests.set(id, request);

    // Log completion
    auditLogger.logAction(
      AuditAction.GDPR_REQUEST_RECEIVED,
      AuditEntityType.COMPLIANCE_REQUEST,
      id,
      request.userId,
      processedBy || 'SYSTEM',
      'service',
      { previousStatus: 'in_progress', newStatus: 'completed' },
      'success',
      req.headers['x-request-id'] as string
    );

    res.json({
      success: true,
      request
    });
  } catch (error) {
    logger.error('Error completing GDPR request', { error, requestId: req.headers['x-request-id'] });
    res.status(500).json({ error: 'Failed to complete GDPR request' });
  }
});

// Reject GDPR request
router.post('/request/:id/reject', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { processedBy, reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    const request = gdprRequests.get(id);
    if (!request) {
      return res.status(404).json({ error: 'GDPR request not found' });
    }

    request.status = 'rejected';
    request.completedAt = new Date();
    request.processedBy = processedBy;
    request.rejectionReason = reason;
    gdprRequests.set(id, request);

    // Log rejection
    auditLogger.logAction(
      AuditAction.GDPR_REQUEST_RECEIVED,
      AuditEntityType.COMPLIANCE_REQUEST,
      id,
      request.userId,
      processedBy || 'SYSTEM',
      'service',
      { previousStatus: request.status, rejectionReason: reason },
      'failure',
      req.headers['x-request-id'] as string
    );

    res.json({
      success: true,
      request
    });
  } catch (error) {
    logger.error('Error rejecting GDPR request', { error, requestId: req.headers['x-request-id'] });
    res.status(500).json({ error: 'Failed to reject GDPR request' });
  }
});

// Update consent
router.post('/consent', async (req: Request, res: Response) => {
  try {
    const { userId, consentType, granted, source } = req.body;

    if (!userId || !consentType || granted === undefined) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['userId', 'consentType', 'granted']
      });
    }

    const action = granted ? AuditAction.GDPR_CONSENT_GRANTED : AuditAction.GDPR_CONSENT_WITHDRAWN;

    auditLogger.logAction(
      action,
      AuditEntityType.USER,
      userId,
      userId,
      'SYSTEM',
      'service',
      { consentType, granted, source },
      'success',
      req.headers['x-request-id'] as string
    );

    res.json({
      success: true,
      message: granted ? 'Consent granted' : 'Consent withdrawn',
      userId,
      consentType,
      granted
    });
  } catch (error) {
    logger.error('Error updating consent', { error, requestId: req.headers['x-request-id'] });
    res.status(500).json({ error: 'Failed to update consent' });
  }
});

// Get GDPR statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const allRequests = Array.from(gdprRequests.values());
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const stats = {
      total: allRequests.length,
      byStatus: {} as Record<string, number>,
      byType: {} as Record<string, number>,
      pending: allRequests.filter(r => r.status === 'pending' || r.status === 'in_progress').length,
      completedInLast30Days: allRequests.filter(r =>
        r.completedAt && r.completedAt >= thirtyDaysAgo
      ).length,
      averageCompletionTime: 0
    };

    const completedWithTimes = allRequests.filter(r => r.completedAt);
    if (completedWithTimes.length > 0) {
      const totalTime = completedWithTimes.reduce((sum, r) => {
        return sum + (r.completedAt!.getTime() - r.requestedAt.getTime());
      }, 0);
      stats.averageCompletionTime = Math.round(totalTime / completedWithTimes.length / (1000 * 60 * 60 * 24)); // days
    }

    allRequests.forEach(req => {
      stats.byStatus[req.status] = (stats.byStatus[req.status] || 0) + 1;
      stats.byType[req.type] = (stats.byType[req.type] || 0) + 1;
    });

    res.json({ stats });
  } catch (error) {
    logger.error('Error fetching GDPR stats', { error, requestId: req.headers['x-request-id'] });
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

export default router;
