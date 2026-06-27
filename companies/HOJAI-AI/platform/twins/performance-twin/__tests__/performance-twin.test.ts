import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createPerformanceTwinService } from '../src/index.js';

describe('PerformanceTwin', () => {
  let app: ReturnType<typeof createPerformanceTwinService>;

  beforeEach(() => {
    app = createPerformanceTwinService();
  });

  describe('POST /api/performance', () => {
    it('should create a performance record', async () => {
      const res = await request(app)
        .post('/api/performance')
        .send({ employeeId: 'emp-123', period: 'quarterly' });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.employeeId).toBe('emp-123');
      expect(res.body.period).toBe('quarterly');
      expect(res.body.status).toBe('draft');
    });

    it('should create with metrics and auto-calculate score', async () => {
      const res = await request(app)
        .post('/api/performance')
        .send({
          employeeId: 'emp-123',
          period: 'quarterly',
          metrics: [
            { name: 'Quality', description: 'Work quality', weight: 0.4, score: 85, maxScore: 100 },
            { name: 'Productivity', description: 'Output', weight: 0.6, score: 90, maxScore: 100 }
          ]
        });

      expect(res.body.overallScore).toBe(88);
      expect(res.body.rating).toBe('meets_expectations');
    });

    it('should return 400 for missing fields', async () => {
      const res = await request(app).post('/api/performance').send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('employeeId and period are required');
    });
  });

  describe('GET /api/performance', () => {
    it('should return all records', async () => {
      await request(app).post('/api/performance').send({ employeeId: 'emp-1', period: 'monthly' });
      await request(app).post('/api/performance').send({ employeeId: 'emp-2', period: 'monthly' });

      const res = await request(app).get('/api/performance');
      expect(res.body.total).toBeGreaterThanOrEqual(2);
    });

    it('should filter by employeeId', async () => {
      await request(app).post('/api/performance').send({ employeeId: 'emp-1', period: 'monthly' });
      await request(app).post('/api/performance').send({ employeeId: 'emp-2', period: 'monthly' });

      const res = await request(app).get('/api/performance?employeeId=emp-1');
      expect(res.body.records.every((r: any) => r.employeeId === 'emp-1')).toBe(true);
    });

    it('should filter by rating', async () => {
      await request(app).post('/api/performance').send({
        employeeId: 'emp-1', period: 'monthly',
        metrics: [{ name: 'Test', weight: 1, score: 95, maxScore: 100 }]
      });

      const res = await request(app).get('/api/performance?rating=exceeds_expectations');
      expect(res.body.records.every((r: any) => r.rating === 'exceeds_expectations')).toBe(true);
    });
  });

  describe('GET /api/performance/:id', () => {
    it('should return record by id', async () => {
      const createRes = await request(app).post('/api/performance').send({
        employeeId: 'emp-123', period: 'quarterly'
      });

      const res = await request(app).get(`/api/performance/${createRes.body.id}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(createRes.body.id);
    });

    it('should return 404 for non-existent', async () => {
      const res = await request(app).get('/api/performance/non-existent');
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/performance/:id', () => {
    it('should update record', async () => {
      const createRes = await request(app).post('/api/performance').send({
        employeeId: 'emp-123', period: 'quarterly'
      });

      const res = await request(app)
        .put(`/api/performance/${createRes.body.id}`)
        .send({ overallScore: 85 });

      expect(res.status).toBe(200);
      expect(res.body.overallScore).toBe(85);
      expect(res.body.rating).toBe('meets_expectations');
    });

    it('should update status and set timestamps', async () => {
      const createRes = await request(app).post('/api/performance').send({
        employeeId: 'emp-123', period: 'quarterly'
      });

      const res = await request(app)
        .put(`/api/performance/${createRes.body.id}`)
        .send({ status: 'submitted' });

      expect(res.body.status).toBe('submitted');
      expect(res.body.submittedAt).toBeDefined();
    });
  });

  describe('DELETE /api/performance/:id', () => {
    it('should delete record', async () => {
      const createRes = await request(app).post('/api/performance').send({
        employeeId: 'emp-123', period: 'quarterly'
      });

      const deleteRes = await request(app).delete(`/api/performance/${createRes.body.id}`);
      expect(deleteRes.status).toBe(204);
    });
  });

  describe('POST /api/performance/:id/feedback', () => {
    it('should add feedback', async () => {
      const createRes = await request(app).post('/api/performance').send({
        employeeId: 'emp-123', period: 'quarterly'
      });

      const res = await request(app)
        .post(`/api/performance/${createRes.body.id}/feedback`)
        .send({
          reviewerId: 'mgr-1',
          reviewerName: 'Manager Smith',
          type: 'manager',
          comment: 'Great work this quarter!'
        });

      expect(res.status).toBe(201);
      expect(res.body.reviewerName).toBe('Manager Smith');
      expect(res.body.type).toBe('manager');
    });

    it('should return 400 for missing fields', async () => {
      const createRes = await request(app).post('/api/performance').send({
        employeeId: 'emp-123', period: 'quarterly'
      });

      const res = await request(app)
        .post(`/api/performance/${createRes.body.id}/feedback`)
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/performance/analytics', () => {
    it('should return analytics', async () => {
      const testApp = createPerformanceTwinService();
      await request(testApp).post('/api/performance').send({
        employeeId: 'emp-1', period: 'quarterly',
        metrics: [{ name: 'Test', weight: 1, score: 80, maxScore: 100 }]
      });
      await request(testApp).post('/api/performance').send({
        employeeId: 'emp-2', period: 'monthly',
        metrics: [{ name: 'Test', weight: 1, score: 95, maxScore: 100 }]
      });

      const res = await request(testApp).get('/api/performance/analytics');
      expect(res.status).toBe(200);
      expect(res.body.total).toBe(2);
      expect(res.body.avgScore).toBeDefined();
    });
  });

  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.service).toBe('performance-twin');
    });
  });
});