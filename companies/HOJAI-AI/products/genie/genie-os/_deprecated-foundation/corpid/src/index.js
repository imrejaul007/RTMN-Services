import express from 'express';
import { requireEnv } from '@rtmn/shared/lib/env';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { z } from 'zod';
import crypto from 'crypto';

const PORT = parseInt(process.env.CORPID_PORT || '7001', 10);
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai';
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;

const app = express();

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '1mb' }));

// ============================================================================
// MIDDLEWARE
// ============================================================================

function requireInternal(req, res, next) {
  const token = req.headers['x-internal-token'];
  if (token !== INTERNAL_TOKEN) {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid internal token' } });
  }
  next();
}

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function sendSuccess(res, status, data) {
  res.status(status).json({ success: true, data, meta: { timestamp: new Date().toISOString() } });
}

function sendError(res, status, code, message, details) {
  res.status(status).json({ success: false, error: { code, message, details }, meta: { timestamp: new Date().toISOString() } });
}

// ============================================================================
// MODELS
// ============================================================================

const CorpIdSchema = new mongoose.Schema({
  corpId: { type: String, required: true, unique: true, index: true },
  type: { type: String, enum: ['user', 'agent', 'merchant', 'organization', 'service'], required: true },
  name: { type: String, required: true },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  verified: { type: Boolean, default: false },
  status: { type: String, enum: ['active', 'suspended', 'deleted'], default: 'active' },
}, { timestamps: true });

const CorpId = mongoose.model('CorpId', CorpIdSchema);

// ============================================================================
// SCHEMAS
// ============================================================================

const issueSchema = z.object({
  type: z.enum(['user', 'agent', 'merchant', 'organization', 'service']),
  name: z.string().min(1).max(200),
  metadata: z.record(z.unknown()).optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  metadata: z.record(z.unknown()).optional(),
  verified: z.boolean().optional(),
  status: z.enum(['active', 'suspended', 'deleted']).optional(),
});

// ============================================================================
// HELPERS
// ============================================================================

function generateCorpId(type) {
  const prefix = { user: 'USR', agent: 'AGT', merchant: 'MRC', organization: 'ORG', service: 'SVC' }[type] || 'ID';
  const ts = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `${prefix}-${ts}${rand}`;
}

// ============================================================================
// ROUTES
// ============================================================================

app.get('/health', (req, res) => {
  sendSuccess(res, 200, { service: 'corpid', status: 'healthy', version: '1.0.0', uptime: Math.round(process.uptime()) });
});

app.post('/api/identity/issue', requireInternal, asyncHandler(async (req, res) => {
  const data = issueSchema.parse(req.body);
  const corpId = generateCorpId(data.type);
  const record = await CorpId.create({ corpId, type: data.type, name: data.name, metadata: data.metadata || {} });
  sendSuccess(res, 201, { corpId: record.corpId, type: record.type, name: record.name, verified: record.verified, createdAt: record.createdAt });
}));

app.get('/api/identity/:corpId', requireInternal, asyncHandler(async (req, res) => {
  const record = await CorpId.findOne({ corpId: req.params.corpId });
  if (!record) return sendError(res, 404, 'NOT_FOUND', `CorpId ${req.params.corpId} not found`);
  sendSuccess(res, 200, { corpId: record.corpId, type: record.type, name: record.name, metadata: record.metadata, verified: record.verified, status: record.status });
}));

app.patch('/api/identity/:corpId', requireInternal, asyncHandler(async (req, res) => {
  const data = updateSchema.parse(req.body);
  const record = await CorpId.findOneAndUpdate({ corpId: req.params.corpId }, { $set: data }, { new: true });
  if (!record) return sendError(res, 404, 'NOT_FOUND', `CorpId ${req.params.corpId} not found`);
  sendSuccess(res, 200, { corpId: record.corpId, type: record.type, name: record.name, metadata: record.metadata, verified: record.verified, status: record.status });
}));

app.get('/api/identity', requireInternal, asyncHandler(async (req, res) => {
  const { type, status = 'active', limit = 50, skip = 0 } = req.query;
  const filter = { status };
  if (type) filter.type = type;
  const records = await CorpId.find(filter).limit(parseInt(limit)).skip(parseInt(skip)).sort({ createdAt: -1 });
  sendSuccess(res, 200, { count: records.length, items: records.map(r => ({ corpId: r.corpId, type: r.type, name: r.name, verified: r.verified })) });
}));

// ============================================================================
// STARTUP
// ============================================================================

async function start() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log(`[corpid] MongoDB connected`);
  } catch (err) {
    console.error(`[corpid] MongoDB connection failed, retrying in 5s:`, err.message);
    setTimeout(start, 5000);
    return;
  }
  if (process.env.NODE_ENV !== 'test' && !process.env.SUPPRESS_LISTEN) {
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});


    const server = app.listen(PORT, () => console.log(`[corpid] listening on :${PORT}`));
    installGracefulShutdown(server);
  }
}

start();

export { app };
