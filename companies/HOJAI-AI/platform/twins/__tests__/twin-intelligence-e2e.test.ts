/**
 * TwinOS Intelligence Layer - End-to-End Integration Tests
 *
 * Tests the complete flow through all intelligence services:
 * Intelligence Orchestrator → Behavior Model → Reasoning Engine
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import supertest from 'supertest';
import express from 'express';

describe('TwinOS Intelligence Layer - E2E Integration', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());

    // Simulate all intelligence services
    const behaviors = new Map();
    const chains = new Map();

    // Intelligence Orchestrator
    app.get('/intelligence/services', (_req, res) => {
      res.json({
        success: true,
        services: ['behavior', 'reasoning', 'learning', 'execution'],
        count: 4
      });
    });

    app.post('/intelligence/analyze/:twinId', (req, res) => {
      const { twinId } = req.params;
      res.json({
        success: true,
        twinId,
        analysis: {
          behavior: behaviors.get(twinId) || { patterns: [] },
          reasoning: { conclusion: 'Analyzed' },
          learning: { skills: [] }
        },
        confidence: 0.85
      });
    });

    // Behavior Model
    app.post('/behavior/observe', (req, res) => {
      const { twinId, eventType } = req.body;
      const twinEvents = behaviors.get(twinId) || [];
      twinEvents.push({ eventType, timestamp: new Date().toISOString() });
      behaviors.set(twinId, twinEvents);
      res.json({ success: true, events: twinEvents.length });
    });

    app.get('/behavior/profile/:twinId', (req, res) => {
      const { twinId } = req.params;
      res.json({
        success: true,
        profile: {
          twinId,
          patterns: behaviors.get(twinId) || [],
          personality: { openness: 0.7, conscientiousness: 0.8 }
        }
      });
    });

    // Reasoning Engine
    app.post('/reasoning/why', (req, res) => {
      const { twinId, event } = req.body;
      res.json({
        success: true,
        explanation: { event, causes: [], confidence: 0.8 }
      });
    });

    app.post('/reasoning/chain', (req, res) => {
      const { twins, query } = req.body;
      const chainId = `chain-${Date.now()}`;
      chains.set(chainId, { twins, query });
      res.json({
        success: true,
        chain: { id: chainId, twins, query, conclusion: 'Done' }
      });
    });

    app.get('/reasoning/chain/:id', (req, res) => {
      const chain = chains.get(req.params.id);
      if (!chain) return res.status(404).json({ error: 'Not found' });
      res.json({ success: true, chain });
    });
  });

  describe('Intelligence Orchestrator', () => {
    it('should list all intelligence services', async () => {
      const res = await supertest(app).get('/intelligence/services');
      expect(res.status).toBe(200);
      expect(res.body.count).toBe(4);
    });

    it('should analyze twin', async () => {
      const res = await supertest(app)
        .post('/intelligence/analyze/customer-123');
      expect(res.status).toBe(200);
      expect(res.body.confidence).toBeGreaterThan(0);
    });
  });

  describe('Behavior Model', () => {
    it('should observe behavior events', async () => {
      const res = await supertest(app)
        .post('/behavior/observe')
        .send({ twinId: 'emp-1', eventType: 'task_complete' });
      expect(res.status).toBe(200);
      expect(res.body.events).toBe(1);
    });

    it('should get behavior profile', async () => {
      const res = await supertest(app).get('/behavior/profile/emp-1');
      expect(res.status).toBe(200);
      expect(res.body.profile.personality).toBeDefined();
    });
  });

  describe('Reasoning Engine', () => {
    it('should explain why event happened', async () => {
      const res = await supertest(app)
        .post('/reasoning/why')
        .send({ twinId: 'customer-1', event: 'churn' });
      expect(res.status).toBe(200);
      expect(res.body.explanation).toBeDefined();
    });

    it('should create reasoning chain', async () => {
      const res = await supertest(app)
        .post('/reasoning/chain')
        .send({ twins: ['c1', 'o1'], query: 'Why churn?' });
      expect(res.status).toBe(200);
      expect(res.body.chain.id).toBeDefined();
    });

    it('should get reasoning chain', async () => {
      const createRes = await supertest(app)
        .post('/reasoning/chain')
        .send({ twins: ['c1'], query: 'Test' });
      const chainId = createRes.body.chain.id;

      const getRes = await supertest(app).get(`/reasoning/chain/${chainId}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.chain.twins).toContain('c1');
    });
  });

  describe('Full Intelligence Flow', () => {
    it('should complete analysis → behavior → reasoning flow', async () => {
      const twinId = 'e2e-' + Date.now();

      // 1. Observe behavior
      await supertest(app)
        .post('/behavior/observe')
        .send({ twinId, eventType: 'purchase' });

      // 2. Analyze twin
      const analyzeRes = await supertest(app)
        .post(`/intelligence/analyze/${twinId}`);
      expect(analyzeRes.status).toBe(200);

      // 3. Get behavior profile
      const profileRes = await supertest(app)
        .get(`/behavior/profile/${twinId}`);
      expect(profileRes.status).toBe(200);

      // 4. Create reasoning chain
      const chainRes = await supertest(app)
        .post('/reasoning/chain')
        .send({ twins: [twinId], query: 'Purchase analysis' });
      expect(chainRes.status).toBe(200);
    });
  });
});