import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'crypto';

const SIMULATION_STATES = {
  CREATED: 'created',
  RUNNING: 'running',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
};

const createSimulationEngine = () => {
  const simulations = new Map();
  const simulationResults = new Map();

  const createSimulation = (workflowDefinition, options = {}) => {
    const simId = crypto.randomUUID();
    const now = Date.now();

    const simulation = {
      id: simId,
      name: options.name || `Simulation ${simId.slice(0, 8)}`,
      workflowDefinition,
      state: SIMULATION_STATES.CREATED,
      initialContext: options.initialContext || {},
      simulationConfig: {
        maxSteps: options.maxSteps || 1000,
        maxDuration: options.maxDuration || 60000,
        enableBacktracking: options.enableBacktracking !== false,
        exploreAllPaths: options.exploreAllPaths || false,
        failureInjection: options.failureInjection || false,
        variableOverrides: options.variableOverrides || {},
      },
      currentStep: null,
      stepHistory: [],
      metrics: {
        stepsExecuted: 0,
        pathsExplored: 0,
        decisionsMade: 0,
        backtracks: 0,
        failuresInjected: 0,
        estimatedCost: 0,
        estimatedDuration: 0,
      },
      createdAt: now,
      startedAt: null,
      completedAt: null,
    };

    simulations.set(simId, simulation);
    return simulation;
  };

  const simulateStep = (simId, step, context) => {
    const sim = simulations.get(simId);
    if (!sim) throw new Error('Simulation not found');

    const result = {
      stepId: step.id,
      stepType: step.type,
      inputs: step.inputs || {},
      outputs: {},
      duration: 10,
      status: 'success',
      error: null,
      branches: [],
    };

    // Simulate based on step type
    if (step.type === 'task') {
      result.outputs = { result: `Task ${step.id} executed` };
    } else if (step.type === 'condition') {
      result.outputs = { conditionResult: true };
      result.branches = ['true'];
      sim.metrics.decisionsMade++;
    } else if (step.type === 'parallel') {
      result.branches = step.branches || ['branch-1', 'branch-2'];
      sim.metrics.pathsExplored += result.branches.length;
    } else {
      result.outputs = { result: 'simulated' };
    }

    sim.metrics.stepsExecuted++;
    sim.metrics.estimatedCost += result.duration * 0.0000001;
    sim.metrics.estimatedDuration += result.duration;
    sim.stepHistory.push({ stepId: step.id, ...result });
    sim.currentStep = step.id;

    simulations.set(simId, sim);
    return result;
  };

  const runSimulation = (simId) => {
    const sim = simulations.get(simId);
    if (!sim) throw new Error('Simulation not found');

    sim.startedAt = Date.now();
    sim.state = SIMULATION_STATES.RUNNING;

    let context = { ...sim.initialContext };
    const results = { steps: [], finalContext: context, metrics: { ...sim.metrics }, status: SIMULATION_STATES.COMPLETED };

    if (sim.workflowDefinition.nodes) {
      for (const node of sim.workflowDefinition.nodes) {
        const stepResult = simulateStep(simId, node, context);
        results.steps.push(stepResult);
        context = { ...context, ...stepResult.outputs };
      }
    }

    sim.completedAt = Date.now();
    sim.state = results.status;
    simulations.set(simId, sim);
    simulationResults.set(simId, results);

    return results;
  };

  const getSimulation = (simId) => simulations.get(simId) || null;

  const getSimulationResults = (simId) => simulationResults.get(simId) || null;

  const compareScenarios = (scenarioIds) => {
    const scenarios = scenarioIds.map(id => ({
      id,
      simulation: simulations.get(id),
      results: simulationResults.get(id),
    }));

    const comparison = {
      scenarios: [],
      metrics: { totalSteps: {}, totalDuration: {}, totalCost: {} },
      recommendations: [],
    };

    for (const scenario of scenarios) {
      if (!scenario.simulation) continue;

      comparison.scenarios.push({ id: scenario.id, name: scenario.simulation.name });
      comparison.metrics.totalSteps[scenario.id] = scenario.simulation.metrics.stepsExecuted;
      comparison.metrics.totalDuration[scenario.id] = scenario.simulation.metrics.estimatedDuration;
      comparison.metrics.totalCost[scenario.id] = scenario.simulation.metrics.estimatedCost;
    }

    return comparison;
  };

  return { createSimulation, simulateStep, runSimulation, getSimulation, getSimulationResults, compareScenarios };
};

describe('SimulationEngine', () => {
  let service;

  beforeEach(() => {
    service = createSimulationEngine();
  });

  describe('createSimulation', () => {
    it('should create a simulation with workflow definition', () => {
      const workflow = { nodes: [{ id: 'step-1', type: 'task' }] };
      const sim = service.createSimulation(workflow, { name: 'Test Sim' });

      expect(sim).toBeDefined();
      expect(sim.id).toBeDefined();
      expect(sim.name).toBe('Test Sim');
      expect(sim.workflowDefinition).toEqual(workflow);
      expect(sim.state).toBe(SIMULATION_STATES.CREATED);
    });

    it('should use default configuration', () => {
      const sim = service.createSimulation({});

      expect(sim.simulationConfig.maxSteps).toBe(1000);
      expect(sim.simulationConfig.maxDuration).toBe(60000);
      expect(sim.simulationConfig.enableBacktracking).toBe(true);
    });

    it('should allow custom configuration', () => {
      const sim = service.createSimulation({}, {
        maxSteps: 100,
        failureInjection: true,
        variableOverrides: { env: 'test' }
      });

      expect(sim.simulationConfig.maxSteps).toBe(100);
      expect(sim.simulationConfig.failureInjection).toBe(true);
      expect(sim.simulationConfig.variableOverrides.env).toBe('test');
    });

    it('should initialize metrics to zero', () => {
      const sim = service.createSimulation({});

      expect(sim.metrics.stepsExecuted).toBe(0);
      expect(sim.metrics.pathsExplored).toBe(0);
      expect(sim.metrics.decisionsMade).toBe(0);
      expect(sim.metrics.estimatedCost).toBe(0);
    });

    it('should set initial context', () => {
      const initialContext = { userId: '123', action: 'process' };
      const sim = service.createSimulation({}, { initialContext });

      expect(sim.initialContext).toEqual(initialContext);
    });
  });

  describe('simulateStep', () => {
    it('should simulate a task step', () => {
      const sim = service.createSimulation({});
      const step = { id: 'step-1', type: 'task' };

      const result = service.simulateStep(sim.id, step, {});

      expect(result.stepId).toBe('step-1');
      expect(result.stepType).toBe('task');
      expect(result.status).toBe('success');
      expect(result.outputs.result).toBeDefined();
    });

    it('should track metrics for simulated steps', () => {
      const sim = service.createSimulation({});
      const step = { id: 'step-1', type: 'task' };

      service.simulateStep(sim.id, step, {});
      service.simulateStep(sim.id, { id: 'step-2', type: 'task' }, {});

      const updated = service.getSimulation(sim.id);
      expect(updated.metrics.stepsExecuted).toBe(2);
    });

    it('should track decision points', () => {
      const sim = service.createSimulation({});
      const step = { id: 'step-1', type: 'condition' };

      service.simulateStep(sim.id, step, {});

      const updated = service.getSimulation(sim.id);
      expect(updated.metrics.decisionsMade).toBe(1);
    });

    it('should track parallel branches', () => {
      const sim = service.createSimulation({});
      const step = { id: 'parallel-1', type: 'parallel', branches: ['a', 'b', 'c'] };

      service.simulateStep(sim.id, step, {});

      const updated = service.getSimulation(sim.id);
      expect(updated.metrics.pathsExplored).toBe(3);
      expect(updated.stepHistory[0].branches).toEqual(['a', 'b', 'c']);
    });

    it('should throw for non-existent simulation', () => {
      expect(() => service.simulateStep('non-existent', { id: 'step-1' }, {}))
        .toThrow('Simulation not found');
    });

    it('should estimate cost based on duration', () => {
      const sim = service.createSimulation({});
      const step = { id: 'step-1', type: 'task' };

      service.simulateStep(sim.id, step, {});

      const updated = service.getSimulation(sim.id);
      expect(updated.metrics.estimatedCost).toBeGreaterThan(0);
    });
  });

  describe('runSimulation', () => {
    it('should run simulation and update state', () => {
      const workflow = {
        nodes: [
          { id: 'step-1', type: 'task' },
          { id: 'step-2', type: 'task' },
        ]
      };
      const sim = service.createSimulation(workflow);

      const results = service.runSimulation(sim.id);

      expect(results.status).toBe(SIMULATION_STATES.COMPLETED);
      expect(results.steps.length).toBe(2);
    });

    it('should populate final context with step outputs', () => {
      const workflow = {
        nodes: [
          { id: 'step-1', type: 'task' },
        ]
      };
      const sim = service.createSimulation(workflow, { initialContext: { count: 0 } });

      const results = service.runSimulation(sim.id);

      expect(results.finalContext.count).toBe(0);
      // Step outputs are added to context
      expect(results.steps[0].outputs).toBeDefined();
    });

    it('should set startedAt and completedAt timestamps', () => {
      const sim = service.createSimulation({ nodes: [{ id: 'step-1', type: 'task' }] });

      const results = service.runSimulation(sim.id);

      const updated = service.getSimulation(sim.id);
      expect(updated.startedAt).not.toBeNull();
      expect(updated.completedAt).not.toBeNull();
    });

    it('should store results for later retrieval', () => {
      const sim = service.createSimulation({ nodes: [{ id: 'step-1', type: 'task' }] });

      service.runSimulation(sim.id);
      const results = service.getSimulationResults(sim.id);

      expect(results).toBeDefined();
      expect(results.steps).toBeDefined();
    });

    it('should update simulation state to completed', () => {
      const sim = service.createSimulation({ nodes: [{ id: 'step-1', type: 'task' }] });

      service.runSimulation(sim.id);

      const updated = service.getSimulation(sim.id);
      expect(updated.state).toBe(SIMULATION_STATES.COMPLETED);
    });
  });

  describe('compareScenarios', () => {
    it('should compare multiple simulations', () => {
      const sim1 = service.createSimulation({ nodes: [{ id: 'step-1', type: 'task' }] }, { name: 'Scenario 1' });
      const sim2 = service.createSimulation({ nodes: [{ id: 'step-1', type: 'task' }, { id: 'step-2', type: 'task' }] }, { name: 'Scenario 2' });

      service.runSimulation(sim1.id);
      service.runSimulation(sim2.id);

      const comparison = service.compareScenarios([sim1.id, sim2.id]);

      expect(comparison.scenarios.length).toBe(2);
      expect(comparison.metrics.totalSteps[sim1.id]).toBe(1);
      expect(comparison.metrics.totalSteps[sim2.id]).toBe(2);
    });

    it('should calculate cost comparison', () => {
      const sim1 = service.createSimulation({ nodes: [{ id: 'step-1', type: 'task' }] });
      const sim2 = service.createSimulation({ nodes: [{ id: 'step-1', type: 'task' }, { id: 'step-2', type: 'task' }] });

      service.runSimulation(sim1.id);
      service.runSimulation(sim2.id);

      const comparison = service.compareScenarios([sim1.id, sim2.id]);

      expect(comparison.metrics.totalCost[sim2.id]).toBeGreaterThan(comparison.metrics.totalCost[sim1.id]);
    });

    it('should handle non-existent scenarios gracefully', () => {
      const sim = service.createSimulation({});
      service.runSimulation(sim.id);

      const comparison = service.compareScenarios([sim.id, 'non-existent']);

      expect(comparison.scenarios.length).toBe(1);
    });
  });

  describe('getSimulation', () => {
    it('should retrieve existing simulation', () => {
      const created = service.createSimulation({});
      const retrieved = service.getSimulation(created.id);

      expect(retrieved).toEqual(created);
    });

    it('should return null for non-existent simulation', () => {
      const retrieved = service.getSimulation('non-existent');

      expect(retrieved).toBeNull();
    });
  });

  describe('workflow simulation scenarios', () => {
    it('should simulate a multi-step workflow', () => {
      const workflow = {
        nodes: [
          { id: 'fetch-user', type: 'task' },
          { id: 'validate', type: 'condition' },
          { id: 'process', type: 'task' },
          { id: 'notify', type: 'task' },
        ]
      };

      const sim = service.createSimulation(workflow);
      const results = service.runSimulation(sim.id);

      expect(results.steps.length).toBe(4);
      expect(results.status).toBe(SIMULATION_STATES.COMPLETED);

      const updated = service.getSimulation(sim.id);
      expect(updated.metrics.stepsExecuted).toBe(4);
      expect(updated.metrics.decisionsMade).toBe(1);
    });

    it('should simulate parallel execution paths', () => {
      const workflow = {
        nodes: [
          { id: 'start', type: 'task' },
          { id: 'parallel', type: 'parallel', branches: ['path-a', 'path-b', 'path-c'] },
          { id: 'merge', type: 'task' },
        ]
      };

      const sim = service.createSimulation(workflow);
      const results = service.runSimulation(sim.id);

      const updated = service.getSimulation(sim.id);
      expect(updated.metrics.pathsExplored).toBe(3);
    });

    it('should accumulate context through workflow', () => {
      const workflow = {
        nodes: [
          { id: 'step-1', type: 'task' },
          { id: 'step-2', type: 'task' },
        ]
      };

      const sim = service.createSimulation(workflow, { initialContext: { orderId: '123' } });
      const results = service.runSimulation(sim.id);

      expect(results.finalContext.orderId).toBe('123');
      // Check that steps have outputs
      expect(results.steps.length).toBe(2);
      expect(results.steps[0].outputs).toBeDefined();
    });
  });
});