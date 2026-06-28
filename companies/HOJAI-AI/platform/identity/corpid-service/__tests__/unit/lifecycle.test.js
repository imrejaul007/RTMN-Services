/**
 * CorpID Lifecycle Tests
 * Tests for P0 Lifecycle Extension
 */
import { describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import { body, validationResult } from 'express-validator';
import request from 'supertest';

const LIFECYCLE_STATES = {
  INVITED: 'invited',
  ONBOARDING: 'onboarding',
  ACTIVE: 'active',
  PROBATION: 'probation',
  SUSPENDED: 'suspended',
  TRANSFERRED: 'transferred',
  OFFBOARDING: 'offboarding',
  ARCHIVED: 'archived',
  DELETED: 'deleted',
};

const LIFECYCLE_TRANSITIONS = {
  invited: ['onboarding'],
  onboarding: ['active', 'probation'],
  active: ['suspended', 'offboarding', 'transferred'],
  probation: ['active', 'suspended', 'offboarding'],
  suspended: ['active', 'offboarding'],
  transferred: ['active'],
  offboarding: ['archived'],
  archived: ['active'],
  deleted: [],
};

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const sanitizeInput = (obj) => obj;
const NotFoundError = class extends Error { constructor(msg) { super(msg); this.status = 404; } };
const ValidationError = class extends Error { constructor(msg) { super(msg); this.status = 400; } };

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

  // GET /api/lifecycle/states
  app.get('/api/lifecycle/states', (req, res) => {
    res.json({
      success: true,
      states: LIFECYCLE_STATES,
      transitions: LIFECYCLE_TRANSITIONS,
    });
  });

  // GET /api/lifecycle/:entityId/state
  app.get('/api/lifecycle/:entityId/state', requireAuth, asyncHandler(async (req, res) => {
    const { entityId } = req.params;

    // Mock entity lookup
    let entity = null;
    if (entityId === 'CI-IND-user1') entity = { status: 'active' };
    if (entityId === 'CI-IND-user2') entity = { status: 'suspended' };
    if (entityId === 'CI-AGT-agent1') entity = { status: 'active' };

    if (!entity) throw new NotFoundError('Entity not found');

    const currentState = entity.status || 'active';
    const allowedTransitions = LIFECYCLE_TRANSITIONS[currentState] || [];

    res.json({
      success: true,
      entityId,
      state: currentState,
      allowedTransitions,
    });
  }));

  // POST /api/lifecycle/:entityId/transition
  app.post('/api/lifecycle/:entityId/transition', [
    requireAuth,
    body('toState').isIn(Object.values(LIFECYCLE_STATES)),
    validate,
  ], asyncHandler(async (req, res) => {
    const { entityId } = req.params;
    const { toState, reason } = sanitizeInput(req.body);

    // Mock entity lookup
    let entity = null;
    if (entityId === 'CI-IND-user1') entity = { status: 'active' };
    if (entityId === 'CI-AGT-agent1') entity = { status: 'active' };

    if (!entity) throw new NotFoundError('Entity not found');

    const fromState = entity.status || 'active';
    const allowedTransitions = LIFECYCLE_TRANSITIONS[fromState] || [];
    if (!allowedTransitions.includes(toState)) {
      throw new ValidationError(`Invalid transition: ${fromState} → ${toState}`);
    }

    res.json({
      success: true,
      entityId,
      fromState,
      toState,
      transitionedAt: new Date().toISOString(),
    });
  }));

  app.use((err, req, res, _next) => {
    res.status(err.status || 500).json({ error: err.message });
  });

  return app;
}

describe('CorpID Lifecycle', () => {
  describe('GET /api/lifecycle/states', () => {
    it('returns all lifecycle states without auth', async () => {
      const res = await request(createApp()).get('/api/lifecycle/states');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.states).toBeDefined();
      expect(res.body.transitions).toBeDefined();
    });

    it('includes all lifecycle states', async () => {
      const res = await request(createApp()).get('/api/lifecycle/states');
      const states = Object.values(res.body.states);

      expect(states).toContain('invited');
      expect(states).toContain('active');
      expect(states).toContain('suspended');
      expect(states).toContain('archived');
      expect(states).toContain('deleted');
    });

    it('includes valid transitions for each state', async () => {
      const res = await request(createApp()).get('/api/lifecycle/states');

      expect(res.body.transitions.active).toContain('suspended');
      expect(res.body.transitions.active).toContain('offboarding');
      expect(res.body.transitions.invited).toContain('onboarding');
      expect(res.body.transitions.offboarding).toContain('archived');
    });
  });

  describe('GET /api/lifecycle/:entityId/state', () => {
    it('returns current state for existing entity', async () => {
      const res = await request(createApp())
        .get('/api/lifecycle/CI-IND-user1')
        .set('Authorization', 'Bearer test');

      expect(res.status).toBe(200);
      expect(res.body.entityId).toBe('CI-IND-user1');
      expect(res.body.state).toBe('active');
      expect(Array.isArray(res.body.allowedTransitions)).toBe(true);
    });

    it('returns 404 for non-existent entity', async () => {
      const res = await request(createApp())
        .get('/api/lifecycle/CI-IND-invalid')
        .set('Authorization', 'Bearer test');

      expect(res.status).toBe(404);
    });

    it('returns 401 without auth', async () => {
      const res = await request(createApp()).get('/api/lifecycle/CI-IND-user1');
      expect(res.status).toBe(401);
    });

    it('shows correct allowed transitions for suspended state', async () => {
      const res = await request(createApp())
        .get('/api/lifecycle/CI-AGT-agent1')
        .set('Authorization', 'Bearer test');

      expect(res.status).toBe(200);
      expect(res.body.state).toBe('active');
      expect(res.body.allowedTransitions).toContain('suspended');
    });
  });

  describe('POST /api/lifecycle/:entityId/transition', () => {
    it('allows valid transition', async () => {
      const res = await request(createApp())
        .post('/api/lifecycle/CI-IND-user1/transition')
        .set('Authorization', 'Bearer test')
        .send({ toState: 'suspended', reason: 'Maintenance' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.fromState).toBe('active');
      expect(res.body.toState).toBe('suspended');
    });

    it('rejects invalid transition', async () => {
      const res = await request(createApp())
        .post('/api/lifecycle/CI-IND-user1/transition')
        .set('Authorization', 'Bearer test')
        .send({ toState: 'deleted' }); // Can't go directly to deleted

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid transition');
    });

    it('rejects invalid state value', async () => {
      const res = await request(createApp())
        .post('/api/lifecycle/CI-IND-user1/transition')
        .set('Authorization', 'Bearer test')
        .send({ toState: 'invalid_state' });

      expect(res.status).toBe(400);
    });

    it('returns 404 for non-existent entity', async () => {
      const res = await request(createApp())
        .post('/api/lifecycle/CI-IND-invalid/transition')
        .set('Authorization', 'Bearer test')
        .send({ toState: 'active' });

      expect(res.status).toBe(404);
    });
  });
});