import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createPayrollTwinService } from '../src/index.js';

describe('PayrollTwin', () => {
  let app: ReturnType<typeof createPayrollTwinService>;
  beforeEach(() => { app = createPayrollTwinService(); });

  describe('POST /api/payroll', () => {
    it('should create payroll record', async () => {
      const res = await request(app).post('/api/payroll').send({ employeeId: 'emp-1', period: '2026-06', grossSalary: 50000 });
      expect(res.status).toBe(201);
      expect(res.body.grossSalary).toBe(50000);
      expect(res.body.netSalary).toBe(50000);
    });

    it('should calculate net salary with deductions', async () => {
      const res = await request(app).post('/api/payroll').send({
        employeeId: 'emp-1', period: '2026-06', grossSalary: 100000,
        deductions: [{ type: 'tax', amount: 20000 }]
      });
      expect(res.body.netSalary).toBe(80000);
    });

    it('should return 400 for missing fields', async () => {
      const res = await request(app).post('/api/payroll').send({});
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/payroll', () => {
    it('should list records', async () => {
      await request(app).post('/api/payroll').send({ employeeId: 'emp-1', period: '2026-06', grossSalary: 50000 });
      const res = await request(app).get('/api/payroll');
      expect(res.body.total).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /api/payroll/:id', () => {
    it('should return record', async () => {
      const createRes = await request(app).post('/api/payroll').send({ employeeId: 'emp-1', period: '2026-06', grossSalary: 50000 });
      const res = await request(app).get(`/api/payroll/${createRes.body.id}`);
      expect(res.status).toBe(200);
    });
  });

  describe('PUT /api/payroll/:id', () => {
    it('should update status', async () => {
      const createRes = await request(app).post('/api/payroll').send({ employeeId: 'emp-1', period: '2026-06', grossSalary: 50000 });
      const res = await request(app).put(`/api/payroll/${createRes.body.id}`).send({ status: 'paid' });
      expect(res.body.status).toBe('paid');
      expect(res.body.paidAt).toBeDefined();
    });
  });

  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.service).toBe('payroll-twin');
    });
  });
});