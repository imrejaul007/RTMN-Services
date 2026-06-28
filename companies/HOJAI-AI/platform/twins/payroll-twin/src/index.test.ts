/**
 * Payroll Twin Service Tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import supertest from 'supertest';
import { createPayrollTwinService } from './index';

describe('Payroll Twin Service', () => {
  let app: ReturnType<typeof createPayrollTwinService>;

  beforeEach(() => {
    app = createPayrollTwinService();
  });

  describe('POST /api/payroll', () => {
    it('should create payroll record', async () => {
      const res = await supertest(app)
        .post('/api/payroll')
        .send({
          employeeId: 'emp-1',
          period: '2026-06',
          grossSalary: 50000
        });
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        employeeId: 'emp-1',
        period: '2026-06',
        grossSalary: 50000,
        netSalary: 50000,
        status: 'draft'
      });
    });

    it('should require employeeId, period, and grossSalary', async () => {
      const res = await supertest(app)
        .post('/api/payroll')
        .send({ employeeId: 'emp-1' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('required');
    });

    it('should calculate net salary with deductions', async () => {
      const res = await supertest(app)
        .post('/api/payroll')
        .send({
          employeeId: 'emp-1',
          period: '2026-06',
          grossSalary: 50000,
          deductions: [{ type: 'tax', amount: 5000 }]
        });
      expect(res.body.netSalary).toBe(45000);
    });

    it('should calculate net salary with bonuses', async () => {
      const res = await supertest(app)
        .post('/api/payroll')
        .send({
          employeeId: 'emp-1',
          period: '2026-06',
          grossSalary: 50000,
          bonuses: [{ type: 'performance', amount: 10000 }]
        });
      expect(res.body.netSalary).toBe(60000);
    });
  });

  describe('GET /api/payroll', () => {
    it('should list all records', async () => {
      await supertest(app).post('/api/payroll').send({ employeeId: 'emp-1', period: '2026-06', grossSalary: 50000 });
      await supertest(app).post('/api/payroll').send({ employeeId: 'emp-2', period: '2026-06', grossSalary: 60000 });
      const res = await supertest(app).get('/api/payroll');
      expect(res.body.total).toBe(2);
    });

    it('should filter by employeeId', async () => {
      await supertest(app).post('/api/payroll').send({ employeeId: 'emp-1', period: '2026-06', grossSalary: 50000 });
      await supertest(app).post('/api/payroll').send({ employeeId: 'emp-2', period: '2026-06', grossSalary: 60000 });
      const res = await supertest(app).get('/api/payroll?employeeId=emp-1');
      expect(res.body.total).toBe(1);
    });

    it('should filter by status', async () => {
      await supertest(app).post('/api/payroll').send({ employeeId: 'emp-1', period: '2026-06', grossSalary: 50000 });
      const res = await supertest(app).get('/api/payroll?status=draft');
      expect(res.body.total).toBe(1);
    });
  });

  describe('GET /api/payroll/:id', () => {
    it('should get record by id', async () => {
      const create = await supertest(app)
        .post('/api/payroll')
        .send({ employeeId: 'emp-1', period: '2026-06', grossSalary: 50000 });
      const res = await supertest(app).get(`/api/payroll/${create.body.id}`);
      expect(res.status).toBe(200);
    });

    it('should return 404 for unknown id', async () => {
      const res = await supertest(app).get('/api/payroll/unknown');
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/payroll/:id', () => {
    it('should update record status', async () => {
      const create = await supertest(app)
        .post('/api/payroll')
        .send({ employeeId: 'emp-1', period: '2026-06', grossSalary: 50000 });
      const res = await supertest(app)
        .put(`/api/payroll/${create.body.id}`)
        .send({ status: 'paid' });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('paid');
      expect(res.body.paidAt).toBeDefined();
    });
  });

  describe('DELETE /api/payroll/:id', () => {
    it('should delete record', async () => {
      const create = await supertest(app)
        .post('/api/payroll')
        .send({ employeeId: 'emp-1', period: '2026-06', grossSalary: 50000 });
      await supertest(app).delete(`/api/payroll/${create.body.id}`).expect(204);
    });
  });

  describe('GET /api/payroll/analytics', () => {
    it('should return analytics', async () => {
      await supertest(app).post('/api/payroll').send({
        employeeId: 'emp-1', period: '2026-06', grossSalary: 50000,
        deductions: [{ type: 'tax', amount: 5000 }]
      });
      await supertest(app).post('/api/payroll').send({
        employeeId: 'emp-2', period: '2026-06', grossSalary: 60000,
        deductions: [{ type: 'tax', amount: 6000 }]
      });
      const res = await supertest(app).get('/api/payroll/analytics');
      expect(res.body.totalGross).toBe(110000);
      expect(res.body.totalDeductions).toBe(11000);
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const res = await supertest(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.service).toBe('payroll-twin');
    });
  });
});
