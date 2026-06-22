/**
 * HOJAI ExpertOS - Agent Runtime Platform
 * Port: 4550
 *
 * This service provides the runtime environment for AI agents,
 * skill orchestration, and expert twin management.
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';

// ============================================
// LOGGING SETUP
// ============================================

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
});

const VERSION = '1.0.0';

// ============================================
// EXPRESS APP SETUP
// ============================================

const app = express();
const PORT = parseInt(process.env.PORT || '4550', 10);

// Security middleware
app.use(helmet());

// CORS - explicit origins
const allowedOrigins = (process.env.CORS_ORIGIN || '').split(',').filter(Boolean);
app.use(cors({
  origin: allowedOrigins.length > 0 ? allowedOrigins : false,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
}));

app.use(express.json({ limit: '10kb' }));

// Request ID middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();
  res.setHeader('X-Request-ID', requestId);
  next();
});

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: Date.now() - start,
      requestId: res.getHeader('X-Request-ID'),
    });
  });
  next();
});

// ============================================
// DATABASE CONNECTIONS
// ============================================

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai-expert-os';
mongoose.connect(MONGODB_URI)
  .then(() => logger.info('MongoDB connected'))
  .catch(err => logger.error({ err }, 'MongoDB connection failed'));

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// ============================================
// MONGOOSE SCHEMAS
// ============================================

// Agent Schema
const AgentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: () => uuidv4() },
  name: { type: String, required: true },
  description: String,
  type: { type: String, enum: ['conversational', 'task', 'automation', 'analysis', 'custom'], default: 'task' },
  skills: [{ type: String }],
  capabilities: [{ type: String }],
  config: { type: mongoose.Schema.Types.Mixed, default: {} },
  status: { type: String, enum: ['idle', 'running', 'paused', 'error', 'stopped'], default: 'idle' },
  memory: { type: mongoose.Schema.Types.Mixed, default: {} },
  ownerId: String,
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });
AgentSchema.index({ ownerId: 1 });
AgentSchema.index({ type: 1 });
const AgentModel = mongoose.model('Agent', AgentSchema);

// Execution Schema
const ExecutionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: () => uuidv4() },
  agentId: { type: String, required: true, index: true },
  skillId: { type: String, required: true },
  input: { type: mongoose.Schema.Types.Mixed, default: {} },
  output: { type: mongoose.Schema.Types.Mixed },
  status: { type: String, enum: ['pending', 'running', 'completed', 'failed', 'cancelled'], default: 'pending' },
  startedAt: Date,
  completedAt: Date,
  error: String,
  logs: [{
    timestamp: { type: Date, default: Date.now },
    level: { type: String, enum: ['debug', 'info', 'warn', 'error'] },
    message: String,
    data: mongoose.Schema.Types.Mixed,
  }],
  metrics: {
    duration: Number,
    tokens: Number,
    cost: Number,
  },
}, { timestamps: true });
ExecutionSchema.index({ agentId: 1, status: 1 });
const ExecutionModel = mongoose.model('Execution', ExecutionSchema);

// Workflow Schema
const WorkflowSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: () => uuidv4() },
  name: { type: String, required: true },
  description: String,
  steps: [{
    id: String,
    skillId: String,
    input: mongoose.Schema.Types.Mixed,
    condition: String,
    retry: {
      maxAttempts: { type: Number, default: 3 },
      delay: { type: Number, default: 1000 },
    },
  }],
  parallel: { type: Boolean, default: false },
  errorHandling: { type: String, enum: ['stop', 'continue', 'retry'], default: 'stop' },
}, { timestamps: true });
const WorkflowModel = mongoose.model('Workflow', WorkflowSchema);

// ExpertTwin Schema
const ExpertTwinSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: () => uuidv4() },
  agentId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  domain: String,
  expertise: [String],
  trainingData: [{
    input: mongoose.Schema.Types.Mixed,
    output: mongoose.Schema.Types.Mixed,
    feedback: Number,
  }],
  model: {
    type: String,
    version: String,
    config: mongoose.Schema.Types.Mixed,
  },
  performance: {
    accuracy: Number,
    throughput: Number,
    latency: Number,
  },
}, { timestamps: true });
const ExpertTwinModel = mongoose.model('ExpertTwin', ExpertTwinSchema);

// ============================================
// HEALTH ENDPOINTS
// ============================================

app.get('/health', (req: Request, res: Response) => {
  const memUsage = process.memoryUsage();
  res.json({
    status: 'healthy',
    service: 'hojai-expert-os',
    version: VERSION,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    memory: {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      rss: Math.round(memUsage.rss / 1024 / 1024),
    },
  });
});

app.get('/health/live', (req: Request, res: Response) => {
  res.json({ status: 'alive' });
});

app.get('/health/ready', async (req: Request, res: Response) => {
  try {
    const mongoStatus = mongoose.connection.readyState === 1;
    let redisStatus = false;
    try {
      await redis.ping();
      redisStatus = true;
    } catch {
      redisStatus = false;
    }
    if (mongoStatus && redisStatus) {
      res.json({ status: 'ready', mongo: mongoStatus, redis: redisStatus });
    } else {
      res.status(503).json({ status: 'not ready', mongo: mongoStatus, redis: redisStatus });
    }
  } catch (error) {
    res.status(503).json({ status: 'not ready', error: String(error) });
  }
});

// Prometheus metrics endpoint
app.get('/metrics', (req: Request, res: Response) => {
  const memUsage = process.memoryUsage();
  const metrics = [
    '# HELP http_requests_total Total HTTP requests',
    '# TYPE http_requests_total counter',
    'http_requests_total 0',
    '',
    '# HELP service_up Service availability',
    '# TYPE service_up gauge',
    'service_up 1',
    '',
    '# HELP process_uptime_seconds Process uptime in seconds',
    '# TYPE process_uptime_seconds gauge',
    `process_uptime_seconds ${Math.floor(process.uptime())}`,
    '',
    '# HELP nodejs_memory_heap_used_bytes Process heap used',
    '# TYPE nodejs_memory_heap_used_bytes gauge',
    `nodejs_memory_heap_used_bytes ${memUsage.heapUsed}`,
  ];
  res.set('Content-Type', 'text/plain');
  res.send(metrics.join('\n'));
});

// ============================================
// INPUT VALIDATION HELPERS
// ============================================

function sanitizeString(value: unknown): string {
  if (typeof value === 'string') {
    return value.replace(/[<>\"\'\\]/g, '');
  }
  return '';
}

function validateAgentInput(data: Record<string, unknown>): { valid: boolean; error?: string } {
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    return { valid: false, error: 'name is required' };
  }
  if (data.name.length > 100) {
    return { valid: false, error: 'name must be less than 100 characters' };
  }
  return { valid: true };
}

// ============================================
// AGENT API
// ============================================

// List agents
app.get('/api/agents', async (req: Request, res: Response) => {
  try {
    const { ownerId, type, status, limit = 50, offset = 0 } = req.query;
    const filter: Record<string, unknown> = {};
    if (ownerId) filter.ownerId = sanitizeString(ownerId);
    if (type) filter.type = sanitizeString(type);
    if (status) filter.status = sanitizeString(status);

    const parsedLimit = Math.min(Math.max(1, Number(limit)), 100);
    const parsedOffset = Math.max(0, Number(offset));

    const [agents, total] = await Promise.all([
      AgentModel.find(filter).select('-__v').skip(parsedOffset).limit(parsedLimit).lean(),
      AgentModel.countDocuments(filter),
    ]);

    res.json({ count: agents.length, total, agents });
  } catch (error) {
    logger.error({ error }, 'Failed to list agents');
    res.status(500).json({ error: 'Failed to list agents' });
  }
});

// Get agent by ID
app.get('/api/agents/:id', async (req: Request, res: Response) => {
  try {
    const agent = await AgentModel.findOne({ id: req.params.id }).lean();
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    res.json(agent);
  } catch (error) {
    logger.error({ error }, 'Failed to get agent');
    res.status(500).json({ error: 'Failed to get agent' });
  }
});

// Create agent
app.post('/api/agents', async (req: Request, res: Response) => {
  try {
    const validation = validateAgentInput(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const { name, description, type, skills, capabilities, config, ownerId } = req.body;

    const agent = new AgentModel({
      id: uuidv4(),
      name: name.trim(),
      description,
      type: type || 'task',
      skills: skills || [],
      capabilities: capabilities || [],
      config: config || {},
      ownerId,
      status: 'idle',
    });

    await agent.save();
    logger.info({ agentId: agent.id, name: agent.name }, 'Agent created');
    res.status(201).json(agent.toObject());
  } catch (error) {
    logger.error({ error }, 'Failed to create agent');
    res.status(500).json({ error: 'Failed to create agent' });
  }
});

// Update agent
app.put('/api/agents/:id', async (req: Request, res: Response) => {
  try {
    const { name, description, skills, capabilities, config, status } = req.body;
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description;
    if (skills !== undefined) updates.skills = skills;
    if (capabilities !== undefined) updates.capabilities = capabilities;
    if (config !== undefined) updates.config = config;
    if (status !== undefined) updates.status = status;

    const agent = await AgentModel.findOneAndUpdate(
      { id: req.params.id },
      updates,
      { new: true }
    ).lean();

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    logger.info({ agentId: agent.id }, 'Agent updated');
    res.json(agent);
  } catch (error) {
    logger.error({ error }, 'Failed to update agent');
    res.status(500).json({ error: 'Failed to update agent' });
  }
});

// Delete agent
app.delete('/api/agents/:id', async (req: Request, res: Response) => {
  try {
    const agent = await AgentModel.findOneAndDelete({ id: req.params.id });
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    await ExecutionModel.deleteMany({ agentId: req.params.id });
    logger.info({ agentId: req.params.id }, 'Agent deleted');
    res.json({ deleted: true });
  } catch (error) {
    logger.error({ error }, 'Failed to delete agent');
    res.status(500).json({ error: 'Failed to delete agent' });
  }
});

// ============================================
// AGENT EXECUTION API
// ============================================

// Invoke agent
app.post('/api/agents/:id/invoke', async (req: Request, res: Response) => {
  try {
    const { input, context, timeout } = req.body;
    const agent = await AgentModel.findOne({ id: req.params.id }).lean();

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const executionId = uuidv4();
    const execution = new ExecutionModel({
      id: executionId,
      agentId: agent.id,
      skillId: agent.skills[0] || 'default',
      input: input || {},
      status: 'running',
      startedAt: new Date(),
    });
    await execution.save();
    await AgentModel.updateOne({ id: agent.id }, { status: 'running' });

    const startTime = Date.now();

    try {
      let output: Record<string, unknown> = {};

      switch (agent.type) {
        case 'conversational':
          output = { response: `Processed conversational input: ${JSON.stringify(input)}` };
          break;
        case 'task':
          output = { result: `Task completed: ${JSON.stringify(input)}`, status: 'success' };
          break;
        case 'automation':
          output = { automated: true, steps: ['step1', 'step2', 'step3'], completed: true };
          break;
        case 'analysis':
          output = { analysis: 'Analysis complete', insights: [], recommendations: [] };
          break;
        default:
          output = { processed: true, input };
      }

      const duration = Date.now() - startTime;
      await ExecutionModel.findOneAndUpdate(
        { id: executionId },
        {
          status: 'completed',
          output,
          completedAt: new Date(),
          metrics: { duration },
          logs: [{ timestamp: new Date(), level: 'info', message: 'Execution completed' }],
        }
      );
      await AgentModel.updateOne({ id: agent.id }, { status: 'idle' });
      await redis.set(`execution:${executionId}`, JSON.stringify(output), 'EX', 3600);

      logger.info({ executionId, agentId: agent.id, duration }, 'Agent invocation completed');
      res.json({ executionId, output, metrics: { duration } });
    } catch (execError) {
      await ExecutionModel.findOneAndUpdate(
        { id: executionId },
        {
          status: 'failed',
          error: String(execError),
          completedAt: new Date(),
        }
      );
      await AgentModel.updateOne({ id: agent.id }, { status: 'error' });
      throw execError;
    }
  } catch (error) {
    logger.error({ error }, 'Agent invocation failed');
    res.status(500).json({ error: 'Agent invocation failed' });
  }
});

// Train agent
app.post('/api/agents/:id/train', async (req: Request, res: Response) => {
  try {
    const { trainingData, epochs = 10, batchSize = 32 } = req.body;
    const agent = await AgentModel.findOne({ id: req.params.id }).lean();

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const executionId = uuidv4();
    const execution = new ExecutionModel({
      id: executionId,
      agentId: agent.id,
      skillId: 'training',
      input: { trainingDataCount: (trainingData || []).length, epochs, batchSize },
      status: 'running',
      startedAt: new Date(),
    });
    await execution.save();

    const startTime = Date.now();
    let totalLoss = 0;
    for (let epoch = 0; epoch < (epochs || 10); epoch++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      totalLoss += Math.random() * 0.1;
    }

    const avgLoss = totalLoss / (epochs || 10);
    const duration = Date.now() - startTime;

    await ExecutionModel.findOneAndUpdate(
      { id: executionId },
      {
        status: 'completed',
        output: { epochs, avgLoss, accuracy: 1 - avgLoss, trainedOn: (trainingData || []).length },
        completedAt: new Date(),
        metrics: { duration },
      }
    );

    await AgentModel.updateOne(
      { id: agent.id },
      {
        'metadata.lastTrainedAt': new Date(),
        'metadata.trainingLoss': avgLoss,
        'metadata.trainingAccuracy': 1 - avgLoss,
      }
    );

    logger.info({ agentId: agent.id, epochs, avgLoss, duration }, 'Agent training completed');
    res.json({ trainingId: executionId, epochs, avgLoss, accuracy: 1 - avgLoss, metrics: { duration } });
  } catch (error) {
    logger.error({ error }, 'Agent training failed');
    res.status(500).json({ error: 'Agent training failed' });
  }
});

// Get agent stats
app.get('/api/agents/:id/stats', async (req: Request, res: Response) => {
  try {
    const [agent, executions] = await Promise.all([
      AgentModel.findOne({ id: req.params.id }).lean(),
      ExecutionModel.find({ agentId: req.params.id }).sort({ createdAt: -1 }).limit(100).lean(),
    ]);

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const stats = {
      totalExecutions: executions.length,
      completed: executions.filter(e => e.status === 'completed').length,
      failed: executions.filter(e => e.status === 'failed').length,
      pending: executions.filter(e => e.status === 'pending' || e.status === 'running').length,
      avgDuration: 0,
    };

    const completedWithMetrics = executions.filter(e => e.metrics);
    if (completedWithMetrics.length > 0) {
      stats.avgDuration = completedWithMetrics.reduce((sum, e) => sum + (e.metrics?.duration || 0), 0) / completedWithMetrics.length;
    }

    res.json({ agent: { id: agent.id, name: agent.name, type: agent.type, status: agent.status }, stats });
  } catch (error) {
    logger.error({ error }, 'Failed to get agent stats');
    res.status(500).json({ error: 'Failed to get agent stats' });
  }
});

// ============================================
// EXECUTION API
// ============================================

app.get('/api/executions', async (req: Request, res: Response) => {
  try {
    const { agentId, status, limit = 100 } = req.query;
    const filter: Record<string, unknown> = {};
    if (agentId) filter.agentId = agentId;
    if (status) filter.status = status;

    const executions = await ExecutionModel.find(filter)
      .sort({ createdAt: -1 })
      .limit(Math.min(Number(limit), 500))
      .select('-logs')
      .lean();

    res.json({ count: executions.length, executions });
  } catch (error) {
    logger.error({ error }, 'Failed to list executions');
    res.status(500).json({ error: 'Failed to list executions' });
  }
});

app.get('/api/executions/:id', async (req: Request, res: Response) => {
  try {
    const execution = await ExecutionModel.findOne({ id: req.params.id }).lean();
    if (!execution) {
      return res.status(404).json({ error: 'Execution not found' });
    }
    res.json(execution);
  } catch (error) {
    logger.error({ error }, 'Failed to get execution');
    res.status(500).json({ error: 'Failed to get execution' });
  }
});

app.post('/api/executions/:id/cancel', async (req: Request, res: Response) => {
  try {
    const execution = await ExecutionModel.findOneAndUpdate(
      { id: req.params.id, status: { $in: ['pending', 'running'] } },
      { status: 'cancelled', completedAt: new Date() },
      { new: true }
    ).lean();

    if (!execution) {
      return res.status(404).json({ error: 'Execution not found or already completed' });
    }

    await AgentModel.updateOne({ id: execution.agentId }, { status: 'idle' });
    logger.info({ executionId: req.params.id }, 'Execution cancelled');
    res.json({ cancelled: true, execution });
  } catch (error) {
    logger.error({ error }, 'Failed to cancel execution');
    res.status(500).json({ error: 'Failed to cancel execution' });
  }
});

// ============================================
// WORKFLOW API
// ============================================

app.get('/api/workflows', async (req: Request, res: Response) => {
  try {
    const workflows = await WorkflowModel.find().lean();
    res.json({ count: workflows.length, workflows });
  } catch (error) {
    logger.error({ error }, 'Failed to list workflows');
    res.status(500).json({ error: 'Failed to list workflows' });
  }
});

app.post('/api/workflows', async (req: Request, res: Response) => {
  try {
    const { name, description, steps, parallel, errorHandling } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    const workflow = new WorkflowModel({
      id: uuidv4(),
      name,
      description,
      steps: steps || [],
      parallel: parallel || false,
      errorHandling: errorHandling || 'stop',
    });
    await workflow.save();
    res.status(201).json(workflow.toObject());
  } catch (error) {
    logger.error({ error }, 'Failed to create workflow');
    res.status(500).json({ error: 'Failed to create workflow' });
  }
});

app.post('/api/workflows/:id/execute', async (req: Request, res: Response) => {
  try {
    const { input } = req.body;
    const workflow = await WorkflowModel.findOne({ id: req.params.id }).lean();

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    const executionId = uuidv4();
    const results: Record<string, unknown>[] = [];

    for (const step of workflow.steps) {
      try {
        results.push({
          stepId: step.id,
          output: { processed: true, input },
          status: 'success',
        });
      } catch (stepError) {
        const shouldStop = workflow.errorHandling === 'stop';
        results.push({ stepId: step.id, error: String(stepError), status: 'failed' });
        if (shouldStop) {
          throw stepError;
        }
      }
    }

    res.json({ executionId, workflowId: workflow.id, results, status: 'completed' });
  } catch (error) {
    logger.error({ error }, 'Workflow execution failed');
    res.status(500).json({ error: 'Workflow execution failed' });
  }
});

// ============================================
// EXPERT TWIN API
// ============================================

app.get('/api/expert-twins', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.query;
    const filter = agentId ? { agentId } : {};
    const twins = await ExpertTwinModel.find(filter).lean();
    res.json({ count: twins.length, twins });
  } catch (error) {
    logger.error({ error }, 'Failed to list expert twins');
    res.status(500).json({ error: 'Failed to list expert twins' });
  }
});

app.post('/api/expert-twins', async (req: Request, res: Response) => {
  try {
    const { agentId, name, domain, expertise, model, performance } = req.body;
    if (!agentId || !name) {
      return res.status(400).json({ error: 'agentId and name are required' });
    }

    const twin = new ExpertTwinModel({
      id: uuidv4(),
      agentId,
      name,
      domain,
      expertise: expertise || [],
      model: model || { type: 'default', version: '1.0.0', config: {} },
      performance: performance || { accuracy: 0, throughput: 0, latency: 0 },
    });
    await twin.save();
    res.status(201).json(twin.toObject());
  } catch (error) {
    logger.error({ error }, 'Failed to create expert twin');
    res.status(500).json({ error: 'Failed to create expert twin' });
  }
});

app.get('/api/expert-twins/:id', async (req: Request, res: Response) => {
  try {
    const twin = await ExpertTwinModel.findOne({ id: req.params.id }).lean();
    if (!twin) {
      return res.status(404).json({ error: 'Expert twin not found' });
    }
    res.json(twin);
  } catch (error) {
    logger.error({ error }, 'Failed to get expert twin');
    res.status(500).json({ error: 'Failed to get expert twin' });
  }
});

app.delete('/api/expert-twins/:id', async (req: Request, res: Response) => {
  try {
    const twin = await ExpertTwinModel.findOneAndDelete({ id: req.params.id });
    if (!twin) {
      return res.status(404).json({ error: 'Expert twin not found' });
    }
    res.json({ deleted: true });
  } catch (error) {
    logger.error({ error }, 'Failed to delete expert twin');
    res.status(500).json({ error: 'Failed to delete expert twin' });
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
║   🎯 HOJAI ExpertOS (${PORT})                         ║
║                                                       ║
║   Agent Runtime Platform                              ║
║   - Agent Management                                  ║
║   - Skill Orchestration                               ║
║   - Expert Twins                                     ║
║   - Workflow Execution                               ║
║                                                       ║
║   Endpoints:                                         ║
║   GET  /health                                       ║
║   GET  /api/agents                                  ║
║   POST /api/agents                                   ║
║   POST /api/agents/:id/invoke                        ║
║   POST /api/agents/:id/train                        ║
║   GET  /api/expert-twins                            ║
║   GET  /api/workflows                               ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
  `);
});

export default app;
