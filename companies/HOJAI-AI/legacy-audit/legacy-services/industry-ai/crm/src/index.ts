/**
 * CRM Service - Customer Relationship Management
 * Port: 4700
 *
 * Full-featured CRM with:
 * - Customer management
 * - Lead tracking
 * - Deal management
 * - Activity tracking
 * - Task management
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';
import * as fs from 'fs';
import * as path from 'path';

// ============================================
// VERSION
// ============================================

function getPackageVersion(): string {
  try {
    const packagePath = path.join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
    return packageJson.version || '1.0.0';
  } catch {
    return '1.0.0';
  }
}

const VERSION = getPackageVersion();

// ============================================
// LOGGING
// ============================================

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
});

// ============================================
// EXPRESS APP
// ============================================

const app = express();
const PORT = parseInt(process.env.PORT || '4700', 10);

// Security
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  credentials: true,
}));
app.use(express.json({ limit: '10kb' }));

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: Date.now() - start,
    });
  });
  next();
});

// ============================================
// DATABASE
// ============================================

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/crm';
mongoose.connect(MONGODB_URI)
  .then(() => logger.info('MongoDB connected'))
  .catch(err => logger.error({ err }, 'MongoDB connection failed'));

// ============================================
// MONGOOSE SCHEMAS
// ============================================

// Customer Schema
const CustomerSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: () => uuidv4() },
  name: { type: String, required: true },
  email: String,
  phone: String,
  company: String,
  status: { type: String, enum: ['active', 'inactive', 'lead', 'churned'], default: 'lead' },
  tags: [String],
  notes: String,
  source: String,
  ownerId: String,
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });
CustomerSchema.index({ email: 1 });
CustomerSchema.index({ status: 1 });
CustomerSchema.index({ ownerId: 1 });
const CustomerModel = mongoose.model('Customer', CustomerSchema);

// Lead Schema
const LeadSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: () => uuidv4() },
  customerId: { type: String, required: true, index: true },
  status: { type: String, enum: ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'], default: 'new' },
  value: Number,
  probability: { type: Number, default: 0 },
  expectedCloseDate: Date,
  notes: [{
    id: String,
    text: String,
    author: String,
    createdAt: { type: Date, default: Date.now },
  }],
}, { timestamps: true });
LeadSchema.index({ status: 1 });
const LeadModel = mongoose.model('Lead', LeadSchema);

// Deal Schema
const DealSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: () => uuidv4() },
  customerId: String,
  leadId: String,
  title: { type: String, required: true },
  value: { type: Number, default: 0 },
  status: { type: String, enum: ['open', 'won', 'lost'], default: 'open' },
  stage: { type: String, default: 'qualification' },
  probability: { type: Number, default: 10 },
  expectedCloseDate: Date,
  actualCloseDate: Date,
  ownerId: { type: String, required: true },
  notes: String,
}, { timestamps: true });
DealSchema.index({ status: 1 });
DealSchema.index({ ownerId: 1 });
DealSchema.index({ value: -1 });
const DealModel = mongoose.model('Deal', DealSchema);

// Activity Schema
const ActivitySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: () => uuidv4() },
  type: { type: String, enum: ['call', 'email', 'meeting', 'note', 'task', 'other'], required: true },
  customerId: String,
  dealId: String,
  subject: { type: String, required: true },
  description: String,
  duration: Number,
  outcome: String,
  scheduledAt: Date,
  completedAt: Date,
  ownerId: { type: String, required: true },
}, { timestamps: true });
ActivitySchema.index({ customerId: 1 });
ActivitySchema.index({ dealId: 1 });
ActivitySchema.index({ ownerId: 1 });
const ActivityModel = mongoose.model('Activity', ActivitySchema);

// Task Schema
const TaskSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: () => uuidv4() },
  title: { type: String, required: true },
  description: String,
  customerId: String,
  dealId: String,
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  status: { type: String, enum: ['pending', 'in_progress', 'completed', 'cancelled'], default: 'pending' },
  dueDate: Date,
  assigneeId: { type: String, required: true },
  createdById: { type: String, required: true },
  completedAt: Date,
}, { timestamps: true });
TaskSchema.index({ assigneeId: 1 });
TaskSchema.index({ status: 1 });
TaskSchema.index({ dueDate: 1 });
const TaskModel = mongoose.model('Task', TaskSchema);

// ============================================
// HEALTH ENDPOINTS
// ============================================

app.get('/health', (req: Request, res: Response) => {
  const memUsage = process.memoryUsage();
  res.json({
    status: 'healthy',
    service: 'crm-service',
    version: VERSION,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    memory: {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
    },
  });
});

app.get('/health/live', (req: Request, res: Response) => {
  res.json({ status: 'alive' });
});

app.get('/health/ready', async (req: Request, res: Response) => {
  try {
    const mongoStatus = mongoose.connection.readyState === 1;
    if (mongoStatus) {
      res.json({ status: 'ready', mongo: mongoStatus });
    } else {
      res.status(503).json({ status: 'not ready', mongo: mongoStatus });
    }
  } catch (error) {
    res.status(503).json({ status: 'not ready', error: String(error) });
  }
});

// ============================================
// CUSTOMER API
// ============================================

// List customers
app.get('/api/customers', async (req: Request, res: Response) => {
  try {
    const { status, ownerId, search, limit = 100 } = req.query;

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (ownerId) filter.ownerId = ownerId;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
      ];
    }

    const customers = await CustomerModel.find(filter)
      .sort({ updatedAt: -1 })
      .limit(Number(limit))
      .lean();

    res.json({ count: customers.length, customers });
  } catch (error) {
    logger.error({ error }, 'Failed to list customers');
    res.status(500).json({ error: 'Failed to list customers' });
  }
});

// Get customer
app.get('/api/customers/:id', async (req: Request, res: Response) => {
  try {
    const customer = await CustomerModel.findOne({ id: req.params.id }).lean();

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Get related data
    const [leads, deals, activities, tasks] = await Promise.all([
      LeadModel.find({ customerId: customer.id }).lean(),
      DealModel.find({ customerId: customer.id }).lean(),
      ActivityModel.find({ customerId: customer.id }).sort({ createdAt: -1 }).limit(50).lean(),
      TaskModel.find({ customerId: customer.id }).lean(),
    ]);

    res.json({ ...customer, leads, deals, activities, tasks });
  } catch (error) {
    logger.error({ error }, 'Failed to get customer');
    res.status(500).json({ error: 'Failed to get customer' });
  }
});

// Create customer
app.post('/api/customers', async (req: Request, res: Response) => {
  try {
    const { name, email, phone, company, tags, notes, source, ownerId } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    const customer = new CustomerModel({
      id: uuidv4(),
      name,
      email,
      phone,
      company,
      tags: tags || [],
      notes,
      source,
      ownerId,
      status: 'lead',
    });

    await customer.save();
    logger.info({ customerId: customer.id, name }, 'Customer created');

    res.status(201).json(customer.toObject());
  } catch (error) {
    logger.error({ error }, 'Failed to create customer');
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

// Update customer
app.put('/api/customers/:id', async (req: Request, res: Response) => {
  try {
    const customer = await CustomerModel.findOneAndUpdate(
      { id: req.params.id },
      { ...req.body, updatedAt: new Date() },
      { new: true }
    ).lean();

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json(customer);
  } catch (error) {
    logger.error({ error }, 'Failed to update customer');
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

// Delete customer
app.delete('/api/customers/:id', async (req: Request, res: Response) => {
  try {
    const customer = await CustomerModel.findOneAndDelete({ id: req.params.id });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    logger.info({ customerId: req.params.id }, 'Customer deleted');
    res.json({ deleted: true });
  } catch (error) {
    logger.error({ error }, 'Failed to delete customer');
    res.status(500).json({ error: 'Failed to delete customer' });
  }
});

// ============================================
// DEAL API
// ============================================

// List deals
app.get('/api/deals', async (req: Request, res: Response) => {
  try {
    const { status, ownerId, stage, limit = 100 } = req.query;

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (ownerId) filter.ownerId = ownerId;
    if (stage) filter.stage = stage;

    const deals = await DealModel.find(filter)
      .sort({ updatedAt: -1 })
      .limit(Number(limit))
      .lean();

    // Calculate pipeline value
    const pipelineValue = deals
      .filter(d => d.status === 'open')
      .reduce((sum, d) => sum + (d.value * d.probability / 100), 0);

    res.json({
      count: deals.length,
      deals,
      pipelineValue: Math.round(pipelineValue),
      wonValue: deals.filter(d => d.status === 'won').reduce((sum, d) => sum + d.value, 0),
    });
  } catch (error) {
    logger.error({ error }, 'Failed to list deals');
    res.status(500).json({ error: 'Failed to list deals' });
  }
});

// Get deal
app.get('/api/deals/:id', async (req: Request, res: Response) => {
  try {
    const deal = await DealModel.findOne({ id: req.params.id }).lean();

    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    res.json(deal);
  } catch (error) {
    logger.error({ error }, 'Failed to get deal');
    res.status(500).json({ error: 'Failed to get deal' });
  }
});

// Create deal
app.post('/api/deals', async (req: Request, res: Response) => {
  try {
    const { customerId, leadId, title, value, stage, probability, expectedCloseDate, ownerId, notes } = req.body;

    if (!title || !ownerId) {
      return res.status(400).json({ error: 'title and ownerId are required' });
    }

    const deal = new DealModel({
      id: uuidv4(),
      customerId,
      leadId,
      title,
      value: value || 0,
      stage: stage || 'qualification',
      probability: probability || 10,
      expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : undefined,
      ownerId,
      notes,
      status: 'open',
    });

    await deal.save();
    logger.info({ dealId: deal.id, title, value }, 'Deal created');

    res.status(201).json(deal.toObject());
  } catch (error) {
    logger.error({ error }, 'Failed to create deal');
    res.status(500).json({ error: 'Failed to create deal' });
  }
});

// Update deal
app.put('/api/deals/:id', async (req: Request, res: Response) => {
  try {
    const deal = await DealModel.findOneAndUpdate(
      { id: req.params.id },
      { ...req.body, updatedAt: new Date() },
      { new: true }
    ).lean();

    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    res.json(deal);
  } catch (error) {
    logger.error({ error }, 'Failed to update deal');
    res.status(500).json({ error: 'Failed to update deal' });
  }
});

// Update deal stage
app.post('/api/deals/:id/stage', async (req: Request, res: Response) => {
  try {
    const { stage, status } = req.body;

    const deal = await DealModel.findOneAndUpdate(
      { id: req.params.id },
      {
        ...(stage && { stage }),
        ...(status && { status }),
        ...(status === 'won' && { actualCloseDate: new Date() }),
        updatedAt: new Date(),
      },
      { new: true }
    ).lean();

    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    logger.info({ dealId: deal.id, stage, status }, 'Deal stage updated');
    res.json(deal);
  } catch (error) {
    logger.error({ error }, 'Failed to update deal stage');
    res.status(500).json({ error: 'Failed to update deal stage' });
  }
});

// ============================================
// ACTIVITY API
// ============================================

// List activities
app.get('/api/activities', async (req: Request, res: Response) => {
  try {
    const { customerId, dealId, type, ownerId, limit = 100 } = req.query;

    const filter: Record<string, unknown> = {};
    if (customerId) filter.customerId = customerId;
    if (dealId) filter.dealId = dealId;
    if (type) filter.type = type;
    if (ownerId) filter.ownerId = ownerId;

    const activities = await ActivityModel.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .lean();

    res.json({ count: activities.length, activities });
  } catch (error) {
    logger.error({ error }, 'Failed to list activities');
    res.status(500).json({ error: 'Failed to list activities' });
  }
});

// Create activity
app.post('/api/activities', async (req: Request, res: Response) => {
  try {
    const { type, customerId, dealId, subject, description, duration, outcome, scheduledAt, ownerId } = req.body;

    if (!type || !subject || !ownerId) {
      return res.status(400).json({ error: 'type, subject, and ownerId are required' });
    }

    const activity = new ActivityModel({
      id: uuidv4(),
      type,
      customerId,
      dealId,
      subject,
      description,
      duration,
      outcome,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      completedAt: outcome ? new Date() : undefined,
      ownerId,
    });

    await activity.save();
    logger.info({ activityId: activity.id, type, subject }, 'Activity created');

    res.status(201).json(activity.toObject());
  } catch (error) {
    logger.error({ error }, 'Failed to create activity');
    res.status(500).json({ error: 'Failed to create activity' });
  }
});

// ============================================
// TASK API
// ============================================

// List tasks
app.get('/api/tasks', async (req: Request, res: Response) => {
  try {
    const { status, assigneeId, priority, overdue, limit = 100 } = req.query;

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (assigneeId) filter.assigneeId = assigneeId;
    if (priority) filter.priority = priority;

    let tasks = await TaskModel.find(filter)
      .sort({ dueDate: 1, priority: -1 })
      .limit(Number(limit))
      .lean();

    // Filter overdue tasks
    if (overdue === 'true') {
      tasks = tasks.filter(t =>
        t.status !== 'completed' &&
        t.dueDate &&
        new Date(t.dueDate) < new Date()
      );
    }

    res.json({ count: tasks.length, tasks });
  } catch (error) {
    logger.error({ error }, 'Failed to list tasks');
    res.status(500).json({ error: 'Failed to list tasks' });
  }
});

// Create task
app.post('/api/tasks', async (req: Request, res: Response) => {
  try {
    const { title, description, customerId, dealId, priority, dueDate, assigneeId, createdById } = req.body;

    if (!title || !assigneeId || !createdById) {
      return res.status(400).json({ error: 'title, assigneeId, and createdById are required' });
    }

    const task = new TaskModel({
      id: uuidv4(),
      title,
      description,
      customerId,
      dealId,
      priority: priority || 'medium',
      dueDate: dueDate ? new Date(dueDate) : undefined,
      assigneeId,
      createdById,
      status: 'pending',
    });

    await task.save();
    logger.info({ taskId: task.id, title }, 'Task created');

    res.status(201).json(task.toObject());
  } catch (error) {
    logger.error({ error }, 'Failed to create task');
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Update task
app.put('/api/tasks/:id', async (req: Request, res: Response) => {
  try {
    const updates: Record<string, unknown> = { ...req.body };

    // Handle completed status
    if (updates.status === 'completed' && !updates.completedAt) {
      updates.completedAt = new Date();
    }

    const task = await TaskModel.findOneAndUpdate(
      { id: req.params.id },
      { ...updates, updatedAt: new Date() },
      { new: true }
    ).lean();

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(task);
  } catch (error) {
    logger.error({ error }, 'Failed to update task');
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// ============================================
// DASHBOARD/STATS API
// ============================================

app.get('/api/stats', async (req: Request, res: Response) => {
  try {
    const { ownerId } = req.query;
    const filter: Record<string, unknown> = ownerId ? { ownerId } : {};

    const [
      customerStats,
      dealStats,
      taskStats,
      recentActivities,
    ] = await Promise.all([
      // Customer stats
      CustomerModel.aggregate([
        { $match: filter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      // Deal stats
      DealModel.aggregate([
        { $match: { ...filter, status: 'open' } },
        { $group: {
          _id: '$stage',
          count: { $sum: 1 },
          totalValue: { $sum: '$value' },
          weightedValue: { $sum: { $multiply: ['$value', { $divide: ['$probability', 100] }] } },
        }},
      ]),
      // Task stats
      TaskModel.aggregate([
        { $match: { ...filter, status: { $ne: 'completed' } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      // Recent activities
      ActivityModel.find(filter)
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
    ]);

    res.json({
      customers: Object.fromEntries(customerStats.map(s => [s._id, s.count])),
      deals: dealStats,
      tasks: Object.fromEntries(taskStats.map(s => [s._id, s.count])),
      recentActivities,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get stats');
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// ============================================
// ERROR HANDLER
// ============================================

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error' });
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  logger.info(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   📊 CRM Service (${PORT})                             ║
║                                                       ║
║   Features:                                          ║
║   - Customer Management                              ║
║   - Lead Tracking                                   ║
║   - Deal Management                                 ║
║   - Activity Tracking                               ║
║   - Task Management                                ║
║                                                       ║
║   Endpoints:                                        ║
║   GET  /health                                      ║
║   GET  /api/customers                               ║
║   POST /api/customers                               ║
║   GET  /api/deals                                   ║
║   POST /api/deals                                   ║
║   GET  /api/activities                              ║
║   POST /api/activities                              ║
║   GET  /api/tasks                                   ║
║   POST /api/tasks                                   ║
║   GET  /api/stats                                   ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
  `);
});

export default app;
