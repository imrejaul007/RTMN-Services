/**
 * Goal Twin Service Tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import supertest from 'supertest';
import { createGoalTwinService } from './index';

describe('Goal Twin Service', () => {
  let app: ReturnType<typeof createGoalTwinService>;

  beforeEach(() => {
    app = createGoalTwinService();
  });

  describe('POST /api/goals', () => {
    it('should create goal', async () => {
      const res = await supertest(app)
        .post('/api/goals')
        .send({
          title: 'Increase Sales',
          startDate: '2026-01-01',
          targetDate: '2026-12-31'
        });
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        title: 'Increase Sales',
        status: 'draft',
        progress: 0
      });
    });

    it('should require title', async () => {
      const res = await supertest(app)
        .post('/api/goals')
        .send({ startDate: '2026-01-01', targetDate: '2026-12-31' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Title');
    });

    it('should require dates', async () => {
      const res = await supertest(app)
        .post('/api/goals')
        .send({ title: 'Test Goal' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('startDate');
    });

    it('should set defaults', async () => {
      const res = await supertest(app)
        .post('/api/goals')
        .send({
          title: 'Test',
          startDate: '2026-01-01',
          targetDate: '2026-12-31'
        });
      expect(res.body.category).toBe('personal');
      expect(res.body.type).toBe('okr');
      expect(res.body.priority).toBe('medium');
    });
  });

  describe('GET /api/goals', () => {
    it('should list all goals', async () => {
      await supertest(app).post('/api/goals').send({ title: 'Goal1', startDate: '2026-01-01', targetDate: '2026-12-31' });
      await supertest(app).post('/api/goals').send({ title: 'Goal2', startDate: '2026-01-01', targetDate: '2026-12-31' });
      const res = await supertest(app).get('/api/goals');
      expect(res.body.total).toBe(2);
    });

    it('should filter by status', async () => {
      await supertest(app).post('/api/goals').send({ title: 'Active', startDate: '2026-01-01', targetDate: '2026-12-31' });
      await supertest(app).post('/api/goals').send({ title: 'Draft', startDate: '2026-01-01', targetDate: '2026-12-31' });
      const res = await supertest(app).get('/api/goals?status=draft');
      expect(res.body.total).toBe(1);
    });
  });

  describe('GET /api/goals/:id', () => {
    it('should get goal by id', async () => {
      const create = await supertest(app)
        .post('/api/goals')
        .send({ title: 'Test', startDate: '2026-01-01', targetDate: '2026-12-31' });
      const res = await supertest(app).get(`/api/goals/${create.body.id}`);
      expect(res.status).toBe(200);
    });

    it('should return 404 for unknown id', async () => {
      const res = await supertest(app).get('/api/goals/unknown');
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/goals/:id', () => {
    it('should update goal', async () => {
      const create = await supertest(app)
        .post('/api/goals')
        .send({ title: 'Test', startDate: '2026-01-01', targetDate: '2026-12-31' });
      const res = await supertest(app)
        .put(`/api/goals/${create.body.id}`)
        .send({ title: 'Updated', status: 'active' });
      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Updated');
      expect(res.body.status).toBe('active');
    });

    it('should auto-complete when status is completed', async () => {
      const create = await supertest(app)
        .post('/api/goals')
        .send({ title: 'Test', startDate: '2026-01-01', targetDate: '2026-12-31' });
      const res = await supertest(app)
        .put(`/api/goals/${create.body.id}`)
        .send({ status: 'completed' });
      expect(res.body.completedAt).toBeDefined();
      expect(res.body.progress).toBe(100);
    });
  });

  describe('DELETE /api/goals/:id', () => {
    it('should delete goal', async () => {
      const create = await supertest(app)
        .post('/api/goals')
        .send({ title: 'Test', startDate: '2026-01-01', targetDate: '2026-12-31' });
      await supertest(app).delete(`/api/goals/${create.body.id}`).expect(204);
    });
  });

  describe('POST /api/goals/:id/milestones', () => {
    it('should add milestone', async () => {
      const create = await supertest(app)
        .post('/api/goals')
        .send({ title: 'Test', startDate: '2026-01-01', targetDate: '2026-12-31' });
      const res = await supertest(app)
        .post(`/api/goals/${create.body.id}/milestones`)
        .send({ title: 'Phase 1' });
      expect(res.status).toBe(201);
      expect(res.body.title).toBe('Phase 1');
      expect(res.body.status).toBe('pending');
    });
  });

  describe('PUT /api/goals/:id/milestones/:milestoneId', () => {
    it('should update milestone', async () => {
      const create = await supertest(app)
        .post('/api/goals')
        .send({ title: 'Test', startDate: '2026-01-01', targetDate: '2026-12-31' });
      const milestone = await supertest(app)
        .post(`/api/goals/${create.body.id}/milestones`)
        .send({ title: 'Phase 1' });
      const res = await supertest(app)
        .put(`/api/goals/${create.body.id}/milestones/${milestone.body.id}`)
        .send({ status: 'completed' });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('completed');
    });
  });

  describe('PUT /api/goals/:id/metrics/:metricId', () => {
    it('should update metric and auto-calculate progress', async () => {
      const create = await supertest(app)
        .post('/api/goals')
        .send({
          title: 'Test',
          startDate: '2026-01-01',
          targetDate: '2026-12-31',
          metrics: [{ name: 'Sales', current: 0, target: 100 }]
        });
      const goal = await supertest(app).get(`/api/goals/${create.body.id}`);
      const metricId = goal.body.metrics[0].id;

      const res = await supertest(app)
        .put(`/api/goals/${create.body.id}/metrics/${metricId}`)
        .send({ current: 50 });

      expect(res.status).toBe(200);
      // Check updated progress
      const updated = await supertest(app).get(`/api/goals/${create.body.id}`);
      expect(updated.body.progress).toBe(50);
    });
  });

  describe('GET /api/goals/analytics', () => {
    it('should return analytics', async () => {
      await supertest(app).post('/api/goals').send({ title: 'Goal1', startDate: '2026-01-01', targetDate: '2026-12-31', type: 'okr', status: 'active' });
      await supertest(app).post('/api/goals').send({ title: 'Goal2', startDate: '2026-01-01', targetDate: '2026-12-31', type: 'kpi', status: 'completed' });
      const res = await supertest(app).get('/api/goals/analytics');
      expect(res.body.total).toBe(2);
      expect(res.body.byType).toMatchObject({ okr: 1, kpi: 1 });
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const res = await supertest(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.service).toBe('goal-twin');
    });
  });
});
