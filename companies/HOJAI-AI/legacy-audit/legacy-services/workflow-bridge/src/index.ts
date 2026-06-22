/**
 * HOJAI Workflow Bridge - Agent <-> Workflow Integration
 * Port: 4800
 *
 * Bidirectional bridge between AgentOS and FlowOS
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';
import axios from 'axios';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const VERSION = '1.0.0';

const app = express();
const PORT = parseInt(process.env.PORT || '4800', 10);

// Configuration
const EXPERT_OS_URL = process.env.EXPERT_OS_URL || 'http://localhost:4550';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/workflow-bridge';

// Security
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  credentials: true,
}));
app.use(express.json({ limit: '10kb' }));

app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info({ method: req.method, path: req.path, status: res.statusCode, duration: Date.now() - start });
  });
  next();
});

// Database
mongoose.connect(MONGODB_URI)
  .then(() => logger.info('MongoDB connected'))
  .catch(err => logger.error({ err }, 'MongoDB connection failed'));

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Schemas
const WorkflowDefinitionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: String,
  version: { type: Number, default: 1 },
  status: { type: String, enum: ['draft', 'active', 'paused', 'completed', 'archived'], default: 'draft' },
  trigger: {
    type: { type: String, enum: ['event', 'schedule', 'agent', 'manual', 'api'] },
    config: mongoose.Schema.Types.Mixed,
  },
  steps: [{
    id: String,
    name: String,
    type: String,
    config: mongoose.Schema.Types.Mixed,
    next: [String],
    onError: String,
    retryConfig: mongoose.Schema.Types.Mixed,
  }],
  variables: mongoose.Schema.Types.Mixed,
  errorHandling: { type: String, enum: ['stop', 'continue', 'retry'], default: 'stop' },
  timeout: Number,
  createdBy: String,
}, { timestamps: true });
const WorkflowDefinition = mongoose.model('WorkflowDefinition', WorkflowDefinitionSchema);

const WorkflowRunSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  workflowId: { type: String, required: true },
  workflowVersion: Number,
  status: { type: String, enum: ['pending', 'running', 'paused', 'completed', 'failed', 'cancelled', 'rolled_back'], default: 'pending' },
  context: mongoose.Schema.Types.Mixed,
  currentStepId: String,
  steps: [{
    stepId: String,
    name: String,
    status: String,
    startedAt: Date,
    completedAt: Date,
    input: mongoose.Schema.Types.Mixed,
    output: mongoose.Schema.Types.Mixed,
    error: String,
    retries: { type: Number, default: 0 },
    approvalId: String,
  }],
  startedAt: Date,
  completedAt: Date,
  triggeredBy: String,
  triggeredById: String,
  error: String,
}, { timestamps: true });
const WorkflowRun = mongoose.model('WorkflowRun', WorkflowRunSchema);

const ApprovalRequestSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  workflowRunId: { type: String, required: true },
  stepId: String,
  type: { type: String, enum: ['manual', 'agent'] },
  requestedBy: String,
  approvers: [String],
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'expired', 'cancelled'], default: 'pending' },
  requestedAt: Date,
  respondedAt: Date,
  responder: String,
  comment: String,
  expiresAt: Date,
}, { timestamps: true });
const ApprovalRequest = mongoose.model('ApprovalRequest', ApprovalRequestSchema);

const EventLogSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  type: { type: String, required: true },
  source: { type: String, enum: ['agent', 'workflow', 'schedule', 'event', 'user'] },
  sourceId: String,
  payload: mongoose.Schema.Types.Mixed,
  metadata: mongoose.Schema.Types.Mixed,
  timestamp: { type: Date, default: Date.now },
}, { timestamps: true });
const EventLog = mongoose.model('EventLog', EventLogSchema);

// Event Bus
const subscribers = new Map<string, Array<(event: any) => void>>();

async function publishEvent(event: any): Promise<void> {
  await EventLog.create({
    id: event.id,
    type: event.type,
    source: event.source,
    sourceId: event.sourceId,
    payload: event.payload,
    metadata: event.metadata,
    timestamp: event.timestamp,
  });

  await redis.publish('workflow:events', JSON.stringify(event));

  const handlers = subscribers.get(event.type);
  if (handlers) {
    for (const handler of handlers) {
      try { handler(event); } catch (e) { logger.error({ e }, 'Event handler error'); }
    }
  }
}

// Health
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', service: 'workflow-bridge', version: VERSION, uptime: process.uptime() });
});

app.get('/health/live', (req: Request, res: Response) => {
  res.json({ status: 'alive' });
});

app.get('/health/ready', async (req: Request, res: Response) => {
  try {
    const mongo = mongoose.connection.readyState === 1;
    await redis.ping();
    res.json({ status: 'ready', mongo, redis: true });
  } catch {
    res.status(503).json({ status: 'not ready' });
  }
});

app.get('/metrics', (req: Request, res: Response) => {
  res.set('Content-Type', 'text/plain');
  res.send('service_up 1\n');
});

// ============================================
// AGENT -> WORKFLOW BRIDGE
// ============================================

app.post('/api/bridge/agent/trigger-workflow', async (req: Request, res: Response) => {
  try {
    const { agentId, agentRunId, workflowId, decision, input, context } = req.body;

    if (!agentId || !workflowId) {
      return res.status(400).json({ error: 'agentId and workflowId are required' });
    }

    const event = {
      id: uuidv4(),
      type: 'agent.decision',
      source: 'agent' as const,
      sourceId: agentRunId || agentId,
      timestamp: new Date(),
      payload: { decision, input },
      metadata: { agentId, workflowId },
    };
    await publishEvent(event);

    if (decision?.type === 'continue' || decision?.type === 'approve') {
      const run = await triggerWorkflowInternal(workflowId, { ...input, agentDecision: decision }, 'agent', agentRunId);
      res.json({ success: true, workflowRunId: run.id, eventId: event.id });
    } else {
      res.json({ success: true, workflowTriggered: false, reason: `Decision type '${decision?.type}' does not trigger workflow`, eventId: event.id });
    }
  } catch (error: any) {
    logger.error({ error }, 'Failed to trigger workflow from agent');
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/bridge/agent/completed', async (req: Request, res: Response) => {
  try {
    const { agentId, agentRunId, output } = req.body;

    const event = {
      id: uuidv4(),
      type: 'agent.completed',
      source: 'agent' as const,
      sourceId: agentRunId,
      timestamp: new Date(),
      payload: { output },
      metadata: { agentId, agentRunId },
    };
    await publishEvent(event);

    const workflows = await WorkflowDefinition.find({
      'trigger.type': 'event',
      'trigger.config.eventType': 'agent.completed',
      status: 'active',
    }).lean();

    const runs = [];
    for (const wf of workflows) {
      const run = await triggerWorkflowInternal(wf.id, { agentId, agentRunId, output }, 'agent', agentRunId);
      runs.push({ workflowId: wf.id, runId: run.id });
    }

    res.json({ eventId: event.id, workflowsTriggered: runs.length, runs });
  } catch (error: any) {
    logger.error({ error }, 'Failed to process agent completion');
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// WORKFLOW -> AGENT BRIDGE
// ============================================

app.post('/api/bridge/workflow/invoke-agent', async (req: Request, res: Response) => {
  try {
    const { agentId, agentType, input, workflowRunId, stepId } = req.body;

    if (!agentId) {
      return res.status(400).json({ error: 'agentId is required' });
    }

    const response = await axios.post(`${EXPERT_OS_URL}/api/agents/${agentId}/invoke`, {
      input,
      context: { triggeredBy: 'workflow', workflowRunId, stepId },
    }, { timeout: 60000 });

    const { executionId, output, metrics } = response.data;

    await publishEvent({
      id: uuidv4(),
      type: 'agent.invoked',
      source: 'workflow' as const,
      sourceId: executionId,
      timestamp: new Date(),
      payload: { output, metrics },
      metadata: { agentId, workflowRunId, stepId },
    });

    res.json({ success: true, executionId, output, metrics });
  } catch (error: any) {
    logger.error({ error }, 'Failed to invoke agent from workflow');
    res.status(500).json({
      error: 'Failed to invoke agent',
      details: error.response?.data || error.message,
    });
  }
});

app.post('/api/bridge/workflow/request-agent-decision', async (req: Request, res: Response) => {
  try {
    const { agentId, workflowRunId, stepId, input, timeout } = req.body;

    if (!agentId || !workflowRunId) {
      return res.status(400).json({ error: 'agentId and workflowRunId are required' });
    }

    const response = await axios.post(`${EXPERT_OS_URL}/api/agents/${agentId}/invoke`, {
      input: { ...input, _meta: { workflowRunId, stepId, requestType: 'decision' } },
      context: { triggeredBy: 'workflow', workflowRunId },
    }, { timeout: (timeout || 60) * 1000 });

    const { executionId, output } = response.data;

    await WorkflowRun.findOneAndUpdate(
      { id: workflowRunId, 'steps.stepId': stepId },
      { 'steps.$.output': output, 'steps.$.status': 'completed', 'steps.$.completedAt': new Date() }
    );

    await publishEvent({
      id: uuidv4(),
      type: 'agent.decision',
      source: 'agent' as const,
      sourceId: executionId,
      timestamp: new Date(),
      payload: { decision: output.decision, output },
      metadata: { agentId, workflowRunId, stepId },
    });

    res.json({ success: true, executionId, decision: output.decision });
  } catch (error: any) {
    logger.error({ error }, 'Failed to request agent decision');
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// WORKFLOW MANAGEMENT
// ============================================

async function triggerWorkflowInternal(workflowId: string, input: any, triggeredBy: string, triggeredById?: string): Promise<any> {
  const workflow = await WorkflowDefinition.findOne({ id: workflowId, status: 'active' }).lean();
  if (!workflow) {
    throw new Error('Workflow not found or not active');
  }

  const runId = uuidv4();
  const wfSteps = workflow.steps as any[];
  const run = new WorkflowRun({
    id: runId,
    workflowId,
    workflowVersion: workflow.version,
    status: 'running',
    context: { ...(workflow.variables as any), ...input },
    currentStepId: wfSteps[0]?.stepId,
    steps: wfSteps.map((step: any, i: number) => ({
      stepId: step.stepId || step.id,
      name: step.name,
      status: i === 0 ? 'running' : 'pending',
      retries: 0,
    })),
    startedAt: new Date(),
    triggeredBy,
    triggeredById,
  });
  await run.save();

  await publishEvent({
    id: uuidv4(),
    type: 'workflow.started',
    source: triggeredBy as any,
    sourceId: runId,
    timestamp: new Date(),
    payload: { input },
    metadata: { workflowId, workflowRunId: runId },
  });

  executeWorkflowAsync(runId, workflow, { ...workflow.variables, ...input });

  return run;
}

async function executeWorkflowAsync(runId: string, workflow: any, input: any): Promise<void> {
  const wfSteps = workflow.steps as any[] || [];
  for (const step of wfSteps) {
    const stepId = step.stepId || step.id;
    await WorkflowRun.findOneAndUpdate({ id: runId }, { currentStepId: stepId });
    await WorkflowRun.findOneAndUpdate(
      { id: runId, 'steps.stepId': stepId },
      { 'steps.$.status': 'running', 'steps.$.startedAt': new Date(), 'steps.$.input': input }
    );

    try {
      let output: any = { processed: true };

      if (step.type === 'agent') {
        const resp = await axios.post(
          `http://localhost:4800/api/bridge/workflow/invoke-agent`,
          { agentId: step.config?.agentId, input: { ...input, ...step.config?.input }, workflowRunId: runId, stepId },
          { timeout: 60000 }
        );
        output = resp.data?.output || {};
      } else if (step.type === 'http') {
        const httpResp = await axios({ method: step.config?.method || 'GET', url: step.config?.url, data: step.config?.body });
        output = httpResp.data;
      } else if (step.type === 'approval') {
        const approval = new ApprovalRequest({
          id: uuidv4(),
          workflowRunId: runId,
          stepId: stepId,
          type: 'manual',
          requestedBy: 'system',
          approvers: step.config?.approvers || [],
          requestedAt: new Date(),
          expiresAt: new Date(Date.now() + (step.config?.timeout || 3600) * 1000),
        });
        await approval.save();
        await WorkflowRun.findOneAndUpdate({ id: runId, 'steps.stepId': stepId }, { 'steps.$.approvalId': approval.id, 'steps.$.status': 'waiting_approval' });
        output = { approvalId: approval.id, status: 'pending' };
      }

      await WorkflowRun.findOneAndUpdate(
        { id: runId, 'steps.stepId': stepId },
        { 'steps.$.status': 'completed', 'steps.$.completedAt': new Date(), 'steps.$.output': output }
      );

      await publishEvent({
        id: uuidv4(),
        type: 'workflow.step.completed',
        source: 'workflow' as const,
        sourceId: runId,
        timestamp: new Date(),
        payload: { output },
        metadata: { workflowId: workflow.id, workflowRunId: runId, stepId },
      });

    } catch (error: any) {
      logger.error({ error, stepId }, 'Step execution failed');

      if (step.onError === 'stop') {
        await WorkflowRun.findOneAndUpdate(
          { id: runId, 'steps.stepId': stepId },
          { 'steps.$.status': 'failed', 'steps.$.error': error.message, 'steps.$.completedAt': new Date() }
        );
        await WorkflowRun.findOneAndUpdate({ id: runId }, { status: 'failed', error: error.message, completedAt: new Date() });
        return;
      }

      await publishEvent({
        id: uuidv4(),
        type: 'workflow.step.failed',
        source: 'workflow' as const,
        sourceId: runId,
        timestamp: new Date(),
        payload: { error: error.message },
        metadata: { workflowId: workflow.id, workflowRunId: runId, stepId },
      });
    }
  }

  await WorkflowRun.findOneAndUpdate({ id: runId }, { status: 'completed', completedAt: new Date() });
  await publishEvent({
    id: uuidv4(),
    type: 'workflow.completed',
    source: 'workflow' as const,
    sourceId: runId,
    timestamp: new Date(),
    payload: {},
    metadata: { workflowId: workflow.id, workflowRunId: runId },
  });
}

app.post('/api/workflows/:id/trigger', async (req: Request, res: Response) => {
  try {
    const { input, triggeredById, context } = req.body;
    const run = await triggerWorkflowInternal(req.params.id, input || {}, 'api', triggeredById);
    res.json({ success: true, runId: run.id, status: run.status });
  } catch (error: any) {
    logger.error({ error }, 'Failed to trigger workflow');
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/runs/:id', async (req: Request, res: Response) => {
  const run = await WorkflowRun.findOne({ id: req.params.id }).lean();
  if (!run) return res.status(404).json({ error: 'Run not found' });
  res.json(run);
});

app.get('/api/workflows/:id/runs', async (req: Request, res: Response) => {
  const { status, limit = 50 } = req.query;
  const filter: any = { workflowId: req.params.id };
  if (status) filter.status = status;
  const runs = await WorkflowRun.find(filter).sort({ createdAt: -1 }).limit(Number(limit)).lean();
  res.json({ count: runs.length, runs });
});

// ============================================
// APPROVAL MANAGEMENT
// ============================================

app.get('/api/approvals', async (req: Request, res: Response) => {
  const { status = 'pending', approver } = req.query;
  const filter: any = { status };
  if (approver) filter.approvers = approver;
  const approvals = await ApprovalRequest.find(filter).sort({ requestedAt: -1 }).lean();
  res.json({ count: approvals.length, approvals });
});

app.post('/api/approvals/:id/respond', async (req: Request, res: Response) => {
  try {
    const { action, comment, responder } = req.body;
    if (!['approved', 'rejected'].includes(action)) {
      return res.status(400).json({ error: 'action must be "approved" or "rejected"' });
    }

    const approval = await ApprovalRequest.findOneAndUpdate(
      { id: req.params.id, status: 'pending' },
      { status: action, respondedAt: new Date(), responder, comment },
      { new: true }
    ).lean();

    if (!approval) return res.status(404).json({ error: 'Approval not found or already processed' });

    await publishEvent({
      id: uuidv4(),
      type: action === 'approved' ? 'workflow.approval.granted' : 'workflow.approval.rejected',
      source: 'user' as const,
      sourceId: responder,
      timestamp: new Date(),
      payload: { comment },
      metadata: { approvalId: approval.id, workflowRunId: approval.workflowRunId, stepId: approval.stepId },
    });

    res.json({ success: true, approval });
  } catch (error: any) {
    logger.error({ error }, 'Failed to respond to approval');
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// EVENT API
// ============================================

app.get('/api/events', async (req: Request, res: Response) => {
  const { type, sourceId, startDate, endDate, limit = 100 } = req.query;
  const filter: any = {};
  if (type) filter.type = type;
  if (sourceId) filter.sourceId = sourceId;
  if (startDate || endDate) {
    filter.timestamp = {};
    if (startDate) filter.timestamp.$gte = new Date(startDate as string);
    if (endDate) filter.timestamp.$lte = new Date(endDate as string);
  }

  const events = await EventLog.find(filter).sort({ timestamp: -1 }).limit(Number(limit)).lean();
  res.json({ count: events.length, events });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  logger.info(`
╔═══════════════════════════════════════════════════════╗
║   🔗 Workflow Bridge (${PORT})                        ║
║   Agent <-> Workflow Integration                      ║
║   POST /api/bridge/agent/trigger-workflow           ║
║   POST /api/bridge/workflow/invoke-agent           ║
║   POST /api/workflows/:id/trigger                   ║
║   GET  /api/approvals                              ║
║   GET  /api/events                                 ║
╚═══════════════════════════════════════════════════════╝
  `);
});

export default app;
