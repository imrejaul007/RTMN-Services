/**
 * Attendance Twin Service Tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import supertest from 'supertest';
import { createAttendanceTwinService } from './index';

describe('Attendance Twin Service', () => {
  let app: ReturnType<typeof createAttendanceTwinService>;

  beforeEach(() => {
    app = createAttendanceTwinService();
  });

  describe('POST /api/attendance', () => {
    it('should create attendance record', async () => {
      const res = await supertest(app)
        .post('/api/attendance')
        .send({ employeeId: 'emp-1', date: '2026-06-27', status: 'present' });
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        employeeId: 'emp-1',
        date: '2026-06-27',
        status: 'present'
      });
    });

    it('should require employeeId and date', async () => {
      const res = await supertest(app)
        .post('/api/attendance')
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('required');
    });

    it('should set default status to present', async () => {
      const res = await supertest(app)
        .post('/api/attendance')
        .send({ employeeId: 'emp-1', date: '2026-06-27' });
      expect(res.body.status).toBe('present');
    });
  });

  describe('GET /api/attendance', () => {
    it('should list all records', async () => {
      await supertest(app).post('/api/attendance').send({ employeeId: 'emp-1', date: '2026-06-27' });
      await supertest(app).post('/api/attendance').send({ employeeId: 'emp-2', date: '2026-06-27' });
      const res = await supertest(app).get('/api/attendance');
      expect(res.status).toBe(200);
      expect(res.body.total).toBe(2);
    });

    it('should filter by employeeId', async () => {
      await supertest(app).post('/api/attendance').send({ employeeId: 'emp-1', date: '2026-06-27' });
      await supertest(app).post('/api/attendance').send({ employeeId: 'emp-2', date: '2026-06-27' });
      const res = await supertest(app).get('/api/attendance?employeeId=emp-1');
      expect(res.body.total).toBe(1);
      expect(res.body.records[0].employeeId).toBe('emp-1');
    });
  });

  describe('GET /api/attendance/:id', () => {
    it('should get record by id', async () => {
      const create = await supertest(app)
        .post('/api/attendance')
        .send({ employeeId: 'emp-1', date: '2026-06-27' });
      const res = await supertest(app).get(`/api/attendance/${create.body.id}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(create.body.id);
    });

    it('should return 404 for unknown id', async () => {
      const res = await supertest(app).get('/api/attendance/unknown-id');
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/attendance/:id', () => {
    it('should update record', async () => {
      const create = await supertest(app)
        .post('/api/attendance')
        .send({ employeeId: 'emp-1', date: '2026-06-27' });
      const res = await supertest(app)
        .put(`/api/attendance/${create.body.id}`)
        .send({ status: 'late', checkIn: '09:30' });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('late');
      expect(res.body.checkIn).toBe('09:30');
    });
  });

  describe('DELETE /api/attendance/:id', () => {
    it('should delete record', async () => {
      const create = await supertest(app)
        .post('/api/attendance')
        .send({ employeeId: 'emp-1', date: '2026-06-27' });
      await supertest(app).delete(`/api/attendance/${create.body.id}`).expect(204);
      await supertest(app).get(`/api/attendance/${create.body.id}`).expect(404);
    });
  });

  describe('GET /api/attendance/analytics', () => {
    it('should return analytics', async () => {
      await supertest(app).post('/api/attendance').send({ employeeId: 'emp-1', date: '2026-06-27', status: 'present' });
      await supertest(app).post('/api/attendance').send({ employeeId: 'emp-2', date: '2026-06-27', status: 'absent' });
      const res = await supertest(app).get('/api/attendance/analytics');
      expect(res.status).toBe(200);
      expect(res.body.byStatus).toMatchObject({ present: 1, absent: 1 });
      expect(res.body.attendanceRate).toBe(50);
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const res = await supertest(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.service).toBe('attendance-twin');
    });
  });
});
