/**
 * Performance Twin Service Tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import supertest from 'supertest';
import { createPerformanceTwinService } from './index';

describe('Performance Twin Service', () => {
  let app: ReturnType<typeof createPerformanceTwinService>;

  beforeEach(() => {
    app = createPerformanceTwinService();
  });

  describe('POST /api/performance', () => {
    it('should create performance record', async () => {
      const res = await supertest(app)
        .post('/api/performance')
        .send({ employeeId: 'emp-1', period: 'quarterly' });
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        employeeId: 'emp-1',
        period: 'quarterly',
        status: 'draft'
      });
    });

    it('should require employeeId and period', async () => {
      const res = await supertest(app)
        .post('/api/performance')
        .send({ employeeId: 'emp-1' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('required');
    });

    it('should calculate score from metrics', async () => {
      const res = await supertest(app)
        .post('/api/performance')
        .send({
          employeeId: 'emp-1',
          period: 'quarterly',
          metrics: [
            { name: 'Quality', weight: 0.5, score: 80, maxScore: 100 },
            { name: 'Speed', weight: 0.5, score: 90, maxScore: 100 }
          ]
        });
      expect(res.body.overallScore).toBe(85);
      expect(res.body.rating).toBe('meets_expectations');
    });

    it('should set exceeds_expectations for high scores', async () => {
      const res = await supertest(app)
        .post('/api/performance')
        .send({
          employeeId: 'emp-1',
          period: 'quarterly',
          metrics: [{ name: 'Quality', weight: 1, score: 95, maxScore: 100 }]
        });
      expect(res.body.rating).toBe('exceeds_expectations');
    });
  });

  describe('GET /api/performance', () => {
    it('should list all records', async () => {
      await supertest(app).post('/api/performance').send({ employeeId: 'emp-1', period: 'quarterly' });
      await supertest(app).post('/api/performance').send({ employeeId: 'emp-2', period: 'monthly' });
      const res = await supertest(app).get('/api/performance');
      expect(res.body.total).toBe(2);
    });

    it('should filter by employeeId', async () => {
      await supertest(app).post('/api/performance').send({ employeeId: 'emp-1', period: 'quarterly' });
      await supertest(app).post('/api/performance').send({ employeeId: 'emp-2', period: 'quarterly' });
      const res = await supertest(app).get('/api/performance?employeeId=emp-1');
      expect(res.body.total).toBe(1);
    });

    it('should filter by rating', async () => {
      await supertest(app).post('/api/performance').send({
        employeeId: 'emp-1',
        period: 'quarterly',
        metrics: [{ name: 'Quality', weight: 1, score: 95, maxScore: 100 }]
      });
      const res = await supertest(app).get('/api/performance?rating=exceeds_expectations');
      expect(res.body.total).toBe(1);
    });
  });

  describe('GET /api/performance/:id', () => {
    it('should get record by id', async () => {
      const create = await supertest(app)
        .post('/api/performance')
        .send({ employeeId: 'emp-1', period: 'quarterly' });
      const res = await supertest(app).get(`/api/performance/${create.body.id}`);
      expect(res.status).toBe(200);
    });

    it('should return 404 for unknown id', async () => {
      const res = await supertest(app).get('/api/performance/unknown');
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/performance/:id', () => {
    it('should update record', async () => {
      const create = await supertest(app)
        .post('/api/performance')
        .send({ employeeId: 'emp-1', period: 'quarterly' });
      const res = await supertest(app)
        .put(`/api/performance/${create.body.id}`)
        .send({ status: 'submitted', strengths: ['Good communication'] });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('submitted');
      expect(res.body.submittedAt).toBeDefined();
    });

    it('should recalculate rating when metrics updated', async () => {
      const create = await supertest(app)
        .post('/api/performance')
        .send({ employeeId: 'emp-1', period: 'quarterly' });
      const res = await supertest(app)
        .put(`/api/performance/${create.body.id}`)
        .send({
          metrics: [{ name: 'Quality', weight: 1, score: 55, maxScore: 100 }]
        });
      // 55% = needs_improvement (50-70 range)
      expect(res.body.rating).toBe('needs_improvement');
    });
  });

  describe('DELETE /api/performance/:id', () => {
    it('should delete record', async () => {
      const create = await supertest(app)
        .post('/api/performance')
        .send({ employeeId: 'emp-1', period: 'quarterly' });
      await supertest(app).delete(`/api/performance/${create.body.id}`).expect(204);
    });
  });

  describe('POST /api/performance/:id/feedback', () => {
    it('should add feedback', async () => {
      const create = await supertest(app)
        .post('/api/performance')
        .send({ employeeId: 'emp-1', period: 'quarterly' });
      const res = await supertest(app)
        .post(`/api/performance/${create.body.id}/feedback`)
        .send({
          reviewerId: 'rev-1',
          reviewerName: 'Manager',
          type: 'manager',
          comment: 'Great work!'
        });
      expect(res.status).toBe(201);
      expect(res.body.comment).toBe('Great work!');
    });

    it('should require feedback fields', async () => {
      const create = await supertest(app)
        .post('/api/performance')
        .send({ employeeId: 'emp-1', period: 'quarterly' });
      const res = await supertest(app)
        .post(`/api/performance/${create.body.id}/feedback`)
        .send({ reviewerId: 'rev-1' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/performance/analytics', () => {
    it('should return analytics', async () => {
      await supertest(app).post('/api/performance').send({
        employeeId: 'emp-1',
        period: 'quarterly',
        metrics: [{ name: 'Quality', weight: 1, score: 80, maxScore: 100 }]
      });
      const res = await supertest(app).get('/api/performance/analytics');
      expect(res.body.total).toBe(1);
      expect(res.body.avgScore).toBe(80);
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const res = await supertest(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.service).toBe('performance-twin');
    });
  });
});
