import express from 'express';
import { requireEnv } from '@rtmn/shared/lib/env';
import { requireAuth } from '@rtmn/shared/auth';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import axios from 'axios';

const PORT = parseInt(process.env.FLOWOS_PORT || '7007', 10);
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai';
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;
const SKILLOS_URL = process.env.SKILLOS_URL || 'http://localhost:7006';
const CANONICAL_URL = process.env.FLOWOS_CANONICAL_URL || null; // e.g. http://flow-os-canonical:4156
const HEARTBEAT_INTERVAL_MS = 5_000;
const STALE_RUN_AFTER_MS = 60_000;
const DEP_TIMEOUT_MS = 30_000;

if (!INTERNAL_TOKEN) {
  console.error('[flowos] FATAL: INTERNAL_SERVICE_TOKEN env var is required');
  process.exit(1);
}

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


requireEnv(['PORT'], { allowDev: true });
app.use(helmet()); app.use(cors()); app.use(compression()); app.use(express.json({ limit: '2mb' }));
const reqI = (req, res, next) => { if (req.headers['x-internal-token'] !== INTERNAL_TOKEN) return res.status(401).json({ success: false }); next(); };
const send = (res, s, d) => res.status(s).json({ success: true, data: d, meta: { timestamp: new Date().toISOString() } });

// Per-IP rate limit on the heavy execute endpoint (30/min default).
const executeLimiter = rateLimit({ windowMs: 60_000, max: parseInt(process.env.FLOWOS_EXEC_LIMIT || '30', 10), standardHeaders: true, legacyHeaders: false });

const FlowSchema = new mongoose.Schema({
  flowId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  description: String,
  corpId: { type: String, index: true },
  source: { type: String, enum: ['api', 'flow-os-canonical'], default: 'api' },
  steps: [{
    id: String,
    name: String,
    skill: String,
    input: mongoose.Schema.Types.Mixed,
    dependsOn: [String],
    onError: { type: String, enum: ['stop', 'continue', 'retry'], default: 'stop' },
  }],
  status: { type: String, enum: ['draft', 'active', 'paused', 'archived'], default: 'draft' },
  runs: { total: { type: Number, default: 0 }, successful: { type: Number, default: 0 }, failed: { type: Number, default: 0 } },
}, { timestamps: true });
const Flow = mongoose.model('Flow', FlowSchema);

const RunSchema = new mongoose.Schema({
  runId: { type: String, required: true, unique: true, index: true },
  flowId: { type: String, required: true, index: true },
  corpId: { type: String, index: true },
  idempotencyKey: { type: String, index: true, sparse: true, unique: true },
  status: { type: String, enum: ['pending', 'running', 'completed', 'failed'], default: 'pending' },
  input: mongoose.Schema.Types.Mixed,
  output: mongoose.Schema.Types.Mixed,
  stepResults: mongoose.Schema.Types.Mixed,
  error: String,
  startedAt: Date,
  completedAt: Date,
  lastHeartbeatAt: Date,
}, { timestamps: true });
const Run = mongoose.model('Run', RunSchema);

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  corpId: z.string().optional(),
  steps: z.array(z.object({
    id: z.string(),
    name: z.string().optional(),
    skill: z.string(),
    input: z.record(z.unknown()).optional(),
    dependsOn: z.array(z.string()).optional(),
    onError: z.enum(['stop', 'continue', 'retry']).optional(),
  })).min(1),
});

const executeSchema = z.object({
  corpId: z.string().optional(),
  input: z.record(z.unknown()).optional(),
});

// requireAuth() sets req.auth = { type, ...payload }; the createToken() payload has businessId, corpId, userId, etc.
const tenantOf = (req) => req.auth?.businessId || req.auth?.corpId || req.auth?.userId || null;

app.get('/health', (req, res) => send(res, 200, { service: 'flowos', status: 'healthy' }));
app.post('/api/flows', requireAuth, reqI, async (req, res, next) => {
  try {
    const data = createSchema.parse(req.body);
    const flowId = `FLW-${Date.now().toString(36).toUpperCase()}`;
    const f = await Flow.create({ ...data, flowId, corpId: data.corpId || tenantOf(req) });
    res.status(201).json({ success: true, data: { flowId, name: f.name, status: f.status, steps: f.steps.length }, meta: { timestamp: new Date().toISOString() } });
  } catch (e) { next(e); }
});
app.get('/api/flows', requireAuth, reqI, async (req, res, next) => {
  try {
    const tenant = tenantOf(req);
    const items = await Flow.find({ corpId: tenant, status: { $ne: 'archived' } });
    res.json({ success: true, data: { count: items.length, items: items.map(f => ({ flowId: f.flowId, name: f.name, status: f.status, steps: f.steps.length, runs: f.runs, source: f.source })) }, meta: { timestamp: new Date().toISOString() } });
  } catch (e) { next(e); }
});
app.post('/api/flows/:flowId/execute', executeLimiter, requireAuth, reqI, async (req, res, next) => {
  try {
    const { corpId, input = {} } = executeSchema.parse(req.body);
    const tenant = tenantOf(req);
    const flow = await Flow.findOne({ flowId: req.params.flowId, corpId: tenant });
    if (!flow) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });

    // Idempotency: same key + same tenant → return the existing run instead of starting a new one.
    const idemKey = req.headers['idempotency-key'];
    if (idemKey) {
      const existing = await Run.findOne({ idempotencyKey: idemKey, corpId: tenant });
      if (existing) {
        return res.status(200).json({ success: true, data: { runId: existing.runId, status: existing.status, flowId: existing.flowId, idempotent: true }, meta: { timestamp: new Date().toISOString() } });
      }
    }

    const runId = `RUN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const run = await Run.create({ runId, flowId: flow.flowId, corpId: tenant, idempotencyKey: idemKey || undefined, status: 'running', input, startedAt: new Date(), lastHeartbeatAt: new Date(), stepResults: {} });
    executeFlow(flow, run, input).catch(err => console.error('[flowos] run error:', err));
    res.status(202).json({ success: true, data: { runId, status: 'running', flowId: flow.flowId }, meta: { timestamp: new Date().toISOString() } });
  } catch (e) { next(e); }
});
app.get('/api/runs/:runId', requireAuth, reqI, async (req, res, next) => {
  try {
    const tenant = tenantOf(req);
    const run = await Run.findOne({ runId: req.params.runId, corpId: tenant });
    if (!run) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
    res.json({ success: true, data: { runId: run.runId, flowId: run.flowId, status: run.status, input: run.input, output: run.output, stepResults: run.stepResults, error: run.error, startedAt: run.startedAt, completedAt: run.completedAt, lastHeartbeatAt: run.lastHeartbeatAt }, meta: { timestamp: new Date().toISOString() } });
  } catch (e) { next(e); }
});

async function waitForDep(dep, completed, since) {
  while (!completed.has(dep)) {
    if (Date.now() - since > DEP_TIMEOUT_MS) {
      throw new Error(`dependency ${dep} not satisfied within ${DEP_TIMEOUT_MS}ms`);
    }
    await new Promise(r => setTimeout(r, 50));
  }
}

async function executeFlow(flow, run, input) {
  const results = {};
  const completed = new Set();
  const hbTimer = setInterval(() => { Run.updateOne({ _id: run._id }, { lastHeartbeatAt: new Date() }).catch(() => {}); }, HEARTBEAT_INTERVAL_MS);
  try {
    for (const step of flow.steps) {
      for (const dep of (step.dependsOn || [])) {
        await waitForDep(dep, completed, Date.now());
      }
      try {
        const stepInput = { ...step.input, ...input, _results: results };
        const res = await axios.post(`${SKILLOS_URL}/api/skills/${step.skill}/execute`, { input: stepInput, context: { flowId: flow.flowId, runId: run.runId } }, { headers: { 'x-internal-token': INTERNAL_TOKEN }, timeout: 10_000 });
        results[step.id] = res.data.data.output;
        completed.add(step.id);
        run.stepResults = results;
        await run.save();
      } catch (err) {
        if (step.onError === 'stop') throw err;
        results[step.id] = { error: err.message };
        completed.add(step.id);
      }
    }
    run.status = 'completed';
    run.output = results;
    run.completedAt = new Date();
    await run.save();
    // Atomic counter update — avoids the read-modify-write race in the previous version.
    await Flow.updateOne({ flowId: flow.flowId }, { $inc: { 'runs.total': 1, 'runs.successful': 1 } });
  } catch (err) {
    run.status = 'failed';
    run.error = err.message;
    run.completedAt = new Date();
    await run.save();
    await Flow.updateOne({ flowId: flow.flowId }, { $inc: { 'runs.total': 1, 'runs.failed': 1 } });
  } finally {
    clearInterval(hbTimer);
  }
}

// Recovery sweep: any run stuck in 'running' with a stale heartbeat is marked failed.
// This handles the case where the process crashes between Run.create and executeFlow finishing.
async function recoverStaleRuns() {
  const cutoff = new Date(Date.now() - STALE_RUN_AFTER_MS);
  const stale = await Run.find({ status: 'running', lastHeartbeatAt: { $lt: cutoff } });
  for (const r of stale) {
    r.status = 'failed';
    r.error = 'recovered: heartbeat lost';
    r.completedAt = new Date();
    await r.save();
    await Flow.updateOne({ flowId: r.flowId }, { $inc: { 'runs.total': 1, 'runs.failed': 1 } });
    console.warn(`[flowos] recovered stale run ${r.runId}`);
  }
  if (stale.length) console.log(`[flowos] recovery sweep: ${stale.length} run(s) marked failed`);
}

// Best-effort sync of canonical templates from flow-os-canonical@4156.
// Runs once on startup; failures are logged and do not block boot.
async function syncCanonicalTemplates() {
  if (!CANONICAL_URL) return;
  try {
    const r = await axios.get(`${CANONICAL_URL}/api/flows`, { headers: { 'x-internal-token': INTERNAL_TOKEN }, timeout: 5000 });
    const tpls = r.data?.flows || [];
    for (const tpl of tpls) {
      const steps = (tpl.steps || []).map(s => ({ id: s.key, skill: s.service, name: s.key }));
      const exists = await Flow.findOne({ name: tpl.name, source: 'flow-os-canonical', corpId: '__shared__' });
      if (!exists) {
        await Flow.create({ flowId: `CN-${tpl.name.toUpperCase()}`, name: tpl.name, description: tpl.description, steps, source: 'flow-os-canonical', status: 'active', corpId: '__shared__' });
      }
    }
    console.log(`[flowos] synced ${tpls.length} canonical templates from ${CANONICAL_URL}`);
  } catch (e) {
    console.warn(`[flowos] canonical sync skipped: ${e.message}`);
  }
}

async function start() {
  try { await mongoose.connect(MONGODB_URI); console.log(`[flowos] MongoDB connected`); }
  catch (err) { console.error(`[flowos] MongoDB failed:`, err.message); setTimeout(start, 5000); return; }
  await recoverStaleRuns();
  await syncCanonicalTemplates();
  setInterval(recoverStaleRuns, STALE_RUN_AFTER_MS).unref();
  if (process.env.NODE_ENV !== 'test' && !process.env.SUPPRESS_LISTEN) {
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});


    const server = app.listen(PORT, () => console.log(`[flowos] listening on :${PORT}`));
    installGracefulShutdown(server);
  }
}
start();
export { app };
