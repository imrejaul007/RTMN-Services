import express from 'express';
import { requireEnv } from '@rtmn/shared/lib/env';
import { requireAuth } from '@rtmn/shared/auth';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { z } from 'zod';

const PORT = parseInt(process.env.POLICYOS_PORT || '7005', 10);
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai';
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;

const app = express();

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
app.use(helmet()); app.use(cors()); app.use(compression()); app.use(express.json({ limit: '1mb' }));
const reqI = (req, res, next) => { if (req.headers['x-internal-token'] !== INTERNAL_TOKEN) return res.status(401).json({ success: false }); next(); };
const send = (res, s, d) => res.status(s).json({ success: true, data: d, meta: { timestamp: new Date().toISOString() } });

const PolicySchema = new mongoose.Schema({
  policyId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  action: { type: String, required: true, index: true },
  resource: String,
  effect: { type: String, enum: ['allow', 'deny'], required: true },
  conditions: { type: mongoose.Schema.Types.Mixed, default: {} },
  priority: { type: Number, default: 100 },
  enabled: { type: Boolean, default: true },
  description: String,
}, { timestamps: true });
const Policy = mongoose.model('Policy', PolicySchema);

const createSchema = z.object({
  name: z.string().min(1),
  action: z.string().min(1),
  resource: z.string().optional(),
  effect: z.enum(['allow', 'deny']),
  conditions: z.record(z.unknown()).optional(),
  priority: z.number().optional(),
  description: z.string().optional(),
});

const evaluateSchema = z.object({
  action: z.string().min(1),
  corpId: z.string().optional(),
  resource: z.string().optional(),
  context: z.record(z.unknown()).optional(),
});

function evaluateCondition(conditions, context) {
  if (!conditions || Object.keys(conditions).length === 0) return true;
  for (const [key, expected] of Object.entries(conditions)) {
    const actual = context[key];
    // Support numeric thresholds: amount_greater_than, amount_less_than
    if (key.endsWith('_greater_than') && typeof expected === 'number') {
      if (!(typeof actual === 'number' && actual > expected)) return false;
    } else if (key.endsWith('_less_than') && typeof expected === 'number') {
      if (!(typeof actual === 'number' && actual < expected)) return false;
    } else if (key.endsWith('_at_least') && typeof expected === 'number') {
      if (!(typeof actual === 'number' && actual >= expected)) return false;
    } else {
      if (actual !== expected) return false;
    }
  }
  return true;
}

app.get('/health', (req, res) => send(res, 200, { service: 'policyos', status: 'healthy' }));
app.post('/api/policies',requireAuth,  reqI, async (req, res, next) => {
  try {
    const data = createSchema.parse(req.body);
    const policyId = `POL-${Date.now().toString(36).toUpperCase()}`;
    const p = await Policy.create({ ...data, policyId });
    res.status(201).json({ success: true, data: { policyId, name: p.name, action: p.action, effect: p.effect }, meta: { timestamp: new Date().toISOString() } });
  } catch (e) { next(e); }
});
app.get('/api/policies', reqI, async (req, res, next) => {
  try {
    const { action } = req.query;
    const filter = { enabled: true };
    if (action) filter.action = action;
    const items = await Policy.find(filter).sort({ priority: -1 });
    res.json({ success: true, data: { count: items.length, items: items.map(p => ({ policyId: p.policyId, name: p.name, action: p.action, effect: p.effect, priority: p.priority })) }, meta: { timestamp: new Date().toISOString() } });
  } catch (e) { next(e); }
});
app.post('/api/policies/evaluate',requireAuth,  reqI, async (req, res, next) => {
  try {
    const { action, corpId, resource, context = {} } = evaluateSchema.parse(req.body);
    const policies = await Policy.find({ action, enabled: true }).sort({ priority: -1 });
    if (policies.length === 0) {
      return res.json({ success: true, data: { allowed: true, reason: 'no_policies_default_allow', matchedPolicies: [] }, meta: { timestamp: new Date().toISOString() } });
    }
    for (const p of policies) {
      if (p.resource && resource && p.resource !== resource) continue;
      if (evaluateCondition(p.conditions, { ...context, corpId })) {
        return res.json({ success: true, data: { allowed: p.effect === 'allow', reason: p.effect, matchedPolicy: p.policyId, policyName: p.name }, meta: { timestamp: new Date().toISOString() } });
      }
    }
    res.json({ success: true, data: { allowed: true, reason: 'no_match_default_allow', matchedPolicies: [] }, meta: { timestamp: new Date().toISOString() } });
  } catch (e) { next(e); }
});

async function start() {
  try { await mongoose.connect(MONGODB_URI); console.log(`[policyos] MongoDB connected`); }
  catch (err) { console.error(`[policyos] MongoDB failed:`, err.message); setTimeout(start, 5000); return; }
  if (process.env.NODE_ENV !== 'test' && !process.env.SUPPRESS_LISTEN) {
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});


    const server = app.listen(PORT, () => console.log(`[policyos] listening on :${PORT}`));
    installGracefulShutdown(server);
  }
}
start();
export { app };
