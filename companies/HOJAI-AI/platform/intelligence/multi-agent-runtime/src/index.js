// Multi-Agent Runtime (4190)
// Formalizes multi-agent patterns. Provides reusable orchestration primitives.
// Solves Division 04 OPEN: "Multi-Agent Runtime formalization".

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

const PORT = process.env.PORT || 4190;
const SERVICE = 'multi-agent-runtime';

const patterns = new Map();     // patternId -> { id, name, type, description, definition }
const collaborations = new Map(); // collabId -> { id, pattern_id, agents, status, shared_state, started, ended, result }
const agentInstances = new Map(); // instanceId -> { id, collab_id, agent_name, role, status, output, duration_ms }
const messages = new Map();     // msgId -> { id, collab_id, from_agent, to_agent, content, type, ts }

const PATTERN_TYPES = ['sequential', 'parallel', 'pipeline', 'fan-out', 'fan-in', 'conditional', 'debate', 'voting'];

const ok = (data) => ({ ok: true, ...data });
const fail = (msg, code = 400) => ({ ok: false, error: msg });

function seed() {
  const seedPatterns = [
    { name: 'sequential', type: 'sequential', description: 'Agents run one after another',
      definition: { agents: [{ role: 'step1' }, { role: 'step2' }, { role: 'step3' }] } },
    { name: 'parallel-vote', type: 'parallel', description: 'Multiple agents vote in parallel',
      definition: { agents: [{ role: 'voter1' }, { role: 'voter2' }, { role: 'voter3' }], aggregation: 'majority' } },
    { name: 'pipeline-rag', type: 'pipeline', description: 'Retrieve → Augment → Generate',
      definition: { agents: [{ role: 'retriever' }, { role: 'augmenter' }, { role: 'generator' }] } },
    { name: 'fan-out-triage', type: 'fan-out', description: 'One agent dispatches to many specialists',
      definition: { dispatcher: { role: 'router' }, workers: [{ role: 'tech' }, { role: 'billing' }, { role: 'general' }] } }
  ];
  seedPatterns.forEach(p => {
    const id = uuid();
    patterns.set(id, { id, ...p, created: new Date().toISOString() });
  });
}

app.get('/health', (_req, res) => res.json(ok({ service: SERVICE, port: PORT, status: 'healthy' })));
app.get('/', (_req, res) => res.json(ok({
  service: SERVICE,
  pattern_types: PATTERN_TYPES,
  endpoints: ['/api/patterns', '/api/collaborations', '/api/collaborations/:id',
              '/api/collaborations/:id/run', '/api/collaborations/:id/messages',
              '/api/collaborations/:id/instances']
})));

// Patterns
app.get('/api/patterns', (_req, res) => res.json(ok({ patterns: [...patterns.values()] })));
app.get('/api/patterns/:id', (req, res) => {
  const p = patterns.get(req.params.id);
  if (!p) return res.status(404).json(fail('pattern not found'));
  res.json(ok({ pattern: p }));
});
app.post('/api/patterns', (req, res) => {
  const { name, type, description = '', definition } = req.body || {};
  if (!name || !type) return res.status(400).json(fail('name + type required'));
  if (!PATTERN_TYPES.includes(type)) return res.status(400).json(fail('invalid type'));
  const id = uuid();
  const p = { id, name, type, description, definition: definition || {}, created: new Date().toISOString() };
  patterns.set(id, p);
  res.status(201).json(ok({ pattern: p }));
});

// Collaborations
app.get('/api/collaborations', (_req, res) => res.json(ok({ collaborations: [...collaborations.values()] })));
app.get('/api/collaborations/:id', (req, res) => {
  const c = collaborations.get(req.params.id);
  if (!c) return res.status(404).json(fail('collaboration not found'));
  res.json(ok({ collaboration: c }));
});
app.post('/api/collaborations', (req, res) => {
  const { pattern_id, agents, initial_state = {} } = req.body || {};
  if (!pattern_id || !agents) return res.status(400).json(fail('pattern_id + agents required'));
  if (!patterns.has(pattern_id)) return res.status(404).json(fail('pattern not found'));
  const id = uuid();
  const c = { id, pattern_id, agents, status: 'initialized',
    shared_state: initial_state, started: new Date().toISOString(), ended: null, result: null };
  collaborations.set(id, c);
  res.status(201).json(ok({ collaboration: c }));
});

// Run a collaboration
app.post('/api/collaborations/:id/run', (req, res) => {
  const c = collaborations.get(req.params.id);
  if (!c) return res.status(404).json(fail('collaboration not found'));
  c.status = 'running';
  collaborations.set(c.id, c);
  const pattern = patterns.get(c.pattern_id);
  // Simulate execution based on pattern type
  const inputs = req.body?.input || {};
  let outputs = [];
  let messages_emitted = [];
  const start = Date.now();

  const runStep = (agentRole, idx) => {
    const instId = uuid();
    const agentStart = Date.now();
    // Simulate agent work
    const output = {
      role: agentRole,
      step: idx,
      input_summary: typeof inputs === 'object' ? Object.keys(inputs) : [],
      output: `processed by ${agentRole}`,
      ts: new Date().toISOString()
    };
    const inst = { id: instId, collab_id: c.id, agent_name: agentRole, role: agentRole,
      status: 'completed', output, duration_ms: Date.now() - agentStart };
    agentInstances.set(instId, inst);
    outputs.push(output);
    return inst;
  };

  if (pattern.type === 'sequential') {
    (c.agents || pattern.definition.agents || []).forEach((a, i) => runStep(a.role, i));
  } else if (pattern.type === 'parallel') {
    (c.agents || pattern.definition.agents || []).forEach((a, i) => runStep(a.role, i));
  } else if (pattern.type === 'pipeline') {
    (c.agents || pattern.definition.agents || []).forEach((a, i) => runStep(a.role, i));
  } else if (pattern.type === 'fan-out') {
    runStep(pattern.definition.dispatcher.role, 0);
    (pattern.definition.workers || []).forEach((w, i) => runStep(w.role, i + 1));
  } else if (pattern.type === 'fan-in') {
    (c.agents || []).forEach((a, i) => runStep(a.role, i));
  } else if (pattern.type === 'conditional') {
    runStep(c.agents[0]?.role || 'router', 0);
  } else if (pattern.type === 'debate') {
    (c.agents || []).forEach((a, i) => runStep(a.role, i));
  } else if (pattern.type === 'voting') {
    (c.agents || []).forEach((a, i) => runStep(a.role, i));
  }

  // Emit a summary message
  const msgId = uuid();
  const summary = { id: msgId, collab_id: c.id, from_agent: 'orchestrator',
    to_agent: 'all', content: `collaboration completed with ${outputs.length} steps`,
    type: 'summary', ts: new Date().toISOString() };
  messages.set(msgId, summary);
  messages_emitted.push(summary);

  c.status = 'completed';
  c.ended = new Date().toISOString();
  c.result = { outputs, total_duration_ms: Date.now() - start };
  collaborations.set(c.id, c);

  res.json(ok({ collaboration: c }));
});

// Messages
app.post('/api/collaborations/:id/messages', (req, res) => {
  if (!collaborations.has(req.params.id)) return res.status(404).json(fail('collaboration not found'));
  const { from_agent, to_agent, content, type = 'message' } = req.body || {};
  if (!from_agent || !content) return res.status(400).json(fail('from_agent + content required'));
  const id = uuid();
  const m = { id, collab_id: req.params.id, from_agent, to_agent: to_agent || 'all', content, type, ts: new Date().toISOString() };
  messages.set(id, m);
  res.status(201).json(ok({ message: m }));
});
app.get('/api/collaborations/:id/messages', (req, res) => {
  if (!collaborations.has(req.params.id)) return res.status(404).json(fail('collaboration not found'));
  const list = [...messages.values()].filter(m => m.collab_id === req.params.id);
  res.json(ok({ messages: list }));
});

// Instances
app.get('/api/collaborations/:id/instances', (req, res) => {
  if (!collaborations.has(req.params.id)) return res.status(404).json(fail('collaboration not found'));
  const list = [...agentInstances.values()].filter(i => i.collab_id === req.params.id);
  res.json(ok({ instances: list }));
});

seed();
app.listen(PORT, () => console.log(`${SERVICE} listening on ${PORT}`));