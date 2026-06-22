import express from 'express';
import { requireEnv } from '@rtmn/shared/lib/env';
import { requireAuth } from '@rtmn/shared/auth';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { z } from 'zod';

const PORT = parseInt(process.env.GOALOS_PORT || '7004', 10);
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai';
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;

const app = express();

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
app.use(helmet()); app.use(cors()); app.use(compression()); app.use(express.json({ limit: '1mb' }));
const reqI = (req, res, next) => { if (req.headers['x-internal-token'] !== INTERNAL_TOKEN) return res.status(401).json({ success: false }); next(); };
const send = (res, s, d) => res.status(s).json({ success: true, data: d, meta: { timestamp: new Date().toISOString() } });

const GoalSchema = new mongoose.Schema({
  goalId: { type: String, required: true, unique: true, index: true },
  corpId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  description: String,
  category: { type: String, enum: ['personal', 'business', 'health', 'finance', 'shopping'], required: true },
  priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  status: { type: String, enum: ['active', 'in_progress', 'achieved', 'failed', 'archived'], default: 'active' },
  progress: { type: Number, default: 0, min: 0, max: 100 },
  milestones: [{ title: String, completed: Boolean, completedAt: Date }],
  targetValue: Number,
  currentValue: { type: Number, default: 0 },
  unit: String,
  dueDate: Date,
}, { timestamps: true });
const Goal = mongoose.model('Goal', GoalSchema);

const createSchema = z.object({
  corpId: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  category: z.enum(['personal', 'business', 'health', 'finance', 'shopping']),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  targetValue: z.number().optional(),
  unit: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  milestones: z.array(z.object({ title: z.string() })).optional(),
});

const progressSchema = z.object({ progress: z.number().min(0).max(100), currentValue: z.number().optional() });

app.get('/health', (req, res) => send(res, 200, { service: 'goalos', status: 'healthy' }));
app.post('/api/goals',requireAuth,  reqI, async (req, res, next) => {
  try {
    const data = createSchema.parse(req.body);
    const goalId = `GOAL-${Date.now().toString(36).toUpperCase()}`;
    const goal = await Goal.create({
      ...data, goalId,
      milestones: (data.milestones || []).map(m => ({ title: m.title, completed: false })),
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    });
    res.status(201).json({ success: true, data: { goalId, title: goal.title, category: goal.category, status: goal.status, progress: goal.progress }, meta: { timestamp: new Date().toISOString() } });
  } catch (e) { next(e); }
});
app.get('/api/goals/:corpId', reqI, async (req, res, next) => {
  try {
    const { status, category } = req.query;
    const filter = { corpId: req.params.corpId };
    if (status) filter.status = status;
    if (category) filter.category = category;
    const items = await Goal.find(filter).sort({ priority: -1, dueDate: 1 });
    res.json({ success: true, data: { count: items.length, items: items.map(g => ({ goalId: g.goalId, title: g.title, category: g.category, priority: g.priority, status: g.status, progress: g.progress, currentValue: g.currentValue, targetValue: g.targetValue, unit: g.unit, dueDate: g.dueDate })) }, meta: { timestamp: new Date().toISOString() } });
  } catch (e) { next(e); }
});
app.patch('/api/goals/:goalId/progress',requireAuth,  reqI, async (req, res, next) => {
  try {
    const { progress, currentValue } = progressSchema.parse(req.body);
    const update = { progress };
    if (currentValue !== undefined) update.currentValue = currentValue;
    if (progress >= 100) update.status = 'achieved';
    else if (progress > 0) update.status = 'in_progress';
    const goal = await Goal.findOneAndUpdate({ goalId: req.params.goalId }, { $set: update }, { new: true });
    if (!goal) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
    res.json({ success: true, data: { goalId: goal.goalId, progress: goal.progress, status: goal.status, currentValue: goal.currentValue }, meta: { timestamp: new Date().toISOString() } });
  } catch (e) { next(e); }
});

async function start() {
  try { await mongoose.connect(MONGODB_URI); console.log(`[goalos] MongoDB connected`); }
  catch (err) { console.error(`[goalos] MongoDB failed:`, err.message); setTimeout(start, 5000); return; }
  if (process.env.NODE_ENV !== 'test' && !process.env.SUPPRESS_LISTEN) {
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});


    const server = app.listen(PORT, () => console.log(`[goalos] listening on :${PORT}`));
    installGracefulShutdown(server);
  }
}
start();
export { app };
