/**
 * Performance Review Twin Service Tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import supertest from 'supertest';
import { createPerformanceReviewTwinService } from './index';

describe('Performance Review Twin Service', () => {
  let app: ReturnType<typeof createPerformanceReviewTwinService>;

  beforeEach(() => {
    app = createPerformanceReviewTwinService();
  });

  describe('POST /api/reviews', () => {
    it('should create review', async () => {
      const res = await supertest(app)
        .post('/api/reviews')
        .send({
          employeeId: 'emp-1',
          reviewerId: 'rev-1',
          period: '2026-H1',
          type: 'mid_year'
        });
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        employeeId: 'emp-1',
        reviewerId: 'rev-1',
        period: '2026-H1',
        type: 'mid_year',
        status: 'draft'
      });
    });

    it('should require all mandatory fields', async () => {
      const res = await supertest(app)
        .post('/api/reviews')
        .send({ employeeId: 'emp-1', reviewerId: 'rev-1' });
      expect(res.status).toBe(400);
    });

    it('should calculate overall rating from ratings', async () => {
      const res = await supertest(app)
        .post('/api/reviews')
        .send({
          employeeId: 'emp-1',
          reviewerId: 'rev-1',
          period: '2026-H1',
          type: 'mid_year',
          ratings: [
            { category: 'Performance', rating: 80, maxRating: 100 },
            { category: 'Teamwork', rating: 70, maxRating: 100 }
          ]
        });
      expect(res.body.overallRating).toBe(75);
    });
  });

  describe('GET /api/reviews', () => {
    it('should list all reviews', async () => {
      await supertest(app).post('/api/reviews').send({
        employeeId: 'emp-1', reviewerId: 'rev-1', period: '2026-H1', type: 'mid_year'
      });
      await supertest(app).post('/api/reviews').send({
        employeeId: 'emp-2', reviewerId: 'rev-1', period: '2026-H1', type: 'mid_year'
      });
      const res = await supertest(app).get('/api/reviews');
      expect(res.body.total).toBe(2);
    });

    it('should filter by employeeId', async () => {
      await supertest(app).post('/api/reviews').send({
        employeeId: 'emp-1', reviewerId: 'rev-1', period: '2026-H1', type: 'mid_year'
      });
      const res = await supertest(app).get('/api/reviews?employeeId=emp-1');
      expect(res.body.total).toBe(1);
    });

    it('should filter by type', async () => {
      await supertest(app).post('/api/reviews').send({
        employeeId: 'emp-1', reviewerId: 'rev-1', period: '2026-H1', type: 'mid_year'
      });
      await supertest(app).post('/api/reviews').send({
        employeeId: 'emp-2', reviewerId: 'rev-1', period: '2026-H1', type: 'annual'
      });
      const res = await supertest(app).get('/api/reviews?type=annual');
      expect(res.body.total).toBe(1);
    });
  });

  describe('GET /api/reviews/:id', () => {
    it('should get review by id', async () => {
      const create = await supertest(app)
        .post('/api/reviews')
        .send({
          employeeId: 'emp-1', reviewerId: 'rev-1', period: '2026-H1', type: 'mid_year'
        });
      const res = await supertest(app).get(`/api/reviews/${create.body.id}`);
      expect(res.status).toBe(200);
    });

    it('should return 404 for unknown id', async () => {
      const res = await supertest(app).get('/api/reviews/unknown');
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/reviews/:id', () => {
    it('should update review status', async () => {
      const create = await supertest(app)
        .post('/api/reviews')
        .send({
          employeeId: 'emp-1', reviewerId: 'rev-1', period: '2026-H1', type: 'mid_year'
        });
      const res = await supertest(app)
        .put(`/api/reviews/${create.body.id}`)
        .send({ status: 'completed' });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('completed');
      expect(res.body.completedAt).toBeDefined();
    });
  });

  describe('DELETE /api/reviews/:id', () => {
    it('should delete review', async () => {
      const create = await supertest(app)
        .post('/api/reviews')
        .send({
          employeeId: 'emp-1', reviewerId: 'rev-1', period: '2026-H1', type: 'mid_year'
        });
      await supertest(app).delete(`/api/reviews/${create.body.id}`).expect(204);
    });
  });

  describe('GET /api/reviews/analytics', () => {
    it('should return analytics', async () => {
      await supertest(app).post('/api/reviews').send({
        employeeId: 'emp-1', reviewerId: 'rev-1', period: '2026-H1', type: 'mid_year',
        ratings: [{ category: 'Perf', rating: 80, maxRating: 100 }]
      });
      const res = await supertest(app).get('/api/reviews/analytics');
      expect(res.body.total).toBe(1);
      expect(res.body.avgRating).toBe(80);
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const res = await supertest(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.service).toBe('performance-review-twin');
    });
  });
});
