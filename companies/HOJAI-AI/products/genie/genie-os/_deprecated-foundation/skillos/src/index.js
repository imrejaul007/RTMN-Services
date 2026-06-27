import express from 'express';
import { requireEnv } from '@rtmn/shared/lib/env';
import { requireAuth } from '@rtmn/shared/auth';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { z } from 'zod';

const PORT = parseInt(process.env.SKILLOS_PORT || '7006', 10);
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai';
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;

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
app.use(helmet()); app.use(cors()); app.use(compression()); app.use(express.json({ limit: '1mb' }));
const reqI = (req, res, next) => { if (req.headers['x-internal-token'] !== INTERNAL_TOKEN) return res.status(401).json({ success: false }); next(); };
const send = (res, s, d) => res.status(s).json({ success: true, data: d, meta: { timestamp: new Date().toISOString() } });

const SkillSchema = new mongoose.Schema({
  skillId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true, index: true },
  category: { type: String, enum: ['communication', 'negotiation', 'analysis', 'transaction', 'search', 'recommendation', 'translation', 'vision', 'voice', 'workflow'], required: true },
  description: String,
  version: { type: String, default: '1.0.0' },
  handler: String,
  inputSchema: mongoose.Schema.Types.Mixed,
  outputSchema: mongoose.Schema.Types.Mixed,
  requiredServices: [String],
  enabled: { type: Boolean, default: true },
  pricing: {
    type: { type: String, enum: ['free', 'per_call', 'subscription'], default: 'free' },
    costPerCall: { type: Number, default: 0 },
  },
  stats: { totalCalls: { type: Number, default: 0 }, successfulCalls: { type: Number, default: 0 }, avgLatencyMs: { type: Number, default: 0 } },
}, { timestamps: true });
const Skill = mongoose.model('Skill', SkillSchema);

const createSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.enum(['communication', 'negotiation', 'analysis', 'transaction', 'search', 'recommendation', 'translation', 'vision', 'voice', 'workflow']),
  description: z.string().optional(),
  handler: z.string().optional(),
  inputSchema: z.record(z.unknown()).optional(),
  outputSchema: z.record(z.unknown()).optional(),
  requiredServices: z.array(z.string()).optional(),
  pricing: z.object({ type: z.enum(['free', 'per_call', 'subscription']), costPerCall: z.number().optional() }).optional(),
});

const executeSchema = z.object({
  input: z.record(z.unknown()),
  context: z.record(z.unknown()).optional(),
});

app.get('/health', (req, res) => send(res, 200, { service: 'skillos', status: 'healthy' }));
app.post('/api/skills',requireAuth,  reqI, async (req, res, next) => {
  try {
    const data = createSchema.parse(req.body);
    const skillId = `SKL-${data.category.toUpperCase().slice(0, 3)}-${Date.now().toString(36).toUpperCase()}`;
    const s = await Skill.create({ ...data, skillId });
    res.status(201).json({ success: true, data: { skillId, name: s.name, category: s.category, version: s.version }, meta: { timestamp: new Date().toISOString() } });
  } catch (e) { next(e); }
});
app.get('/api/skills', reqI, async (req, res, next) => {
  try {
    const { category, q } = req.query;
    const filter = { enabled: true };
    if (category) filter.category = category;
    if (q) filter.name = { $regex: q, $options: 'i' };
    const items = await Skill.find(filter);
    res.json({ success: true, data: { count: items.length, items: items.map(s => ({ skillId: s.skillId, name: s.name, category: s.category, description: s.description, pricing: s.pricing, stats: s.stats })) }, meta: { timestamp: new Date().toISOString() } });
  } catch (e) { next(e); }
});
app.post('/api/skills/:skillId/execute',requireAuth,  reqI, async (req, res, next) => {
  try {
    const { input, context = {} } = executeSchema.parse(req.body);
    const skill = await Skill.findOne({ skillId: req.params.skillId });
    if (!skill) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
    const start = Date.now();
    const result = await executeSkill(skill, input, context);
    const latency = Date.now() - start;
    skill.stats.totalCalls += 1;
    skill.stats.successfulCalls += result.success ? 1 : 0;
    skill.stats.avgLatencyMs = Math.round((skill.stats.avgLatencyMs * (skill.stats.totalCalls - 1) + latency) / skill.stats.totalCalls);
    await skill.save();
    res.json({ success: true, data: { skillId: skill.skillId, success: result.success, output: result.output, latencyMs: latency }, meta: { timestamp: new Date().toISOString() } });
  } catch (e) { next(e); }
});

async function executeSkill(skill, input, context) {
  // Built-in skill handlers
  switch (skill.category) {
    case 'search': return { success: true, output: { results: [], query: input.query || '' } };
    case 'analysis': return { success: true, output: { sentiment: 'neutral', confidence: 0.85, text: input.text || '' } };
    case 'recommendation': return { success: true, output: { recommendations: [] } };
    case 'transaction': return { success: true, output: { transactionId: `TXN-${Date.now()}`, status: 'completed' } };
    case 'negotiation': return { success: true, output: { counterOffer: input.initialOffer, roundsRemaining: 3 } };
    default: return { success: true, output: { message: `Executed ${skill.name}`, input } };
  }
}

async function start() {
  try { await mongoose.connect(MONGODB_URI); console.log(`[skillos] MongoDB connected`); }
  catch (err) { console.error(`[skillos] MongoDB failed:`, err.message); setTimeout(start, 5000); return; }
  if (process.env.NODE_ENV !== 'test' && !process.env.SUPPRESS_LISTEN) {
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});


    const server = app.listen(PORT, () => console.log(`[skillos] listening on :${PORT}`));
    installGracefulShutdown(server);
  }
}
start();
export { app };
