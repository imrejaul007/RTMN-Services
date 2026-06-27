import { describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Create a fresh app for each test
function createTestApp() {
  const app = express();
  app.use(express.json());

  // In-memory stores
  const scheduledForgets = new Map();
  const completedForgets = new Map();
  const undoRequests = new Map();
  const forgettingPolicies = new Map();
  const memoryLinks = new Map();

  const UNDO_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

  const createId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  // SCHEDULED FORGETTING
  app.post('/api/v1/forgetting/schedule', async (req, res) => {
    try {
      const { memoryId, reason, scheduledAt, cascade, undoable } = req.body;

      if (!memoryId) {
        return res.status(400).json({ error: 'memoryId is required' });
      }

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
      res.status(201).json(schedule);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // NOTE: More specific routes MUST come before :param routes
  app.get('/api/v1/forgetting/schedules', async (req, res) => {
    try {
      const { status, limit } = req.query;
      let result = [...scheduledForgets.values()];

      if (status) {
        result = result.filter(f => f.status === status);
      }

      result = result.sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
      result = result.slice(0, parseInt(limit) || 100);

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

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
      res.json({ message: 'Scheduled forgetting cancelled', schedule });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // MANUAL FORGETTING
  app.post('/api/v1/forgetting/forget', async (req, res) => {
    try {
      const { memoryId, reason, preserveRelations } = req.body;

      if (!memoryId) {
        return res.status(400).json({ error: 'memoryId is required' });
      }

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
        executedAt: new Date().toISOString(),
        cascadeCount: 0,
      };

      completedForgets.set(forgetRecord.id, forgetRecord);
      res.status(201).json(forgetRecord);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // NOTE: More specific routes MUST come before :param routes
  app.get('/api/v1/forgetting/history', async (req, res) => {
    try {
      const { memoryId, limit } = req.query;
      let result = [...completedForgets.values()];

      if (memoryId) {
        result = result.filter(f => f.memoryId === memoryId);
      }

      result = result.sort((a, b) => new Date(b.executedAt) - new Date(a.executedAt));
      result = result.slice(0, parseInt(limit) || 100);

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // UNDO CAPABILITIES - specific routes BEFORE :param routes
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

  app.post('/api/v1/forgetting/undo', async (req, res) => {
    try {
      const { memoryId, requesterId } = req.body;

      if (!memoryId) {
        return res.status(400).json({ error: 'memoryId is required' });
      }

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
      recentForget.status = 'undo_pending';
      completedForgets.set(recentForget.id, recentForget);

      res.status(201).json(undoRequest);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/v1/forgetting/undo/:undoId/execute', async (req, res) => {
    try {
      const undoRequest = undoRequests.get(req.params.undoId);

      if (!undoRequest) {
        return res.status(404).json({ error: 'Undo request not found' });
      }

      if (undoRequest.status !== 'pending') {
        return res.status(400).json({ error: `Cannot execute undo with status: ${undoRequest.status}` });
      }

      if (new Date() > new Date(undoRequest.expiresAt)) {
        undoRequest.status = 'expired';
        undoRequests.set(undoRequest.id, undoRequest);
        return res.status(410).json({ error: 'Undo request expired', undoRequest });
      }

      undoRequest.status = 'completed';
      undoRequest.executedAt = new Date().toISOString();
      undoRequests.set(undoRequest.id, undoRequest);

      const forgetRecord = completedForgets.get(undoRequest.forgetId);
      if (forgetRecord) {
        forgetRecord.status = 'undone';
        forgetRecord.undoneAt = undoRequest.executedAt;
        forgetRecord.undoId = undoRequest.id;
        completedForgets.set(forgetRecord.id, forgetRecord);
      }

      res.json({
        message: 'Memory restored successfully',
        undoRequest,
        restoredAt: undoRequest.executedAt
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

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

      const forgetRecord = completedForgets.get(undoRequest.forgetId);
      if (forgetRecord) {
        forgetRecord.status = 'completed';
        completedForgets.set(forgetRecord.id, forgetRecord);
      }

      res.json({ message: 'Undo request cancelled', undoRequest });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

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

  // FORGETTING POLICIES - MUST be before :forgetId
  app.post('/api/v1/forgetting/policies', async (req, res) => {
    try {
      const { name, description, memoryType, retentionPeriod, cascade, undoable } = req.body;

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
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      forgettingPolicies.set(policy.id, policy);
      res.status(201).json(policy);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

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

  app.post('/api/v1/forgetting/policies/:policyId/preview', async (req, res) => {
    try {
      const policy = forgettingPolicies.get(req.params.policyId);

      if (!policy) {
        return res.status(404).json({ error: 'Policy not found' });
      }

      const { memoryIds } = req.body;

      const previewResults = memoryIds ? memoryIds.map(id => ({
        memoryId: id,
        wouldForget: Math.random() > 0.5,
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

  // STATISTICS - MUST be before :forgetId
  app.get('/api/v1/forgetting/stats', async (req, res) => {
    try {
      const stats = {
        scheduled: {
          total: scheduledForgets.size,
          pending: [...scheduledForgets.values()].filter(f => f.status === 'pending').length,
        },
        completed: {
          total: completedForgets.size,
          byReason: [...completedForgets.values()].reduce((acc, f) => {
            acc[f.reason] = (acc[f.reason] || 0) + 1;
            return acc;
          }, {}),
        },
        undoRequests: {
          total: undoRequests.size,
          pending: [...undoRequests.values()].filter(u => u.status === 'pending').length,
        },
        policies: {
          total: forgettingPolicies.size,
          active: [...forgettingPolicies.values()].filter(p => p.status === 'active').length,
        },
      };

      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // PARAM route - MUST be LAST
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
  app.post('/api/v1/forgetting/policies', async (req, res) => {
    try {
      const { name, description, memoryType, retentionPeriod, cascade, undoable } = req.body;

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
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      forgettingPolicies.set(policy.id, policy);
      res.status(201).json(policy);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

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

  // MEMORY LINKS
  app.post('/api/v1/forgetting/links', async (req, res) => {
    try {
      const { sourceId, targetId, linkType, bidirectional } = req.body;

      if (!sourceId || !targetId) {
        return res.status(400).json({ error: 'sourceId and targetId are required' });
      }

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

      res.status(201).json({ sourceId, targetId, linkType, bidirectional });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/v1/forgetting/links/:memoryId', async (req, res) => {
    try {
      const links = memoryLinks.get(req.params.memoryId) || [];
      res.json(links);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/v1/forgetting/links/:memoryId/:targetId', async (req, res) => {
    try {
      const links = memoryLinks.get(req.params.memoryId) || [];
      const filtered = links.filter(l => l.targetId !== req.params.targetId);
      memoryLinks.set(req.params.memoryId, filtered);
      res.json({ message: 'Link deleted', sourceId: req.params.memoryId, targetId: req.params.targetId });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return { app, scheduledForgets, completedForgets, undoRequests, forgettingPolicies, memoryLinks };
}

describe('Memory Forgetting Service', () => {
  describe('Scheduled Forgetting', () => {
    it('should schedule a memory for forgetting', async () => {
      const { app } = createTestApp();

      const res = await request(app)
        .post('/api/v1/forgetting/schedule')
        .send({
          memoryId: 'memory-001',
          reason: 'retention_policy',
          cascade: true
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.memoryId).toBe('memory-001');
      expect(res.body.status).toBe('pending');
      expect(res.body.cascade).toBe(true);
    });

    it('should reject duplicate scheduling', async () => {
      const { app } = createTestApp();

      await request(app)
        .post('/api/v1/forgetting/schedule')
        .send({ memoryId: 'memory-001' });

      const res = await request(app)
        .post('/api/v1/forgetting/schedule')
        .send({ memoryId: 'memory-001' });

      expect(res.status).toBe(409);
      expect(res.body.error).toContain('already scheduled');
    });

    it('should require memoryId', async () => {
      const { app } = createTestApp();

      const res = await request(app)
        .post('/api/v1/forgetting/schedule')
        .send({ reason: 'test' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('memoryId is required');
    });

    it('should get scheduled forgetting by ID', async () => {
      const { app } = createTestApp();

      const createRes = await request(app)
        .post('/api/v1/forgetting/schedule')
        .send({ memoryId: 'memory-001', reason: 'test' });

      const res = await request(app)
        .get(`/api/v1/forgetting/schedule/${createRes.body.id}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(createRes.body.id);
    });

    it('should list scheduled forgettings with filters', async () => {
      const { app } = createTestApp();

      await request(app)
        .post('/api/v1/forgetting/schedule')
        .send({ memoryId: 'memory-001', reason: 'retention' });

      await request(app)
        .post('/api/v1/forgetting/schedule')
        .send({ memoryId: 'memory-002', reason: 'manual' });

      const res = await request(app)
        .get('/api/v1/forgetting/schedules?status=pending');

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
    });

    it('should cancel scheduled forgetting', async () => {
      const { app } = createTestApp();

      const createRes = await request(app)
        .post('/api/v1/forgetting/schedule')
        .send({ memoryId: 'memory-001' });

      const res = await request(app)
        .delete(`/api/v1/forgetting/schedule/${createRes.body.id}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('cancelled');
      expect(res.body.schedule.status).toBe('cancelled');
    });
  });

  describe('Manual Forgetting', () => {
    it('should forget memory immediately', async () => {
      const { app } = createTestApp();

      const res = await request(app)
        .post('/api/v1/forgetting/forget')
        .send({
          memoryId: 'memory-001',
          reason: 'user_request'
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('completed');
      expect(res.body.memoryId).toBe('memory-001');
    });

    it('should preserve relations when requested', async () => {
      const { app } = createTestApp();

      const res = await request(app)
        .post('/api/v1/forgetting/forget')
        .send({
          memoryId: 'memory-001',
          reason: 'user_request',
          preserveRelations: true
        });

      expect(res.status).toBe(201);
      expect(res.body.preserveRelations).toBe(true);
    });

    it('should reject forgetting with pending undo', async () => {
      const { app } = createTestApp();

      await request(app)
        .post('/api/v1/forgetting/forget')
        .send({ memoryId: 'memory-001' });

      await request(app)
        .post('/api/v1/forgetting/undo')
        .send({ memoryId: 'memory-001' });

      const res = await request(app)
        .post('/api/v1/forgetting/forget')
        .send({ memoryId: 'memory-001' });

      expect(res.status).toBe(409);
      expect(res.body.error).toContain('Undo request pending');
    });

    it('should get forgetting record', async () => {
      const { app } = createTestApp();

      const createRes = await request(app)
        .post('/api/v1/forgetting/forget')
        .send({ memoryId: 'memory-001' });

      const res = await request(app)
        .get(`/api/v1/forgetting/${createRes.body.id}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(createRes.body.id);
    });

    it('should list forgetting history', async () => {
      const { app } = createTestApp();

      await request(app)
        .post('/api/v1/forgetting/forget')
        .send({ memoryId: 'memory-001', reason: 'test1' });

      await request(app)
        .post('/api/v1/forgetting/forget')
        .send({ memoryId: 'memory-002', reason: 'test2' });

      const res = await request(app)
        .get('/api/v1/forgetting/history');

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Undo Capabilities', () => {
    it('should request undo of forgetting', async () => {
      const { app } = createTestApp();

      await request(app)
        .post('/api/v1/forgetting/forget')
        .send({ memoryId: 'memory-001' });

      const res = await request(app)
        .post('/api/v1/forgetting/undo')
        .send({ memoryId: 'memory-001', requesterId: 'user-001' });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('pending');
      expect(res.body).toHaveProperty('expiresAt');
      expect(res.body).toHaveProperty('remainingMs');
    });

    it('should return 404 if no forgetting found', async () => {
      const { app } = createTestApp();

      const res = await request(app)
        .post('/api/v1/forgetting/undo')
        .send({ memoryId: 'memory-999' });

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('No recent forgetting');
    });

    it('should execute undo', async () => {
      const { app } = createTestApp();

      await request(app)
        .post('/api/v1/forgetting/forget')
        .send({ memoryId: 'memory-001' });

      const undoRes = await request(app)
        .post('/api/v1/forgetting/undo')
        .send({ memoryId: 'memory-001' });

      const res = await request(app)
        .post(`/api/v1/forgetting/undo/${undoRes.body.id}/execute`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('restored');
      expect(res.body.undoRequest.status).toBe('completed');
    });

    it('should cancel undo request', async () => {
      const { app } = createTestApp();

      await request(app)
        .post('/api/v1/forgetting/forget')
        .send({ memoryId: 'memory-001' });

      const undoRes = await request(app)
        .post('/api/v1/forgetting/undo')
        .send({ memoryId: 'memory-001' });

      const res = await request(app)
        .delete(`/api/v1/forgetting/undo/${undoRes.body.id}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('cancelled');
    });

    it('should list pending undo requests', async () => {
      const { app } = createTestApp();

      await request(app)
        .post('/api/v1/forgetting/forget')
        .send({ memoryId: 'memory-001' });

      await request(app)
        .post('/api/v1/forgetting/undo')
        .send({ memoryId: 'memory-001' });

      const res = await request(app)
        .get('/api/v1/forgetting/undo-requests?status=pending');

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0]).toHaveProperty('remainingMs');
    });

    it('should get undo request by ID', async () => {
      const { app } = createTestApp();

      await request(app)
        .post('/api/v1/forgetting/forget')
        .send({ memoryId: 'memory-001' });

      const undoRes = await request(app)
        .post('/api/v1/forgetting/undo')
        .send({ memoryId: 'memory-001' });

      const res = await request(app)
        .get(`/api/v1/forgetting/undo/${undoRes.body.id}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(undoRes.body.id);
    });
  });

  describe('Memory Links', () => {
    it('should register memory link', async () => {
      const { app } = createTestApp();

      const res = await request(app)
        .post('/api/v1/forgetting/links')
        .send({
          sourceId: 'memory-001',
          targetId: 'memory-002',
          linkType: 'related',
          bidirectional: true
        });

      expect(res.status).toBe(201);
      expect(res.body.sourceId).toBe('memory-001');
      expect(res.body.targetId).toBe('memory-002');
    });

    it('should require sourceId and targetId', async () => {
      const { app } = createTestApp();

      const res = await request(app)
        .post('/api/v1/forgetting/links')
        .send({ sourceId: 'memory-001' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('sourceId and targetId are required');
    });

    it('should get links for memory', async () => {
      const { app } = createTestApp();

      await request(app)
        .post('/api/v1/forgetting/links')
        .send({ sourceId: 'memory-001', targetId: 'memory-002' });

      const res = await request(app)
        .get('/api/v1/forgetting/links/memory-001');

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].targetId).toBe('memory-002');
    });

    it('should delete link', async () => {
      const { app } = createTestApp();

      await request(app)
        .post('/api/v1/forgetting/links')
        .send({ sourceId: 'memory-001', targetId: 'memory-002' });

      const res = await request(app)
        .delete('/api/v1/forgetting/links/memory-001/memory-002');

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('deleted');
    });
  });

  describe('Forgetting Policies', () => {
    it('should create forgetting policy', async () => {
      const { app } = createTestApp();

      const res = await request(app)
        .post('/api/v1/forgetting/policies')
        .send({
          name: 'Customer Data Policy',
          memoryType: 'customer_data',
          retentionPeriod: { days: 365 },
          cascade: true
        });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Customer Data Policy');
      expect(res.body.status).toBe('active');
    });

    it('should require name and memoryType', async () => {
      const { app } = createTestApp();

      const res = await request(app)
        .post('/api/v1/forgetting/policies')
        .send({ name: 'Test Policy' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('name and memoryType are required');
    });

    it('should get policy by ID', async () => {
      const { app } = createTestApp();

      const createRes = await request(app)
        .post('/api/v1/forgetting/policies')
        .send({ name: 'Policy 1', memoryType: 'test' });

      const res = await request(app)
        .get(`/api/v1/forgetting/policies/${createRes.body.id}`);

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Policy 1');
    });

    it('should list policies with filters', async () => {
      const { app } = createTestApp();

      await request(app)
        .post('/api/v1/forgetting/policies')
        .send({ name: 'Policy A', memoryType: 'customer' });

      await request(app)
        .post('/api/v1/forgetting/policies')
        .send({ name: 'Policy B', memoryType: 'logs' });

      const res = await request(app)
        .get('/api/v1/forgetting/policies?memoryType=customer');

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].memoryType).toBe('customer');
    });

    it('should preview forgetting impact', async () => {
      const { app } = createTestApp();

      const createRes = await request(app)
        .post('/api/v1/forgetting/policies')
        .send({ name: 'Policy 1', memoryType: 'test' });

      const res = await request(app)
        .post(`/api/v1/forgetting/policies/${createRes.body.id}/preview`)
        .send({ memoryIds: ['id1', 'id2', 'id3'] });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('totalItems', 3);
      expect(res.body).toHaveProperty('itemsToForget');
    });
  });

  describe('Statistics', () => {
    it('should get forgetting statistics', async () => {
      const { app } = createTestApp();

      await request(app)
        .post('/api/v1/forgetting/schedule')
        .send({ memoryId: 'memory-001' });

      await request(app)
        .post('/api/v1/forgetting/forget')
        .send({ memoryId: 'memory-002', reason: 'manual' });

      await request(app)
        .post('/api/v1/forgetting/policies')
        .send({ name: 'Policy 1', memoryType: 'test' });

      const res = await request(app)
        .get('/api/v1/forgetting/stats');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('scheduled');
      expect(res.body).toHaveProperty('completed');
      expect(res.body).toHaveProperty('undoRequests');
      expect(res.body).toHaveProperty('policies');
      expect(res.body.scheduled.total).toBe(1);
      expect(res.body.completed.total).toBe(1);
    });
  });
});
