import express from 'express';
import { requireEnv } from '@rtmn/shared/lib/env';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { z } from 'zod';

const PORT = parseInt(process.env.TWINOS_PORT || '7002', 10);
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai';
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;

const app = express();

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
app.use(helmet()); app.use(cors()); app.use(compression()); app.use(express.json({ limit: '2mb' }));

const requireInternal = (req, res, next) => {
  if (req.headers['x-internal-token'] !== INTERNAL_TOKEN) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });
  next();
};

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const sendSuccess = (res, status, data) => res.status(status).json({ success: true, data, meta: { timestamp: new Date().toISOString() } });
const sendError = (res, status, code, message) => res.status(status).json({ success: false, error: { code, message }, meta: { timestamp: new Date().toISOString() } });

const TwinSchema = new mongoose.Schema({
  twinId: { type: String, required: true, unique: true, index: true },
  corpId: { type: String, required: true, index: true },
  type: { type: String, enum: ['user', 'agent', 'merchant', 'organization', 'product', 'order'], required: true },
  name: { type: String, required: true },
  state: { type: mongoose.Schema.Types.Mixed, default: {} },
  traits: { type: mongoose.Schema.Types.Mixed, default: {} },
  relationships: [{ type: String }],
  version: { type: Number, default: 1 },
}, { timestamps: true });

const Twin = mongoose.model('Twin', TwinSchema);

const createSchema = z.object({
  corpId: z.string().min(1),
  type: z.enum(['user', 'agent', 'merchant', 'organization', 'product', 'order']),
  name: z.string().min(1).max(200),
  state: z.record(z.unknown()).optional(),
  traits: z.record(z.unknown()).optional(),
});

const updateSchema = z.object({
  state: z.record(z.unknown()).optional(),
  traits: z.record(z.unknown()).optional(),
  relationships: z.array(z.string()).optional(),
});

app.get('/health', (req, res) => sendSuccess(res, 200, { service: 'twinos', status: 'healthy', version: '1.0.0' }));

app.post('/api/twins', requireInternal, asyncHandler(async (req, res) => {
  const data = createSchema.parse(req.body);
  const twinId = `TWN-${Date.now().toString(36).toUpperCase()}`;
  const twin = await Twin.create({ ...data, twinId });
  sendSuccess(res, 201, { twinId: twin.twinId, corpId: twin.corpId, type: twin.type, name: twin.name, version: twin.version });
}));

app.get('/api/twins/:twinId', requireInternal, asyncHandler(async (req, res) => {
  const twin = await Twin.findOne({ twinId: req.params.twinId });
  if (!twin) return sendError(res, 404, 'NOT_FOUND', 'Twin not found');
  sendSuccess(res, 200, { twinId: twin.twinId, corpId: twin.corpId, type: twin.type, name: twin.name, state: twin.state, traits: twin.traits, relationships: twin.relationships, version: twin.version });
}));

app.get('/api/twins/by-corp/:corpId', requireInternal, asyncHandler(async (req, res) => {
  const twins = await Twin.find({ corpId: req.params.corpId });
  sendSuccess(res, 200, { count: twins.length, items: twins.map(t => ({ twinId: t.twinId, type: t.type, name: t.name, version: t.version })) });
}));

app.patch('/api/twins/:twinId', requireInternal, asyncHandler(async (req, res) => {
  const data = updateSchema.parse(req.body);
  const twin = await Twin.findOneAndUpdate({ twinId: req.params.twinId }, { $set: data, $inc: { version: 1 } }, { new: true });
  if (!twin) return sendError(res, 404, 'NOT_FOUND', 'Twin not found');
  sendSuccess(res, 200, { twinId: twin.twinId, version: twin.version, state: twin.state, traits: twin.traits });
}));

async function start() {
  try { await mongoose.connect(MONGODB_URI); console.log(`[twinos] MongoDB connected`); }
  catch (err) { console.error(`[twinos] MongoDB failed:`, err.message); setTimeout(start, 5000); return; }
  if (process.env.NODE_ENV !== 'test' && !process.env.SUPPRESS_LISTEN) {
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});


    const server = app.listen(PORT, () => console.log(`[twinos] listening on :${PORT}`));
    installGracefulShutdown(server);
  }
}
start();
export { app };
