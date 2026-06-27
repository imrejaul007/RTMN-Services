import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createEngagementTwinService } from '../src/index.js';

describe('EngagementTwin', () => {
  let app: ReturnType<typeof createEngagementTwinService>;
  beforeEach(() => { app = createEngagementTwinService(); });

  describe('POST /api/engagement', () => {
    it('should create engagement survey', async () => {
      const res = await request(app).post('/api/engagement').send({ employeeId: 'emp-1', period: '2026-Q2' });
      expect(res.status).toBe(201);
      expect(res.body.employeeId).toBe('emp-1');
    });

    it('should calculate overall score from dimensions', async () => {
      const res = await request(app).post('/api/engagement').send({
        employeeId: 'emp-1', period: '2026-Q2',
        dimensions: [{ name: 'Satisfaction', score: 80 }, { name: 'Growth', score: 90 }]
      });
      expect(res.body.overallScore).toBe(85);
    });

    it('should return 400 for missing fields', async () => {
      const res = await request(app).post('/api/engagement').send({});
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/engagement', () => {
    it('should list surveys', async () => {
      await request(app).post('/api/engagement').send({ employeeId: 'emp-1', period: '2026-Q2' });
      const res = await request(app).get('/api/engagement');
      expect(res.body.total).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /api/engagement/:id', () => {
    it('should return survey', async () => {
      const createRes = await request(app).post('/api/engagement').send({ employeeId: 'emp-1', period: '2026-Q2' });
      const res = await request(app).get(`/api/engagement/${createRes.body.id}`);
      expect(res.status).toBe(200);
    });
  });

  describe('PUT /api/engagement/:id', () => {
    it('should update status', async () => {
      const createRes = await request(app).post('/api/engagement').send({ employeeId: 'emp-1', period: '2026-Q2' });
      const res = await request(app).put(`/api/engagement/${createRes.body.id}`).send({ status: 'completed' });
      expect(res.body.status).toBe('completed');
      expect(res.body.completedAt).toBeDefined();
    });
  });

  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.service).toBe('engagement-twin');
    });
  });
});