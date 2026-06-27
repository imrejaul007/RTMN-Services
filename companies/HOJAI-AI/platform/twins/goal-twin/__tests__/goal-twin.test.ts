import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createGoalTwinService } from '../src/index.js';

describe('GoalTwin', () => {
  let app: ReturnType<typeof createGoalTwinService>;

  beforeEach(() => {
    app = createGoalTwinService();
  });

  describe('POST /api/goals', () => {
    it('should create a goal with required fields', async () => {
      const res = await request(app)
        .post('/api/goals')
        .send({
          title: 'Q3 Revenue Target',
          startDate: '2026-07-01',
          targetDate: '2026-09-30'
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.title).toBe('Q3 Revenue Target');
      expect(res.body.status).toBe('draft');
      expect(res.body.progress).toBe(0);
      expect(res.body.category).toBe('personal');
      expect(res.body.type).toBe('okr');
    });

    it('should create goal with all options', async () => {
      const res = await request(app)
        .post('/api/goals')
        .send({
          title: 'Launch New Product',
          description: 'Launch the new product line',
          category: 'team',
          type: 'project',
          priority: 'high',
          employeeId: 'emp-123',
          department: 'Engineering',
          startDate: '2026-07-01',
          targetDate: '2026-09-30',
          milestones: [{ title: 'Design Complete', dueDate: '2026-07-15' }],
          metrics: [{ name: 'Revenue', current: 0, target: 1000000, unit: '$' }]
        });

      expect(res.body.title).toBe('Launch New Product');
      expect(res.body.category).toBe('team');
      expect(res.body.type).toBe('project');
      expect(res.body.priority).toBe('high');
      expect(res.body.milestones).toHaveLength(1);
      expect(res.body.metrics).toHaveLength(1);
    });

    it('should return 400 for missing title', async () => {
      const res = await request(app)
        .post('/api/goals')
        .send({ startDate: '2026-07-01', targetDate: '2026-09-30' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Title is required');
    });

    it('should return 400 for missing dates', async () => {
      const res = await request(app)
        .post('/api/goals')
        .send({ title: 'Test Goal' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('startDate and targetDate are required');
    });
  });

  describe('GET /api/goals', () => {
    it('should return all goals', async () => {
      await request(app).post('/api/goals').send({
        title: 'Goal 1', startDate: '2026-07-01', targetDate: '2026-09-30'
      });
      await request(app).post('/api/goals').send({
        title: 'Goal 2', startDate: '2026-07-01', targetDate: '2026-09-30'
      });

      const res = await request(app).get('/api/goals');

      expect(res.status).toBe(200);
      expect(res.body.total).toBeGreaterThanOrEqual(2);
    });

    it('should filter by status', async () => {
      await request(app).post('/api/goals').send({
        title: 'Draft Goal', startDate: '2026-07-01', targetDate: '2026-09-30', status: 'draft'
      });
      await request(app).post('/api/goals').send({
        title: 'Active Goal', startDate: '2026-07-01', targetDate: '2026-09-30'
      });

      // Update first to active
      const list = await request(app).get('/api/goals?title=Draft Goal');
      await request(app).put(`/api/goals/${list.body.goals[0].id}`).send({ status: 'active' });

      const res = await request(app).get('/api/goals?status=active');
      expect(res.body.goals.every((g: any) => g.status === 'active')).toBe(true);
    });

    it('should filter by type', async () => {
      await request(app).post('/api/goals').send({
        title: 'OKR Goal', startDate: '2026-07-01', targetDate: '2026-09-30', type: 'okr'
      });
      await request(app).post('/api/goals').send({
        title: 'KPI Goal', startDate: '2026-07-01', targetDate: '2026-09-30', type: 'kpi'
      });

      const res = await request(app).get('/api/goals?type=okr');
      expect(res.body.goals.every((g: any) => g.type === 'okr')).toBe(true);
    });

    it('should filter by employeeId', async () => {
      await request(app).post('/api/goals').send({
        title: 'Emp1 Goal', startDate: '2026-07-01', targetDate: '2026-09-30', employeeId: 'emp-1'
      });
      await request(app).post('/api/goals').send({
        title: 'Emp2 Goal', startDate: '2026-07-01', targetDate: '2026-09-30', employeeId: 'emp-2'
      });

      const res = await request(app).get('/api/goals?employeeId=emp-1');
      expect(res.body.goals.every((g: any) => g.employeeId === 'emp-1')).toBe(true);
    });
  });

  describe('GET /api/goals/:id', () => {
    it('should return goal by id', async () => {
      const createRes = await request(app).post('/api/goals').send({
        title: 'Findable Goal', startDate: '2026-07-01', targetDate: '2026-09-30'
      });

      const res = await request(app).get(`/api/goals/${createRes.body.id}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(createRes.body.id);
    });

    it('should return 404 for non-existent goal', async () => {
      const res = await request(app).get('/api/goals/non-existent-id');
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/goals/:id', () => {
    it('should update goal', async () => {
      const createRes = await request(app).post('/api/goals').send({
        title: 'Original Title', startDate: '2026-07-01', targetDate: '2026-09-30'
      });

      const res = await request(app)
        .put(`/api/goals/${createRes.body.id}`)
        .send({ title: 'Updated Title', progress: 50 });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Updated Title');
      expect(res.body.progress).toBe(50);
    });

    it('should set completedAt when status changes to completed', async () => {
      const createRes = await request(app).post('/api/goals').send({
        title: 'Complete Me', startDate: '2026-07-01', targetDate: '2026-09-30'
      });

      const res = await request(app)
        .put(`/api/goals/${createRes.body.id}`)
        .send({ status: 'completed' });

      expect(res.body.status).toBe('completed');
      expect(res.body.completedAt).toBeDefined();
      expect(res.body.progress).toBe(100);
    });

    it('should return 404 for non-existent goal', async () => {
      const res = await request(app).put('/api/goals/non-existent-id').send({ title: 'Update' });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/goals/:id', () => {
    it('should delete goal', async () => {
      const createRes = await request(app).post('/api/goals').send({
        title: 'Delete Me', startDate: '2026-07-01', targetDate: '2026-09-30'
      });

      const deleteRes = await request(app).delete(`/api/goals/${createRes.body.id}`);
      expect(deleteRes.status).toBe(204);

      const getRes = await request(app).get(`/api/goals/${createRes.body.id}`);
      expect(getRes.status).toBe(404);
    });
  });

  describe('POST /api/goals/:id/milestones', () => {
    it('should add milestone to goal', async () => {
      const createRes = await request(app).post('/api/goals').send({
        title: 'Goal with Milestone', startDate: '2026-07-01', targetDate: '2026-09-30'
      });

      const res = await request(app)
        .post(`/api/goals/${createRes.body.id}/milestones`)
        .send({ title: 'Phase 1 Complete', dueDate: '2026-08-01' });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe('Phase 1 Complete');
      expect(res.body.status).toBe('pending');
    });

    it('should return 400 for missing title', async () => {
      const createRes = await request(app).post('/api/goals').send({
        title: 'Goal', startDate: '2026-07-01', targetDate: '2026-09-30'
      });

      const res = await request(app)
        .post(`/api/goals/${createRes.body.id}/milestones`)
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/goals/:id/milestones/:milestoneId', () => {
    it('should update milestone', async () => {
      const createRes = await request(app).post('/api/goals').send({
        title: 'Goal', startDate: '2026-07-01', targetDate: '2026-09-30',
        milestones: [{ title: 'Initial Milestone' }]
      });

      const milestoneId = createRes.body.milestones[0].id;

      const res = await request(app)
        .put(`/api/goals/${createRes.body.id}/milestones/${milestoneId}`)
        .send({ status: 'completed' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('completed');
      expect(res.body.completedAt).toBeDefined();
    });
  });

  describe('PUT /api/goals/:id/metrics/:metricId', () => {
    it('should update metric and auto-update progress', async () => {
      const createRes = await request(app).post('/api/goals').send({
        title: 'Goal', startDate: '2026-07-01', targetDate: '2026-09-30',
        metrics: [{ name: 'Revenue', current: 0, target: 100000 }]
      });

      const metricId = createRes.body.metrics[0].id;

      const res = await request(app)
        .put(`/api/goals/${createRes.body.id}/metrics/${metricId}`)
        .send({ current: 50000 });

      expect(res.status).toBe(200);
      expect(res.body.current).toBe(50000);

      // Check goal progress updated
      const goalRes = await request(app).get(`/api/goals/${createRes.body.id}`);
      expect(goalRes.body.progress).toBe(50);
    });
  });

  describe('GET /api/goals/analytics', () => {
    it('should return goal analytics', async () => {
      const testApp = createGoalTwinService();
      await request(testApp).post('/api/goals').send({
        title: 'Goal 1', startDate: '2026-07-01', targetDate: '2026-09-30', status: 'active', type: 'okr'
      });
      await request(testApp).post('/api/goals').send({
        title: 'Goal 2', startDate: '2026-07-01', targetDate: '2026-09-30', status: 'completed', type: 'kpi'
      });

      const res = await request(testApp).get('/api/goals/analytics');

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(2);
      expect(res.body.byStatus).toBeDefined();
      expect(res.body.byType).toBeDefined();
      expect(res.body.completionRate).toBeDefined();
    });
  });

  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body.service).toBe('goal-twin');
    });
  });
});