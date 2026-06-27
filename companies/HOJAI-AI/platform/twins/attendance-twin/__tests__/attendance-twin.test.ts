import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createAttendanceTwinService } from '../src/index.js';

describe('AttendanceTwin', () => {
  let app: ReturnType<typeof createAttendanceTwinService>;
  beforeEach(() => { app = createAttendanceTwinService(); });

  describe('POST /api/attendance', () => {
    it('should create attendance record', async () => {
      const res = await request(app).post('/api/attendance').send({ employeeId: 'emp-1', date: '2026-06-28' });
      expect(res.status).toBe(201);
      expect(res.body.employeeId).toBe('emp-1');
      expect(res.body.status).toBe('present');
    });

    it('should return 400 for missing fields', async () => {
      const res = await request(app).post('/api/attendance').send({});
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/attendance', () => {
    it('should list all records', async () => {
      await request(app).post('/api/attendance').send({ employeeId: 'emp-1', date: '2026-06-28' });
      const res = await request(app).get('/api/attendance');
      expect(res.body.total).toBeGreaterThanOrEqual(1);
    });

    it('should filter by employeeId', async () => {
      await request(app).post('/api/attendance').send({ employeeId: 'emp-1', date: '2026-06-28' });
      const res = await request(app).get('/api/attendance?employeeId=emp-1');
      expect(res.body.records.every((r: any) => r.employeeId === 'emp-1')).toBe(true);
    });
  });

  describe('GET /api/attendance/:id', () => {
    it('should return record', async () => {
      const createRes = await request(app).post('/api/attendance').send({ employeeId: 'emp-1', date: '2026-06-28' });
      const res = await request(app).get(`/api/attendance/${createRes.body.id}`);
      expect(res.status).toBe(200);
    });

    it('should return 404 for non-existent', async () => {
      const res = await request(app).get('/api/attendance/non-existent');
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/attendance/:id', () => {
    it('should update record', async () => {
      const createRes = await request(app).post('/api/attendance').send({ employeeId: 'emp-1', date: '2026-06-28' });
      const res = await request(app).put(`/api/attendance/${createRes.body.id}`).send({ status: 'late' });
      expect(res.body.status).toBe('late');
    });
  });

  describe('DELETE /api/attendance/:id', () => {
    it('should delete record', async () => {
      const createRes = await request(app).post('/api/attendance').send({ employeeId: 'emp-1', date: '2026-06-28' });
      const deleteRes = await request(app).delete(`/api/attendance/${createRes.body.id}`);
      expect(deleteRes.status).toBe(204);
    });
  });

  describe('GET /api/attendance/analytics', () => {
    it('should return analytics', async () => {
      await request(app).post('/api/attendance').send({ employeeId: 'emp-1', date: '2026-06-28', status: 'present' });
      const res = await request(app).get('/api/attendance/analytics');
      expect(res.body.attendanceRate).toBeDefined();
    });
  });

  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.service).toBe('attendance-twin');
    });
  });
});