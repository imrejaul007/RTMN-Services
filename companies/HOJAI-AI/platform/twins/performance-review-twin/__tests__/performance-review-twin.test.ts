import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createPerformanceReviewTwinService } from '../src/index.js';

describe('PerformanceReviewTwin', () => {
  let app: ReturnType<typeof createPerformanceReviewTwinService>;
  beforeEach(() => { app = createPerformanceReviewTwinService(); });

  describe('POST /api/reviews', () => {
    it('should create review', async () => {
      const res = await request(app).post('/api/reviews').send({
        employeeId: 'emp-1', reviewerId: 'mgr-1', period: '2026-H1', type: 'annual'
      });
      expect(res.status).toBe(201);
      expect(res.body.status).toBe('draft');
    });

    it('should calculate overall rating from ratings', async () => {
      const res = await request(app).post('/api/reviews').send({
        employeeId: 'emp-1', reviewerId: 'mgr-1', period: '2026-H1', type: 'annual',
        ratings: [{ category: 'Performance', rating: 80, maxRating: 100 }]
      });
      expect(res.body.overallRating).toBe(80);
    });

    it('should return 400 for missing fields', async () => {
      const res = await request(app).post('/api/reviews').send({});
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/reviews', () => {
    it('should list reviews', async () => {
      await request(app).post('/api/reviews').send({ employeeId: 'emp-1', reviewerId: 'mgr-1', period: '2026-H1', type: 'annual' });
      const res = await request(app).get('/api/reviews');
      expect(res.body.total).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /api/reviews/:id', () => {
    it('should return review', async () => {
      const createRes = await request(app).post('/api/reviews').send({
        employeeId: 'emp-1', reviewerId: 'mgr-1', period: '2026-H1', type: 'annual'
      });
      const res = await request(app).get(`/api/reviews/${createRes.body.id}`);
      expect(res.status).toBe(200);
    });
  });

  describe('PUT /api/reviews/:id', () => {
    it('should update status and set timestamps', async () => {
      const createRes = await request(app).post('/api/reviews').send({
        employeeId: 'emp-1', reviewerId: 'mgr-1', period: '2026-H1', type: 'annual'
      });
      const res = await request(app).put(`/api/reviews/${createRes.body.id}`).send({ status: 'completed' });
      expect(res.body.status).toBe('completed');
      expect(res.body.completedAt).toBeDefined();
    });
  });

  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.service).toBe('performance-review-twin');
    });
  });
});