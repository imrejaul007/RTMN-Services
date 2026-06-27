/**
 * HOJAI Studio - Edge Functions Service
 * Serverless workers at the edge
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();

// ── Internal Auth ────────────────────────────────────────────────
function requireInternal(req, res, next) {
  const token = req.headers['x-internal-token'];
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  if (token && expected && token === expected) {
    req.user = { type: 'service', id: 'internal' };
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}
const PORT = 4758;
app.use(express.json());

const functions = new Map(); // functionId -> function data
const deployments = []; // deployment history
const executions = []; // execution logs

// Runtime templates
const RUNTIMES = {
  nodejs: { version: '18.x', memory: 128, timeout: 10 },
  deno: { version: '1.x', memory: 128, timeout: 10 },
  python: { version: '3.11', memory: 256, timeout: 30 },
  go: { version: '1.20', memory: 256, timeout: 30 }
};

// Default edge function template
const DEFAULT_FUNCTION = `// Edge Function: {{name}}
export default async function handler(request) {
  const { method, path, headers, body } = request;

  // Your logic here
  return {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Hello from edge!' })
  };
};`;

// REST API - Functions
app.post('/api/functions', requireInternal, (req, res) => {
  const { projectId, name, description, runtime = 'nodejs', code, environment = {} } = req.body;
  const functionId = uuidv4();

  const fn = {
    id: functionId,
    projectId,
    name,
    description,
    runtime,
    code: code || DEFAULT_FUNCTION.replace('{{name}}', name),
    environment,
    url: `https://${name}.${projectId}.edge.hojai.app`,
    status: 'active',
    deployments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  functions.set(functionId, fn);
  res.json(fn);
});

app.get('/api/functions', (req, res) => {
  const { projectId, status } = req.query;
  let list = Array.from(functions.values());
  if (projectId) list = list.filter(f => f.projectId === projectId);
  if (status) list = list.filter(f => f.status === status);
  res.json(list);
});

app.get('/api/functions/:functionId', (req, res) => {
  const fn = functions.get(req.params.functionId);
  if (!fn) return res.status(404).json({ error: 'Function not found' });
  res.json(fn);
});

app.patch('/api/functions/:functionId', requireInternal, (req, res) => {
  const fn = functions.get(req.params.functionId);
  if (!fn) return res.status(404).json({ error: 'Function not found' });
  Object.assign(fn, req.body, { updatedAt: new Date().toISOString() });
  res.json(fn);
});

app.delete('/api/functions/:functionId', requireInternal, (req, res) => {
  if (!functions.has(req.params.functionId)) return res.status(404).json({ error: 'Function not found' });
  functions.delete(req.params.functionId);
  res.json({ deleted: true });
});

// REST API - Deploy
app.post('/api/functions/:functionId/deploy', requireInternal, (req, res) => {
  const fn = functions.get(req.params.functionId);
  if (!fn) return res.status(404).json({ error: 'Function not found' });

  const deployment = {
    id: uuidv4(),
    functionId: fn.id,
    version: fn.deployments.length + 1,
    status: 'building',
    createdAt: new Date().toISOString()
  };

  fn.deployments.push(deployment);
  deployments.push(deployment);

  // Simulate deployment
  setTimeout(() => {
    deployment.status = 'ready';
    deployment.readyAt = new Date().toISOString();
  }, 2000);

  res.json(deployment);
});

// REST API - Execute
app.post('/api/functions/:functionId/execute', requireInternal, async (req, res) => {
  const fn = functions.get(req.params.functionId);
  if (!fn) return res.status(404).json({ error: 'Function not found' });

  const { event = {}, context = {} } = req.body;
  const executionId = uuidv4();
  const startTime = Date.now();

  const execution = {
    id: executionId,
    functionId: fn.id,
    projectId: fn.projectId,
    status: 'running',
    event,
    result: null,
    error: null,
    duration: 0,
    memory: 0,
    startedAt: new Date().toISOString()
  };

  executions.push(execution);
  if (executions.length > 1000) executions.shift();

  // Simulate execution
  await new Promise(r => setTimeout(r, 50 + Math.random() * 100));

  execution.duration = Date.now() - startTime;
  execution.status = 'completed';
  execution.result = { message: 'Function executed successfully', input: event };
  execution.memory = Math.round(20 + Math.random() * 100);
  execution.completedAt = new Date().toISOString();

  res.json(execution);
});

// REST API - Logs
app.get('/api/functions/:functionId/logs', (req, res) => {
  const { limit = 100 } = req.query;
  const logs = executions
    .filter(e => e.functionId === req.params.functionId)
    .slice(-parseInt(limit));
  res.json(logs);
});

// REST API - Metrics
app.get('/api/functions/:functionId/metrics', (req, res) => {
  const { period = '1h' } = req.query;
  const fn = functions.get(req.params.functionId);
  if (!fn) return res.status(404).json({ error: 'Function not found' });

  const fnExecutions = executions.filter(e => e.functionId === fn.id);

  res.json({
    functionId: fn.id,
    period,
    invocations: fnExecutions.length,
    errors: fnExecutions.filter(e => e.status === 'error').length,
    avgDuration: fnExecutions.length > 0
      ? Math.round(fnExecutions.reduce((sum, e) => sum + e.duration, 0) / fnExecutions.length)
      : 0,
    avgMemory: fnExecutions.length > 0
      ? Math.round(fnExecutions.reduce((sum, e) => sum + e.memory, 0) / fnExecutions.length)
      : 0,
    p99Latency: Math.round(100 + Math.random() * 200)
  });
});

// REST API - Runtimes
app.get('/api/runtimes', (req, res) => res.json(RUNTIMES));

// REST API - Invoke (HTTP endpoint for edge functions)
app.all('/edge/:functionId', async (req, res) => {
  const fn = functions.get(req.params.functionId);
  if (!fn) return res.status(404).json({ error: 'Function not found' });

  const startTime = Date.now();

  // Simulate edge function execution
  await new Promise(r => setTimeout(r, 10 + Math.random() * 50));

  res.json({
    status: 200,
    body: { message: 'Edge function response', function: fn.name },
    headers: { 'x-edge-function': fn.id, 'x-execution-time': Date.now() - startTime }
  });
});

app.get('/health', (req, res) => res.json({ status: 'healthy', service: 'edge-functions', functions: functions.size }));
app.listen(PORT, () => console.log(`Edge Functions running on port ${PORT}`));
