/**
 * HOJAI Self-Learning Service
 * Real-time learning from interactions
 * Port: 4881
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';

const PORT = parseInt(process.env.PORT || '4881', 10);
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret';

const app = express();
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: "10kb" }));

// Interaction patterns
const PatternSchema = new mongoose.Schema({
  patternId: String,
  tenantId: String,
  aiId: String,
  trigger: String,
  response: String,
  outcome: String,
  confidence: Number,
  usageCount: Number,
  successRate: Number,
  createdAt: Date
}, { timestamps: true });

// Corrections
const CorrectionSchema = new mongoose.Schema({
  correctionId: String,
  tenantId: String,
  aiId: String,
  original: String,
  corrected: String,
  context: mongoose.Schema.Types.Mixed,
  createdAt: Date
}, { timestamps: true });

// Memory
const MemorySchema = new mongoose.Schema({
  memoryId: String,
  tenantId: String,
  aiId: String,
  type: String,
  content: String,
  confidence: Number,
  source: String,
  lastUsed: Date,
  createdAt: Date
}, { timestamps: true });

const Pattern = mongoose.model('Pattern', PatternSchema);
const Correction = mongoose.model('Correction', CorrectionSchema);
const Memory = mongoose.model('Memory', MemorySchema);

async function auth(req: Request, res: Response, next: Function) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'AUTH_REQUIRED' });
  try {
    const token = header.startsWith('Bearer ') ? header.slice(7) : header;
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    (req as any).tenantId = decoded.tenantId || decoded.tenant_id;
    next();
  } catch { res.status(401).json({ error: 'AUTH_INVALID' }); }
}

app.get('/health', (_, res) => res.json({ status: 'ok', service: 'self-learning' }));

// Record interaction
app.post('/api/interaction', auth, async (req: Request, res: Response) => {
  const { aiId, trigger, response, outcome } = req.body;
  const patternId = `pat_${uuid().slice(0, 8)}`;
  const pattern = new Pattern({
    patternId,
    tenantId: (req as any).tenantId,
    aiId,
    trigger,
    response,
    outcome,
    confidence: outcome === 'success' ? 0.9 : 0.3,
    usageCount: 1,
    successRate: outcome === 'success' ? 1 : 0
  });
  await pattern.save();
  res.json({ success: true, patternId });
});

// Record correction
app.post('/api/correction', auth, async (req: Request, res: Response) => {
  const { aiId, original, corrected, context } = req.body;
  const correctionId = `corr_${uuid().slice(0, 8)}`;
  const c = new Correction({
    correctionId,
    tenantId: (req as any).tenantId,
    aiId,
    original,
    corrected,
    context
  });
  await c.save();
  res.json({ success: true, correctionId });
});

// Update confidence
app.post('/api/feedback', auth, async (req: Request, res: Response) => {
  const { patternId, success } = req.body;
  const pattern = await Pattern.findOne({ patternId });
  if (!pattern) return res.status(404).json({ error: 'NOT_FOUND' });
  pattern.usageCount++;
  pattern.successRate = (pattern.successRate + (success ? 1 : 0)) / pattern.usageCount;
  pattern.confidence = pattern.successRate * 0.9 + 0.1;
  await pattern.save();
  res.json({ success: true, confidence: pattern.confidence });
});

// Get patterns
app.get('/api/patterns/:aiId', auth, async (req: Request, res: Response) => {
  const patterns = await Pattern.find({
    tenantId: (req as any).tenantId,
    aiId: req.params.aiId
  }).sort({ successRate: -1 });
  res.json({ success: true, data: patterns });
});

// Store memory
app.post('/api/memory', auth, async (req: Request, res: Response) => {
  const memoryId = `mem_${uuid().slice(0, 8)}`;
  const memory = new Memory({
    memoryId,
    tenantId: (req as any).tenantId,
    ...req.body
  });
  await memory.save();
  res.json({ success: true, memoryId });
});

// Get memory
app.get('/api/memory/:aiId', auth, async (req: Request, res: Response) => {
  const memories = await Memory.find({
    tenantId: (req as any).tenantId,
    aiId: req.params.aiId
  }).sort({ updatedAt: -1 });
  res.json({ success: true, data: memories });
});

async function start() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai-self-learning');
  app.listen(PORT, () => console.log(`Self-Learning running on ${PORT}`));
}

start();
export default app;
