import express from 'express';
import { requireEnv } from '@rtmn/shared/lib/env';
import { requireAuth } from '@rtmn/shared/auth';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { z } from 'zod';

const PORT = parseInt(process.env.AGENTOS_PORT || '7300', 10);
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai';
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;

const app = express();

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
app.use(helmet()); app.use(cors()); app.use(compression()); app.use(express.json({ limit: '1mb' }));
const reqI = (req, res, next) => { if (req.headers['x-internal-token'] !== INTERNAL_TOKEN) return res.status(401).json({ success: false }); next(); };
const send = (res, s, d) => res.status(s).json({ success: true, data: d, meta: { timestamp: new Date().toISOString() } });

const AgentSchema = new mongoose.Schema({
  agentId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['personal', 'business', 'system'], required: true },
  ownerCorpId: { type: String, index: true },
  status: { type: String, enum: ['created', 'deployed', 'active', 'paused', 'retired'], default: 'created' },
  version: { type: String, default: '1.0.0' },
  runtime: { type: String, enum: ['genie', 'sutar', 'custom'], required: true },
  config: mongoose.Schema.Types.Mixed,
  metrics: { tasksCompleted: { type: Number, default: 0 }, tasksFailed: { type: Number, default: 0 }, avgLatencyMs: { type: Number, default: 0 }, totalRuntime: { type: Number, default: 0 } },
  metadata: mongoose.Schema.Types.Mixed,
}, { timestamps: true });
const Agent = mongoose.model('Agent', AgentSchema);

const TaskSchema = new mongoose.Schema({
  taskId: { type: String, required: true, unique: true, index: true },
  agentId: { type: String, required: true, index: true },
  type: String,
  input: mongoose.Schema.Types.Mixed,
  output: mongoose.Schema.Types.Mixed,
  status: { type: String, enum: ['pending', 'running', 'completed', 'failed'], default: 'pending' },
  latencyMs: Number,
  error: String,
}, { timestamps: true });
const Task = mongoose.model('Task', TaskSchema);

const createSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['personal', 'business', 'system']),
  ownerCorpId: z.string().optional(),
  runtime: z.enum(['genie', 'sutar', 'custom']),
  config: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const taskSchema = z.object({
  type: z.string().min(1),
  input: z.record(z.unknown()).optional(),
});

app.get('/health', (req, res) => send(res, 200, { service: 'agentos', status: 'healthy' }));
app.post('/api/agents',requireAuth,  reqI, async (req, res, next) => {
  try {
    const data = createSchema.parse(req.body);
    const agentId = `AGX-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
    const a = await Agent.create({ ...data, agentId });
    res.status(201).json({ success: true, data: { agentId, name: a.name, runtime: a.runtime, status: a.status }, meta: { timestamp: new Date().toISOString() } });
  } catch (e) { next(e); }
});
app.get('/api/agents', reqI, async (req, res, next) => {
  try {
    const { type, runtime, ownerCorpId } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (runtime) filter.runtime = runtime;
    if (ownerCorpId) filter.ownerCorpId = ownerCorpId;
    const items = await Agent.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: { count: items.length, items: items.map(a => ({ agentId: a.agentId, name: a.name, type: a.type, runtime: a.runtime, status: a.status, metrics: a.metrics })) }, meta: { timestamp: new Date().toISOString() } });
  } catch (e) { next(e); }
});
app.get('/api/agents/:agentId', reqI, async (req, res, next) => {
  try {
    const a = await Agent.findOne({ agentId: req.params.agentId });
    if (!a) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
    res.json({ success: true, data: { agentId: a.agentId, name: a.name, type: a.type, runtime: a.runtime, status: a.status, config: a.config, metrics: a.metrics, version: a.version }, meta: { timestamp: new Date().toISOString() } });
  } catch (e) { next(e); }
});
app.post('/api/agents/:agentId/deploy',requireAuth,  reqI, async (req, res, next) => {
  try {
    const a = await Agent.findOneAndUpdate({ agentId: req.params.agentId }, { $set: { status: 'deployed' } }, { new: true });
    if (!a) return res.status(404).json({ success: false });
    res.json({ success: true, data: { agentId: a.agentId, status: a.status }, meta: { timestamp: new Date().toISOString() } });
  } catch (e) { next(e); }
});
app.post('/api/agents/:agentId/tasks',requireAuth,  reqI, async (req, res, next) => {
  try {
    const { type, input = {} } = taskSchema.parse(req.body);
    const a = await Agent.findOne({ agentId: req.params.agentId });
    if (!a) return res.status(404).json({ success: false });
    if (a.status === 'paused' || a.status === 'retired') {
      return res.status(409).json({ success: false, error: { code: 'AGENT_NOT_ACTIVE', message: `Agent is ${a.status}, cannot accept tasks` } });
    }
    const taskId = `TSK-${Date.now().toString(36).toUpperCase()}`;
    const start = Date.now();
    // Simulate task execution with possible failure
    const willFail = Math.random() < 0.1; // 10% failure rate for realistic metrics
    const latency = 50 + Math.floor(Math.random() * 200);
    if (willFail) {
      const errorMsg = 'Simulated task failure';
      await Task.create({ taskId, agentId: a.agentId, type, input, status: 'failed', error: errorMsg, latencyMs: latency });
      a.metrics.tasksFailed += 1;
      await a.save();
      return res.status(500).json({ success: false, data: { taskId, status: 'failed', error: errorMsg }, meta: { timestamp: new Date().toISOString() } });
    }
    const output = { result: `Task ${type} completed by ${a.name}`, timestamp: new Date().toISOString() };
    await Task.create({ taskId, agentId: a.agentId, type, input, output, status: 'completed', latencyMs: latency });
    a.metrics.tasksCompleted += 1;
    a.metrics.avgLatencyMs = Math.round((a.metrics.avgLatencyMs * (a.metrics.tasksCompleted - 1) + latency) / a.metrics.tasksCompleted);
    a.metrics.totalRuntime += latency;
    // Auto-transition 'deployed' → 'active' on first task
    if (a.status === 'deployed') a.status = 'active';
    await a.save();
    res.json({ success: true, data: { taskId, status: 'completed', output, latencyMs: latency }, meta: { timestamp: new Date().toISOString() } });
  } catch (e) { next(e); }
});

// Pause/Resume/Retire endpoints for full lifecycle
app.post('/api/agents/:agentId/pause',requireAuth,  reqI, async (req, res, next) => {
  try {
    const a = await Agent.findOneAndUpdate({ agentId: req.params.agentId }, { $set: { status: 'paused' } }, { new: true });
    if (!a) return res.status(404).json({ success: false });
    res.json({ success: true, data: { agentId: a.agentId, status: a.status }, meta: { timestamp: new Date().toISOString() } });
  } catch (e) { next(e); }
});

app.post('/api/agents/:agentId/resume',requireAuth,  reqI, async (req, res, next) => {
  try {
    const a = await Agent.findOneAndUpdate({ agentId: req.params.agentId }, { $set: { status: 'active' } }, { new: true });
    if (!a) return res.status(404).json({ success: false });
    res.json({ success: true, data: { agentId: a.agentId, status: a.status }, meta: { timestamp: new Date().toISOString() } });
  } catch (e) { next(e); }
});

app.post('/api/agents/:agentId/retire',requireAuth,  reqI, async (req, res, next) => {
  try {
    const a = await Agent.findOneAndUpdate({ agentId: req.params.agentId }, { $set: { status: 'retired' } }, { new: true });
    if (!a) return res.status(404).json({ success: false });
    res.json({ success: true, data: { agentId: a.agentId, status: a.status }, meta: { timestamp: new Date().toISOString() } });
  } catch (e) { next(e); }
});
app.get('/api/agents/:agentId/tasks', reqI, async (req, res, next) => {
  try {
    const items = await Task.find({ agentId: req.params.agentId }).sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, data: { count: items.length, items }, meta: { timestamp: new Date().toISOString() } });
  } catch (e) { next(e); }
});

async function start() {
  try { await mongoose.connect(MONGODB_URI); console.log(`[agentos] MongoDB connected`); }
  catch (err) { console.error(`[agentos] MongoDB failed:`, err.message); setTimeout(start, 5000); return; }
  if (process.env.NODE_ENV !== 'test' && !process.env.SUPPRESS_LISTEN) {
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});


    const server = app.listen(PORT, () => console.log(`[agentos] listening on :${PORT}`));
    installGracefulShutdown(server);
  }
}
start();
export { app };
