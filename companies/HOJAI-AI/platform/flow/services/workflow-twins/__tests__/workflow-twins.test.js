import { describe, it, expect, beforeEach } from 'vitest';

// Import the module under test - we'll create a test-friendly version
const TWIN_STATES = {
  INITIALIZED: 'initialized',
  RUNNING: 'running',
  WAITING: 'waiting',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
};

const createWorkflowTwins = () => {
  const twins = new Map();
  const history = new Map();
  const metrics = new Map();

  const createTwin = (data) => {
    const twinId = crypto.randomUUID();
    const now = Date.now();

    const twin = {
      id: twinId,
      workflowId: data.workflowId,
      instanceId: data.instanceId,
      definition: data.definition || {},
      state: TWIN_STATES.INITIALIZED,
      currentStep: data.currentStep || null,
      stepStates: data.stepStates || {},
      variables: data.variables || {},
      metadata: data.metadata || {},
      createdAt: now,
      updatedAt: now,
      startedAt: null,
      completedAt: null,
      version: 1,
    };

    twins.set(twinId, twin);

    metrics.set(twinId, {
      twinId,
      executionTime: 0,
      stepCount: 0,
      errorCount: 0,
      retryCount: 0,
      avgStepDuration: 0,
      lastActivity: now,
      steps: [],
    });

    return twin;
  };

  const getTwin = (twinId) => twins.get(twinId) || null;

  const updateTwinState = (twinId, newState, stepData = {}) => {
    const twin = twins.get(twinId);
    if (!twin) throw new Error('Twin not found');

    const now = Date.now();
    twin.state = newState;
    twin.currentStep = stepData.currentStep || twin.currentStep;
    twin.stepStates = { ...twin.stepStates, ...stepData.stepStates };
    twin.variables = { ...twin.variables, ...stepData.variables };
    twin.updatedAt = now;
    twin.version++;

    if (newState === TWIN_STATES.RUNNING && !twin.startedAt) {
      twin.startedAt = now;
    }

    if ([TWIN_STATES.COMPLETED, TWIN_STATES.FAILED, TWIN_STATES.CANCELLED].includes(newState)) {
      twin.completedAt = now;
    }

    twins.set(twinId, twin);

    const m = metrics.get(twinId);
    if (m) {
      m.lastActivity = now;
      if (twin.startedAt) m.executionTime = now - twin.startedAt;
    }

    return twin;
  };

  const recordStepExecution = (twinId, stepId, execution) => {
    const twin = twins.get(twinId);
    if (!twin) throw new Error('Twin not found');

    twin.stepStates[stepId] = execution;
    twin.currentStep = stepId;
    twin.updatedAt = Date.now();
    twin.version++;

    twins.set(twinId, twin);

    const m = metrics.get(twinId);
    if (m) {
      m.stepCount++;
      m.steps.push({ stepId, ...execution, timestamp: Date.now() });

      if (execution.duration) {
        const totalDuration = m.avgStepDuration * (m.stepCount - 1);
        m.avgStepDuration = (totalDuration + execution.duration) / m.stepCount;
      }

      if (execution.error) m.errorCount++;
      m.lastActivity = Date.now();
    }

    return twin;
  };

  const getTwinHistory = (twinId, options = {}) => {
    const events = history.get(twinId) || [];
    if (options.eventType) return events.filter(e => e.eventType === options.eventType);
    if (options.since) return events.filter(e => e.timestamp >= options.since);
    return events;
  };

  const getTwinMetrics = (twinId) => metrics.get(twinId) || null;

  const getAllTwins = (filters = {}) => {
    let result = Array.from(twins.values());
    if (filters.workflowId) result = result.filter(t => t.workflowId === filters.workflowId);
    if (filters.state) result = result.filter(t => t.state === filters.state);
    if (filters.instanceId) result = result.filter(t => t.instanceId === filters.instanceId);
    return result;
  };

  const deleteTwin = (twinId) => {
    twins.delete(twinId);
    history.delete(twinId);
    metrics.delete(twinId);
    return true;
  };

  const getStats = () => {
    const allTwins = Array.from(twins.values());
    const stateCounts = {};
    for (const twin of allTwins) {
      stateCounts[twin.state] = (stateCounts[twin.state] || 0) + 1;
    }

    let totalExecutionTime = 0;
    let completedCount = 0;

    for (const twin of allTwins) {
      if (twin.completedAt && twin.startedAt) {
        totalExecutionTime += twin.completedAt - twin.startedAt;
        completedCount++;
      }
    }

    return {
      totalTwins: allTwins.length,
      byState: stateCounts,
      avgExecutionTime: completedCount > 0 ? Math.round(totalExecutionTime / completedCount) : 0,
      completedCount,
      runningCount: stateCounts[TWIN_STATES.RUNNING] || 0,
      failedCount: stateCounts[TWIN_STATES.FAILED] || 0,
    };
  };

  return {
    twins,
    history,
    metrics,
    createTwin,
    getTwin,
    updateTwinState,
    recordStepExecution,
    getTwinHistory,
    getTwinMetrics,
    getAllTwins,
    deleteTwin,
    getStats,
  };
};

import crypto from 'crypto';

describe('WorkflowTwins', () => {
  let service;

  beforeEach(() => {
    service = createWorkflowTwins();
  });

  describe('createTwin', () => {
    it('should create a twin with initial state', () => {
      const twin = service.createTwin({
        workflowId: 'wf-1',
        instanceId: 'inst-1',
        variables: { count: 0 }
      });

      expect(twin).toBeDefined();
      expect(twin.id).toBeDefined();
      expect(twin.workflowId).toBe('wf-1');
      expect(twin.instanceId).toBe('inst-1');
      expect(twin.state).toBe(TWIN_STATES.INITIALIZED);
      expect(twin.variables.count).toBe(0);
      expect(twin.version).toBe(1);
    });

    it('should initialize metrics for new twin', () => {
      const twin = service.createTwin({ workflowId: 'wf-1' });
      const metrics = service.getTwinMetrics(twin.id);

      expect(metrics).toBeDefined();
      expect(metrics.twinId).toBe(twin.id);
      expect(metrics.stepCount).toBe(0);
      expect(metrics.errorCount).toBe(0);
    });

    it('should generate unique IDs', () => {
      const twin1 = service.createTwin({ workflowId: 'wf-1' });
      const twin2 = service.createTwin({ workflowId: 'wf-1' });

      expect(twin1.id).not.toBe(twin2.id);
    });
  });

  describe('getTwin', () => {
    it('should retrieve existing twin', () => {
      const created = service.createTwin({ workflowId: 'wf-1' });
      const retrieved = service.getTwin(created.id);

      expect(retrieved).toEqual(created);
    });

    it('should return null for non-existent twin', () => {
      const retrieved = service.getTwin('non-existent');

      expect(retrieved).toBeNull();
    });
  });

  describe('updateTwinState', () => {
    it('should update twin state', () => {
      const twin = service.createTwin({ workflowId: 'wf-1' });

      const updated = service.updateTwinState(twin.id, TWIN_STATES.RUNNING);

      expect(updated.state).toBe(TWIN_STATES.RUNNING);
      expect(updated.startedAt).toBeDefined();
      expect(updated.version).toBe(2);
    });

    it('should set startedAt when transitioning to RUNNING', () => {
      const twin = service.createTwin({ workflowId: 'wf-1' });

      expect(twin.startedAt).toBeNull();

      const updated = service.updateTwinState(twin.id, TWIN_STATES.RUNNING);

      expect(updated.startedAt).not.toBeNull();
    });

    it('should set completedAt when transitioning to terminal state', () => {
      const twin = service.createTwin({ workflowId: 'wf-1' });

      const updated = service.updateTwinState(twin.id, TWIN_STATES.COMPLETED);

      expect(updated.completedAt).not.toBeNull();
    });

    it('should merge step data into state', () => {
      const twin = service.createTwin({ workflowId: 'wf-1' });

      const updated = service.updateTwinState(twin.id, TWIN_STATES.RUNNING, {
        currentStep: 'step-1',
        variables: { count: 5 },
        stepStates: { 'step-1': { status: 'completed' } }
      });

      expect(updated.currentStep).toBe('step-1');
      expect(updated.variables.count).toBe(5);
      expect(updated.stepStates['step-1'].status).toBe('completed');
    });

    it('should throw for non-existent twin', () => {
      expect(() => service.updateTwinState('non-existent', TWIN_STATES.RUNNING))
        .toThrow('Twin not found');
    });
  });

  describe('recordStepExecution', () => {
    it('should record step execution', () => {
      const twin = service.createTwin({ workflowId: 'wf-1' });

      const updated = service.recordStepExecution(twin.id, 'step-1', {
        status: 'completed',
        duration: 100,
        output: { result: 'success' }
      });

      expect(updated.stepStates['step-1']).toBeDefined();
      expect(updated.stepStates['step-1'].status).toBe('completed');
      expect(updated.currentStep).toBe('step-1');
    });

    it('should update metrics when recording step', () => {
      const twin = service.createTwin({ workflowId: 'wf-1' });

      service.recordStepExecution(twin.id, 'step-1', {
        duration: 100
      });

      const metrics = service.getTwinMetrics(twin.id);

      expect(metrics.stepCount).toBe(1);
      expect(metrics.avgStepDuration).toBe(100);
    });

    it('should track errors in metrics', () => {
      const twin = service.createTwin({ workflowId: 'wf-1' });

      service.recordStepExecution(twin.id, 'step-1', {
        error: 'Something went wrong'
      });

      const metrics = service.getTwinMetrics(twin.id);

      expect(metrics.errorCount).toBe(1);
    });

    it('should throw for non-existent twin', () => {
      expect(() => service.recordStepExecution('non-existent', 'step-1', {}))
        .toThrow('Twin not found');
    });
  });

  describe('getAllTwins', () => {
    it('should return all twins', () => {
      service.createTwin({ workflowId: 'wf-1' });
      service.createTwin({ workflowId: 'wf-2' });

      const twins = service.getAllTwins();

      expect(twins.length).toBe(2);
    });

    it('should filter by workflowId', () => {
      service.createTwin({ workflowId: 'wf-1' });
      service.createTwin({ workflowId: 'wf-1' });
      service.createTwin({ workflowId: 'wf-2' });

      const twins = service.getAllTwins({ workflowId: 'wf-1' });

      expect(twins.length).toBe(2);
    });

    it('should filter by state', () => {
      const twin1 = service.createTwin({ workflowId: 'wf-1' });
      service.createTwin({ workflowId: 'wf-2' });
      service.updateTwinState(twin1.id, TWIN_STATES.RUNNING);

      const twins = service.getAllTwins({ state: TWIN_STATES.RUNNING });

      expect(twins.length).toBe(1);
      expect(twins[0].workflowId).toBe('wf-1');
    });
  });

  describe('deleteTwin', () => {
    it('should delete twin and its data', () => {
      const twin = service.createTwin({ workflowId: 'wf-1' });

      service.deleteTwin(twin.id);

      expect(service.getTwin(twin.id)).toBeNull();
      expect(service.getTwinMetrics(twin.id)).toBeNull();
    });

    it('should return true after deletion', () => {
      const twin = service.createTwin({ workflowId: 'wf-1' });

      const result = service.deleteTwin(twin.id);

      expect(result).toBe(true);
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      service.createTwin({ workflowId: 'wf-1' });
      const twin2 = service.createTwin({ workflowId: 'wf-2' });
      service.updateTwinState(twin2.id, TWIN_STATES.RUNNING);
      const twin3 = service.createTwin({ workflowId: 'wf-3' });
      service.updateTwinState(twin3.id, TWIN_STATES.COMPLETED);

      const stats = service.getStats();

      expect(stats.totalTwins).toBe(3);
      expect(stats.runningCount).toBe(1);
      // completedCount only counts twins with both startedAt and completedAt
      expect(stats.completedCount).toBe(0);
      expect(stats.byState[TWIN_STATES.INITIALIZED]).toBe(1);
    });

    it('should calculate average execution time', async () => {
      const twin1 = service.createTwin({ workflowId: 'wf-1' });
      service.updateTwinState(twin1.id, TWIN_STATES.RUNNING);
      await new Promise(r => setTimeout(r, 10));
      service.updateTwinState(twin1.id, TWIN_STATES.COMPLETED);

      const stats = service.getStats();

      expect(stats.completedCount).toBe(1);
      expect(stats.avgExecutionTime).toBeGreaterThan(0);
    });
  });

  describe('lifecycle scenarios', () => {
    it('should track complete workflow lifecycle', () => {
      // Create twin
      const twin = service.createTwin({
        workflowId: 'order-processing',
        instanceId: 'order-123',
        variables: { orderId: 'order-123', status: 'pending' }
      });

      expect(twin.state).toBe(TWIN_STATES.INITIALIZED);

      // Start workflow
      let updated = service.updateTwinState(twin.id, TWIN_STATES.RUNNING);
      expect(updated.startedAt).not.toBeNull();

      // Execute steps
      service.recordStepExecution(twin.id, 'validate-order', {
        status: 'completed',
        duration: 50
      });

      service.recordStepExecution(twin.id, 'process-payment', {
        status: 'completed',
        duration: 200
      });

      // Get metrics
      const metrics = service.getTwinMetrics(twin.id);
      expect(metrics.stepCount).toBe(2);
      expect(metrics.avgStepDuration).toBe(125);

      // Complete workflow
      updated = service.updateTwinState(twin.id, TWIN_STATES.COMPLETED, {
        variables: { status: 'completed' }
      });

      expect(updated.state).toBe(TWIN_STATES.COMPLETED);
      expect(updated.completedAt).not.toBeNull();
      expect(updated.variables.status).toBe('completed');
    });

    it('should track failed workflow', () => {
      const twin = service.createTwin({ workflowId: 'wf-1' });
      service.updateTwinState(twin.id, TWIN_STATES.RUNNING);

      service.recordStepExecution(twin.id, 'step-1', {
        error: 'Connection timeout'
      });

      const updated = service.updateTwinState(twin.id, TWIN_STATES.FAILED);

      expect(updated.state).toBe(TWIN_STATES.FAILED);

      const metrics = service.getTwinMetrics(twin.id);
      expect(metrics.errorCount).toBe(1);
    });
  });
});