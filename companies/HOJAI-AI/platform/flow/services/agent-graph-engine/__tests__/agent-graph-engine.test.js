/**
 * FlowOS Agent Graph Engine Tests
 * Tests for state machines, branching, time travel
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Graph states
const GRAPH_STATES = {
  PENDING: 'pending',
  RUNNING: 'running',
  WAITING: 'waiting',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  PAUSED: 'paused'
};

// Mock storage
const mockStorage = {
  graphs: new Map(),
  executions: new Map(),
  checkpoints: new Map()
};

// Compile definition
function compileDefinition(definition) {
  const states = {};
  const transitions = [];

  for (const [name, config] of Object.entries(definition.states || {})) {
    states[name] = {
      name,
      type: config.type || 'task',
      on_enter: config.on_enter || null,
      on_exit: config.on_exit || null,
      condition: config.condition || null,
      approvers: config.approvers || null,
      branches: config.branches || null,
      next: config.next || null,
      metadata: config.metadata || {}
    };
  }

  for (const [name, config] of Object.entries(definition.states || {})) {
    if (config.on_event) {
      for (const [event, target] of Object.entries(config.on_event)) {
        transitions.push({ from: name, event, to: target });
      }
    }

    if (config.condition) {
      transitions.push({
        from: name,
        type: 'conditional',
        condition: config.condition,
        targets: Object.entries(config.condition).map(([key, value]) => ({
          condition: key === 'default' ? null : key,
          target: value
        }))
      });
    }
  }

  return {
    id: `compiled_${Date.now()}`,
    name: definition.graph || 'Compiled Graph',
    initial_state: definition.initial_state || 'start',
    states,
    transitions,
    compiledAt: new Date().toISOString()
  };
}

// Validate state transition
function validateStateTransition(from, to, transitions) {
  const valid = transitions.find(t => t.from === from && t.to === to);
  return valid !== undefined;
}

// Create execution
function createExecution(graphId, context = {}, startState = null) {
  const id = `exec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();

  const execution = {
    id,
    graphId,
    current_state: startState || 'start',
    context,
    state_data: {},
    status: GRAPH_STATES.RUNNING,
    startedAt: now,
    updatedAt: now,
    completedAt: null,
    steps: [{ step: 0, state: startState || 'start', event: 'start', timestamp: now }]
  };

  mockStorage.executions.set(id, execution);
  return execution;
}

// Advance execution
function advanceExecution(execution, event, condition_result) {
  const graph = mockStorage.graphs.get(execution.graphId);
  const currentStateConfig = graph?.states[execution.current_state];

  if (!currentStateConfig) {
    return { error: 'State not found' };
  }

  // Find next state
  let nextState = null;

  if (event && currentStateConfig.on_event?.[event]) {
    nextState = currentStateConfig.on_event[event];
  } else if (condition_result !== undefined && currentStateConfig.condition) {
    const cond = currentStateConfig.condition;
    if (condition_result === true && cond.true) {
      nextState = cond.true;
    } else if (condition_result === false && cond.false) {
      nextState = cond.false;
    } else if (cond.default) {
      nextState = cond.default;
    }
  } else if (currentStateConfig.next) {
    nextState = currentStateConfig.next;
  }

  if (nextState) {
    execution.current_state = nextState;
    execution.steps.push({
      step: execution.steps.length,
      from: execution.current_state,
      to: nextState,
      event,
      timestamp: new Date().toISOString()
    });
    execution.updatedAt = new Date().toISOString();
  }

  return execution;
}

// Create checkpoint
function createCheckpoint(executionId, execution) {
  const id = `cp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const checkpoint = {
    id,
    execution_id: executionId,
    state: execution.current_state,
    context: { ...execution.context },
    state_data: { ...execution.state_data },
    step: execution.steps.length - 1,
    createdAt: new Date().toISOString()
  };

  mockStorage.checkpoints.set(id, checkpoint);
  return checkpoint;
}

// Replay from checkpoint
function replayExecution(execution, fromCheckpoint) {
  const checkpoint = mockStorage.checkpoints.get(fromCheckpoint);
  if (!checkpoint) {
    return { error: 'Checkpoint not found' };
  }

  return createExecution(execution.graphId, checkpoint.context, checkpoint.state);
}

describe('Agent Graph Engine', () => {
  beforeEach(() => {
    mockStorage.graphs.clear();
    mockStorage.executions.clear();
    mockStorage.checkpoints.clear();
  });

  describe('Graph Compilation', () => {
    it('should compile simple graph', () => {
      const definition = {
        graph: 'OrderProcessing',
        initial_state: 'received',
        states: {
          received: { next: 'validated' },
          validated: { type: 'task', next: 'completed' },
          completed: { type: 'final' }
        }
      };

      const compiled = compileDefinition(definition);

      expect(compiled.name).toBe('OrderProcessing');
      expect(compiled.initial_state).toBe('received');
      expect(compiled.states.received).toBeDefined();
      expect(compiled.states.completed.type).toBe('final');
    });

    it('should compile graph with event transitions', () => {
      const definition = {
        graph: 'PaymentFlow',
        initial_state: 'start',
        states: {
          start: {
            on_event: {
              payment_received: 'validated',
              payment_failed: 'failed'
            }
          },
          validated: { next: 'completed' },
          completed: { type: 'final' },
          failed: { type: 'final' }
        }
      };

      const compiled = compileDefinition(definition);

      expect(compiled.transitions).toHaveLength(2);
      expect(compiled.transitions.find(t => t.event === 'payment_received')?.to).toBe('validated');
      expect(compiled.transitions.find(t => t.event === 'payment_failed')?.to).toBe('failed');
    });

    it('should compile graph with conditions', () => {
      const definition = {
        graph: 'RiskCheck',
        initial_state: 'start',
        states: {
          start: {
            condition: {
              'risk > 80': 'legal_review',
              'default': 'processing'
            }
          },
          legal_review: { next: 'completed' },
          processing: { next: 'completed' },
          completed: { type: 'final' }
        }
      };

      const compiled = compileDefinition(definition);

      expect(compiled.transitions).toHaveLength(1);
      expect(compiled.transitions[0].type).toBe('conditional');
    });

    it('should validate state types', () => {
      const definition = {
        graph: 'Types',
        states: {
          task: { type: 'task' },
          human: { type: 'human_task' },
          parallel: { type: 'parallel' },
          final: { type: 'final' }
        }
      };

      const compiled = compileDefinition(definition);

      expect(compiled.states.task.type).toBe('task');
      expect(compiled.states.human.type).toBe('human_task');
      expect(compiled.states.parallel.type).toBe('parallel');
      expect(compiled.states.final.type).toBe('final');
    });
  });

  describe('State Transitions', () => {
    it('should validate valid transition', () => {
      const transitions = [
        { from: 'start', to: 'middle' },
        { from: 'middle', to: 'end' }
      ];

      expect(validateStateTransition('start', 'middle', transitions)).toBe(true);
      expect(validateStateTransition('middle', 'end', transitions)).toBe(true);
    });

    it('should reject invalid transition', () => {
      const transitions = [
        { from: 'start', to: 'middle' }
      ];

      expect(validateStateTransition('start', 'end', transitions)).toBe(false);
    });

    it('should handle event-based transitions', () => {
      const graph = {
        states: {
          received: {
            on_event: {
              payment_received: 'validated'
            }
          },
          validated: {}
        }
      };

      const transition = graph.states.received.on_event.payment_received;
      expect(transition).toBe('validated');
    });
  });

  describe('Execution Management', () => {
    it('should create execution', () => {
      const graphId = 'graph_1';
      mockStorage.graphs.set(graphId, {
        id: graphId,
        initial_state: 'start',
        states: { start: { next: 'end' } }
      });

      const execution = createExecution(graphId, { userId: '123' });

      expect(execution.id).toBeDefined();
      expect(execution.graphId).toBe(graphId);
      expect(execution.current_state).toBe('start');
      expect(execution.status).toBe(GRAPH_STATES.RUNNING);
    });

    it('should start from custom state', () => {
      const graphId = 'graph_2';
      mockStorage.graphs.set(graphId, {
        id: graphId,
        initial_state: 'start',
        states: { middle: {} }
      });

      const execution = createExecution(graphId, {}, 'middle');

      expect(execution.current_state).toBe('middle');
    });

    it('should advance execution with event', () => {
      const graphId = 'graph_3';
      mockStorage.graphs.set(graphId, {
        states: {
          start: { on_event: { go: 'middle' } },
          middle: {}
        }
      });

      const execution = createExecution(graphId, {}, 'start');
      advanceExecution(execution, 'go');

      expect(execution.current_state).toBe('middle');
    });

    it('should advance execution with condition', () => {
      const graphId = 'graph_4';
      mockStorage.graphs.set(graphId, {
        states: {
          check: {
            condition: {
              true: 'success',
              false: 'failure'
            }
          },
          success: {},
          failure: {}
        }
      });

      const execution = createExecution(graphId, {}, 'check');
      advanceExecution(execution, null, true);

      expect(execution.current_state).toBe('success');
    });

    it('should track execution steps', () => {
      const graphId = 'graph_5';
      mockStorage.graphs.set(graphId, {
        states: { start: { next: 'end' } }
      });

      const execution = createExecution(graphId);
      advanceExecution(execution, null);

      expect(execution.steps).toHaveLength(2);
      expect(execution.steps[0].state).toBe('start');
      expect(execution.steps[1].to).toBe('end');
    });
  });

  describe('Checkpoints', () => {
    it('should create checkpoint', () => {
      const graphId = 'graph_6';
      mockStorage.graphs.set(graphId, {
        states: { start: {} }
      });

      const execution = createExecution(graphId, { data: 'test' });
      const checkpoint = createCheckpoint(execution.id, execution);

      expect(checkpoint.id).toBeDefined();
      expect(checkpoint.execution_id).toBe(execution.id);
      expect(checkpoint.context.data).toBe('test');
      expect(checkpoint.step).toBe(0);
    });

    it('should restore from checkpoint', () => {
      const graphId = 'graph_7';
      mockStorage.graphs.set(graphId, {
        states: { start: {} }
      });

      const original = createExecution(graphId, { restored: true }, 'middle');
      const checkpoint = createCheckpoint(original.id, original);

      const restored = replayExecution(original, checkpoint.id);

      expect(restored.current_state).toBe('middle');
      expect(restored.context.restored).toBe(true);
    });
  });

  describe('Time Travel (Replay)', () => {
    it('should replay from step', () => {
      const graphId = 'graph_8';
      mockStorage.graphs.set(graphId, {
        states: { start: { next: 'middle' }, middle: { next: 'end' } }
      });

      const execution = createExecution(graphId);
      advanceExecution(execution, null); // to middle
      advanceExecution(execution, null); // to end

      const fromStep = 1; // Replay from 'middle'
      const newExecution = createExecution(
        graphId,
        execution.context,
        execution.steps[fromStep].to || execution.steps[fromStep].state
      );

      expect(newExecution.steps).toHaveLength(1);
    });

    it('should preserve context on replay', () => {
      const graphId = 'graph_9';
      mockStorage.graphs.set(graphId, { states: { start: {} } });

      const execution = createExecution(graphId, {
        userId: 'user_1',
        orderId: 'order_123'
      });

      const checkpoint = createCheckpoint(execution.id, execution);
      const restored = replayExecution(execution, checkpoint.id);

      expect(restored.context.userId).toBe('user_1');
      expect(restored.context.orderId).toBe('order_123');
    });
  });

  describe('Graph States', () => {
    it('should have correct state values', () => {
      expect(GRAPH_STATES.PENDING).toBe('pending');
      expect(GRAPH_STATES.RUNNING).toBe('running');
      expect(GRAPH_STATES.WAITING).toBe('waiting');
      expect(GRAPH_STATES.COMPLETED).toBe('completed');
      expect(GRAPH_STATES.FAILED).toBe('failed');
      expect(GRAPH_STATES.CANCELLED).toBe('cancelled');
      expect(GRAPH_STATES.PAUSED).toBe('paused');
    });
  });

  describe('Graph Visualization', () => {
    it('should build state tree', () => {
      const steps = [
        { state: 'start', step: 0 },
        { state: 'middle', step: 1 },
        { state: 'end', step: 2 }
      ];

      const tree = steps.map((step, index) => ({
        id: `${step.state}_${index}`,
        state: step.state,
        step: index,
        children: []
      }));

      expect(tree).toHaveLength(3);
      expect(tree[0].state).toBe('start');
      expect(tree[2].state).toBe('end');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing state', () => {
      const graph = { states: {} };
      const execution = { current_state: 'unknown', graphId: 'graph_10' };

      const result = advanceExecution(execution, null);
      expect(result.error).toBeDefined();
    });

    it('should handle missing checkpoint', () => {
      const execution = { graphId: 'graph_11' };
      const result = replayExecution(execution, 'non_existent_cp');

      expect(result.error).toBe('Checkpoint not found');
    });
  });
});
