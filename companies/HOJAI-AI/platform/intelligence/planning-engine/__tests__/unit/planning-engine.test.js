// Planning Engine unit tests
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { detectCycle, topologicalSort, validatePlan, getExecutionLevels } from '../../src/validator.js';
import { decomposeGoal, suggestStrategy, NODE_TYPES } from '../../src/decomposer.js';
import { executePlan, EXEC_STATES } from '../../src/executor.js';

function httpReq(method, path, body) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: 'localhost', port: 4896, path, method, headers: {} };
    if (body) { const json = JSON.stringify(body); opts.headers['Content-Type'] = 'application/json'; opts.headers['Content-Length'] = Buffer.byteLength(json); }
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(data) }); } catch { resolve({ status: res.statusCode, body: data }); } });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// --- Validator Tests ---
describe('Validator', () => {
  const simpleNodes = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const simpleEdges = [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }];

  it('detectCycle should return empty for valid DAG', () => {
    expect(detectCycle(simpleNodes, simpleEdges)).toEqual([]);
  });

  it('detectCycle should return cycle for circular graph', () => {
    const nodes = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const edges = [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }, { from: 'c', to: 'a' }];
    const cycle = detectCycle(nodes, edges);
    expect(cycle.length).toBeGreaterThan(0);
  });

  it('topologicalSort should return correct order', () => {
    const order = topologicalSort(simpleNodes, simpleEdges);
    expect(order.indexOf('a')).toBeLessThan(order.indexOf('b'));
    expect(order.indexOf('b')).toBeLessThan(order.indexOf('c'));
  });

  it('topologicalSort should handle parallel branches', () => {
    const nodes = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
    const edges = [{ from: 'a', to: 'b' }, { from: 'a', to: 'c' }, { from: 'b', to: 'd' }, { from: 'c', to: 'd' }];
    const order = topologicalSort(nodes, edges);
    expect(order[0]).toBe('a');
    expect(order[order.length - 1]).toBe('d');
    expect(order.indexOf('b')).toBeLessThan(order.indexOf('d'));
    expect(order.indexOf('c')).toBeLessThan(order.indexOf('d'));
  });

  it('validatePlan should pass valid plan', () => {
    const plan = { name: 'Test', nodes: simpleNodes, edges: simpleEdges };
    const result = validatePlan(plan);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('validatePlan should fail for duplicate node IDs', () => {
    const plan = { name: 'Test', nodes: [{ id: 'a' }, { id: 'a' }], edges: [] };
    const result = validatePlan(plan);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Duplicate node IDs');
  });

  it('validatePlan should fail for edges referencing unknown nodes', () => {
    const plan = { name: 'Test', nodes: [{ id: 'a' }], edges: [{ from: 'a', to: 'b' }] };
    const result = validatePlan(plan);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('b'))).toBe(true);
  });

  it('validatePlan should fail for cycle', () => {
    const nodes = [{ id: 'a' }, { id: 'b' }];
    const edges = [{ from: 'a', to: 'b' }, { from: 'b', to: 'a' }];
    const result = validatePlan({ name: 'Test', nodes, edges });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Cycle'))).toBe(true);
  });

  it('validatePlan should require at least one root', () => {
    const nodes = [{ id: 'a' }, { id: 'b' }];
    const edges = [{ from: 'a', to: 'b' }];
    const result = validatePlan({ name: 'Test', nodes, edges });
    expect(result.valid).toBe(true); // 'a' is the root
  });

  it('getExecutionLevels should assign correct levels', () => {
    const nodes = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
    const edges = [{ from: 'a', to: 'b' }, { from: 'a', to: 'c' }, { from: 'b', to: 'd' }, { from: 'c', to: 'd' }];
    const levels = getExecutionLevels(nodes, edges);
    expect(levels.get('a')).toBe(0);
    expect(levels.get('d')).toBe(3);
  });
});

// --- Decomposer Tests ---
describe('Decomposer', () => {
  it('decomposeGoal should create nodes and edges', () => {
    const result = decomposeGoal('Research market trends');
    expect(result.nodes.length).toBeGreaterThan(0);
    expect(result.edges.length).toBeGreaterThan(0);
    expect(result.rootId).toBeTruthy();
    expect(result.nodes.some(n => n.type === 'output')).toBe(true);
  });

  it('decomposeGoal should handle sequential keywords', () => {
    const result = decomposeGoal('Create report and then review it and then send it');
    expect(result.nodes.length).toBeGreaterThan(2);
  });

  it('decomposeGoal should handle branching keywords', () => {
    const result = decomposeGoal('Review code or update docs');
    expect(result.nodes.length).toBeGreaterThan(1);
  });

  it('decomposeGoal should assign rootId correctly', () => {
    const result = decomposeGoal('Build a feature');
    expect(result.rootId).toBe('n0');
    expect(result.nodes.find(n => n.id === result.rootId)).toBeTruthy();
  });

  it('suggestStrategy should return sequential for small plans', () => {
    const nodes = [{ id: 'a' }, { id: 'b' }];
    const edges = [{ from: 'a', to: 'b' }];
    expect(suggestStrategy(nodes, edges)).toBe('sequential');
  });

  it('suggestStrategy should return parallel for multi-branch', () => {
    const nodes = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
    const edges = [{ from: 'a', to: 'b' }, { from: 'a', to: 'c' }, { from: 'b', to: 'd' }, { from: 'c', to: 'd' }];
    expect(suggestStrategy(nodes, edges)).toBe('parallel_fan_out');
  });

  it('NODE_TYPES should include expected types', () => {
    expect(NODE_TYPES).toContain('task');
    expect(NODE_TYPES).toContain('decision');
    expect(NODE_TYPES).toContain('output');
    expect(NODE_TYPES).toContain('merge');
    expect(NODE_TYPES).toContain('parallel');
  });
});

// --- Executor Tests ---
describe('Executor', () => {
  it('executePlan should run in topological order', async () => {
    const nodes = [{ id: 'a', type: 'task', description: 'Step A' }, { id: 'b', type: 'task', description: 'Step B' }, { id: 'c', type: 'output', description: 'Output' }];
    const edges = [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }];
    const result = await executePlan({ id: 'p1', nodes, edges });
    expect(result.order[0]).toBe('a');
    expect(result.order[result.order.length - 1]).toBe('c');
    expect(result.results['a']).toBeTruthy();
    expect(result.results['b']).toBeTruthy();
  });

  it('executePlan should track summary', async () => {
    const nodes = [{ id: 'a', type: 'task', description: 'A' }, { id: 'b', type: 'task', description: 'B' }];
    const edges = [{ from: 'a', to: 'b' }];
    const result = await executePlan({ id: 'p2', nodes, edges });
    expect(result.summary.total).toBe(2);
    expect(result.summary.done).toBe(2);
    expect(result.summary.failed).toBe(0);
  });

  it('executePlan should pass context to nodes', async () => {
    const nodes = [{ id: 'a', type: 'task', description: 'A' }];
    const edges = [];
    const result = await executePlan({ id: 'p3', nodes, edges }, { input: 'test-value' });
    expect(result.results['a'].context.input).toBe('test-value');
  });

  it('EXEC_STATES should include all states', () => {
    expect(EXEC_STATES).toContain('pending');
    expect(EXEC_STATES).toContain('running');
    expect(EXEC_STATES).toContain('done');
    expect(EXEC_STATES).toContain('failed');
    expect(EXEC_STATES).toContain('skipped');
  });
});

// --- HTTP Integration Tests ---
let server;
describe('Planning Engine HTTP API', () => {
  beforeAll(async () => { const mod = await import('../../src/index.js'); server = mod.default; await new Promise(r => setTimeout(r, 200)); });
  afterAll(() => { if (server) server.close(); });

  it('GET /health', async () => { const r = await httpReq('GET', '/health'); expect(r.status).toBe(200); expect(r.body.status).toBe('healthy'); });
  it('GET /ready', async () => { const r = await httpReq('GET', '/ready'); expect(r.status).toBe(200); expect(r.body.ready).toBe(true); });
  it('GET /api/node-types', async () => { const r = await httpReq('GET', '/api/node-types'); expect(r.status).toBe(200); expect(r.body.nodeTypes).toContain('task'); });

  // Plans
  it('POST /api/plans with goal auto-decomposes', async () => { const r = await httpReq('POST', '/api/plans', { name: 'Test Plan', goal: 'Research and write report' }); expect(r.status).toBe(201); expect(r.body.id).toBeTruthy(); expect(r.body.nodes.length).toBeGreaterThan(0); expect(r.body.edges.length).toBeGreaterThan(0); });
  it('POST /api/plans with manual nodes+edges', async () => { const r = await httpReq('POST', '/api/plans', { name: 'Manual', nodes: [{ id: 'a', type: 'task', description: 'A' }], edges: [] }); expect(r.status).toBe(201); });
  it('POST /api/plans → 400 without name', async () => { const r = await httpReq('POST', '/api/plans', { goal: 'x' }); expect(r.status).toBe(400); });
  it('POST /api/plans → 400 for invalid plan structure', async () => { const r = await httpReq('POST', '/api/plans', { name: 'Bad', nodes: [{ id: 'a' }, { id: 'a' }], edges: [] }); expect(r.status).toBe(400); });
  it('GET /api/plans', async () => { const r = await httpReq('GET', '/api/plans'); expect(r.status).toBe(200); expect(r.body.plans).toBeTruthy(); });
  it('GET /api/plans/:id', async () => { const create = await httpReq('POST', '/api/plans', { name: 'Get Test', goal: 'Do something' }); const r = await httpReq('GET', `/api/plans/${create.body.id}`); expect(r.status).toBe(200); expect(r.body.name).toBe('Get Test'); });
  it('DELETE /api/plans/:id', async () => { const create = await httpReq('POST', '/api/plans', { name: 'Del', goal: 'x' }); const r = await httpReq('DELETE', `/api/plans/${create.body.id}`); expect(r.status).toBe(200); expect(r.body.deleted).toBe(true); });

  // Decomposition
  it('POST /api/decompose', async () => { const r = await httpReq('POST', '/api/decompose', { goal: 'Build and test feature' }); expect(r.status).toBe(200); expect(r.body.nodes).toBeTruthy(); expect(r.body.edges).toBeTruthy(); expect(r.body.strategy).toBeTruthy(); });
  it('POST /api/decompose → 400 without goal', async () => { const r = await httpReq('POST', '/api/decompose', {}); expect(r.status).toBe(400); });

  // Validation
  it('POST /api/validate valid plan', async () => { const r = await httpReq('POST', '/api/validate', { nodes: [{ id: 'a' }], edges: [] }); expect(r.status).toBe(200); expect(r.body.valid).toBe(true); });
  it('POST /api/validate cycle → invalid', async () => { const r = await httpReq('POST', '/api/validate', { nodes: [{ id: 'a' }, { id: 'b' }], edges: [{ from: 'a', to: 'b' }, { from: 'b', to: 'a' }] }); expect(r.status).toBe(200); expect(r.body.valid).toBe(false); });

  // Toposort
  it('POST /api/toposort', async () => { const r = await httpReq('POST', '/api/toposort', { nodes: [{ id: 'a' }, { id: 'b' }], edges: [{ from: 'a', to: 'b' }] }); expect(r.status).toBe(200); expect(r.body.order[0]).toBe('a'); });
  it('POST /api/toposort → 400 without inputs', async () => { const r = await httpReq('POST', '/api/toposort', {}); expect(r.status).toBe(400); });

  // Cycle detection
  it('POST /api/cycles no cycle', async () => { const r = await httpReq('POST', '/api/cycles', { nodes: [{ id: 'a' }], edges: [] }); expect(r.status).toBe(200); expect(r.body.hasCycle).toBe(false); });
  it('POST /api/cycles with cycle', async () => { const r = await httpReq('POST', '/api/cycles', { nodes: [{ id: 'a' }, { id: 'b' }], edges: [{ from: 'a', to: 'b' }, { from: 'b', to: 'a' }] }); expect(r.status).toBe(200); expect(r.body.hasCycle).toBe(true); expect(r.body.cycle).toBeTruthy(); });

  // Execution
  it('POST /api/plans/:id/execute', async () => {
    const create = await httpReq('POST', '/api/plans', { name: 'Exec Test', goal: 'Research and build' });
    await new Promise(r => setTimeout(r, 50));
    const r = await httpReq('POST', `/api/plans/${create.body.id}/execute`, {});
    expect(r.status).toBe(200);
    expect(r.body.status).toBe('started');
    await new Promise(r => setTimeout(r, 100));
    const executions = await httpReq('GET', '/api/executions');
    expect(executions.body.executions.length).toBeGreaterThan(0);
  });

  // Strategy
  it('POST /api/strategy', async () => { const r = await httpReq('POST', '/api/strategy', { nodes: [{ id: 'a' }], edges: [] }); expect(r.status).toBe(200); expect(r.body.strategy).toBeTruthy(); });

  // Plans validation route
  it('POST /api/plans/:id/validate', async () => { const create = await httpReq('POST', '/api/plans', { name: 'Validate', goal: 'x' }); const r = await httpReq('POST', `/api/plans/${create.body.id}/validate`); expect(r.status).toBe(200); expect(r.body.valid).toBe(true); });
});
