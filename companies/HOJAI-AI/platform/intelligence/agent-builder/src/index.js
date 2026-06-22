// Agent Builder (4188)
// Visual agent workflow builder backend.
// Agents = directed graph of nodes (input, llm, tool, condition, output).
// Stores blueprints, validates, exports to flow-orchestrator-compatible JSON.

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuid } from 'uuid';

const app = express();
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '5mb' }));
app.use(morgan('tiny'));

const PORT = process.env.PORT || 4188;
const SERVICE = 'agent-builder';

const blueprints = new Map();   // bpId -> { id, name, description, nodes, edges, version, owner, status, created }
const versions = new Map();     // verId -> { id, blueprint_id, version, graph, created }
const templates = new Map();    // tplId -> { id, name, category, graph }
const exports = new Map();      // expId -> { id, blueprint_id, format, payload, ts }

const NODE_TYPES = ['input', 'output', 'llm', 'tool', 'condition', 'memory', 'http', 'delay', 'parallel', 'loop'];

const ok = (data) => ({ ok: true, ...data });
const fail = (msg, code = 400) => ({ ok: false, error: msg });

// Validate a graph
function validateGraph(nodes, edges) {
  const errors = [];
  if (!Array.isArray(nodes) || nodes.length === 0) errors.push('nodes must be non-empty array');
  if (!Array.isArray(edges)) errors.push('edges must be array');
  // Check node types
  nodes.forEach((n, i) => {
    if (!n.type) errors.push(`node[${i}] missing type`);
    else if (!NODE_TYPES.includes(n.type)) errors.push(`node[${i}] invalid type: ${n.type}`);
    if (!n.id) errors.push(`node[${i}] missing id`);
  });
  // Check edge endpoints exist
  const nodeIds = new Set(nodes.map(n => n.id));
  edges.forEach((e, i) => {
    if (!e.from || !nodeIds.has(e.from)) errors.push(`edge[${i}] invalid from: ${e.from}`);
    if (!e.to || !nodeIds.has(e.to)) errors.push(`edge[${i}] invalid to: ${e.to}`);
  });
  // Check there's at least one input and one output node
  if (!nodes.some(n => n.type === 'input')) errors.push('no input node');
  if (!nodes.some(n => n.type === 'output')) errors.push('no output node');
  return { valid: errors.length === 0, errors };
}

function seed() {
  // Templates
  const tplSeeds = [
    {
      name: 'simple-qa', category: 'qa',
      graph: {
        nodes: [
          { id: 'in', type: 'input', config: {} },
          { id: 'llm', type: 'llm', config: { model: 'gpt-4o', prompt: 'Answer: {{input}}' } },
          { id: 'out', type: 'output', config: {} }
        ],
        edges: [{ from: 'in', to: 'llm' }, { from: 'llm', to: 'out' }]
      }
    },
    {
      name: 'rag', category: 'rag',
      graph: {
        nodes: [
          { id: 'in', type: 'input', config: {} },
          { id: 'retrieve', type: 'tool', config: { tool: 'vector-search' } },
          { id: 'llm', type: 'llm', config: { model: 'gpt-4o', prompt: 'Context: {{retrieve}}\nQ: {{input}}' } },
          { id: 'out', type: 'output', config: {} }
        ],
        edges: [{ from: 'in', to: 'retrieve' }, { from: 'retrieve', to: 'llm' }, { from: 'llm', to: 'out' }]
      }
    },
    {
      name: 'tool-use', category: 'agent',
      graph: {
        nodes: [
          { id: 'in', type: 'input', config: {} },
          { id: 'llm', type: 'llm', config: { model: 'gpt-4o', tools: ['search', 'calculator'] } },
          { id: 'tool', type: 'tool', config: { tool: 'dispatch' } },
          { id: 'cond', type: 'condition', config: { expr: 'tool_calls.length > 0' } },
          { id: 'out', type: 'output', config: {} }
        ],
        edges: [
          { from: 'in', to: 'llm' },
          { from: 'llm', to: 'cond' },
          { from: 'cond', to: 'tool', when: 'true' },
          { from: 'cond', to: 'out', when: 'false' },
          { from: 'tool', to: 'llm' }
        ]
      }
    }
  ];
  tplSeeds.forEach(t => {
    const id = uuid();
    templates.set(id, { id, ...t, created: new Date().toISOString() });
  });

  // A sample blueprint from rag template
  const ragTpl = [...templates.values()].find(t => t.name === 'rag');
  const bpId = uuid();
  blueprints.set(bpId, {
    id: bpId, name: 'my-rag-bot', description: 'RAG-based Q&A bot',
    nodes: ragTpl.graph.nodes, edges: ragTpl.graph.edges,
    version: 1, owner: 'demo-user', status: 'draft',
    template_id: ragTpl.id, created: new Date().toISOString()
  });
}

app.get('/health', (_req, res) => res.json(ok({ service: SERVICE, port: PORT, status: 'healthy' })));
app.get('/', (_req, res) => res.json(ok({
  service: SERVICE,
  node_types: NODE_TYPES,
  endpoints: ['/api/blueprints', '/api/blueprints/:id', '/api/blueprints/:id/validate',
              '/api/blueprints/:id/versions', '/api/blueprints/:id/export',
              '/api/templates', '/api/templates/:id/instantiate']
})));

// Templates
app.get('/api/templates', (_req, res) => res.json(ok({ templates: [...templates.values()] })));
app.get('/api/templates/:id', (req, res) => {
  const t = templates.get(req.params.id);
  if (!t) return res.status(404).json(fail('template not found'));
  res.json(ok({ template: t }));
});
app.post('/api/templates/:id/instantiate', (req, res) => {
  const t = templates.get(req.params.id);
  if (!t) return res.status(404).json(fail('template not found'));
  const { name, owner } = req.body || {};
  if (!name) return res.status(400).json(fail('name required'));
  const id = uuid();
  const bp = { id, name, description: `From template ${t.name}`,
    nodes: t.graph.nodes, edges: t.graph.edges,
    version: 1, owner: owner || 'user', status: 'draft',
    template_id: t.id, created: new Date().toISOString() };
  blueprints.set(id, bp);
  res.status(201).json(ok({ blueprint: bp }));
});

// Blueprints
app.get('/api/blueprints', (_req, res) => res.json(ok({ blueprints: [...blueprints.values()] })));
app.get('/api/blueprints/:id', (req, res) => {
  const bp = blueprints.get(req.params.id);
  if (!bp) return res.status(404).json(fail('blueprint not found'));
  res.json(ok({ blueprint: bp }));
});
app.post('/api/blueprints', (req, res) => {
  const { name, description = '', nodes, edges, owner = 'user' } = req.body || {};
  if (!name) return res.status(400).json(fail('name required'));
  if (!nodes || !edges) return res.status(400).json(fail('nodes + edges required'));
  const validation = validateGraph(nodes, edges);
  if (!validation.valid) return res.status(400).json(fail(`invalid graph: ${validation.errors.join('; ')}`));
  const id = uuid();
  const bp = { id, name, description, nodes, edges, version: 1, owner,
    status: 'draft', created: new Date().toISOString() };
  blueprints.set(id, bp);
  res.status(201).json(ok({ blueprint: bp }));
});
app.put('/api/blueprints/:id', (req, res) => {
  const bp = blueprints.get(req.params.id);
  if (!bp) return res.status(404).json(fail('blueprint not found'));
  const { name, description, nodes, edges } = req.body || {};
  if (nodes || edges) {
    const validation = validateGraph(nodes || bp.nodes, edges || bp.edges);
    if (!validation.valid) return res.status(400).json(fail(`invalid: ${validation.errors.join('; ')}`));
  }
  if (name) bp.name = name;
  if (description !== undefined) bp.description = description;
  if (nodes) bp.nodes = nodes;
  if (edges) bp.edges = edges;
  bp.version++;
  blueprints.set(bp.id, bp);
  // Snapshot version
  const vid = uuid();
  versions.set(vid, { id: vid, blueprint_id: bp.id, version: bp.version,
    graph: { nodes: bp.nodes, edges: bp.edges }, created: new Date().toISOString() });
  res.json(ok({ blueprint: bp }));
});

app.post('/api/blueprints/:id/validate', (req, res) => {
  const bp = blueprints.get(req.params.id);
  if (!bp) return res.status(404).json(fail('blueprint not found'));
  const v = validateGraph(bp.nodes, bp.edges);
  res.json(ok({ valid: v.valid, errors: v.errors }));
});

app.post('/api/blueprints/:id/publish', (req, res) => {
  const bp = blueprints.get(req.params.id);
  if (!bp) return res.status(404).json(fail('blueprint not found'));
  const v = validateGraph(bp.nodes, bp.edges);
  if (!v.valid) return res.status(400).json(fail(`cannot publish invalid: ${v.errors.join('; ')}`));
  bp.status = 'published';
  bp.published_at = new Date().toISOString();
  blueprints.set(bp.id, bp);
  res.json(ok({ blueprint: bp }));
});

app.get('/api/blueprints/:id/versions', (req, res) => {
  if (!blueprints.has(req.params.id)) return res.status(404).json(fail('blueprint not found'));
  const list = [...versions.values()].filter(v => v.blueprint_id === req.params.id);
  res.json(ok({ blueprint_id: req.params.id, versions: list }));
});

// Export (to flow-orchestrator-compatible JSON)
app.post('/api/blueprints/:id/export', (req, res) => {
  const bp = blueprints.get(req.params.id);
  if (!bp) return res.status(404).json(fail('blueprint not found'));
  const format = req.body?.format || 'flow-orchestrator';
  let payload;
  if (format === 'flow-orchestrator') {
    payload = {
      name: bp.name, version: bp.version,
      steps: bp.nodes.map(n => ({
        id: n.id, type: n.type, config: n.config,
        next: bp.edges.filter(e => e.from === n.id).map(e => ({ to: e.to, when: e.when || null }))
      }))
    };
  } else if (format === 'langgraph') {
    payload = {
      name: bp.name, nodes: bp.nodes.map(n => ({
        id: n.id, type: n.type, function: n.type === 'llm' ? 'call_llm' : n.type === 'tool' ? 'call_tool' : 'passthrough',
        params: n.config
      })), edges: bp.edges
    };
  } else if (format === 'json') {
    payload = bp;
  } else {
    return res.status(400).json(fail('unknown format: ' + format));
  }
  const id = uuid();
  exports.set(id, { id, blueprint_id: bp.id, format, payload, ts: new Date().toISOString() });
  res.json(ok({ export: { id, format, payload } }));
});

seed();
app.listen(PORT, () => console.log(`${SERVICE} listening on ${PORT}`));