/**
 * CorpID Lifecycle Tests
 */
import { describe, it, expect } from 'vitest';
import express from 'express';
import { body, validationResult } from 'express-validator';
import request from 'supertest';

const LIFECYCLE_STATES = {
  INVITED: 'invited', ONBOARDING: 'onboarding', ACTIVE: 'active',
  PROBATION: 'probation', SUSPENDED: 'suspended', TRANSFERRED: 'transferred',
  OFFBOARDING: 'offboarding', ARCHIVED: 'archived', DELETED: 'deleted',
};

const LIFECYCLE_TRANSITIONS = {
  invited: ['onboarding'], onboarding: ['active', 'probation'],
  active: ['suspended', 'offboarding', 'transferred'],
  probation: ['active', 'suspended', 'offboarding'],
  suspended: ['active', 'offboarding'], transferred: ['active'],
  offboarding: ['archived'], archived: ['active'], deleted: [],
};

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const sanitizeInput = (obj) => obj;
const NotFoundError = class extends Error { constructor(m) { super(m); this.status = 404; } };

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
  next();
}

function createApp() {
  const requireAuth = (req, res, next) => {
    if (!req.headers.authorization) return res.status(401).json({ error: 'Unauthorized' });
    req.user = { id: 'CI-IND-admin' };
    next();
  };

  const app = express();
  app.use(express.json());

  app.get('/api/lifecycle/states', (req, res) => {
    res.json({ success: true, states: LIFECYCLE_STATES, transitions: LIFECYCLE_TRANSITIONS });
  });

  app.get('/api/lifecycle/:entityId/state', requireAuth, asyncHandler(async (req, res) => {
    const { entityId } = req.params;
    if (!entityId || entityId.length < 3) throw new NotFoundError('Entity not found');
    res.json({ success: true, entityId, state: 'active', allowedTransitions: ['suspended', 'offboarding'] });
  }));

  app.post('/api/lifecycle/:entityId/transition', [
    requireAuth,
    body('toState').isIn(Object.values(LIFECYCLE_STATES)),
    validate,
  ], asyncHandler(async (req, res) => {
    const { entityId } = req.params;
    const { toState } = sanitizeInput(req.body);
    if (!entityId.startsWith('CI-')) throw new NotFoundError('Entity not found');
    res.json({ success: true, entityId, fromState: 'active', toState });
  }));

  app.use((err, req, res) => res.status(err.status || 500).json({ error: err.message }));
  return app;
}

describe('CorpID Lifecycle', () => {
  describe('GET /api/lifecycle/states', () => {
    it('returns all states without auth', async () => {
      const res = await request(createApp()).get('/api/lifecycle/states');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Object.values(res.body.states)).toContain('active');
    });

    it('includes valid transitions', async () => {
      const res = await request(createApp()).get('/api/lifecycle/states');
      expect(res.body.transitions.active).toContain('suspended');
      expect(res.body.transitions.invited).toContain('onboarding');
    });
  });

  describe('GET /api/lifecycle/:entityId/state', () => {
    it('returns state for valid entity', async () => {
      const res = await request(createApp())
        .get('/api/lifecycle/CI-USER-123')
        .set('Authorization', 'Bearer test');
      expect(res.status).toBe(200);
      expect(res.body.state).toBeDefined();
    });
  });

  describe('POST /api/lifecycle/:entityId/transition', () => {
    it('accepts valid transition', async () => {
      const res = await request(createApp())
        .post('/api/lifecycle/CI-AGT-agent1/transition')
        .set('Authorization', 'Bearer test')
        .send({ toState: 'suspended' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.toState).toBe('suspended');
    });

    it('rejects invalid state', async () => {
      const res = await request(createApp())
        .post('/api/lifecycle/CI-AGT-agent1/transition')
        .set('Authorization', 'Bearer test')
        .send({ toState: 'invalid' });
      expect(res.status).toBe(400);
    });
  });
});
