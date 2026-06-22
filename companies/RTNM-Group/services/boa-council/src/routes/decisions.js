import express from 'express';
import { createClient } from 'redis';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Create Redis client
const redis = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
redis.connect().catch(console.error);

// Decision status enum
export const DECISION_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  DEFERRED: 'deferred',
  IMPLEMENTED: 'implemented',
  MONITORING: 'monitoring'
};

// Decision priority levels
export const DECISION_PRIORITY = {
  CRITICAL: 1,
  HIGH: 2,
  MEDIUM: 3,
  LOW: 4
};

/**
 * POST /api/decisions
 * Create a new decision record
 */
router.post('/', async (req, res) => {
  try {
    const {
      title,
      description,
      context,
      perspectives,
      recommendation,
      priority = 'medium',
      requestedBy,
      deadline
    } = req.body;

    if (!title || !recommendation) {
      return res.status(400).json({
        success: false,
        error: 'Title and recommendation are required'
      });
    }

    const decisionId = uuidv4();
    const now = new Date().toISOString();

    const decision = {
      id: decisionId,
      title,
      description: description || '',
      context: context || '',
      perspectives: JSON.stringify(perspectives || []),
      recommendation,
      priority,
      status: DECISION_STATUS.PENDING,
      requestedBy: requestedBy || 'system',
      createdAt: now,
      updatedAt: now,
      deadline: deadline || '',
      tags: JSON.stringify([])
    };

    await redis.hSet(`boa:decision:${decisionId}`, decision);

    // Add to decisions list
    await redis.zAdd('boa:decisions:by_date', {
      score: Date.now(),
      value: decisionId
    });

    // Add to priority queue
    const priorityScore = DECISION_PRIORITY[priority.toUpperCase()] || 3;
    await redis.zAdd('boa:decisions:by_priority', {
      score: priorityScore,
      value: decisionId
    });

    res.status(201).json({
      success: true,
      decision: {
        ...decision,
        perspectives: perspectives || [],
        tags: []
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/decisions
 * List all decisions with optional filtering
 */
router.get('/', async (req, res) => {
  try {
    const {
      status,
      priority,
      limit = 20,
      offset = 0,
      sort = 'date'
    } = req.query;

    // Get decision IDs based on sort order
    const sortedSet = sort === 'priority'
      ? 'boa:decisions:by_priority'
      : 'boa:decisions:by_date';

    let decisionIds = await redis.zRange(sortedSet, 0, -1);

    // Apply status filter
    if (status) {
      decisionIds = await Promise.all(
        decisionIds.map(async (id) => {
          const s = await redis.hGet(`boa:decision:${id}`, 'status');
          return s === status ? id : null;
        })
      );
      decisionIds = decisionIds.filter(Boolean);
    }

    // Apply priority filter
    if (priority) {
      decisionIds = await Promise.all(
        decisionIds.map(async (id) => {
          const p = await redis.hGet(`boa:decision:${id}`, 'priority');
          return p === priority.toLowerCase() ? id : null;
        })
      );
      decisionIds = decisionIds.filter(Boolean);
    }

    // Apply pagination
    const paginatedIds = decisionIds.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

    // Get decision data
    const decisions = await Promise.all(
      paginatedIds.map(async (id) => {
        const data = await redis.hGetAll(`boa:decision:${id}`);
        return {
          ...data,
          perspectives: JSON.parse(data.perspectives || '[]'),
          tags: JSON.parse(data.tags || '[]'),
          priority: data.priority || 'medium'
        };
      })
    );

    res.json({
      success: true,
      count: decisions.length,
      total: decisionIds.length,
      decisions
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/decisions/:id
 * Get specific decision details
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const data = await redis.hGetAll(`boa:decision:${id}`);

    if (!data || Object.keys(data).length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Decision not found'
      });
    }

    // Get related decisions (same context or recommendation)
    const relatedIds = await redis.keys('boa:decision:*');
    const related = await Promise.all(
      relatedIds
        .filter(key => key !== `boa:decision:${id}`)
        .map(async (key) => {
          const relatedId = key.split(':').pop();
          const relatedData = await redis.hGetAll(key);
          if (relatedData.context === data.context && data.context) {
            return { id: relatedId, ...relatedData };
          }
          return null;
        })
    );
    const relatedDecisions = related.filter(Boolean).slice(0, 5);

    res.json({
      success: true,
      decision: {
        ...data,
        perspectives: JSON.parse(data.perspectives || '[]'),
        tags: JSON.parse(data.tags || '[]')
      },
      related: relatedDecisions
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PATCH /api/decisions/:id
 * Update a decision (status, tags, etc.)
 */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const exists = await redis.exists(`boa:decision:${id}`);
    if (!exists) {
      return res.status(404).json({
        success: false,
        error: 'Decision not found'
      });
    }

    const allowedFields = ['title', 'description', 'status', 'priority', 'tags', 'deadline'];
    const updateData = {};

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        if (field === 'tags' && Array.isArray(updates[field])) {
          updateData[field] = JSON.stringify(updates[field]);
        } else {
          updateData[field] = updates[field];
        }
      }
    }

    updateData.updatedAt = new Date().toISOString();

    await redis.hSet(`boa:decision:${id}`, updateData);

    const updated = await redis.hGetAll(`boa:decision:${id}`);

    res.json({
      success: true,
      decision: {
        ...updated,
        perspectives: JSON.parse(updated.perspectives || '[]'),
        tags: JSON.parse(updated.tags || '[]')
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/decisions/:id/approve
 * Approve a decision
 */
router.post('/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { approvedBy, notes } = req.body;

    const exists = await redis.exists(`boa:decision:${id}`);
    if (!exists) {
      return res.status(404).json({
        success: false,
        error: 'Decision not found'
      });
    }

    await redis.hSet(`boa:decision:${id}`, {
      status: DECISION_STATUS.APPROVED,
      updatedAt: new Date().toISOString(),
      approvedBy: approvedBy || 'council',
      approvalNotes: notes || ''
    });

    // Add to approved list
    await redis.zAdd('boa:decisions:approved', {
      score: Date.now(),
      value: id
    });

    const updated = await redis.hGetAll(`boa:decision:${id}`);

    res.json({
      success: true,
      message: 'Decision approved',
      decision: {
        ...updated,
        perspectives: JSON.parse(updated.perspectives || '[]'),
        tags: JSON.parse(updated.tags || '[]')
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/decisions/:id/reject
 * Reject a decision
 */
router.post('/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectedBy, reason } = req.body;

    const exists = await redis.exists(`boa:decision:${id}`);
    if (!exists) {
      return res.status(404).json({
        success: false,
        error: 'Decision not found'
      });
    }

    await redis.hSet(`boa:decision:${id}`, {
      status: DECISION_STATUS.REJECTED,
      updatedAt: new Date().toISOString(),
      rejectedBy: rejectedBy || 'council',
      rejectionReason: reason || ''
    });

    // Add to rejected list
    await redis.zAdd('boa:decisions:rejected', {
      score: Date.now(),
      value: id
    });

    const updated = await redis.hGetAll(`boa:decision:${id}`);

    res.json({
      success: true,
      message: 'Decision rejected',
      decision: {
        ...updated,
        perspectives: JSON.parse(updated.perspectives || '[]'),
        tags: JSON.parse(updated.tags || '[]')
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/decisions/:id/defer
 * Defer a decision
 */
router.post('/:id/defer', async (req, res) => {
  try {
    const { id } = req.params;
    const { deferredUntil, reason } = req.body;

    const exists = await redis.exists(`boa:decision:${id}`);
    if (!exists) {
      return res.status(404).json({
        success: false,
        error: 'Decision not found'
      });
    }

    await redis.hSet(`boa:decision:${id}`, {
      status: DECISION_STATUS.DEFERRED,
      updatedAt: new Date().toISOString(),
      deferredUntil: deferredUntil || '',
      deferralReason: reason || ''
    });

    const updated = await redis.hGetAll(`boa:decision:${id}`);

    res.json({
      success: true,
      message: 'Decision deferred',
      decision: {
        ...updated,
        perspectives: JSON.parse(updated.perspectives || '[]'),
        tags: JSON.parse(updated.tags || '[]')
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/decisions/stats
 * Get decision statistics
 */
router.get('/stats/overview', async (req, res) => {
  try {
    const allIds = await redis.zRange('boa:decisions:by_date', 0, -1);

    const stats = {
      total: allIds.length,
      byStatus: {},
      byPriority: {},
      recentTrend: []
    };

    // Count by status
    for (const status of Object.values(DECISION_STATUS)) {
      stats.byStatus[status] = 0;
    }

    // Count by priority
    for (const priority of ['critical', 'high', 'medium', 'low']) {
      stats.byPriority[priority] = 0;
    }

    for (const id of allIds) {
      const data = await redis.hGetAll(`boa:decision:${id}`);
      if (data.status) stats.byStatus[data.status] = (stats.byStatus[data.status] || 0) + 1;
      if (data.priority) stats.byPriority[data.priority] = (stats.byPriority[data.priority] || 0) + 1;
    }

    // Calculate approval rate
    const approved = stats.byStatus[DECISION_STATUS.APPROVED] || 0;
    const rejected = stats.byStatus[DECISION_STATUS.REJECTED] || 0;
    const decided = approved + rejected;
    stats.approvalRate = decided > 0 ? (approved / decided * 100).toFixed(1) : 0;

    // Recent decisions (last 7 days)
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const recentIds = allIds.slice(-7);
    let recentCount = 0;
    for (const id of recentIds) {
      const data = await redis.hGet(`boa:decision:${id}`, 'createdAt');
      if (data && new Date(data).getTime() > sevenDaysAgo) recentCount++;
    }
    stats.recentCount = recentCount;

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/decisions/pending
 * Get pending decisions requiring action
 */
router.get('/pending', async (req, res) => {
  try {
    const allIds = await redis.zRange('boa:decisions:by_priority', 0, -1);

    const pending = [];
    for (const id of allIds) {
      const data = await redis.hGetAll(`boa:decision:${id}`);
      if (data.status === DECISION_STATUS.PENDING) {
        pending.push({
          ...data,
          perspectives: JSON.parse(data.perspectives || '[]'),
          tags: JSON.parse(data.tags || '[]')
        });
      }
    }

    // Sort by priority
    pending.sort((a, b) =>
      (DECISION_PRIORITY[a.priority?.toUpperCase()] || 3) -
      (DECISION_PRIORITY[b.priority?.toUpperCase()] || 3)
    );

    res.json({
      success: true,
      count: pending.length,
      pending
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
