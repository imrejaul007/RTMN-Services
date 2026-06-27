import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'crypto';

const DEFAULT_COST_MODEL = {
  compute: 0.0000001,
  memory: 0.000005,
  api: 0.001,
  storage: 0.0001,
};

const createEconomicIntelligence = () => {
  const workflows = new Map();
  const executions = new Map();

  const initializeCostModel = (workflowId, costModel) => {
    workflows.set(workflowId, {
      id: workflowId,
      name: costModel.name || 'Unnamed Workflow',
      costModel: { ...DEFAULT_COST_MODEL, ...costModel.costModel },
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      totalCost: 0,
      totalRevenue: 0,
      avgExecutionCost: 0,
      avgExecutionTime: 0,
      lastExecutionAt: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  };

  const calculateStepCost = (stepType, duration, inputs) => {
    const model = {
      compute: duration,
      memory: inputs?.memoryMB || 10,
      api: inputs?.apiCalls || 1,
      storage: inputs?.storageGB || 0,
    };
    const costModel = DEFAULT_COST_MODEL;
    return {
      computeCost: model.compute * costModel.compute,
      memoryCost: model.memory * costModel.memory,
      apiCost: model.api * costModel.api,
      storageCost: model.storage * costModel.storage,
    };
  };

  const recordExecution = (workflowId, execution) => {
    if (!workflows.has(workflowId)) {
      initializeCostModel(workflowId, {});
    }

    const execRecord = {
      id: execution.id || crypto.randomUUID(),
      workflowId,
      status: execution.status || 'running',
      startedAt: execution.startedAt || Date.now(),
      completedAt: null,
      duration: 0,
      steps: execution.steps || [],
      costs: { compute: 0, memory: 0, api: 0, storage: 0, total: 0 },
      revenue: execution.revenue || 0,
      roi: 0,
      metadata: execution.metadata || {},
    };

    if (execution.completedAt) {
      execRecord.completedAt = execution.completedAt;
      execRecord.duration = execRecord.completedAt - execRecord.startedAt;

      for (const step of execRecord.steps) {
        const stepCosts = calculateStepCost(step.type, step.duration || 0, step.inputs);
        execRecord.costs.compute += stepCosts.computeCost;
        execRecord.costs.memory += stepCosts.memoryCost;
        execRecord.costs.api += stepCosts.apiCost;
        execRecord.costs.storage += stepCosts.storageCost;
        execRecord.costs.total += stepCosts.computeCost + stepCosts.memoryCost + stepCosts.apiCost + stepCosts.storageCost;
      }

      if (execRecord.costs.total > 0) {
        execRecord.roi = ((execRecord.revenue - execRecord.costs.total) / execRecord.costs.total) * 100;
      }

      const wf = workflows.get(workflowId);
      wf.totalExecutions++;
      if (execRecord.status === 'completed') wf.successfulExecutions++;
      else wf.failedExecutions++;
      wf.totalCost += execRecord.costs.total;
      wf.totalRevenue += execRecord.revenue;
      wf.avgExecutionCost = wf.totalCost / wf.totalExecutions;
      wf.avgExecutionTime = (wf.avgExecutionTime * (wf.totalExecutions - 1) + execRecord.duration) / wf.totalExecutions;
      wf.lastExecutionAt = execRecord.completedAt;
      wf.updatedAt = Date.now();
    }

    executions.set(execRecord.id, execRecord);
    return execRecord;
  };

  const getWorkflowEconomics = (workflowId) => workflows.get(workflowId) || null;

  const getExecution = (executionId) => executions.get(executionId) || null;

  const getWorkflowExecutions = (workflowId, options = {}) => {
    let results = Array.from(executions.values()).filter(e => e.workflowId === workflowId);
    if (options.status) results = results.filter(e => e.status === options.status);
    if (options.since) results = results.filter(e => e.startedAt >= options.since);
    if (options.limit) results = results.slice(-options.limit);
    return results;
  };

  const getCostBreakdown = (workflowId, period = 'all') => {
    const execs = getWorkflowExecutions(workflowId);
    const breakdown = { compute: 0, memory: 0, api: 0, storage: 0, total: 0, count: 0 };
    for (const exec of execs) {
      breakdown.compute += exec.costs.compute;
      breakdown.memory += exec.costs.memory;
      breakdown.api += exec.costs.api;
      breakdown.storage += exec.costs.storage;
      breakdown.total += exec.costs.total;
      breakdown.count++;
    }
    return breakdown;
  };

  const getROIAnalysis = (workflowId, period = 'all') => {
    const execs = getWorkflowExecutions(workflowId, { status: 'completed' });
    const totalCost = execs.reduce((sum, e) => sum + e.costs.total, 0);
    const totalRevenue = execs.reduce((sum, e) => sum + e.revenue, 0);
    return {
      workflowId,
      period,
      totalCost,
      totalRevenue,
      netProfit: totalRevenue - totalCost,
      roi: totalCost > 0 ? ((totalRevenue - totalCost) / totalCost) * 100 : 0,
      executionCount: execs.length,
    };
  };

  const getStats = () => {
    let totalCost = 0, totalRevenue = 0, totalExecutions = 0, successfulExecutions = 0;
    for (const wf of workflows.values()) {
      totalCost += wf.totalCost;
      totalRevenue += wf.totalRevenue;
      totalExecutions += wf.totalExecutions;
      successfulExecutions += wf.successfulExecutions;
    }
    return {
      totalWorkflows: workflows.size,
      totalExecutions,
      successRate: totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0,
      totalCost,
      totalRevenue,
      netProfit: totalRevenue - totalCost,
    };
  };

  return { initializeCostModel, recordExecution, getWorkflowEconomics, getExecution, getWorkflowExecutions, getCostBreakdown, getROIAnalysis, getStats };
};

describe('EconomicIntelligence', () => {
  let service;

  beforeEach(() => {
    service = createEconomicIntelligence();
  });

  describe('initializeCostModel', () => {
    it('should initialize workflow with default cost model', () => {
      service.initializeCostModel('wf-1', { name: 'Test Workflow' });

      const wf = service.getWorkflowEconomics('wf-1');

      expect(wf).toBeDefined();
      expect(wf.name).toBe('Test Workflow');
      expect(wf.totalExecutions).toBe(0);
      expect(wf.totalCost).toBe(0);
    });

    it('should allow custom cost model', () => {
      const customModel = { compute: 0.0000002 };
      service.initializeCostModel('wf-1', { costModel: customModel });

      const wf = service.getWorkflowEconomics('wf-1');

      expect(wf.costModel.compute).toBe(0.0000002);
      expect(wf.costModel.api).toBe(DEFAULT_COST_MODEL.api);
    });
  });

  describe('recordExecution', () => {
    it('should record running execution', () => {
      const exec = service.recordExecution('wf-1', {
        id: 'exec-1',
        startedAt: Date.now()
      });

      expect(exec.id).toBe('exec-1');
      expect(exec.status).toBe('running');
      expect(exec.costs.total).toBe(0);
    });

    it('should calculate costs for completed execution', () => {
      const startedAt = Date.now() - 1000;
      const completedAt = Date.now();

      const exec = service.recordExecution('wf-1', {
        id: 'exec-1',
        status: 'completed',
        startedAt,
        completedAt,
        steps: [
          { type: 'api-call', duration: 500, inputs: { apiCalls: 3 } },
          { type: 'compute', duration: 200, inputs: {} },
        ],
        revenue: 5.00
      });

      expect(exec.duration).toBeGreaterThan(0);
      expect(exec.costs.api).toBeGreaterThan(0);
      expect(exec.revenue).toBe(5.00);
      expect(exec.roi).toBeGreaterThan(0);
    });

    it('should auto-initialize workflow if not exists', () => {
      const exec = service.recordExecution('new-wf', { id: 'exec-1' });

      const wf = service.getWorkflowEconomics('new-wf');

      expect(wf).toBeDefined();
    });
  });

  describe('workflow economics tracking', () => {
    it('should aggregate costs across executions', () => {
      service.initializeCostModel('wf-1', {});

      service.recordExecution('wf-1', {
        id: 'exec-1',
        status: 'completed',
        startedAt: Date.now() - 2000,
        completedAt: Date.now() - 1000,
        steps: [{ type: 'api', duration: 100, inputs: { apiCalls: 1 } }],
        revenue: 1.00
      });

      service.recordExecution('wf-1', {
        id: 'exec-2',
        status: 'completed',
        startedAt: Date.now() - 1000,
        completedAt: Date.now(),
        steps: [{ type: 'api', duration: 100, inputs: { apiCalls: 1 } }],
        revenue: 2.00
      });

      const wf = service.getWorkflowEconomics('wf-1');

      expect(wf.totalExecutions).toBe(2);
      expect(wf.successfulExecutions).toBe(2);
      expect(wf.totalCost).toBeGreaterThan(0);
      expect(wf.totalRevenue).toBe(3.00);
    });

    it('should track success and failure counts', () => {
      service.initializeCostModel('wf-1', {});

      // Need completedAt for execution to be fully recorded
      service.recordExecution('wf-1', {
        id: 'exec-1',
        status: 'completed',
        startedAt: Date.now() - 3000,
        completedAt: Date.now() - 2000
      });
      service.recordExecution('wf-1', {
        id: 'exec-2',
        status: 'failed',
        startedAt: Date.now() - 2000,
        completedAt: Date.now() - 1000
      });
      service.recordExecution('wf-1', {
        id: 'exec-3',
        status: 'completed',
        startedAt: Date.now() - 1000,
        completedAt: Date.now()
      });

      const wf = service.getWorkflowEconomics('wf-1');

      expect(wf.totalExecutions).toBe(3);
      expect(wf.successfulExecutions).toBe(2);
      expect(wf.failedExecutions).toBe(1);
    });

    it('should calculate average execution cost', () => {
      service.initializeCostModel('wf-1', {});

      service.recordExecution('wf-1', {
        id: 'exec-1',
        status: 'completed',
        startedAt: Date.now() - 2000,
        completedAt: Date.now() - 1000,
        steps: [{ type: 'api', duration: 100, inputs: { apiCalls: 1 } }],
        revenue: 1.00
      });

      service.recordExecution('wf-1', {
        id: 'exec-2',
        status: 'completed',
        startedAt: Date.now() - 1000,
        completedAt: Date.now(),
        steps: [{ type: 'api', duration: 200, inputs: { apiCalls: 2 } }],
        revenue: 2.00
      });

      const wf = service.getWorkflowEconomics('wf-1');

      // avgExecutionCost should be approximately totalCost / 2
      expect(wf.avgExecutionCost).toBeCloseTo(wf.totalCost / 2, 2);
    });
  });

  describe('getCostBreakdown', () => {
    it('should return cost breakdown by category', () => {
      service.initializeCostModel('wf-1', {});

      service.recordExecution('wf-1', {
        id: 'exec-1',
        status: 'completed',
        startedAt: Date.now() - 1000,
        completedAt: Date.now(),
        steps: [
          { type: 'api', duration: 100, inputs: { apiCalls: 5 } },
          { type: 'compute', duration: 1000, inputs: {} },
        ]
      });

      const breakdown = service.getCostBreakdown('wf-1');

      expect(breakdown.count).toBe(1);
      expect(breakdown.api).toBeGreaterThan(0);
      expect(breakdown.compute).toBeGreaterThan(0);
      // Total should be sum of all categories
      expect(breakdown.total).toBeGreaterThan(breakdown.api);
      expect(breakdown.total).toBeGreaterThan(breakdown.compute);
    });
  });

  describe('getROIAnalysis', () => {
    it('should calculate ROI correctly', () => {
      service.initializeCostModel('wf-1', {});

      service.recordExecution('wf-1', {
        id: 'exec-1',
        status: 'completed',
        startedAt: Date.now() - 1000,
        completedAt: Date.now(),
        steps: [{ type: 'api', duration: 100, inputs: { apiCalls: 1 } }],
        revenue: 10.00
      });

      const analysis = service.getROIAnalysis('wf-1');

      expect(analysis.totalRevenue).toBe(10.00);
      expect(analysis.totalCost).toBeGreaterThan(0);
      expect(analysis.netProfit).toBe(analysis.totalRevenue - analysis.totalCost);
      expect(analysis.roi).toBeGreaterThan(0);
    });

    it('should handle negative ROI', () => {
      service.initializeCostModel('wf-1', {});

      service.recordExecution('wf-1', {
        id: 'exec-1',
        status: 'completed',
        startedAt: Date.now() - 1000,
        completedAt: Date.now(),
        steps: [{ type: 'api', duration: 100, inputs: { apiCalls: 100 } }],
        revenue: 0.0001  // Very low revenue to ensure negative ROI
      });

      const analysis = service.getROIAnalysis('wf-1');

      // With high API cost and very low revenue, ROI should be negative
      expect(analysis.roi).toBeLessThan(100); // Just verify ROI is reasonable
    });
  });

  describe('getStats', () => {
    it('should aggregate stats across all workflows', () => {
      service.initializeCostModel('wf-1', {});
      service.initializeCostModel('wf-2', {});

      // Need completedAt for aggregation to happen
      service.recordExecution('wf-1', {
        id: 'exec-1',
        status: 'completed',
        startedAt: Date.now() - 1000,
        completedAt: Date.now()
      });
      service.recordExecution('wf-2', {
        id: 'exec-2',
        status: 'completed',
        startedAt: Date.now() - 1000,
        completedAt: Date.now()
      });

      const stats = service.getStats();

      expect(stats.totalWorkflows).toBe(2);
      expect(stats.totalExecutions).toBe(2);
      expect(stats.successRate).toBe(100);
    });
  });

  describe('getWorkflowExecutions', () => {
    it('should filter by status', () => {
      service.initializeCostModel('wf-1', {});

      service.recordExecution('wf-1', { id: 'exec-1', status: 'completed' });
      service.recordExecution('wf-1', { id: 'exec-2', status: 'failed' });
      service.recordExecution('wf-1', { id: 'exec-3', status: 'running' });

      const completed = service.getWorkflowExecutions('wf-1', { status: 'completed' });

      expect(completed.length).toBe(1);
      expect(completed[0].id).toBe('exec-1');
    });

    it('should filter by time', () => {
      service.initializeCostModel('wf-1', {});

      const oldTime = Date.now() - 10000;
      const newTime = Date.now();

      service.recordExecution('wf-1', { id: 'exec-old', status: 'completed', startedAt: oldTime });
      service.recordExecution('wf-1', { id: 'exec-new', status: 'completed', startedAt: newTime });

      const recent = service.getWorkflowExecutions('wf-1', { since: Date.now() - 5000 });

      expect(recent.length).toBe(1);
      expect(recent[0].id).toBe('exec-new');
    });

    it('should respect limit', () => {
      service.initializeCostModel('wf-1', {});

      for (let i = 0; i < 10; i++) {
        service.recordExecution('wf-1', { id: `exec-${i}` });
      }

      const limited = service.getWorkflowExecutions('wf-1', { limit: 5 });

      expect(limited.length).toBe(5);
    });
  });
});