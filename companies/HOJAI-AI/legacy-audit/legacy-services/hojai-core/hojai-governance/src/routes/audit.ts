/**
 * Audit Routes
 */

import { Router, Request, Response } from 'express';
import {
  createResponse,
  createErrorResponse,
  tenantMiddleware,
  AuditEntry
} from '../index.js';

const router = Router();

// Import the shared audit log (in real app, this would be a database)
let auditLog: AuditEntry[] = [];

// For this demo, we'll use in-memory storage
// In production, this would query a database
const localAuditLog: AuditEntry[] = [];

/**
 * GET /api/audit
 * Get audit log entries
 */
router.get('/', tenantMiddleware(), (req: Request, res: Response) => {
  const ctx = req.tenantContext!;
  const { action, resource, userId, limit = 100, offset = 0 } = req.query;

  let entries = localAuditLog.filter(e => e.tenantId === ctx.tenant_id);

  if (action) {
    entries = entries.filter(e => e.action.includes(action as string));
  }

  if (resource) {
    entries = entries.filter(e => e.resource === resource);
  }

  if (userId) {
    entries = entries.filter(e => e.userId === userId);
  }

  // Sort by timestamp descending
  entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const total = entries.length;
  const paginated = entries.slice(Number(offset), Number(offset) + Number(limit));

  res.json(createResponse({
    entries: paginated,
    pagination: {
      total,
      limit: Number(limit),
      offset: Number(offset),
      hasMore: Number(offset) + paginated.length < total
    }
  }, ctx.tenant_id));
});

/**
 * GET /api/audit/:id
 * Get audit entry by ID
 */
router.get('/:id', tenantMiddleware(), (req: Request, res: Response) => {
  const ctx = req.tenantContext!;
  const { id } = req.params;

  const entry = localAuditLog.find(e => e.id === id && e.tenantId === ctx.tenant_id);
  if (!entry) {
    return res.status(404).json(createErrorResponse('NOT_FOUND', `Audit entry ${id} not found`));
  }

  res.json(createResponse({ entry }, ctx.tenant_id));
});

/**
 * GET /api/audit/actions
 * Get available audit action types
 */
router.get('/meta/actions', tenantMiddleware(), (req: Request, res: Response) => {
  const ctx = req.tenantContext!;

  const actions = [
    // User actions
    'user.created', 'user.updated', 'user.deleted',
    // Role actions
    'role.assigned', 'role.revoked',
    // Permission actions
    'permission.granted', 'permission.revoked',
    // Memory actions
    'memory.created', 'memory.updated', 'memory.deleted', 'memory.searched',
    // Event actions
    'event.published', 'event.consumed',
    // Workflow actions
    'workflow.created', 'workflow.activated', 'workflow.triggered', 'workflow.completed',
    // Agent actions
    'agent.registered', 'agent.executed', 'agent.updated'
  ];

  res.json(createResponse({ actions }, ctx.tenant_id));
});

/**
 * GET /api/audit/stats
 * Get audit statistics
 */
router.get('/stats', tenantMiddleware(), (req: Request, res: Response) => {
  const ctx = req.tenantContext!;
  const entries = localAuditLog.filter(e => e.tenantId === ctx.tenant_id);

  const stats = {
    total: entries.length,
    byAction: {} as Record<string, number>,
    byResource: {} as Record<string, number>,
    byDay: {} as Record<string, number>
  };

  for (const entry of entries) {
    stats.byAction[entry.action] = (stats.byAction[entry.action] || 0) + 1;
    stats.byResource[entry.resource] = (stats.byResource[entry.resource] || 0) + 1;

    const day = entry.timestamp.split('T')[0];
    stats.byDay[day] = (stats.byDay[day] || 0) + 1;
  }

  res.json(createResponse({ stats }, ctx.tenant_id));
});

/**
 * POST /api/audit/export
 * Export audit log (for compliance)
 */
router.post('/export', tenantMiddleware(), (req: Request, res: Response) => {
  const ctx = req.tenantContext!;
  const { format = 'json', startDate, endDate } = req.body;

  let entries = localAuditLog.filter(e => e.tenantId === ctx.tenant_id);

  if (startDate) {
    entries = entries.filter(e => e.timestamp >= startDate);
  }

  if (endDate) {
    entries = entries.filter(e => e.timestamp <= endDate);
  }

  if (format === 'csv') {
    const csv = [
      'id,timestamp,tenantId,userId,action,resource,resourceId',
      ...entries.map(e =>
        `${e.id},${e.timestamp},${e.tenantId},${e.userId || ''},${e.action},${e.resource},${e.resourceId || ''}`
      )
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=audit-log.csv');
    return res.send(csv);
  }

  res.json(createResponse({ entries, count: entries.length }, ctx.tenant_id));
});

export { router as auditRoutes, localAuditLog };
