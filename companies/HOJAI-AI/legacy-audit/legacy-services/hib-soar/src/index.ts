/**
 * HIB SOAR - Security Orchestration, Automation and Response
 * Port: 3054
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const VERSION = '1.0.0';

const app = express();
const PORT = parseInt(process.env.PORT || '3054', 10);

// Security
app.use(helmet());
const allowedOrigins = (process.env.CORS_ORIGIN || '').split(',').filter(Boolean);
app.use(cors({
  origin: allowedOrigins.length > 0 ? allowedOrigins : false,
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));

app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info({ method: req.method, path: req.path, status: res.statusCode, duration: Date.now() - start });
  });
  next();
});

// Database
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hib-soar';
mongoose.connect(MONGODB_URI)
  .then(() => logger.info('MongoDB connected'))
  .catch(err => logger.error({ err }, 'MongoDB connection failed'));

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Schemas
const PlaybookSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: () => uuidv4() },
  name: { type: String, required: true },
  description: String,
  trigger: { type: String, enum: ['manual', 'event', 'schedule'], default: 'manual' },
  steps: [{
    id: String,
    action: String,
    params: mongoose.Schema.Types.Mixed,
    condition: String,
    onFailure: { type: String, enum: ['stop', 'continue', 'retry'], default: 'stop' },
  }],
  enabled: { type: Boolean, default: true },
  tags: [String],
}, { timestamps: true });
const Playbook = mongoose.model('Playbook', PlaybookSchema);

const IncidentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: () => uuidv4() },
  title: { type: String, required: true },
  description: String,
  severity: { type: String, enum: ['critical', 'high', 'medium', 'low', 'info'], default: 'medium' },
  status: { type: String, enum: ['open', 'investigating', 'mitigated', 'resolved', 'closed'], default: 'open' },
  source: String,
  indicators: [String],
  assignee: String,
  timeline: [{
    timestamp: { type: Date, default: Date.now },
    action: String,
    actor: String,
  }],
}, { timestamps: true });
const Incident = mongoose.model('Incident', IncidentSchema);

const PlaybookRunSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: () => uuidv4() },
  playbookId: { type: String, required: true },
  incidentId: String,
  status: { type: String, enum: ['pending', 'running', 'completed', 'failed', 'cancelled'], default: 'pending' },
  startedAt: Date,
  completedAt: Date,
  steps: [{
    stepId: String,
    action: String,
    status: { type: String, enum: ['pending', 'running', 'completed', 'failed', 'skipped'] },
    output: mongoose.Schema.Types.Mixed,
  }],
}, { timestamps: true });
const PlaybookRun = mongoose.model('PlaybookRun', PlaybookRunSchema);

// Health
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', service: 'hib-soar', version: VERSION, uptime: process.uptime() });
});

app.get('/health/live', (req: Request, res: Response) => {
  res.json({ status: 'alive' });
});

app.get('/health/ready', async (req: Request, res: Response) => {
  try {
    const mongoStatus = mongoose.connection.readyState === 1;
    await redis.ping();
    res.json({ status: 'ready', mongo: mongoStatus, redis: true });
  } catch {
    res.status(503).json({ status: 'not ready' });
  }
});

// Metrics
app.get('/metrics', (req: Request, res: Response) => {
  res.set('Content-Type', 'text/plain');
  res.send('service_up 1\n');
});

// Playbook API
app.get('/api/playbooks', async (req: Request, res: Response) => {
  try {
    const { enabled, tag } = req.query;
    const filter: Record<string, unknown> = {};
    if (enabled !== undefined) filter.enabled = enabled === 'true';
    const playbooks = await Playbook.find(filter).lean();
    res.json({ count: playbooks.length, playbooks });
  } catch (error) {
    logger.error({ error }, 'Failed to list playbooks');
    res.status(500).json({ error: 'Failed to list playbooks' });
  }
});

app.get('/api/playbooks/:id', async (req: Request, res: Response) => {
  try {
    const playbook = await Playbook.findOne({ id: req.params.id }).lean();
    if (!playbook) return res.status(404).json({ error: 'Playbook not found' });
    res.json(playbook);
  } catch (error) {
    logger.error({ error }, 'Failed to get playbook');
    res.status(500).json({ error: 'Failed to get playbook' });
  }
});

app.post('/api/playbooks', async (req: Request, res: Response) => {
  try {
    const { name, description, trigger, steps, enabled, tags } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const playbook = new Playbook({
      id: uuidv4(),
      name,
      description,
      trigger: trigger || 'manual',
      steps: steps || [],
      enabled: enabled !== false,
      tags: tags || [],
    });
    await playbook.save();
    res.status(201).json(playbook.toObject());
  } catch (error) {
    logger.error({ error }, 'Failed to create playbook');
    res.status(500).json({ error: 'Failed to create playbook' });
  }
});

app.put('/api/playbooks/:id', async (req: Request, res: Response) => {
  try {
    const playbook = await Playbook.findOneAndUpdate({ id: req.params.id }, req.body, { new: true }).lean();
    if (!playbook) return res.status(404).json({ error: 'Playbook not found' });
    res.json(playbook);
  } catch (error) {
    logger.error({ error }, 'Failed to update playbook');
    res.status(500).json({ error: 'Failed to update playbook' });
  }
});

app.delete('/api/playbooks/:id', async (req: Request, res: Response) => {
  try {
    const playbook = await Playbook.findOneAndDelete({ id: req.params.id });
    if (!playbook) return res.status(404).json({ error: 'Playbook not found' });
    res.json({ deleted: true });
  } catch (error) {
    logger.error({ error }, 'Failed to delete playbook');
    res.status(500).json({ error: 'Failed to delete playbook' });
  }
});

// Execute playbook
app.post('/api/playbooks/:id/execute', async (req: Request, res: Response) => {
  try {
    const { incidentId, params } = req.body;
    const playbook = await Playbook.findOne({ id: req.params.id }).lean();
    if (!playbook) return res.status(404).json({ error: 'Playbook not found' });
    if (!playbook.enabled) return res.status(400).json({ error: 'Playbook is disabled' });

    const runId = uuidv4();
    const run = new PlaybookRun({
      id: runId,
      playbookId: playbook.id,
      incidentId,
      status: 'running',
      startedAt: new Date(),
      steps: playbook.steps.map((s, i) => ({ stepId: s.id || `step_${i}`, action: s.action, status: 'pending' })),
    });
    await run.save();

    if (incidentId) {
      await Incident.findOneAndUpdate({ id: incidentId }, { playbookId: playbook.id, playbookRunId: runId });
    }

    // Execute steps async
    executeStepsAsync(runId, playbook.steps);

    logger.info({ runId, playbookId: playbook.id, incidentId }, 'Playbook execution started');
    res.json({ runId, playbookId: playbook.id, status: 'running', steps: playbook.steps.length });
  } catch (error) {
    logger.error({ error }, 'Failed to execute playbook');
    res.status(500).json({ error: 'Failed to execute playbook' });
  }
});

// Execute steps helper
async function executeStepsAsync(runId: string, steps: any[]) {
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    await PlaybookRun.findOneAndUpdate({ id: runId }, { currentStep: i });
    await PlaybookRun.findOneAndUpdate({ id: runId, 'steps.stepId': step.id || `step_${i}` }, {
      'steps.$.status': 'running',
      'steps.$.startedAt': new Date(),
    });

    try {
      const output = { executed: true, action: step.action };
      await PlaybookRun.findOneAndUpdate({ id: runId, 'steps.stepId': step.id || `step_${i}` }, {
        'steps.$.status': 'completed',
        'steps.$.completedAt': new Date(),
        'steps.$.output': output,
      });
      logger.info({ runId, stepId: step.id, action: step.action }, 'Step completed');
    } catch (stepError: any) {
      logger.error({ runId, stepId: step.id, error: stepError }, 'Step failed');
      const shouldStop = step.onFailure === 'stop';
      await PlaybookRun.findOneAndUpdate({ id: runId, 'steps.stepId': step.id || `step_${i}` }, {
        'steps.$.status': 'failed',
        'steps.$.completedAt': new Date(),
        'steps.$.output': { error: stepError.message },
      });
      if (shouldStop) {
        await PlaybookRun.findOneAndUpdate({ id: runId }, { status: 'failed', completedAt: new Date() });
        return;
      }
    }
  }
  await PlaybookRun.findOneAndUpdate({ id: runId }, { status: 'completed', completedAt: new Date() });
  logger.info({ runId }, 'Playbook execution completed');
}

// Run API
app.get('/api/runs/:id', async (req: Request, res: Response) => {
  try {
    const run = await PlaybookRun.findOne({ id: req.params.id }).lean();
    if (!run) return res.status(404).json({ error: 'Run not found' });
    res.json(run);
  } catch (error) {
    logger.error({ error }, 'Failed to get run');
    res.status(500).json({ error: 'Failed to get run' });
  }
});

app.post('/api/runs/:id/cancel', async (req: Request, res: Response) => {
  try {
    const run = await PlaybookRun.findOneAndUpdate(
      { id: req.params.id, status: { $in: ['pending', 'running'] } },
      { status: 'cancelled', completedAt: new Date() },
      { new: true }
    ).lean();
    if (!run) return res.status(404).json({ error: 'Run not found or already completed' });
    res.json({ cancelled: true, run });
  } catch (error) {
    logger.error({ error }, 'Failed to cancel run');
    res.status(500).json({ error: 'Failed to cancel run' });
  }
});

// Incident API
app.get('/api/incidents', async (req: Request, res: Response) => {
  try {
    const { status, severity, limit = 100 } = req.query;
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (severity) filter.severity = severity;
    const incidents = await Incident.find(filter).sort({ createdAt: -1 }).limit(Number(limit)).lean();
    res.json({ count: incidents.length, incidents });
  } catch (error) {
    logger.error({ error }, 'Failed to list incidents');
    res.status(500).json({ error: 'Failed to list incidents' });
  }
});

app.get('/api/incidents/:id', async (req: Request, res: Response) => {
  try {
    const incident = await Incident.findOne({ id: req.params.id }).lean();
    if (!incident) return res.status(404).json({ error: 'Incident not found' });
    res.json(incident);
  } catch (error) {
    logger.error({ error }, 'Failed to get incident');
    res.status(500).json({ error: 'Failed to get incident' });
  }
});

app.post('/api/incidents', async (req: Request, res: Response) => {
  try {
    const { title, description, severity, source, assignee } = req.body;
    if (!title) return res.status(400).json({ error: 'title is required' });
    const incident = new Incident({
      id: uuidv4(),
      title,
      description,
      severity: severity || 'medium',
      source,
      assignee,
      timeline: [{ timestamp: new Date(), action: 'created', actor: 'system' }],
    });
    await incident.save();
    logger.info({ incidentId: incident.id, severity: incident.severity }, 'Incident created');
    res.status(201).json(incident.toObject());
  } catch (error) {
    logger.error({ error }, 'Failed to create incident');
    res.status(500).json({ error: 'Failed to create incident' });
  }
});

app.put('/api/incidents/:id', async (req: Request, res: Response) => {
  try {
    const { status, assignee, ...updates } = req.body;
    const incident = await Incident.findOneAndUpdate(
      { id: req.params.id },
      {
        ...updates,
        ...(status && { status }),
        ...(assignee && { assignee }),
        ...(status && { $push: { timeline: { timestamp: new Date(), action: `status_changed_to_${status}`, actor: 'system' } } }),
      },
      { new: true }
    ).lean();
    if (!incident) return res.status(404).json({ error: 'Incident not found' });
    res.json(incident);
  } catch (error) {
    logger.error({ error }, 'Failed to update incident');
    res.status(500).json({ error: 'Failed to update incident' });
  }
});

// Stats
app.get('/api/stats', async (req: Request, res: Response) => {
  try {
    const incidentStats = await Incident.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]);
    const playbookStats = await Playbook.aggregate([{ $group: { _id: "$enabled", count: { $sum: 1 } } }]);
    const runStats = await PlaybookRun.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]);
    res.json({ incidents: incidentStats, playbooks: playbookStats, runs: runStats });
  } catch (error) {
    logger.error({ error }, 'Failed to get stats');
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  logger.info(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   🛡️ HIB SOAR (${PORT})                               ║
║   Security Orchestration, Automation & Response          ║
║                                                       ║
║   Endpoints:                                         ║
║   GET  /health                                      ║
║   GET  /api/playbooks                               ║
║   POST /api/playbooks                               ║
║   POST /api/playbooks/:id/execute                   ║
║   GET  /api/incidents                              ║
║   POST /api/incidents                               ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
  `);
});

export default app;
