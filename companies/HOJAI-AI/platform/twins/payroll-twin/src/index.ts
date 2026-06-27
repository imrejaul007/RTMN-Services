/**
 * Payroll Twin Service v1.0
 * Digital twin for payroll management
 * Port: 4900
 */

import express, { type Request, type Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

export interface PayrollRecord {
  id: string;
  employeeId: string;
  period: string;
  grossSalary: number;
  deductions: PayrollDeduction[];
  netSalary: number;
  bonuses: PayrollBonus[];
  status: 'draft' | 'calculated' | 'approved' | 'paid';
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PayrollDeduction {
  id: string;
  type: 'tax' | 'insurance' | 'retirement' | 'other';
  amount: number;
  description?: string;
}

export interface PayrollBonus {
  id: string;
  type: 'performance' | 'commission' | 'overtime' | 'bonus' | 'allowance';
  amount: number;
  description?: string;
}

export function createPayrollTwinService() {
  const records: Map<string, PayrollRecord> = new Map();

  const app = express();
  app.use(express.json());

  app.post('/api/payroll', (req: Request, res: Response) => {
    const { employeeId, period, grossSalary, deductions, bonuses } = req.body;
    if (!employeeId || !period || grossSalary === undefined) {
      return res.status(400).json({ error: 'employeeId, period, and grossSalary are required' });
    }

    const totalDeductions = (deductions || []).reduce((sum, d) => sum + d.amount, 0);
    const totalBonuses = (bonuses || []).reduce((sum, b) => sum + b.amount, 0);

    const record: PayrollRecord = {
      id: uuidv4(),
      employeeId,
      period,
      grossSalary,
      deductions: (deductions || []).map(d => ({ ...d, id: uuidv4() })),
      netSalary: grossSalary - totalDeductions + totalBonuses,
      bonuses: (bonuses || []).map(b => ({ ...b, id: uuidv4() })),
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    records.set(record.id, record);
    return res.status(201).json(record);
  });

  app.get('/api/payroll', (req: Request, res: Response) => {
    const { employeeId, period, status } = req.query;
    let filtered = Array.from(records.values());
    if (employeeId) filtered = filtered.filter(r => r.employeeId === employeeId);
    if (period) filtered = filtered.filter(r => r.period === period);
    if (status) filtered = filtered.filter(r => r.status === status);
    return res.status(200).json({ records: filtered, total: filtered.length });
  });

  app.get('/api/payroll/analytics', (req: Request, res: Response) => {
    const { period } = req.query;
    let filtered = Array.from(records.values());
    if (period) filtered = filtered.filter(r => r.period === period);

    const totalGross = filtered.reduce((sum, r) => sum + r.grossSalary, 0);
    const totalNet = filtered.reduce((sum, r) => sum + r.netSalary, 0);
    const totalDeductions = filtered.reduce((sum, r) => sum + r.deductions.reduce((s, d) => s + d.amount, 0), 0);

    return res.status(200).json({
      total: filtered.length,
      totalGross,
      totalNet,
      totalDeductions,
      avgNet: filtered.length > 0 ? totalNet / filtered.length : 0
    });
  });

  app.get('/api/payroll/:id', (req: Request, res: Response) => {
    const record = records.get(req.params.id);
    if (!record) return res.status(404).json({ error: 'Payroll record not found' });
    return res.status(200).json(record);
  });

  app.put('/api/payroll/:id', (req: Request, res: Response) => {
    const record = records.get(req.params.id);
    if (!record) return res.status(404).json({ error: 'Payroll record not found' });

    if (req.body.status) {
      record.status = req.body.status;
      if (req.body.status === 'paid') record.paidAt = new Date().toISOString();
    }
    record.updatedAt = new Date().toISOString();
    records.set(record.id, record);
    return res.status(200).json(record);
  });

  app.delete('/api/payroll/:id', (req: Request, res: Response) => {
    if (!records.has(req.params.id)) return res.status(404).json({ error: 'Payroll record not found' });
    records.delete(req.params.id);
    return res.status(204).send();
  });

  app.get('/health', (_req: Request, res: Response) => {
    return res.status(200).json({ status: 'healthy', service: 'payroll-twin', timestamp: new Date().toISOString() });
  });

  return app;
}

export default createPayrollTwinService;