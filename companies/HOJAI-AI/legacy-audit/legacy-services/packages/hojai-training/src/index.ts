/**
 * HOJAI Training Service
 * Training pipeline for AI models
 *
 * Port: 4880
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';

const PORT = parseInt(process.env.PORT || '4880', 10);
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

// Training Types
const TRAINING_TYPES = {
  EMPLOYEE: 'employee',
  MODEL: 'model',
  AGENT: 'agent',
  WORKFLOW: 'workflow'
} as const;

const TRAINING_STATUS = {
  PENDING: 'pending',
  TRAINING: 'training',
  VALIDATING: 'validating',
  COMPLETED: 'completed',
  FAILED: 'failed'
} as const;

// Models
const TrainingJobSchema = new mongoose.Schema({
  jobId: String,
  tenantId: String,
  type: String,
  targetId: String,
  targetName: String,
  status: String,
  config: mongoose.Schema.Types.Mixed,
  metrics: {
    samples: Number,
    accuracy: Number,
    loss: Number,
    epochs: Number
  },
  results: mongoose.Schema.Types.Mixed,
  startedAt: Date,
  completedAt: Date
}, { timestamps: true });

const DataSourceSchema = new mongoose.Schema({
  sourceId: String,
  tenantId: String,
  name: String,
  type: String,
  connection: mongoose.Schema.Types.Mixed
}, { timestamps: true });

const TrainingJob = mongoose.model('TrainingJob', TrainingJobSchema);
const DataSource = mongoose.model('DataSource', DataSourceSchema);

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

app.get('/health', (_, res) => res.json({ status: 'ok', service: 'training' }));

// Data Sources
app.post('/api/sources', auth, async (req: Request, res: Response) => {
  const sourceId = `src_${uuid().slice(0, 8)}`;
  const source = new DataSource({
    sourceId, tenantId: (req as any).tenantId, ...req.body
  });
  await source.save();
  res.status(201).json({ success: true, data: source });
});

app.get('/api/sources', auth, async (req: Request, res: Response) => {
  const sources = await DataSource.find({ tenantId: (req as any).tenantId });
  res.json({ success: true, data: sources });
});

// Training Jobs
app.post('/api/jobs', auth, async (req: Request, res: Response) => {
  const jobId = `job_${uuid().slice(0, 8)}`;
  const job = new TrainingJob({
    jobId, tenantId: (req as any).tenantId, status: TRAINING_STATUS.PENDING, ...req.body
  });
  await job.save();
  simulateTraining(jobId);
  res.status(201).json({ success: true, data: { jobId, status: 'pending' } });
});

app.get('/api/jobs', auth, async (req: Request, res: Response) => {
  const jobs = await TrainingJob.find({ tenantId: (req as any).tenantId })
    .sort({ createdAt: -1 });
  res.json({ success: true, data: jobs });
});

app.get('/api/jobs/:id', auth, async (req: Request, res: Response) => {
  const job = await TrainingJob.findOne({
    jobId: req.params.id, tenantId: (req as any).tenantId
  });
  if (!job) return res.status(404).json({ error: 'NOT_FOUND' });
  res.json({ success: true, data: job });
});

// Train AI Employee
app.post('/api/train/employee/:id', auth, async (req: Request, res: Response) => {
  const jobId = `job_${uuid().slice(0, 8)}`;
  const job = new TrainingJob({
    jobId, tenantId: (req as any).tenantId,
    type: TRAINING_TYPES.EMPLOYEE, targetId: req.params.id,
    status: TRAINING_STATUS.PENDING, ...req.body
  });
  await job.save();
  simulateTraining(jobId);
  res.status(201).json({ success: true, data: { jobId } });
});

// Train Model
app.post('/api/train/model/:name', auth, async (req: Request, res: Response) => {
  const jobId = `job_${uuid().slice(0, 8)}`;
  const job = new TrainingJob({
    jobId, tenantId: (req as any).tenantId,
    type: TRAINING_TYPES.MODEL, targetId: req.params.name,
    status: TRAINING_STATUS.PENDING, ...req.body
  });
  await job.save();
  simulateTraining(jobId);
  res.status(201).json({ success: true, data: { jobId } });
});

// Batch training
app.post('/api/train/batch', auth, async (req: Request, res: Response) => {
  const { items } = req.body;
  const jobs = [];
  for (const item of items) {
    const jobId = `job_${uuid().slice(0, 8)}`;
    const job = new TrainingJob({
      jobId, tenantId: (req as any).tenantId,
      type: item.type || TRAINING_TYPES.MODEL,
      targetId: item.id, targetName: item.name,
      status: TRAINING_STATUS.PENDING, ...item.config
    });
    await job.save();
    jobs.push({ jobId });
    simulateTraining(jobId);
  }
  res.status(201).json({ success: true, data: { jobs: jobs.length } });
});

// Transfer learning
app.post('/api/train/transfer', auth, async (req: Request, res: Response) => {
  const { sourceModel, targetType, config } = req.body;
  const jobId = `job_${uuid().slice(0, 8)}`;
  const job = new TrainingJob({
    jobId, tenantId: (req as any).tenantId,
    type: TRAINING_TYPES.MODEL, targetId: sourceModel,
    targetName: `Transfer from ${sourceModel}`,
    config: { transferLearning: true, sourceModel, targetType, ...config },
    status: TRAINING_STATUS.PENDING
  });
  await job.save();
  simulateTraining(jobId);
  res.status(201).json({ success: true, data: { jobId } });
});

// Simulate training
async function simulateTraining(jobId: string) {
  const job = await TrainingJob.findOne({ jobId });
  if (!job) return;

  job.status = TRAINING_STATUS.TRAINING;
  job.startedAt = new Date();
  await job.save();

  for (let epoch = 1; epoch <= 10; epoch++) {
    await new Promise(r => setTimeout(r, 500));
    job.metrics = {
      samples: epoch * 1000,
      accuracy: 0.7 + epoch * 0.025,
      loss: 1.5 - epoch * 0.12,
      epochs: epoch
    };
    await job.save();
  }

  job.status = TRAINING_STATUS.VALIDATING;
  await job.save();
  await new Promise(r => setTimeout(r, 1000));

  job.status = TRAINING_STATUS.COMPLETED;
  job.completedAt = new Date();
  job.results = { finalAccuracy: 0.95, trainingTime: '5s' };
  await job.save();
}

// Analytics
app.get('/api/analytics/training', auth, async (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId;
  const [total, completed, failed] = await Promise.all([
    TrainingJob.countDocuments({ tenantId }),
    TrainingJob.countDocuments({ tenantId, status: TRAINING_STATUS.COMPLETED }),
    TrainingJob.countDocuments({ tenantId, status: TRAINING_STATUS.FAILED })
  ]);
  res.json({ success: true, data: { total, completed, failed } });
});

async function start() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai-training');
  app.listen(PORT, () => console.log(`Training Service on port ${PORT}`));
}

start();
export default app;
