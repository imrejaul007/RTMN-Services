/**
 * AI Workforce Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  deployer,
  deployCompanyWorkers,
  deployDepartmentTeam,
  getDefaultWorkersForDepartment,
} from '../deployer';
import {
  getAllWorkers,
  getWorker,
  getWorkersByDepartment,
  workerExists,
  getWorkerCountByDepartment,
} from '../registry';
import { healthMonitor } from '../health';

describe('AI Workforce', () => {
  const companyId = 'test_company_001';

  describe('Worker Registry', () => {
    it('should return all registered workers', () => {
      const workers = getAllWorkers();
      expect(workers.length).toBeGreaterThan(0);
    });

    it('should get worker by ID', () => {
      const worker = getWorker('ai-cfo');
      expect(worker).toBeDefined();
      expect(worker?.name).toBe('AI Chief Financial Officer');
    });

    it('should return undefined for unknown worker', () => {
      const worker = getWorker('unknown-worker');
      expect(worker).toBeUndefined();
    });

    it('should check if worker exists', () => {
      expect(workerExists('ai-cfo')).toBe(true);
      expect(workerExists('unknown')).toBe(false);
    });

    it('should get workers by department', () => {
      const financeWorkers = getWorkersByDepartment('finance');
      expect(financeWorkers.length).toBeGreaterThan(0);
      expect(financeWorkers.every(w => w.department === 'finance')).toBe(true);
    });

    it('should get worker count by department', () => {
      const counts = getWorkerCountByDepartment();
      expect(counts.finance).toBeGreaterThan(0);
      expect(counts.hr).toBeGreaterThan(0);
      expect(counts.marketing).toBeGreaterThan(0);
    });
  });

  describe('Workforce Deployer', () => {
    beforeEach(() => {
      // Clear any existing deployments
      deployer.removeCompany(companyId);
    });

    it('should deploy a single worker', async () => {
      const result = await deployer.deploy({
        workerId: 'ai-cfo',
        companyId,
        department: 'finance',
      });

      expect(result.success).toBe(true);
      expect(result.deployedWorker).toBeDefined();
      expect(result.deployedWorker?.status).toBe('active');
    });

    it('should fail for unknown worker', async () => {
      const result = await deployer.deploy({
        workerId: 'unknown-worker',
        companyId,
        department: 'finance',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should deploy multiple workers', async () => {
      const results = await deployer.deployMany([
        { workerId: 'ai-cfo', companyId, department: 'finance' },
        { workerId: 'ai-recruiter', companyId, department: 'hr' },
      ]);

      expect(results.length).toBe(2);
      expect(results.every(r => r.success)).toBe(true);
    });

    it('should get company workers', async () => {
      await deployer.deploy({
        workerId: 'ai-cmo',
        companyId,
        department: 'marketing',
      });

      const companyWorkers = deployer.getCompanyWorkers(companyId);
      expect(companyWorkers).toBeDefined();
      expect(companyWorkers?.workers.length).toBeGreaterThan(0);
    });

    it('should stop a worker', async () => {
      await deployer.deploy({
        workerId: 'ai-cfo',
        companyId,
        department: 'finance',
      });

      const stopped = await deployer.stop(companyId, 'ai-cfo');
      expect(stopped).toBe(true);

      const worker = deployer.getDeployedWorker(companyId, 'ai-cfo');
      expect(worker?.status).toBe('stopped');
    });

    it('should remove company and all workers', async () => {
      await deployer.deployMany([
        { workerId: 'ai-cfo', companyId, department: 'finance' },
        { workerId: 'ai-recruiter', companyId, department: 'hr' },
      ]);

      deployer.removeCompany(companyId);

      const companyWorkers = deployer.getCompanyWorkers(companyId);
      expect(companyWorkers).toBeNull();
    });

    it('should return deployment statistics', async () => {
      await deployer.deploy({
        workerId: 'ai-cfo',
        companyId,
        department: 'finance',
      });

      const stats = deployer.getStats();
      expect(stats.totalWorkers).toBeGreaterThan(0);
      expect(stats.activeWorkers).toBeGreaterThan(0);
    });
  });

  describe('Deploy Company Workers', () => {
    beforeEach(() => {
      deployer.removeCompany(companyId);
    });

    it('should deploy workers based on config', async () => {
      const results = await deployCompanyWorkers(companyId, {
        finance: { enabled: true, head: 'ai-cfo' },
        hr: { enabled: true, head: 'ai-recruiter' },
      });

      expect(results.length).toBe(2);
      expect(results.every(r => r.success)).toBe(true);
    });

    it('should skip disabled departments', async () => {
      const results = await deployCompanyWorkers(companyId, {
        finance: { enabled: true, head: 'ai-cfo' },
        hr: { enabled: false, head: 'ai-recruiter' },
      });

      expect(results.length).toBe(1);
      expect(results[0].deployedWorker?.workerId).toBe('ai-cfo');
    });
  });

  describe('Deploy Department Team', () => {
    beforeEach(() => {
      deployer.removeCompany(companyId);
    });

    it('should deploy full finance team', async () => {
      const results = await deployDepartmentTeam(companyId, 'finance');

      expect(results.length).toBeGreaterThanOrEqual(3);
      expect(results.every(r => r.success)).toBe(true);
    });

    it('should deploy full sales team', async () => {
      const results = await deployDepartmentTeam(companyId, 'sales');

      expect(results.length).toBe(2);
    });
  });

  describe('Health Monitor', () => {
    beforeEach(() => {
      deployer.removeCompany(companyId);
    });

    it('should check worker health', async () => {
      await deployer.deploy({
        workerId: 'ai-cfo',
        companyId,
        department: 'finance',
      });

      const health = healthMonitor.checkHealth(
        deployer.getDeployedWorker(companyId, 'ai-cfo')!
      );

      expect(health.status).toBeDefined();
    });

    it('should get company health', async () => {
      await deployer.deployMany([
        { workerId: 'ai-cfo', companyId, department: 'finance' },
        { workerId: 'ai-recruiter', companyId, department: 'hr' },
      ]);

      const health = healthMonitor.getCompanyHealth(companyId);

      expect(health.workers.length).toBe(2);
      expect(health.summary.total).toBe(2);
    });

    it('should get fleet health', async () => {
      const fleetHealth = healthMonitor.getFleetHealth();

      expect(fleetHealth.total).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Default Workers', () => {
    it('should return default workers for finance', () => {
      const workers = getDefaultWorkersForDepartment('finance');
      expect(workers).toContain('ai-cfo');
      expect(workers).toContain('ai-accountant');
    });

    it('should return default workers for sales', () => {
      const workers = getDefaultWorkersForDepartment('sales');
      expect(workers).toContain('ai-sdr');
      expect(workers).toContain('ai-closer');
    });

    it('should return empty for unknown department', () => {
      const workers = getDefaultWorkersForDepartment('unknown');
      expect(workers).toEqual([]);
    });
  });
});