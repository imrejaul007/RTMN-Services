/**
 * Reasoning Runtime (port 4253)
 *
 * Bridges SkillOS and Intelligence. Implements three canonical reasoning
 * patterns out of the box:
 *
 *   1. Chain-of-Thought (CoT)         — linear step-by-step
 *   2. ReAct (Reason + Act)           — think → act → observe → think → ...
 *   3. Tree-of-Thought (ToT)          — explore N branches, pick the best
 *
 * Each "step" is a structured object (thought / action / observation /
 * score). The runtime doesn't call a real LLM; it operates on structured
 * step sequences and demonstrates the framework contract. A real
 * inference-gateway (4770) call can be plugged in via the `callLLM`
 * hook.
 *
 * Consumers: FlowOS (4244) plans, agents via acn-orchestration (4851),
 * AI Intelligence (4881) for complex decisions.
 *
 * Port: 4253
 * Pattern: in-memory + Express 5
 */

import express from 'express';
import { PersistentMap } from '@rtmn/shared/lib/persistent-map';
import { requireEnv } from '@rtmn/shared/lib/env';
import { requireAuth } from '@rtmn/shared/auth';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';

const PORT = process.env.REASONING_RUNTIME_PORT || 4253;
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


// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('tiny'));

// =============================================================================
// STORES
// =============================================================================

const traces = new PersistentMap('traces', { serviceName: 'reasoning-runtime' });    // traceId -> full trace record
const templates = new PersistentMap('templates', { serviceName: 'reasoning-runtime' }); // name -> preset reasoning template
const audit = [];

// =============================================================================
// PRESET TEMPLATES
// =============================================================================

function seedTemplates() {
  // CoT — minimal linear reasoning scaffold
  templates.set('cot-default', {
    name: 'cot-default',
    strategy: 'chain-of-thought',
    description: 'Linear step-by-step reasoning.',
    scaffold: [
      { kind: 'thought', instruction: 'Restate the question.' },
      { kind: 'thought', instruction: 'Identify what is known.' },
      { kind: 'thought', instruction: 'Identify what is unknown.' },
      { kind: 'thought', instruction: 'Derive the answer.' },
    ],
  });

  // ReAct — Reason + Act loop
  templates.set('react-default', {
    name: 'react-default',
    strategy: 'react',
    description: 'Think → Act → Observe loop, max 6 rounds.',
    maxRounds: 6,
    scaffold: [
      { kind: 'thought', instruction: 'What do I need to know next?' },
      { kind: 'action',  name: 'lookup', args: {} },
      { kind: 'observation' },
    ],
  });

  // ToT — explore 3 branches, score, pick best
  templates.set('tot-default', {
    name: 'tot-default',
    strategy: 'tree-of-thought',
    description: 'Generate 3 candidate thoughts, score each, pick winner.',
    branches: 3,
    scaffold: [
      { kind: 'branch', id: 'a' },
      { kind: 'branch', id: 'b' },
      { kind: 'branch', id: 'c' },
      { kind: 'score' },
      { kind: 'select' },
    ],
  });
}
seedTemplates();

// =============================================================================
// STRATEGY ENGINES
// =============================================================================

function makeId() { return uuidv4(); }

function recordStep(trace, step) {
  const rec = { id: makeId(), at: new Date().toISOString(), ...step };
  trace.steps.push(rec);
  return rec;
}

/**
 * Run Chain-of-Thought.
 * input:  { question, steps?, context? }
 * output: trace with linear thought chain + conclusion
 */
async function runChainOfThought(input, trace) {
  const { question, steps, context } = input;
  recordStep(trace, { kind: 'input', question });

  const seq = Array.isArray(steps) && steps.length > 0
    ? steps
    : templates.get('cot-default').scaffold;

  let lastThought = null;
  for (const step of seq) {
    const t = recordStep(trace, {
      kind: step.kind || 'thought',
      instruction: step.instruction,
      content: synthesiseThought(step, { question, context, lastThought }),
    });
    lastThought = t.content;
  }
  recordStep(trace, { kind: 'conclusion', content: lastThought || 'No conclusion reached.' });
  return lastThought;
}

/**
 * Run ReAct. Reason → Act → Observe loop.
 * input:  { question, actions?, maxRounds?, context? }
 * output: trace + final answer
 */
async function runReAct(input, trace) {
  const { question, actions, maxRounds, context } = input;
  recordStep(trace, { kind: 'input', question });

  const rounds = Math.min(parseInt(maxRounds) || 6, 20);
  const env = actions || [
    { name: 'lookup',   description: 'Look up a fact.' },
    { name: 'calculate', description: 'Run a calculation.' },
    { name: 'finish',   description: 'Finish with an answer.' },
  ];

  let working = `Question: ${question}`;
  for (let i = 0; i < rounds; i += 1) {
    recordStep(trace, { kind: 'thought', round: i, content: `Round ${i}: ${working}` });
    const actionName = i === rounds - 1 ? 'finish' : 'lookup';
    const action = env.find((a) => a.name === actionName) || env[0];
    const observation = synthesiseObservation(action, { question, context, round: i });
    recordStep(trace, { kind: 'action',  round: i, name: action.name, args: action.args || {} });
    recordStep(trace, { kind: 'observation', round: i, content: observation });
    working = observation;
    if (action.name === 'finish') break;
  }
  recordStep(trace, { kind: 'conclusion', content: working });
  return working;
}

/**
 * Run Tree-of-Thought.
 * input:  { question, branches?, context? }
 * output: trace with N branches, scores, winner
 */
async function runTreeOfThought(input, trace) {
  const { question, branches, context } = input;
  recordStep(trace, { kind: 'input', question });

  const n = Math.min(parseInt(branches) || 3, 8);
  const scored = [];
  for (let i = 0; i < n; i += 1) {
    const content = synthesiseBranch(i, { question, context });
    const score = scoreBranch(content, { question, context });
    const b = recordStep(trace, { kind: 'branch', id: String.fromCharCode(97 + i), content, score });
    scored.push(b);
  }
  scored.sort((a, b) => b.score - a.score);
  const winner = scored[0];
  recordStep(trace, { kind: 'select', winnerId: winner.id, score: winner.score });
  recordStep(trace, { kind: 'conclusion', content: winner.content });
  return winner.content;
}

// =============================================================================
// SYNTHESIS HELPERS
// (These stand in for an LLM. A real impl would call inference-gateway:4770.)
// =============================================================================

function synthesiseThought(step, { question, context, lastThought }) {
  switch (step.instruction) {
    case 'Restate the question.':
      return `Restating: ${question}`;
    case 'Identify what is known.':
      return `Known from context: ${JSON.stringify(context || {}).slice(0, 200)}`;
    case 'Identify what is unknown.':
      return 'Unknown: external factors, real-time data.';
    case 'Derive the answer.':
      return lastThought
        ? `Based on prior reasoning (${lastThought.slice(0, 80)}), the answer follows.`
        : 'Insufficient context to derive an answer.';
    default:
      return step.instruction || 'Thought recorded.';
  }
}

function synthesiseObservation(action, { question, context, round }) {
  if (action.name === 'finish') {
    return `Final answer for "${String(question).slice(0, 80)}" after ${round + 1} rounds.`;
  }
  return `Observation from ${action.name}: ${JSON.stringify(context || {}).slice(0, 160)}`;
}

function synthesiseBranch(i, { question, context }) {
  return `Branch ${String.fromCharCode(97 + i)}: One approach to "${String(question).slice(0, 80)}" given ${JSON.stringify(context || {}).slice(0, 80)}.`;
}

function scoreBranch(content, { question, context }) {
  // Toy scorer: longer + matches more context keywords wins
  const ctxStr = JSON.stringify(context || '').toLowerCase();
  const overlap = content.toLowerCase().split(/\W+/).filter((w) => w && ctxStr.includes(w)).length;
  return Math.min(1, 0.4 + content.length / 400 + overlap * 0.05);
}

// =============================================================================
// ROUTES
// =============================================================================

app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'reasoning-runtime',
    version: '1.0.0',
    port: PORT,
    counts: { traces: traces.size, templates: templates.size, audit: audit.length },
    strategies: ['chain-of-thought', 'react', 'tree-of-thought'],
    capabilities: [
      'trace-run', 'trace-get', 'trace-list',
      'template-list', 'template-get',
      'audit',
    ],
  });
});
app.get('/', (_req, res) => res.redirect('/health'));

// ── Templates ──────────────────────────────────────────────────────────────

app.get('/api/templates', (_req, res) => {
  res.json({ templates: Array.from(templates.values()) });
});

app.get('/api/templates/:name', (req, res) => {
  const t = templates.get(req.params.name);
  if (!t) return res.status(404).json({ error: 'template not found' });
  res.json(t);
});

// ── Traces ─────────────────────────────────────────────────────────────────

app.post('/api/traces',requireAuth,  async (req, res) => {
  const { strategy, question, steps, branches, maxRounds, actions, context } = req.body || {};
  if (!strategy || !question) {
    return res.status(400).json({ error: 'strategy and question required' });
  }
  const id = uuidv4();
  const trace = {
    id,
    strategy,
    question,
    status: 'running',
    startedAt: new Date().toISOString(),
    steps: [],
  };
  traces.set(id, trace);
  audit.push({ id, at: trace.startedAt, kind: 'trace-started', strategy });

  try {
    let conclusion;
    if (strategy === 'chain-of-thought') conclusion = await runChainOfThought({ question, steps, context }, trace);
    else if (strategy === 'react')         conclusion = await runReAct({ question, actions, maxRounds, context }, trace);
    else if (strategy === 'tree-of-thought')conclusion = await runTreeOfThought({ question, branches, context }, trace);
    else throw new Error(`unknown strategy: ${strategy}`);

    trace.status = 'completed';
    trace.conclusion = conclusion;
    trace.completedAt = new Date().toISOString();
    audit.push({ id, at: trace.completedAt, kind: 'trace-completed' });
    res.status(201).json(trace);
  } catch (err) {
    trace.status = 'failed';
    trace.error = err.message;
    trace.completedAt = new Date().toISOString();
    audit.push({ id, at: trace.completedAt, kind: 'trace-failed', error: err.message });
    res.status(500).json(trace);
  }
});

app.get('/api/traces', (_req, res) => {
  res.json({ traces: Array.from(traces.values()).slice(-200) });
});

app.get('/api/traces/:id', (req, res) => {
  const t = traces.get(req.params.id);
  if (!t) return res.status(404).json({ error: 'trace not found' });
  res.json(t);
});

// ── Audit ──────────────────────────────────────────────────────────────────

app.get('/api/audit', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 200, 1000);
  res.json({ entries: audit.slice(-limit) });
});

// =============================================================================
// 404 + error handling
// =============================================================================

app.use((_req, res) => res.status(404).json({ error: 'not found' }));
app.use((err, _req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error('[reasoning-runtime]', err);
  res.status(500).json({ error: err.message || 'internal error' });
});

// =============================================================================
// START
// =============================================================================
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



const server = app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[reasoning-runtime] listening on :${PORT}`);
});
installGracefulShutdown(server);

export default app;
