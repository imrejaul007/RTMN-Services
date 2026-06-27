/**
 * Memory Forgetting Service (Port 4792)
 *
 * Enterprise memory forgetting service that handles:
 * - Scheduled forgetting (based on retention policies)
 * - Manual forgetting (user/deletion requests)
 * - Cascading forgetting (when parent entities are deleted)
 * - Undo capabilities (soft delete with time window)
 * - Privacy compliance (GDPR right to be forgotten)
 *
 * NOT a duplicate of genie-smart-forgetting (port 4715):
 * - genie-smart-forgetting: Personal memory archival (birthdays, events, personal interests)
 * - memory-forgetting: Enterprise forgetting (compliance, retention, cascading)
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(express.json());

// In-memory stores (would be replaced with Memory Substrate in production)
const scheduledForgets = new Map();
const completedForgets = new Map();
const undoRequests = new Map();
const forgettingPolicies = new Map();
const memoryLinks = new Map(); // Track cascade relationships

// Configuration
const UNDO_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_UNDO_REQUESTS = 1000;

// Helper to create IDs
const createId = (prefix) => `${prefix}_${Date.now()}_${uuidv4().slice(0, 8)}`;

// Helper to log forgetting events
const logForget = (action, details) => {
  console.log(`[FORGET] ${new Date().toISOString()} - ${action}:`, JSON.stringify(details));
};

// ============================================
// SCHEDULED FORGETTING
// ============================================

/**
 * Schedule a memory for forgetting
 * POST /api/v1/forgetting/schedule
 */
app.post('/api/v1/forgetting/schedule', async (req, res) => {
  try {
    const { memoryId, reason, scheduledAt, cascade, undoable } = req.body;

    if (!memoryId) {
      return res.status(400).json({ error: 'memoryId is required' });
    }

    // Check if already scheduled
    const existing = [...scheduledForgets.values()].find(
      f => f.memoryId === memoryId && f.status === 'pending'
    );

    if (existing) {
      return res.status(409).json({ error: 'Memory already scheduled for forgetting', existingId: existing.id });
    }

    const scheduledDate = scheduledAt ? new Date(scheduledAt) : new Date(Date.now() + UNDO_WINDOW_MS);

    const schedule = {
      id: createId('sched'),
      memoryId,
      reason: reason || 'scheduled',
      scheduledAt: scheduledDate.toISOString(),
      cascade: cascade !== false,
      undoable: undoable !== false,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    scheduledForgets.set(schedule.id, schedule);
    logForget('scheduled', schedule);

    res.status(201).json(schedule);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get scheduled forgetting by ID
 * GET /api/v1/forgetting/schedule/:scheduleId
 */
app.get('/api/v1/forgetting/schedule/:scheduleId', async (req, res) => {
  try {
    const schedule = scheduledForgets.get(req.params.scheduleId);

    if (!schedule) {
      return res.status(404).json({ error: 'Scheduled forgetting not found' });
    }

    res.json(schedule);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * List scheduled forgettings with filters
 * GET /api/v1/forgetting/schedules
 */
app.get('/api/v1/forgetting/schedules', async (req, res) => {
  try {
    const { status, before, after, limit } = req.query;
    let result = [...scheduledForgets.values()];

    if (status) {
      result = result.filter(f => f.status === status);
    }

    if (before) {
      result = result.filter(f => new Date(f.scheduledAt) <= new Date(before));
    }

    if (after) {
      result = result.filter(f => new Date(f.scheduledAt) >= new Date(after));
    }

    result = result.sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
    result = result.slice(0, parseInt(limit) || 100);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Cancel scheduled forgetting
 * DELETE /api/v1/forgetting/schedule/:scheduleId
 */
app.delete('/api/v1/forgetting/schedule/:scheduleId', async (req, res) => {
  try {
    const schedule = scheduledForgets.get(req.params.scheduleId);

    if (!schedule) {
      return res.status(404).json({ error: 'Scheduled forgetting not found' });
    }

    if (schedule.status !== 'pending') {
      return res.status(400).json({ error: 'Can only cancel pending schedules' });
    }

    schedule.status = 'cancelled';
    schedule.cancelledAt = new Date().toISOString();
    scheduledForgets.set(schedule.id, schedule);

    logForget('cancelled', schedule);
    res.json({ message: 'Scheduled forgetting cancelled', schedule });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// MANUAL FORGETTING
// ============================================

/**
 * Request immediate forgetting
 * POST /api/v1/forgetting/forget
 */
app.post('/api/v1/forgetting/forget', async (req, res) => {
  try {
    const { memoryId, reason, preserveRelations, verificationId } = req.body;

    if (!memoryId) {
      return res.status(400).json({ error: 'memoryId is required' });
    }

    // Check if there's a pending undo request
    const existingUndo = [...undoRequests.values()].find(
      u => u.memoryId === memoryId && u.status === 'pending'
    );

    if (existingUndo) {
      return res.status(409).json({
        error: 'Undo request pending',
        undoRequestId: existingUndo.id,
        expiresAt: existingUndo.expiresAt
      });
    }

    const forgetRecord = {
      id: createId('forgot'),
      memoryId,
      reason: reason || 'manual',
      status: 'completed',
      preserveRelations: preserveRelations || false,
      verificationId: verificationId || null,
      executedAt: new Date().toISOString(),
      cascadeCount: 0,
    };

    // If cascade is enabled, forget linked memories
    const links = memoryLinks.get(memoryId) || [];
    const cascadedIds = [];

    if (links.length > 0) {
      forgetRecord.cascadeCount = links.length;
      links.forEach(link => {
        cascadedIds.push(link.targetId);
        // In production, this would call memory-substrate to delete
      });
    }

    completedForgets.set(forgetRecord.id, forgetRecord);
    logForget('forgotten', forgetRecord);

    res.status(201).json({
      ...forgetRecord,
      cascadedIds: cascadedIds.length > 0 ? cascadedIds : undefined
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get completed forgetting record
 * GET /api/v1/forgetting/:forgetId
 */
app.get('/api/v1/forgetting/:forgetId', async (req, res) => {
  try {
    const record = completedForgets.get(req.params.forgetId);

    if (!record) {
      return res.status(404).json({ error: 'Forgetting record not found' });
    }

    res.json(record);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * List completed forgettings
 * GET /api/v1/forgetting/history
 */
app.get('/api/v1/forgetting/history', async (req, res) => {
  try {
    const { memoryId, reason, startDate, endDate, limit } = req.query;
    let result = [...completedForgets.values()];

    if (memoryId) {
      result = result.filter(f => f.memoryId === memoryId);
    }

    if (reason) {
      result = result.filter(f => f.reason === reason);
    }

    if (startDate) {
      result = result.filter(f => new Date(f.executedAt) >= new Date(startDate));
    }

    if (endDate) {
      result = result.filter(f => new Date(f.executedAt) <= new Date(endDate));
    }

    result = result.sort((a, b) => new Date(b.executedAt) - new Date(a.executedAt));
    result = result.slice(0, parseInt(limit) || 100);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// UNDO CAPABILITIES
// ============================================

/**
 * Request undo of forgetting
 * POST /api/v1/forgetting/undo
 */
app.post('/api/v1/forgetting/undo', async (req, res) => {
  try {
    const { memoryId, requesterId } = req.body;

    if (!memoryId) {
      return res.status(400).json({ error: 'memoryId is required' });
    }

    // Check if undo window is still open
    const recentForget = [...completedForgets.values()]
      .filter(f => f.memoryId === memoryId && f.status === 'completed')
      .sort((a, b) => new Date(b.executedAt) - new Date(a.executedAt))[0];

    if (!recentForget) {
      return res.status(404).json({ error: 'No recent forgetting found to undo' });
    }

    const executedAt = new Date(recentForget.executedAt);
    const now = new Date();
    const elapsed = now - executedAt;

    if (elapsed > UNDO_WINDOW_MS) {
      return res.status(410).json({
        error: 'Undo window expired',
        executedAt: recentForget.executedAt,
        windowExpiredAt: new Date(executedAt.getTime() + UNDO_WINDOW_MS).toISOString()
      });
    }

    // Check undo request limit
    const pendingUndos = [...undoRequests.values()].filter(u => u.status === 'pending');
    if (pendingUndos.length >= MAX_UNDO_REQUESTS) {
      return res.status(503).json({ error: 'Undo request queue full, try again later' });
    }

    // Create undo request
    const undoRequest = {
      id: createId('undo'),
      memoryId,
      forgetId: recentForget.id,
      requesterId: requesterId || 'system',
      status: 'pending',
      expiresAt: new Date(executedAt.getTime() + UNDO_WINDOW_MS).toISOString(),
      remainingMs: UNDO_WINDOW_MS - elapsed,
      createdAt: new Date().toISOString(),
    };

    undoRequests.set(undoRequest.id, undoRequest);

    // Mark the forget record as pending undo
    recentForget.status = 'undo_pending';
    completedForgets.set(recentForget.id, recentForget);

    logForget('undo_requested', undoRequest);

    res.status(201).json(undoRequest);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Execute undo
 * POST /api/v1/forgetting/undo/:undoId/execute
 */
app.post('/api/v1/forgetting/undo/:undoId/execute', async (req, res) => {
  try {
    const undoRequest = undoRequests.get(req.params.undoId);

    if (!undoRequest) {
      return res.status(404).json({ error: 'Undo request not found' });
    }

    if (undoRequest.status !== 'pending') {
      return res.status(400).json({ error: `Cannot execute undo with status: ${undoRequest.status}` });
    }

    // Check if expired
    if (new Date() > new Date(undoRequest.expiresAt)) {
      undoRequest.status = 'expired';
      undoRequests.set(undoRequest.id, undoRequest);
      return res.status(410).json({ error: 'Undo request expired', undoRequest });
    }

    // Execute undo - restore memory
    undoRequest.status = 'completed';
    undoRequest.executedAt = new Date().toISOString();
    undoRequests.set(undoRequest.id, undoRequest);

    // Update the forget record
    const forgetRecord = completedForgets.get(undoRequest.forgetId);
    if (forgetRecord) {
      forgetRecord.status = 'undone';
      forgetRecord.undoneAt = undoRequest.executedAt;
      forgetRecord.undoId = undoRequest.id;
      completedForgets.set(forgetRecord.id, forgetRecord);
    }

    logForget('undone', undoRequest);

    res.json({
      message: 'Memory restored successfully',
      undoRequest,
      restoredAt: undoRequest.executedAt
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Cancel undo request
 * DELETE /api/v1/forgetting/undo/:undoId
 */
app.delete('/api/v1/forgetting/undo/:undoId', async (req, res) => {
  try {
    const undoRequest = undoRequests.get(req.params.undoId);

    if (!undoRequest) {
      return res.status(404).json({ error: 'Undo request not found' });
    }

    if (undoRequest.status !== 'pending') {
      return res.status(400).json({ error: 'Can only cancel pending undo requests' });
    }

    undoRequest.status = 'cancelled';
    undoRequest.cancelledAt = new Date().toISOString();
    undoRequests.set(undoRequest.id, undoRequest);

    // Restore the forget record to completed
    const forgetRecord = completedForgets.get(undoRequest.forgetId);
    if (forgetRecord) {
      forgetRecord.status = 'completed';
      completedForgets.set(forgetRecord.id, forgetRecord);
    }

    logForget('undo_cancelled', undoRequest);

    res.json({ message: 'Undo request cancelled', undoRequest });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get undo request
 * GET /api/v1/forgetting/undo/:undoId
 */
app.get('/api/v1/forgetting/undo/:undoId', async (req, res) => {
  try {
    const undoRequest = undoRequests.get(req.params.undoId);

    if (!undoRequest) {
      return res.status(404).json({ error: 'Undo request not found' });
    }

    res.json(undoRequest);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * List pending undo requests
 * GET /api/v1/forgetting/undo-requests
 */
app.get('/api/v1/forgetting/undo-requests', async (req, res) => {
  try {
    const { status, memoryId, limit } = req.query;
    let result = [...undoRequests.values()];

    if (status) {
      result = result.filter(u => u.status === status);
    }

    if (memoryId) {
      result = result.filter(u => u.memoryId === memoryId);
    }

    result = result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    result = result.slice(0, parseInt(limit) || 100);

    // Add remaining time for pending requests
    result = result.map(u => {
      if (u.status === 'pending') {
        const remaining = new Date(u.expiresAt) - new Date();
        return { ...u, remainingMs: Math.max(0, remaining) };
      }
      return u;
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// MEMORY LINKS (for cascading)
// ============================================

/**
 * Register memory link for cascading
 * POST /api/v1/forgetting/links
 */
app.post('/api/v1/forgetting/links', async (req, res) => {
  try {
    const { sourceId, targetId, linkType, bidirectional } = req.body;

    if (!sourceId || !targetId) {
      return res.status(400).json({ error: 'sourceId and targetId are required' });
    }

    // Add link from source to target
    const sourceLinks = memoryLinks.get(sourceId) || [];
    const exists = sourceLinks.find(l => l.targetId === targetId);

    if (!exists) {
      sourceLinks.push({
        targetId,
        linkType: linkType || 'related',
        createdAt: new Date().toISOString()
      });
      memoryLinks.set(sourceId, sourceLinks);
    }

    // If bidirectional, add reverse link
    if (bidirectional) {
      const targetLinks = memoryLinks.get(targetId) || [];
      const reverseExists = targetLinks.find(l => l.targetId === sourceId);

      if (!reverseExists) {
        targetLinks.push({
          targetId: sourceId,
          linkType: linkType || 'related',
          createdAt: new Date().toISOString()
        });
        memoryLinks.set(targetId, targetLinks);
      }
    }

    logForget('link_registered', { sourceId, targetId, linkType, bidirectional });

    res.status(201).json({
      sourceId,
      targetId,
      linkType,
      bidirectional
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get links for a memory
 * GET /api/v1/forgetting/links/:memoryId
 */
app.get('/api/v1/forgetting/links/:memoryId', async (req, res) => {
  try {
    const links = memoryLinks.get(req.params.memoryId) || [];
    res.json(links);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Delete link
 * DELETE /api/v1/forgetting/links/:memoryId/:targetId
 */
app.delete('/api/v1/forgetting/links/:memoryId/:targetId', async (req, res) => {
  try {
    const links = memoryLinks.get(req.params.memoryId) || [];
    const filtered = links.filter(l => l.targetId !== req.params.targetId);
    memoryLinks.set(req.params.memoryId, filtered);

    logForget('link_deleted', { sourceId: req.params.memoryId, targetId: req.params.targetId });

    res.json({ message: 'Link deleted', sourceId: req.params.memoryId, targetId: req.params.targetId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// FORGETTING POLICIES
// ============================================

/**
 * Create forgetting policy
 * POST /api/v1/forgetting/policies
 */
app.post('/api/v1/forgetting/policies', async (req, res) => {
  try {
    const { name, description, memoryType, retentionPeriod, cascade, undoable, conditions } = req.body;

    if (!name || !memoryType) {
      return res.status(400).json({ error: 'name and memoryType are required' });
    }

    const policy = {
      id: createId('policy'),
      name,
      description: description || '',
      memoryType,
      retentionPeriod: retentionPeriod || { days: 365 },
      cascade: cascade !== false,
      undoable: undoable !== false,
      conditions: conditions || {},
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    forgettingPolicies.set(policy.id, policy);
    logForget('policy_created', policy);

    res.status(201).json(policy);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get forgetting policy
 * GET /api/v1/forgetting/policies/:policyId
 */
app.get('/api/v1/forgetting/policies/:policyId', async (req, res) => {
  try {
    const policy = forgettingPolicies.get(req.params.policyId);

    if (!policy) {
      return res.status(404).json({ error: 'Policy not found' });
    }

    res.json(policy);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * List forgetting policies
 * GET /api/v1/forgetting/policies
 */
app.get('/api/v1/forgetting/policies', async (req, res) => {
  try {
    const { memoryType, status, limit } = req.query;
    let result = [...forgettingPolicies.values()];

    if (memoryType) {
      result = result.filter(p => p.memoryType === memoryType);
    }

    if (status) {
      result = result.filter(p => p.status === status);
    }

    result = result.slice(0, parseInt(limit) || 100);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Preview forgetting based on policy
 * POST /api/v1/forgetting/policies/:policyId/preview
 */
app.post('/api/v1/forgetting/policies/:policyId/preview', async (req, res) => {
  try {
    const policy = forgettingPolicies.get(req.params.policyId);

    if (!policy) {
      return res.status(404).json({ error: 'Policy not found' });
    }

    const { memoryIds } = req.body;

    // Calculate which memories would be forgotten
    const previewResults = memoryIds ? memoryIds.map(id => ({
      memoryId: id,
      wouldForget: Math.random() > 0.5, // In production, check retention period
      reason: `Policy: ${policy.name}`,
    })) : [];

    res.json({
      policy: policy.name,
      totalItems: memoryIds?.length || 0,
      itemsToForget: previewResults.filter(r => r.wouldForget).length,
      previewResults,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// STATISTICS
// ============================================

/**
 * Get forgetting statistics
 * GET /api/v1/forgetting/stats
 */
app.get('/api/v1/forgetting/stats', async (req, res) => {
  try {
    const stats = {
      scheduled: {
        total: scheduledForgets.size,
        pending: [...scheduledForgets.values()].filter(f => f.status === 'pending').length,
        completed: [...scheduledForgets.size - [...scheduledForgets.values()].filter(f => f.status === 'pending').length],
        cancelled: [...scheduledForgets.values()].filter(f => f.status === 'cancelled').length,
      },
      completed: {
        total: completedForgets.size,
        byReason: [...completedForgets.values()].reduce((acc, f) => {
          acc[f.reason] = (acc[f.reason] || 0) + 1;
          return acc;
        }, {}),
        totalCascaded: [...completedForgets.values()].reduce((sum, f) => sum + (f.cascadeCount || 0), 0),
      },
      undoRequests: {
        total: undoRequests.size,
        pending: [...undoRequests.values()].filter(u => u.status === 'pending').length,
        completed: [...undoRequests.values()].filter(u => u.status === 'completed').length,
        expired: [...undoRequests.values()].filter(u => u.status === 'expired').length,
      },
      policies: {
        total: forgettingPolicies.size,
        active: [...forgettingPolicies.values()].filter(p => p.status === 'active').length,
      },
      links: {
        total: [...memoryLinks.values()].reduce((sum, links) => sum + links.length, 0),
      },
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// HEALTH & INFO
// ============================================

app.get('/health', (req, res) => {
  res.json({
    service: 'memory-forgetting',
    version: '1.0.0',
    port: 4792,
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/v1/info', (req, res) => {
  res.json({
    service: 'memory-forgetting',
    description: 'Enterprise memory forgetting service',
    version: '1.0.0',
    capabilities: [
      'scheduled_forgetting',
      'manual_forgetting',
      'cascading_forget',
      'undo_capabilities',
      'privacy_compliance',
    ],
    undoWindowDays: 7,
  });
});

// Start server
const PORT = process.env.PORT || 4792;
const server = app.listen(PORT, () => {
  console.log(`[Memory Forgetting Service] Running on port ${PORT}`);
});

export { app, server };
export default app;
