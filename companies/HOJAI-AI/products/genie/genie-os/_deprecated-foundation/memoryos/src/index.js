import express from 'express';
import { requireEnv } from '@rtmn/shared/lib/env';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { z } from 'zod';

const PORT = parseInt(process.env.MEMORYOS_PORT || '7003', 10);
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
app.use(helmet()); app.use(cors()); app.use(compression()); app.use(express.json({ limit: '2mb' }));

const requireInternal = (req, res, next) => { if (req.headers['x-internal-token'] !== INTERNAL_TOKEN) return res.status(401).json({ success: false }); next(); };
const send = (res, s, d) => res.status(s).json({ success: true, data: d, meta: { timestamp: new Date().toISOString() } });

const MemorySchema = new mongoose.Schema({
  memoryId: { type: String, required: true, unique: true, index: true },
  corpId: { type: String, required: true, index: true },
  scope: { type: String, enum: ['short_term', 'long_term', 'episodic', 'semantic'], default: 'long_term' },
  type: { type: String, required: true },
  content: { type: String, required: true },
  tags: [String],
  importance: { type: Number, default: 0.5, min: 0, max: 1 },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  expiresAt: Date,
}, { timestamps: true });
MemorySchema.index({ corpId: 1, type: 1, createdAt: -1 });
const Memory = mongoose.model('Memory', MemorySchema);

const createSchema = z.object({
  corpId: z.string().min(1),
  type: z.string().min(1).max(50),
  content: z.string().min(1),
  scope: z.enum(['short_term', 'long_term', 'episodic', 'semantic']).optional(),
  tags: z.array(z.string()).optional(),
  importance: z.number().min(0).max(1).optional(),
  metadata: z.record(z.unknown()).optional(),
  ttl: z.number().int().positive().optional(),
});

app.get('/health', (req, res) => send(res, 200, { service: 'memoryos', status: 'healthy' }));
app.post('/api/memory', requireInternal, async (req, res, next) => {
  try {
    const data = createSchema.parse(req.body);
    const memoryId = `MEM-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const expiresAt = data.ttl ? new Date(Date.now() + data.ttl * 1000) : undefined;
    const mem = await Memory.create({ ...data, memoryId, expiresAt });
    res.status(201).json({ success: true, data: { memoryId, corpId: mem.corpId, type: mem.type, createdAt: mem.createdAt }, meta: { timestamp: new Date().toISOString() } });
  } catch (e) { next(e); }
});
app.get('/api/memory/:corpId', requireInternal, async (req, res, next) => {
  try {
    const { type, scope, limit = 50, tags } = req.query;
    const filter = { corpId: req.params.corpId };
    if (type) filter.type = type;
    if (scope) filter.scope = scope;
    if (tags) filter.tags = { $in: tags.split(',') };
    const items = await Memory.find(filter).sort({ importance: -1, createdAt: -1 }).limit(parseInt(limit));
    res.json({ success: true, data: { count: items.length, items: items.map(m => ({ memoryId: m.memoryId, type: m.type, content: m.content, tags: m.tags, importance: m.importance, scope: m.scope, createdAt: m.createdAt })) }, meta: { timestamp: new Date().toISOString() } });
  } catch (e) { next(e); }
});
app.get('/api/memory/:corpId/search', requireInternal, async (req, res, next) => {
  try {
    const { q, limit = 20 } = req.query;
    if (!q) return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'q required' } });
    const items = await Memory.find({ corpId: req.params.corpId, content: { $regex: q, $options: 'i' } }).limit(parseInt(limit));
    res.json({ success: true, data: { count: items.length, items: items.map(m => ({ memoryId: m.memoryId, content: m.content, type: m.type, importance: m.importance })) }, meta: { timestamp: new Date().toISOString() } });
  } catch (e) { next(e); }
});
app.delete('/api/memory/:memoryId', requireInternal, async (req, res, next) => {
  try {
    const r = await Memory.deleteOne({ memoryId: req.params.memoryId });
    res.json({ success: true, data: { deleted: r.deletedCount }, meta: { timestamp: new Date().toISOString() } });
  } catch (e) { next(e); }
});

async function start() {
  try { await mongoose.connect(MONGODB_URI); console.log(`[memoryos] MongoDB connected`); }
  catch (err) { console.error(`[memoryos] MongoDB failed:`, err.message); setTimeout(start, 5000); return; }
  if (process.env.NODE_ENV !== 'test' && !process.env.SUPPRESS_LISTEN) {
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});


    const server = app.listen(PORT, () => console.log(`[memoryos] listening on :${PORT}`));
    installGracefulShutdown(server);
  }
}
start();
export { app };
