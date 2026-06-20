// Agent Studio (4189)
// Debugger for agent executions. Trace steps, capture state, replay, breakpoint-based pauses.

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

const PORT = process.env.PORT || 4189;
const SERVICE = 'agent-studio';

const sessions = new Map();     // sessionId -> { id, agent_id, status, started, ended, total_tokens, total_cost }
const traces = new Map();       // traceId -> { id, session_id, step_name, step_type, input, output, tokens, duration_ms, ts, error }
const breakpoints = new Map();  // bpId -> { id, session_id, condition, paused_at, hit_count }
const replays = new Map();      // replayId -> { id, source_session_id, status, ts }
const comments = new Map();     // commentId -> { id, trace_id, author, text, ts }

const ok = (data) => ({ ok: true, ...data });
const fail = (msg, code = 400) => ({ ok: false, error: msg });

function seed() {
  // One running session
  const sid = uuid();
  sessions.set(sid, {
    id: sid, agent_id: 'sales-assistant', status: 'completed',
    started: new Date().toISOString(), ended: new Date().toISOString(),
    total_tokens: 1247, total_cost: 0.0187
  });
  // Sample traces
  const steps = [
    { name: 'parse-input', type: 'input', input: { q: 'leads in California' }, output: { parsed: true }, tokens: 0, duration_ms: 5 },
    { name: 'call-llm', type: 'llm', input: { prompt: '...' }, output: { text: 'Found 42 leads' }, tokens: 845, duration_ms: 1240 },
    { name: 'query-db', type: 'tool', input: { sql: 'SELECT...' }, output: { rows: 42 }, tokens: 0, duration_ms: 87 },
    { name: 'format-response', type: 'output', input: { rows: 42 }, output: { response: '...' }, tokens: 402, duration_ms: 12 }
  ];
  steps.forEach(s => {
    const tid = uuid();
    traces.set(tid, { id: tid, session_id: sid, ...s, ts: new Date().toISOString(), error: null });
  });
}

app.get('/health', (_req, res) => res.json(ok({ service: SERVICE, port: PORT, status: 'healthy' })));
app.get('/', (_req, res) => res.json(ok({
  service: SERVICE,
  endpoints: ['/api/sessions', '/api/sessions/:id', '/api/sessions/:id/traces',
              '/api/sessions/:id/breakpoints', '/api/sessions/:id/replay',
              '/api/traces/:id/comments', '/api/breakpoints/:id/toggle']
})));

// Sessions
app.get('/api/sessions', (req, res) => {
  const { agent_id, status } = req.query;
  let list = [...sessions.values()];
  if (agent_id) list = list.filter(s => s.agent_id === agent_id);
  if (status) list = list.filter(s => s.status === status);
  res.json(ok({ sessions: list }));
});
app.post('/api/sessions', (req, res) => {
  const { agent_id } = req.body || {};
  if (!agent_id) return res.status(400).json(fail('agent_id required'));
  const id = uuid();
  const s = { id, agent_id, status: 'running', started: new Date().toISOString(),
    ended: null, total_tokens: 0, total_cost: 0 };
  sessions.set(id, s);
  res.status(201).json(ok({ session: s }));
});
app.get('/api/sessions/:id', (req, res) => {
  const s = sessions.get(req.params.id);
  if (!s) return res.status(404).json(fail('session not found'));
  res.json(ok({ session: s }));
});
app.post('/api/sessions/:id/end', (req, res) => {
  const s = sessions.get(req.params.id);
  if (!s) return res.status(404).json(fail('session not found'));
  s.status = 'completed';
  s.ended = new Date().toISOString();
  sessions.set(s.id, s);
  res.json(ok({ session: s }));
});

// Traces
app.post('/api/sessions/:id/traces', (req, res) => {
  if (!sessions.has(req.params.id)) return res.status(404).json(fail('session not found'));
  const { step_name, step_type, input, output, tokens = 0, duration_ms = 0, error = null } = req.body || {};
  if (!step_name) return res.status(400).json(fail('step_name required'));
  const id = uuid();
  const t = { id, session_id: req.params.id, step_name, step_type, input, output, tokens, duration_ms, error, ts: new Date().toISOString() };
  traces.set(id, t);
  // Update session totals
  const sess = sessions.get(req.params.id);
  sess.total_tokens += tokens;
  sess.total_cost += tokens * 0.000015;
  sessions.set(sess.id, sess);
  res.status(201).json(ok({ trace: t }));
});

app.get('/api/sessions/:id/traces', (req, res) => {
  if (!sessions.has(req.params.id)) return res.status(404).json(fail('session not found'));
  const list = [...traces.values()].filter(t => t.session_id === req.params.id);
  // Aggregate stats
  const stats = {
    step_count: list.length,
    total_tokens: list.reduce((s, t) => s + t.tokens, 0),
    total_duration_ms: list.reduce((s, t) => s + t.duration_ms, 0),
    error_count: list.filter(t => t.error).length
  };
  res.json(ok({ session_id: req.params.id, traces: list, stats }));
});

// Breakpoints
app.post('/api/sessions/:id/breakpoints', (req, res) => {
  if (!sessions.has(req.params.id)) return res.status(404).json(fail('session not found'));
  const { condition } = req.body || {};
  if (!condition) return res.status(400).json(fail('condition required'));
  const id = uuid();
  const bp = { id, session_id: req.params.id, condition, paused_at: null, hit_count: 0 };
  breakpoints.set(id, bp);
  res.status(201).json(ok({ breakpoint: bp }));
});

app.get('/api/sessions/:id/breakpoints', (req, res) => {
  if (!sessions.has(req.params.id)) return res.status(404).json(fail('session not found'));
  const list = [...breakpoints.values()].filter(b => b.session_id === req.params.id);
  res.json(ok({ breakpoints: list }));
});

app.post('/api/breakpoints/:id/toggle', (req, res) => {
  const bp = breakpoints.get(req.params.id);
  if (!bp) return res.status(404).json(fail('breakpoint not found'));
  bp.hit_count++;
  bp.paused_at = new Date().toISOString();
  breakpoints.set(bp.id, bp);
  res.json(ok({ breakpoint: bp, paused: true }));
});

// Replay
app.post('/api/sessions/:id/replay', (req, res) => {
  const source = sessions.get(req.params.id);
  if (!source) return res.status(404).json(fail('source session not found'));
  const id = uuid();
  const r = { id, source_session_id: source.id, status: 'queued', ts: new Date().toISOString() };
  replays.set(id, r);
  // Also create a new session that mirrors
  const newId = uuid();
  sessions.set(newId, {
    id: newId, agent_id: source.agent_id, status: 'running',
    started: new Date().toISOString(), ended: null, total_tokens: 0, total_cost: 0,
    replay_of: source.id
  });
  res.status(201).json(ok({ replay: r, new_session_id: newId }));
});

app.get('/api/replays', (_req, res) => res.json(ok({ replays: [...replays.values()] })));

// Comments
app.post('/api/traces/:id/comments', (req, res) => {
  const t = traces.get(req.params.id);
  if (!t) return res.status(404).json(fail('trace not found'));
  const { author, text } = req.body || {};
  if (!text) return res.status(400).json(fail('text required'));
  const id = uuid();
  const c = { id, trace_id: t.id, author: author || 'anonymous', text, ts: new Date().toISOString() };
  comments.set(id, c);
  res.status(201).json(ok({ comment: c }));
});

app.get('/api/traces/:id/comments', (req, res) => {
  if (!traces.has(req.params.id)) return res.status(404).json(fail('trace not found'));
  const list = [...comments.values()].filter(c => c.trace_id === req.params.id);
  res.json(ok({ trace_id: req.params.id, comments: list }));
});

seed();
app.listen(PORT, () => console.log(`${SERVICE} listening on ${PORT}`));