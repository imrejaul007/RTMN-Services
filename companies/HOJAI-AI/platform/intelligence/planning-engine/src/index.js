// Planning Engine - Task decomposition, DAG execution, goal-to-task planning. Port 4896
import express from 'express';
import { requireAuth } from '@rtmn/shared/auth';
import { v4 as uuidv4 } from 'uuid';
import { readJson, writeJson } from './store.js';
import { validatePlan, topologicalSort, detectCycle, getExecutionLevels, NODE_TYPES } from './validator.js';
import { decomposeGoal, suggestStrategy, NODE_TYPES as DECOMPOSER_TYPES } from './decomposer.js';
import { executePlan, EXEC_STATES } from './executor.js';

const app = express();
const PORT = 4896;
app.use(express.json());

// Plans
app.get('/api/plans', (req, res) => {
  const { status, owner } = req.query;
  let plans = readJson('plans.json') || [];
  if (status) plans = plans.filter(p => p.status === status);
  if (owner) plans = plans.filter(p => p.owner === owner);
  res.json({ plans, count: plans.length });
});

app.get('/api/plans/:id', (req, res) => {
  const plan = (readJson('plans.json') || []).find(p => p.id === req.params.id);
  if (!plan) return res.status(404).json({ error: 'Plan not found' });
  res.json(plan);
});

app.post('/api/plans',requireAuth,  (req, res) => {
  const { name, description, goal, owner, metadata = {} } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });

  let nodes = [], edges = [], rootId = null;
  if (goal) {
    // Auto-decompose goal into DAG
    const decomposed = decomposeGoal(goal);
    nodes = decomposed.nodes;
    edges = decomposed.edges;
    rootId = decomposed.rootId;
  } else if (req.body.nodes) {
    nodes = req.body.nodes;
    edges = req.body.edges || [];
    const { valid, errors } = validatePlan({ name, nodes, edges });
    if (!valid) return res.status(400).json({ errors });
  }

  const plan = {
    id: uuidv4(),
    name,
    description,
    owner,
    nodes,
    edges,
    rootId,
    status: 'draft',
    strategy: nodes.length ? suggestStrategy(nodes, edges) : 'sequential',
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    metadata,
  };

  const plans = readJson('plans.json') || [];
  plans.push(plan);
  writeJson('plans.json', plans);
  res.status(201).json(plan);
});

app.put('/api/plans/:id',requireAuth,  (req, res) => {
  const plans = readJson('plans.json') || [];
  const idx = plans.findIndex(p => p.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'Plan not found' });

  const { valid, errors } = validatePlan(req.body);
  if (!valid) return res.status(400).json({ errors });

  Object.assign(plans[idx], req.body, { updatedAt: new Date().toISOString(), version: plans[idx].version + 1 });
  writeJson('plans.json', plans);
  res.json(plans[idx]);
});

app.delete('/api/plans/:id',requireAuth,  (req, res) => {
  const plans = readJson('plans.json') || [];
  const idx = plans.findIndex(p => p.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'Plan not found' });
  plans.splice(idx, 1);
  writeJson('plans.json', plans);
  res.json({ deleted: true });
});

// Goal decomposition
app.post('/api/decompose',requireAuth,  (req, res) => {
  const { goal, options = {} } = req.body;
  if (!goal) return res.status(400).json({ error: 'goal required' });
  const result = decomposeGoal(goal, options);
  res.json({ ...result, strategy: suggestStrategy(result.nodes, result.edges) });
});

// Plan validation
app.post('/api/plans/:id/validate',requireAuth,  (req, res) => {
  const plan = (readJson('plans.json') || []).find(p => p.id === req.params.id);
  if (!plan) return res.status(404).json({ error: 'Plan not found' });
  const result = validatePlan(plan);
  res.json(result);
});

app.post('/api/validate',requireAuth,  (req, res) => {
  const { nodes, edges } = req.body;
  if (!nodes || !edges) return res.status(400).json({ error: 'nodes and edges required' });
  const result = validatePlan({ name: 'temp', nodes, edges });
  res.json(result);
});

// Topological sort preview
app.post('/api/toposort',requireAuth,  (req, res) => {
  const { nodes, edges } = req.body;
  if (!nodes || !edges) return res.status(400).json({ error: 'nodes and edges required' });
  try {
    const order = topologicalSort(nodes, edges);
    const levels = getExecutionLevels(nodes, edges);
    res.json({ order, levels: Object.fromEntries(levels) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Cycle detection
app.post('/api/cycles',requireAuth,  (req, res) => {
  const { nodes, edges } = req.body;
  if (!nodes || !edges) return res.status(400).json({ error: 'nodes and edges required' });
  const cycle = detectCycle(nodes, edges);
  res.json({ hasCycle: cycle.length > 0, cycle: cycle.length ? cycle.join(' → ') : null });
});

// Plan execution
app.post('/api/plans/:id/execute',requireAuth,  (req, res) => {
  const plan = (readJson('plans.json') || []).find(p => p.id === req.params.id);
  if (!plan) return res.status(404).json({ error: 'Plan not found' });
  if (plan.status === 'running') return res.status(409).json({ error: 'Plan already running' });

  const { valid, errors } = validatePlan(plan);
  if (!valid) return res.status(400).json({ errors: ['Cannot execute invalid plan'] });

  const context = req.body.context || {};
  plan.status = 'running';
  plan.updatedAt = new Date().toISOString();
  const plans = readJson('plans.json') || [];
  const idx = plans.findIndex(p => p.id === req.params.id);
  if (idx >= 0) plans[idx] = plan;
  writeJson('plans.json', plans);

  executePlan(plan, context).then(result => {
    plan.status = result.summary.failed > 0 ? 'failed' : 'completed';
    plan.updatedAt = new Date().toISOString();
    const allPlans = readJson('plans.json') || [];
    const i = allPlans.findIndex(p => p.id === req.params.id);
    if (i >= 0) allPlans[i] = plan;
    writeJson('plans.json', allPlans);

    // Save execution
    const executions = readJson('executions.json') || [];
    executions.push({ ...result, planId: plan.id, planName: plan.name });
    writeJson('executions.json', executions);
  });

  res.json({ status: 'started', planId: plan.id, message: 'Plan execution started' });
});

// Executions
app.get('/api/executions', (req, res) => {
  const { planId, status } = req.query;
  let executions = readJson('executions.json') || [];
  if (planId) executions = executions.filter(e => e.planId === planId);
  if (status) executions = executions.filter(e => e.status === status);
  res.json({ executions, count: executions.length });
});

app.get('/api/executions/:id', (req, res) => {
  const execution = (readJson('executions.json') || []).find(e => e.executionId === req.params.id);
  if (!execution) return res.status(404).json({ error: 'Execution not found' });
  res.json(execution);
});

// Strategy suggestion
app.post('/api/strategy',requireAuth,  (req, res) => {
  const { nodes, edges } = req.body;
  if (!nodes || !edges) return res.status(400).json({ error: 'nodes and edges required' });
  res.json({ strategy: suggestStrategy(nodes, edges) });
});

// Node types reference
app.get('/api/node-types', (req, res) => {
  res.json({ nodeTypes: NODE_TYPES, executionStates: EXEC_STATES });
});

// Health
app.get('/health', (req, res) => res.json({ service: 'planning-engine', status: 'healthy' }));
app.get('/ready', (req, res) => res.json({ ready: true }));

const server = app.listen(PORT, () => { console.log(`Planning Engine running on port ${PORT}`); });
export default server;
