/**
 * Engagement Twin Service Tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import supertest from 'supertest';
import { createEngagementTwinService } from './index';

describe('Engagement Twin Service', () => {
  let app: ReturnType<typeof createEngagementTwinService>;

  beforeEach(() => {
    app = createEngagementTwinService();
  });

  describe('POST /api/engagement', () => {
    it('should create engagement survey', async () => {
      const res = await supertest(app)
        .post('/api/engagement')
        .send({ employeeId: 'emp-1', period: '2026-Q2' });
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        employeeId: 'emp-1',
        period: '2026-Q2',
        status: 'pending'
      });
    });

    it('should require employeeId and period', async () => {
      const res = await supertest(app)
        .post('/api/engagement')
        .send({ employeeId: 'emp-1' });
      expect(res.status).toBe(400);
    });

    it('should calculate overall score from dimensions', async () => {
      const dimensions = [
        { name: 'Satisfaction', score: 80, questions: ['Q1'] },
        { name: 'Growth', score: 70, questions: ['Q2'] }
      ];
      const res = await supertest(app)
        .post('/api/engagement')
        .send({ employeeId: 'emp-1', period: '2026-Q2', dimensions });
      expect(res.body.overallScore).toBe(75);
    });
  });

  describe('GET /api/engagement', () => {
    it('should list all surveys', async () => {
      await supertest(app).post('/api/engagement').send({ employeeId: 'emp-1', period: '2026-Q2' });
      await supertest(app).post('/api/engagement').send({ employeeId: 'emp-2', period: '2026-Q2' });
      const res = await supertest(app).get('/api/engagement');
      expect(res.body.total).toBe(2);
    });

    it('should filter by status', async () => {
      await supertest(app).post('/api/engagement').send({ employeeId: 'emp-1', period: '2026-Q2' });
      const res = await supertest(app).get('/api/engagement?status=pending');
      expect(res.body.total).toBe(1);
    });
  });

  describe('GET /api/engagement/:id', () => {
    it('should get survey by id', async () => {
      const create = await supertest(app)
        .post('/api/engagement')
        .send({ employeeId: 'emp-1', period: '2026-Q2' });
      const res = await supertest(app).get(`/api/engagement/${create.body.id}`);
      expect(res.status).toBe(200);
    });

    it('should return 404 for unknown id', async () => {
      const res = await supertest(app).get('/api/engagement/unknown');
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/engagement/:id', () => {
    it('should update survey status', async () => {
      const create = await supertest(app)
        .post('/api/engagement')
        .send({ employeeId: 'emp-1', period: '2026-Q2' });
      const res = await supertest(app)
        .put(`/api/engagement/${create.body.id}`)
        .send({ status: 'completed' });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('completed');
      expect(res.body.completedAt).toBeDefined();
    });
  });

  describe('DELETE /api/engagement/:id', () => {
    it('should delete survey', async () => {
      const create = await supertest(app)
        .post('/api/engagement')
        .send({ employeeId: 'emp-1', period: '2026-Q2' });
      await supertest(app).delete(`/api/engagement/${create.body.id}`).expect(204);
    });
  });

  describe('GET /api/engagement/analytics', () => {
    it('should return analytics', async () => {
      await supertest(app).post('/api/engagement').send({
        employeeId: 'emp-1',
        period: '2026-Q2',
        dimensions: [{ name: 'Satisfaction', score: 80, questions: [] }]
      });
      const res = await supertest(app).get('/api/engagement/analytics');
      expect(res.status).toBe(200);
      expect(res.body.avgScore).toBe(80);
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const res = await supertest(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.service).toBe('engagement-twin');
    });
  });
});
