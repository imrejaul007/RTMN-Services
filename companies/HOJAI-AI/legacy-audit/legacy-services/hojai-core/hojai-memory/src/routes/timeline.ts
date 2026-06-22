/**
 * Timeline Routes
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { TimelineEntry, timelineStore } from '../index.js';

const router = Router();

// ============================================
// HELPERS
// ============================================

function createResponse<T>(data: T, tenantId?: string) {
  return {
    success: true,
    data,
    meta: { timestamp: new Date().toISOString(), requestId: `req_${Date.now()}`, tenantId }
  };
}

function createErrorResponse(code: string, message: string) {
  return {
    success: false,
    error: { code, message },
    meta: { timestamp: new Date().toISOString(), requestId: `req_${Date.now()}` }
  };
}

/**
 * POST /timeline
 * Add timeline entry
 */
router.post('/', (req: Request, res: Response) => {
  const ctx = req.tenantContext!;
  const { userId, type, title, description, timestamp, duration, metadata } = req.body;

  if (!userId || !type || !title) {
    return res.status(400).json(createErrorResponse('INVALID_REQUEST', 'userId, type, and title required'));
  }

  const entry: TimelineEntry = {
    id: uuidv4(),
    tenantId: ctx.tenant_id,
    userId,
    type,
    title,
    description,
    timestamp: timestamp || new Date().toISOString(),
    duration,
    metadata
  };

  const userTimeline = timelineStore.get(ctx.tenant_id) || [];
  userTimeline.push(entry);
  timelineStore.set(ctx.tenant_id, userTimeline);

  res.status(201).json(createResponse({ entry }, ctx.tenant_id));
});

/**
 * GET /timeline/:userId
 * Get user timeline
 */
router.get('/:userId', (req: Request, res: Response) => {
  const ctx = req.tenantContext!;
  const { userId } = req.params;
  const { type, limit = 50, offset = 0, startDate, endDate } = req.query;

  const allTimeline = timelineStore.get(ctx.tenant_id) || [];
  let entries = allTimeline.filter(e => e.userId === userId);

  if (type) {
    entries = entries.filter(e => e.type === type);
  }

  if (startDate) {
    entries = entries.filter(e => e.timestamp >= (startDate as string));
  }

  if (endDate) {
    entries = entries.filter(e => e.timestamp <= (endDate as string));
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
 * GET /timeline/:userId/summary
 * Get timeline summary
 */
router.get('/:userId/summary', (req: Request, res: Response) => {
  const ctx = req.tenantContext!;
  const { userId } = req.params;

  const allTimeline = timelineStore.get(ctx.tenant_id) || [];
  const entries = allTimeline.filter(e => e.userId === userId);

  // Group by type
  const byType: Record<string, number> = {};
  for (const entry of entries) {
    byType[entry.type] = (byType[entry.type] || 0) + 1;
  }

  // Group by day
  const byDay: Record<string, number> = {};
  for (const entry of entries) {
    const day = entry.timestamp.split('T')[0];
    byDay[day] = (byDay[day] || 0) + 1;
  }

  // Calculate total duration
  const totalDuration = entries.reduce((sum, e) => sum + (e.duration || 0), 0);

  res.json(createResponse({
    summary: {
      totalEntries: entries.length,
      byType,
      byDay,
      totalDuration,
      firstEntry: entries.length > 0 ? entries[entries.length - 1].timestamp : null,
      lastEntry: entries.length > 0 ? entries[0].timestamp : null
    }
  }, ctx.tenant_id));
});

/**
 * DELETE /timeline/:userId/:id
 * Delete timeline entry
 */
router.delete('/:userId/:id', (req: Request, res: Response) => {
  const ctx = req.tenantContext!;
  const { userId, id } = req.params;

  const userTimeline = timelineStore.get(ctx.tenant_id) || [];
  const index = userTimeline.findIndex(e => e.userId === userId && e.id === id);

  if (index === -1) {
    return res.status(404).json(createErrorResponse('NOT_FOUND', `Timeline entry ${id} not found`));
  }

  userTimeline.splice(index, 1);
  timelineStore.set(ctx.tenant_id, userTimeline);

  res.json(createResponse({ deleted: true }));
});

/**
 * POST /timeline/:userId/cleanup
 * Clean up old timeline entries
 */
router.post('/:userId/cleanup', (req: Request, res: Response) => {
  const ctx = req.tenantContext!;
  const { userId } = req.params;
  const { before } = req.body;

  if (!before) {
    return res.status(400).json(createErrorResponse('INVALID_REQUEST', 'before date required'));
  }

  const userTimeline = timelineStore.get(ctx.tenant_id) || [];
  const beforeDate = new Date(before);
  const originalCount = userTimeline.filter(e => e.userId === userId).length;

  const filtered = userTimeline.filter(e =>
    e.userId !== userId || new Date(e.timestamp) > beforeDate
  );

  const deleted = originalCount - filtered.filter(e => e.userId === userId).length;

  timelineStore.set(ctx.tenant_id, filtered);

  res.json(createResponse({ deleted, remaining: originalCount - deleted }));
});

/**
 * GET /timeline/types
 * Get available timeline types
 */
router.get('/meta/types', (req: Request, res: Response) => {
  const types = [
    { type: 'purchase', name: 'Purchase', description: 'Purchase transaction' },
    { type: 'visit', name: 'Visit', description: 'Store or location visit' },
    { type: 'interaction', name: 'Interaction', description: 'Customer interaction' },
    { type: 'support', name: 'Support', description: 'Support ticket or call' },
    { type: 'feedback', name: 'Feedback', description: 'Customer feedback' },
    { type: 'lifecycle', name: 'Lifecycle', description: 'Customer lifecycle event' }
  ];

  res.json(createResponse({ types }));
});

export { router as timelineRoutes };
