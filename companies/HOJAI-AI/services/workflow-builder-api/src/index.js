/**
 * HOJAI Workflow Builder API
 * Port: 4440
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import {
  createWorkflow, getWorkflow, updateWorkflow, deleteWorkflow, listWorkflows,
  addNode, updateNode, deleteNode, addEdge, deleteEdge,
  validateWorkflow,
  createExecution, getExecution, updateExecution, listExecutions,
  getStats,
  NodeType, WorkflowStatus
} from './store.js';

const PORT = process.env.PORT || 4440;
const HOST = process.env.HOST || '0.0.0.0';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
});

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'workflow-builder-api', version: '1.0.0', timestamp: new Date().toISOString() });
});

app.get('/ready', (req, res) => {
  res.json({ status: 'ready', timestamp: new Date().toISOString() });
});

// API info
app.get('/api/v1', (req, res) => {
  res.json({
    service: 'HOJAI Workflow Builder API',
    version: '1.0.0',
    nodeTypes: Object.values(NodeType),
    endpoints: {
      workflows: {
        'GET /api/v1/workflows': 'List workflows',
        'GET /api/v1/workflows/:id': 'Get workflow',
        'POST /api/v1/workflows': 'Create workflow',
        'PATCH /api/v1/workflows/:id': 'Update workflow',
        'DELETE /api/v1/workflows/:id': 'Delete workflow',
        'POST /api/v1/workflows/:id/nodes': 'Add node',
        'PATCH /api/v1/workflows/:id/nodes/:nodeId': 'Update node',
        'DELETE /api/v1/workflows/:id/nodes/:nodeId': 'Delete node',
        'POST /api/v1/workflows/:id/edges': 'Add edge',
        'DELETE /api/v1/workflows/:id/edges/:from/:to': 'Delete edge',
        'POST /api/v1/workflows/:id/validate': 'Validate workflow',
        'POST /api/v1/workflows/:id/execute': 'Execute workflow'
      },
      executions: {
        'GET /api/v1/executions': 'List executions',
        'GET /api/v1/executions/:id': 'Get execution',
        'GET /api/v1/stats': 'Statistics'
      }
    }
  });
});

// ── Workflows ────────────────────────────────────────────────────────────

app.get('/api/v1/workflows', (req, res) => {
  try {
    const { status, search } = req.query;
    const workflows = listWorkflows({ status, search });
    res.json({ success: true, count: workflows.length, workflows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/v1/workflows/:id', (req, res) => {
  try {
    const workflow = getWorkflow(req.params.id);
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });
    res.json({ success: true, workflow });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/v1/workflows', (req, res) => {
  try {
    const workflow = createWorkflow(req.body);
    res.status(201).json({ success: true, workflow });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.patch('/api/v1/workflows/:id', (req, res) => {
  try {
    const workflow = updateWorkflow(req.params.id, req.body);
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });
    res.json({ success: true, workflow });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/v1/workflows/:id', (req, res) => {
  try {
    const deleted = deleteWorkflow(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Workflow not found' });
    res.json({ success: true, message: 'Workflow deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── Nodes ──────────────────────────────────────────────────────────────

app.post('/api/v1/workflows/:id/nodes', (req, res) => {
  try {
    const node = addNode(req.params.id, req.body);
    if (!node) return res.status(404).json({ error: 'Workflow not found' });
    res.status(201).json({ success: true, node });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.patch('/api/v1/workflows/:id/nodes/:nodeId', (req, res) => {
  try {
    const node = updateNode(req.params.id, req.params.nodeId, req.body);
    if (!node) return res.status(404).json({ error: 'Node not found' });
    res.json({ success: true, node });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/v1/workflows/:id/nodes/:nodeId', (req, res) => {
  try {
    deleteNode(req.params.id, req.params.nodeId);
    res.json({ success: true, message: 'Node deleted' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ── Edges ─────────────────────────────────────────────────────────────

app.post('/api/v1/workflows/:id/edges', (req, res) => {
  try {
    const edge = addEdge(req.params.id, req.body);
    if (!edge) return res.status(404).json({ error: 'Workflow not found' });
    res.status(201).json({ success: true, edge });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/v1/workflows/:id/edges/:from/:to', (req, res) => {
  try {
    deleteEdge(req.params.id, req.params.from, req.params.to);
    res.json({ success: true, message: 'Edge deleted' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ── Validation ────────────────────────────────────────────────────────

app.post('/api/v1/workflows/:id/validate', (req, res) => {
  try {
    const result = validateWorkflow(req.params.id);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── Execution ────────────────────────────────────────────────────────

app.post('/api/v1/workflows/:id/execute', (req, res) => {
  try {
    const workflow = getWorkflow(req.params.id);
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });

    const { input } = req.body;
    const execution = createExecution(req.params.id, input || {});
    res.status(201).json({ success: true, execution });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/v1/executions', (req, res) => {
  try {
    const { workflowId, status, limit } = req.query;
    const executions = listExecutions({ workflowId, status, limit: limit ? parseInt(limit) : 50 });
    res.json({ success: true, count: executions.length, executions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/v1/executions/:id', (req, res) => {
  try {
    const execution = getExecution(req.params.id);
    if (!execution) return res.status(404).json({ error: 'Execution not found' });
    res.json({ success: true, execution });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── Stats ───────────────────────────────────────────────────────────

app.get('/api/v1/stats', (req, res) => {
  try {
    const stats = getStats();
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Root
app.get('/', (req, res) => {
  res.json({
    name: 'HOJAI Workflow Builder',
    tagline: 'Build AI workflows with drag-and-drop',
    version: '1.0.0',
    port: PORT
  });
});

app.listen(PORT, HOST, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║     🔄 HOJAI WORKFLOW BUILDER — PORT ${PORT}                        ║
║                                                                  ║
║     Build AI workflows with drag-and-drop                       ║
║                                                                  ║
╠══════════════════════════════════════════════════════════════════╣
║     GET  /api/v1/workflows      — List workflows               ║
║     POST /api/v1/workflows      — Create workflow              ║
║     GET  /api/v1/workflows/:id  — Get workflow                  ║
║     POST /api/v1/workflows/:id/nodes — Add node                 ║
║     POST /api/v1/workflows/:id/edges — Add edge                 ║
║     POST /api/v1/workflows/:id/validate — Validate              ║
║     POST /api/v1/workflows/:id/execute — Execute                 ║
╚══════════════════════════════════════════════════════════════════╝
  `);
});

export default app;
