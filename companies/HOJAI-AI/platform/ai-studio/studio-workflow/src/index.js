/**
 * studio-workflow — Workflow definitions: nodes + edges (DAG) + executions
 * Port: 4903
 *
 * A workflow is a DAG (Directed Acyclic Graph) of nodes connected by edges.
 * Node types: llm (model call), agent (agent call), twin (twin read/write),
 *             rag (RAG query), code (JS execution), conditional (branch), wait (delay), output (terminal)
 * Edges: source_node_id, target_node_id, optional condition expression
 * Executions: run a workflow with inputs, traverse the graph in topo order,
 *             capture each node's output.
 *
 * Storage: $DATA_DIR/workflows.json, $DATA_DIR/executions.json
 * Auth:    X-Internal-Token
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = parseInt(process.env.PORT || '4903', 10);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'studio-internal-token';

const WORKFLOWS_FILE = path.join(DATA_DIR, 'workflows.json');
const EXECUTIONS_FILE = path.join(DATA_DIR, 'executions.json');

const VALID_NODE_TYPES = ['llm', 'agent', 'twin', 'rag', 'code', 'conditional', 'wait', 'output'];
const VALID_EXEC_STATUSES = ['pending', 'running', 'completed', 'failed', 'cancelled'];

function nowIso() { return new Date().toISOString(); }
function newId(p) { return `${p}_${crypto.randomBytes(6).toString('hex')}`; }

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(WORKFLOWS_FILE)) fs.writeFileSync(WORKFLOWS_FILE, JSON.stringify({ workflows: {} }, null, 2));
  if (!fs.existsSync(EXECUTIONS_FILE)) fs.writeFileSync(EXECUTIONS_FILE, JSON.stringify({ executions: [] }, null, 2));
}
function loadWorkflows() { ensureDataDir(); try { return JSON.parse(fs.readFileSync(WORKFLOWS_FILE, 'utf8')); } catch (_) { return { workflows: {} }; } }
function saveWorkflows(d) { const tmp = WORKFLOWS_FILE + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(d, null, 2)); fs.renameSync(tmp, WORKFLOWS_FILE); }
function loadExecutions() { ensureDataDir(); try { return JSON.parse(fs.readFileSync(EXECUTIONS_FILE, 'utf8')); } catch (_) { return { executions: [] }; } }
function saveExecutions(d) { const tmp = EXECUTIONS_FILE + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(d, null, 2)); fs.renameSync(tmp, EXECUTIONS_FILE); }

function requireInternal(req, res, next) {
  if (req.headers['x-internal-token'] !== INTERNAL_TOKEN) return res.status(401).json({ error: 'unauthorized' });
  next();
}

// Validate a workflow definition: nodes must be unique, edges must reference existing nodes, no cycles
function validateWorkflow(wf) {
  if (!wf || typeof wf !== 'object') return 'workflow required';
  if (!wf.name || typeof wf.name !== 'string') return 'name required';
  if (!Array.isArray(wf.nodes) || wf.nodes.length === 0) return 'nodes must be non-empty array';
  if (wf.nodes.length > 100) return 'workflow limited to 100 nodes';

  const nodeIds = new Set();
  for (const n of wf.nodes) {
    if (!n.id) return 'each node must have an id';
    if (nodeIds.has(n.id)) return `duplicate node id: ${n.id}`;
    nodeIds.add(n.id);
    if (!VALID_NODE_TYPES.includes(n.type)) return `node ${n.id}: invalid type ${n.type}`;
  }

  if (!Array.isArray(wf.edges)) return 'edges must be an array';
  for (const e of wf.edges) {
    if (!e.source || !e.target) return 'each edge must have source and target';
    if (!nodeIds.has(e.source)) return `edge source not found: ${e.source}`;
    if (!nodeIds.has(e.target)) return `edge target not found: ${e.target}`;
    if (e.source === e.target) return `self-loop on ${e.source} not allowed`;
  }

  // Check for cycles via DFS
  const adj = {};
  for (const id of nodeIds) adj[id] = [];
  for (const e of wf.edges) adj[e.source].push(e.target);

  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = {};
  for (const id of nodeIds) color[id] = WHITE;

  function dfs(node) {
    if (color[node] === GRAY) return true; // cycle
    if (color[node] === BLACK) return false;
    color[node] = GRAY;
    for (const next of adj[node]) {
      if (dfs(next)) return true;
    }
    color[node] = BLACK;
    return false;
  }
  for (const id of nodeIds) {
    if (dfs(id)) return `cycle detected involving node ${id}`;
  }
  return null;
}

// Topological sort of nodes
function topoSort(wf) {
  const adj = {};
  const inDeg = {};
  for (const n of wf.nodes) { adj[n.id] = []; inDeg[n.id] = 0; }
  for (const e of wf.edges) { adj[e.source].push(e.target); inDeg[e.target]++; }
  const queue = Object.keys(inDeg).filter((k) => inDeg[k] === 0);
  const order = [];
  while (queue.length) {
    const node = queue.shift();
    order.push(node);
    for (const next of adj[node]) {
      inDeg[next]--;
      if (inDeg[next] === 0) queue.push(next);
    }
  }
  return order;
}

function findStartNode(wf) {
  const targets = new Set(wf.edges.map(e => e.target));
  return wf.nodes.find(n => !targets.has(n.id));
}

function findOutputNode(wf) {
  return wf.nodes.find(n => n.type === 'output') || wf.nodes[wf.nodes.length - 1];
}

function createApp() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/health', (_req, res) => res.json({ ok: true, service: 'studio-workflow', port: PORT, node_types: VALID_NODE_TYPES }));
  app.get('/ready', (_req, res) => res.json({ ok: true }));

  // List node types
  app.get('/node-types', requireInternal, (_req, res) => {
    res.json({ count: VALID_NODE_TYPES.length, types: VALID_NODE_TYPES });
  });

  // Create a workflow
  app.post('/workflows', requireInternal, (req, res) => {
    const { name, description = '', project_id, user_id, nodes, edges = [], inputs = [] } = req.body || {};
    if (!name) return res.status(400).json({ error: 'validation', message: 'name required' });
    if (!project_id) return res.status(400).json({ error: 'validation', message: 'project_id required' });
    if (!user_id) return res.status(400).json({ error: 'validation', message: 'user_id required' });
    const err = validateWorkflow({ name, nodes, edges });
    if (err) return res.status(400).json({ error: 'validation', message: err });
    const wf = {
      id: newId('wf'),
      name,
      description,
      project_id,
      user_id,
      nodes,
      edges,
      inputs: Array.isArray(inputs) ? inputs : [],
      status: 'draft',
      version: 1,
      created_at: nowIso(),
      updated_at: nowIso()
    };
    const data = loadWorkflows();
    data.workflows[wf.id] = wf;
    saveWorkflows(data);
    res.status(201).json(wf);
  });

  // List workflows (filter by project_id, user_id, status)
  app.get('/workflows', requireInternal, (req, res) => {
    const data = loadWorkflows();
    let items = Object.values(data.workflows);
    if (req.query.project_id) items = items.filter((w) => w.project_id === req.query.project_id);
    if (req.query.user_id) items = items.filter((w) => w.user_id === req.query.user_id);
    if (req.query.status) items = items.filter((w) => w.status === req.query.status);
    res.json({ count: items.length, workflows: items });
  });

  // Get workflow
  app.get('/workflows/:id', requireInternal, (req, res) => {
    const data = loadWorkflows();
    const w = data.workflows[req.params.id];
    if (!w) return res.status(404).json({ error: 'not_found' });
    res.json(w);
  });

  // Update workflow
  app.put('/workflows/:id', requireInternal, (req, res) => {
    const data = loadWorkflows();
    const w = data.workflows[req.params.id];
    if (!w) return res.status(404).json({ error: 'not_found' });
    const { name, description, nodes, edges, inputs, status } = req.body || {};
    if (nodes !== undefined || edges !== undefined) {
      const err = validateWorkflow({ name: name || w.name, nodes: nodes || w.nodes, edges: edges || w.edges });
      if (err) return res.status(400).json({ error: 'validation', message: err });
    }
    if (name !== undefined) w.name = name;
    if (description !== undefined) w.description = description;
    if (nodes !== undefined) w.nodes = nodes;
    if (edges !== undefined) w.edges = edges;
    if (inputs !== undefined) w.inputs = Array.isArray(inputs) ? inputs : w.inputs;
    if (status !== undefined) {
      if (!['draft', 'active', 'archived'].includes(status)) return res.status(400).json({ error: 'validation', message: 'invalid status' });
      w.status = status;
    }
    w.version = (w.version || 1) + 1;
    w.updated_at = nowIso();
    saveWorkflows(data);
    res.json(w);
  });

  // Delete workflow
  app.delete('/workflows/:id', requireInternal, (req, res) => {
    const data = loadWorkflows();
    if (!data.workflows[req.params.id]) return res.status(404).json({ error: 'not_found' });
    delete data.workflows[req.params.id];
    saveWorkflows(data);
    res.json({ deleted: true, workflow_id: req.params.id });
  });

  // Validate a workflow without saving
  app.post('/workflows/validate', requireInternal, (req, res) => {
    const err = validateWorkflow(req.body);
    if (err) return res.status(400).json({ error: 'invalid', message: err });
    const order = topoSort(req.body);
    res.json({ valid: true, execution_order: order });
  });

  // Get topological execution order for a workflow
  app.get('/workflows/:id/order', requireInternal, (req, res) => {
    const data = loadWorkflows();
    const w = data.workflows[req.params.id];
    if (!w) return res.status(404).json({ error: 'not_found' });
    const order = topoSort(w);
    res.json({ workflow_id: w.id, order });
  });

  // Execute a workflow (mock)
  app.post('/workflows/:id/execute', requireInternal, (req, res) => {
    const data = loadWorkflows();
    const w = data.workflows[req.params.id];
    if (!w) return res.status(404).json({ error: 'not_found' });
    if (w.status !== 'active') return res.status(400).json({ error: 'validation', message: 'workflow must be active to execute' });
    const { inputs = {}, user_id = 'system' } = req.body || {};
    const order = topoSort(w);
    const startNode = findStartNode(w);
    const outputNode = findOutputNode(w);
    const execution = {
      id: newId('exec'),
      workflow_id: w.id,
      workflow_version: w.version,
      user_id,
      inputs,
      status: 'completed',
      execution_order: order,
      start_node: startNode ? startNode.id : null,
      output_node: outputNode ? outputNode.id : null,
      node_results: order.map((nid) => {
        const n = w.nodes.find((x) => x.id === nid);
        return {
          node_id: nid,
          type: n ? n.type : 'unknown',
          status: 'completed',
          output: n ? { mock: true, node: nid, type: n.type } : null,
          started_at: nowIso(),
          finished_at: nowIso()
        };
      }),
      started_at: nowIso(),
      finished_at: nowIso(),
      duration_ms: Math.floor(Math.random() * 200) + 50
    };
    const ed = loadExecutions();
    ed.executions.push(execution);
    if (ed.executions.length > 5000) ed.executions = ed.executions.slice(-5000);
    saveExecutions(ed);
    res.status(201).json(execution);
  });

  // List executions (filter by workflow_id, user_id, status)
  app.get('/executions', requireInternal, (req, res) => {
    const data = loadExecutions();
    let items = data.executions.slice().reverse();
    if (req.query.workflow_id) items = items.filter((e) => e.workflow_id === req.query.workflow_id);
    if (req.query.user_id) items = items.filter((e) => e.user_id === req.query.user_id);
    if (req.query.status) items = items.filter((e) => e.status === req.query.status);
    const limit = parseInt(req.query.limit || '50', 10);
    items = items.slice(0, Math.min(limit, 200));
    res.json({ count: items.length, executions: items });
  });

  // Get execution
  app.get('/executions/:id', requireInternal, (req, res) => {
    const data = loadExecutions();
    const e = data.executions.find((x) => x.id === req.params.id);
    if (!e) return res.status(404).json({ error: 'not_found' });
    res.json(e);
  });

  return app;
}

if (require.main === module) {
  const app = createApp();
  app.listen(PORT, () => console.log(`[studio-workflow] listening on :${PORT}`));
}

module.exports = { createApp, validateWorkflow, topoSort, VALID_NODE_TYPES };
