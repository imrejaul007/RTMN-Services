// Planning Engine (7301) — Goal decomposition, DAG validation, critical-path analysis
import express from 'express';
import { requireEnv } from '@rtmn/shared/lib/env';
import { requireAuth } from '@rtmn/shared/auth';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { z } from 'zod';
import axios from 'axios';
import { v4 as uuid } from 'uuid';

const PORT = parseInt(process.env.PLANNING_ENGINE_PORT || '7301', 10);
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai';
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;
const JWT_SECRET = process.env.JWT_SECRET;

// Genie specialist endpoints for automatic step generation
const SPECIALIST_URLS = {
  calendar: process.env.GENIE_CALENDAR_URL || 'http://localhost:4709',
  money: process.env.GENIE_MONEY_URL || 'http://localhost:4715',
  wellness: process.env.GENIE_WELLNESS_URL || 'http://localhost:4717',
  shopping: process.env.GENIE_SHOPPING_URL || 'http://localhost:4728',
  lifeuni: process.env.GENIE_LIFE_UNIVERSITY_URL || 'http://localhost:4727',
  memory: process.env.MEMORYOS_URL || 'http://localhost:7003',
  corpid: process.env.CORPID_URL || 'http://localhost:7001',
  twins: process.env.TWINOS_URL || 'http://localhost:7002',
};

// ============================================================================
// Schema definitions
// ============================================================================
const StepSchema = new mongoose.Schema({
  order: { type: Number, required: true },
  name: { type: String, required: true },
  description: String,
  service: String,
  action: String,
  est_ms: { type: Number, default: 100 },
  depends_on: [{ type: Number }],
  retry: { type: Number, default: 0 },
  timeout_ms: { type: Number, default: 30000 },
  status: { type: String, enum: ['pending', 'running', 'completed', 'failed', 'skipped'], default: 'pending' },
  result: mongoose.Schema.Types.Mixed,
  error: String,
  started_at: Date,
  completed_at: Date,
}, { _id: false });

const PlanSchema = new mongoose.Schema({
  planId: { type: String, required: true, unique: true, index: true },
  userId: { type: String, index: true },
  goal: { type: String, required: true },
  description: String,
  category: { type: String, enum: ['personal', 'professional', 'health', 'financial', 'learning', 'creative', 'other'], default: 'personal' },
  priority: { type: Number, enum: [1, 2, 3, 4, 5], default: 3 },
  steps: [StepSchema],
  constraints: {
    max_total_ms: { type: Number, default: 300000 },
    max_retries: { type: Number, default: 2 },
    parallel: { type: Boolean, default: false },
  },
  status: { type: String, enum: ['draft', 'ready', 'running', 'paused', 'completed', 'failed', 'cancelled'], default: 'draft' },
  progress: { type: Number, default: 0, min: 0, max: 100 },
  started_at: Date,
  completed_at: Date,
  estimated_total_ms: Number,
  actual_total_ms: Number,
  critical_path: [Number],
  tags: [String],
  metadata: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

const StepTemplateSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, index: true },
  description: String,
  service: String,
  action: String,
  est_ms: { type: Number, default: 100 },
  est_cost: { type: Number, default: 0 },
  tags: [String],
  category: String,
}, { timestamps: true });

const ExecutionLogSchema = new mongoose.Schema({
  planId: { type: String, required: true, index: true },
  stepOrder: { type: Number, required: true },
  event: { type: String, enum: ['started', 'completed', 'failed', 'retry', 'skipped'] },
  timestamp: { type: Date, default: Date.now },
  duration_ms: Number,
  result: mongoose.Schema.Types.Mixed,
  error: String,
}, { timestamps: true });

const Plan = mongoose.model('Plan', PlanSchema);
const StepTemplate = mongoose.model('StepTemplate', StepTemplateSchema);
const ExecutionLog = mongoose.model('ExecutionLog', ExecutionLogSchema);

// ============================================================================
// Validation schemas
// ============================================================================
const createStepSchema = z.object({
  order: z.number().int().positive(),
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  service: z.string().max(100).optional(),
  action: z.string().max(100).optional(),
  est_ms: z.number().int().positive().optional(),
  depends_on: z.array(z.number().int().nonnegative()).optional(),
  retry: z.number().int().min(0).max(10).optional(),
  timeout_ms: z.number().int().positive().optional(),
});

const createPlanSchema = z.object({
  userId: z.string().max(100).optional(),
  goal: z.string().min(1).max(500),
  description: z.string().max(1000).optional(),
  category: z.enum(['personal', 'professional', 'health', 'financial', 'learning', 'creative', 'other']).optional(),
  priority: z.enum([1, 2, 3, 4, 5]).optional(),
  steps: z.array(createStepSchema).min(1),
  constraints: z.object({
    max_total_ms: z.number().int().positive().optional(),
    max_retries: z.number().int().min(0).max(10).optional(),
    parallel: z.boolean().optional(),
  }).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const generatePlanSchema = z.object({
  userId: z.string().max(100).optional(),
  goal: z.string().min(1).max(500),
  category: z.enum(['personal', 'professional', 'health', 'financial', 'learning', 'creative', 'other']).optional(),
  priority: z.enum([1, 2, 3, 4, 5]).optional(),
  context: z.record(z.unknown()).optional(),
});

// ============================================================================
// Helpers
// ============================================================================
const app = express();
app.use(helmet()); app.use(cors()); app.use(compression()); app.use(express.json({ limit: '2mb' }));
const reqI = (req, res, next) => { if (req.headers['x-internal-token'] !== INTERNAL_TOKEN) return res.status(401).json({ success: false }); next(); };
const send = (res, s, d, c = 200) => res.status(c).json({ success: true, data: d, meta: { timestamp: new Date().toISOString() } });
const errR = (res, s, code, msg) => res.status(s).json({ success: false, error: { code, message: msg }, meta: { timestamp: new Date().toISOString() } });

// DAG cycle detection using DFS
function detectCycle(steps) {
  const orderToStep = new Map(steps.map(s => [s.order, s]));
  const visiting = new Set();
  const visited = new Set();
  let cycle = null;
  function dfs(order) {
    if (visited.has(order)) return;
    if (visiting.has(order)) { cycle = order; return; }
    visiting.add(order);
    const s = orderToStep.get(order);
    if (s) for (const d of (s.depends_on || [])) dfs(d);
    visiting.delete(order);
    visited.add(order);
  }
  for (const s of steps) dfs(s.order);
  return cycle;
}

// Topological sort (Kahn's algorithm)
function topologicalSort(steps) {
  const orderToStep = new Map(steps.map(s => [s.order, s]));
  const inDeg = new Map(steps.map(s => [s.order, 0]));
  const adj = new Map(steps.map(s => [s.order, []]));

  for (const s of steps) {
    for (const d of (s.depends_on || [])) {
      adj.get(d)?.push(s.order);
      inDeg.set(s.order, (inDeg.get(s.order) || 0) + 1);
    }
  }

  const queue = [...inDeg.entries()].filter(([, v]) => v === 0).map(([k]) => k);
  const result = [];
  while (queue.length) {
    const cur = queue.shift();
    result.push(orderToStep.get(cur));
    for (const nxt of (adj.get(cur) || [])) {
      inDeg.set(nxt, inDeg.get(nxt) - 1);
      if (inDeg.get(nxt) === 0) queue.push(nxt);
    }
  }
  return result;
}

// Critical path calculation (longest dependency chain)
function computeCriticalPath(steps) {
  const sorted = [...steps].sort((a, b) => a.order - b.order);
  const dur = (s) => s.est_ms || 100;
  const finish = new Map();

  // First pass: forward pass (in topological order)
  for (const s of sorted) {
    const preds = (s.depends_on || []).map(o => sorted.find(x => x.order === o)).filter(Boolean);
    const predMax = preds.length ? Math.max(...preds.map(p => finish.get(p.order) || 0)) : 0;
    finish.set(s.order, predMax + dur(s));
  }

  const total = Math.max(...[...finish.values()], 0);

  // Second pass: backward pass to find critical path
  const critSet = new Set();
  let maxFinish = total;
  for (const s of [...sorted].reverse()) {
    const succs = sorted.filter(x => (x.depends_on || []).includes(s.order));
    const succMax = succs.length ? Math.max(...succs.map(x => finish.get(x.order) || 0)) : total;
    if (Math.abs((finish.get(s.order) || 0) + (succMax - total) - maxFinish) < 1) {
      critSet.add(s.order);
      maxFinish = finish.get(s.order) || 0;
    }
  }

  return {
    total_ms: total,
    critical_path: [...critSet].sort((a, b) => a - b),
    step_finishes: Object.fromEntries([...finish.entries()]),
  };
}

// LLM-powered step generation (calls genie-gateway or falls back to rule-based)
async function generateStepsFromLLM(goal, category, context) {
  const genieGateway = SPECIALIST_URLS.calendar ? `${SPECIALIST_URLS.calendar.replace('/4709', '')}/4701` : null;

  // Try the genie gateway for LLM-based decomposition
  if (genieGateway) {
    try {
      const response = await axios.post(`${genieGateway}/api/ai/decompose`, {
        goal,
        category,
        context,
      }, { timeout: 8000 });
      if (response.data?.steps) return response.data.steps;
    } catch {
      // Fall through to rule-based
    }
  }

  // Rule-based step generation (guaranteed fallback)
  return generateRuleBasedSteps(goal, category);
}

// Rule-based step generation
function generateRuleBasedSteps(goal, category) {
  const g = goal.toLowerCase();

  // Common step templates
  const authStep = { order: 1, name: 'auth_check', description: 'Verify user authentication', service: 'corpid', action: 'verify_token', est_ms: 50, depends_on: [] };
  const memoryCheck = { order: 2, name: 'check_memory', description: 'Check existing memories for context', service: 'memory', action: 'retrieve', est_ms: 80, depends_on: [1] };
  const twinRead = { order: 3, name: 'read_twin', description: 'Read relevant digital twin data', service: 'twins', action: 'get', est_ms: 60, depends_on: [1] };

  // Category-specific steps
  const steps = [];

  if (category === 'health' || g.includes('health') || g.includes('fitness') || g.includes('workout') || g.includes('sleep')) {
    steps.push(
      { ...authStep, order: 1 },
      { ...memoryCheck, order: 2, depends_on: [1] },
      {
        order: 3, name: 'fetch_wellness_data', description: 'Get latest wellness metrics', service: 'wellness', action: 'get_metrics', est_ms: 120, depends_on: [1],
      },
      {
        order: 4, name: 'generate_health_insight', description: 'Analyze wellness data and generate insights', service: 'wellness', action: 'analyze', est_ms: 200, depends_on: [3],
      },
      {
        order: 5, name: 'update_health_plan', description: 'Update health plan based on insights', service: 'twins', action: 'update', est_ms: 80, depends_on: [4],
      },
    );
  } else if (category === 'financial' || g.includes('budget') || g.includes('money') || g.includes('finance') || g.includes('expense')) {
    steps.push(
      { ...authStep, order: 1 },
      { ...twinRead, order: 2, depends_on: [1] },
      {
        order: 3, name: 'fetch_financial_data', description: 'Get current financial status', service: 'money', action: 'get_balance', est_ms: 100, depends_on: [1],
      },
      {
        order: 4, name: 'analyze_spending', description: 'Analyze spending patterns', service: 'money', action: 'analyze', est_ms: 150, depends_on: [3],
      },
      {
        order: 5, name: 'suggest_budget', description: 'Generate budget recommendations', service: 'money', action: 'suggest', est_ms: 120, depends_on: [4],
      },
      {
        order: 6, name: 'update_financial_plan', description: 'Update financial plan in twin', service: 'twins', action: 'update', est_ms: 80, depends_on: [5],
      },
    );
  } else if (category === 'learning' || g.includes('learn') || g.includes('course') || g.includes('study') || g.includes('education')) {
    steps.push(
      { ...authStep, order: 1 },
      { ...twinRead, order: 2, depends_on: [1] },
      {
        order: 3, name: 'find_learning_resources', description: 'Search for relevant courses and materials', service: 'lifeuni', action: 'search', est_ms: 200, depends_on: [1],
      },
      {
        order: 4, name: 'assess_skill_level', description: 'Assess current skill level', service: 'memory', action: 'retrieve', est_ms: 100, depends_on: [2],
      },
      {
        order: 5, name: 'create_learning_path', description: 'Create personalized learning path', service: 'lifeuni', action: 'enroll', est_ms: 150, depends_on: [3, 4],
      },
    );
  } else if (g.includes('schedule') || g.includes('meeting') || g.includes('calendar') || g.includes('appointment')) {
    steps.push(
      { ...authStep, order: 1 },
      {
        order: 2, name: 'check_calendar', description: 'Check existing calendar events', service: 'calendar', action: 'get_events', est_ms: 100, depends_on: [1],
      },
      {
        order: 3, name: 'find_availability', description: 'Find available time slots', service: 'calendar', action: 'find_free', est_ms: 80, depends_on: [2],
      },
      {
        order: 4, name: 'create_event', description: 'Create calendar event', service: 'calendar', action: 'create', est_ms: 100, depends_on: [3],
      },
      {
        order: 5, name: 'send_invites', description: 'Send event invitations', service: 'calendar', action: 'invite', est_ms: 120, depends_on: [4],
      },
    );
  } else if (g.includes('shop') || g.includes('buy') || g.includes('purchase') || g.includes('order')) {
    steps.push(
      { ...authStep, order: 1 },
      { ...twinRead, order: 2, depends_on: [1] },
      {
        order: 3, name: 'search_products', description: 'Search for products', service: 'shopping', action: 'search', est_ms: 150, depends_on: [1],
      },
      {
        order: 4, name: 'compare_prices', description: 'Compare prices across sources', service: 'shopping', action: 'compare', est_ms: 200, depends_on: [3],
      },
      {
        order: 5, name: 'check_inventory', description: 'Verify product availability', service: 'shopping', action: 'check', est_ms: 100, depends_on: [3],
      },
      {
        order: 6, name: 'process_order', description: 'Place the order', service: 'shopping', action: 'order', est_ms: 180, depends_on: [4, 5],
      },
    );
  } else if (g.includes('create') || g.includes('write') || g.includes('design') || g.includes('build') || g.includes('project')) {
    steps.push(
      { ...authStep, order: 1 },
      { ...memoryCheck, order: 2, depends_on: [1] },
      { ...twinRead, order: 3, depends_on: [1] },
      {
        order: 4, name: 'gather_requirements', description: 'Gather project requirements and constraints', service: 'memory', action: 'search', est_ms: 150, depends_on: [2, 3],
      },
      {
        order: 5, name: 'draft_content', description: 'Create initial draft', service: 'twins', action: 'update', est_ms: 500, depends_on: [4],
      },
      {
        order: 6, name: 'review_and_refine', description: 'Review and refine the output', service: 'memory', action: 'store', est_ms: 300, depends_on: [5],
      },
      {
        order: 7, name: 'finalize_deliverable', description: 'Finalize and store the deliverable', service: 'twins', action: 'update', est_ms: 100, depends_on: [6],
      },
    );
  } else {
    // Generic plan
    steps.push(
      { ...authStep, order: 1 },
      { ...memoryCheck, order: 2, depends_on: [1] },
      { ...twinRead, order: 3, depends_on: [1] },
      {
        order: 4, name: 'analyze_goal', description: 'Analyze the goal and context', service: 'memory', action: 'search', est_ms: 200, depends_on: [2, 3],
      },
      {
        order: 5, name: 'generate_recommendations', description: 'Generate recommendations based on analysis', service: 'twins', action: 'update', est_ms: 300, depends_on: [4],
      },
      {
        order: 6, name: 'store_insights', description: 'Store insights in memory', service: 'memory', action: 'store', est_ms: 100, depends_on: [5],
      },
    );
  }

  return steps;
}

// Execute a single step (mock execution with service calls)
async function executeStep(planId, step, userId) {
  const start = Date.now();
  await ExecutionLog.create({ planId, stepOrder: step.order, event: 'started', duration_ms: 0 });

  try {
    let result = { executed: true, step: step.name, timestamp: new Date().toISOString() };

    // Call the actual service if configured
    const svcUrl = SPECIALIST_URLS[step.service];
    if (svcUrl && step.action) {
      try {
        const response = await axios.post(`${svcUrl}/api/${step.action}`, {
          userId,
          step: step.name,
          context: { planId, stepOrder: step.order },
        }, { timeout: step.timeout_ms || 30000 });
        result = { ...result, ...response.data };
      } catch (svcErr) {
        // Service call failed — log but don't fail the step (plan can continue)
        result = { ...result, warning: `Service call failed: ${svcErr.message}`, fallback: true };
      }
    }

    const duration = Date.now() - start;
    await ExecutionLog.create({ planId, stepOrder: step.order, event: 'completed', duration_ms: duration, result });
    return { status: 'completed', result, duration_ms: duration };
  } catch (err) {
    const duration = Date.now() - start;
    await ExecutionLog.create({ planId, stepOrder: step.order, event: 'failed', duration_ms: duration, error: err.message });
    return { status: 'failed', error: err.message, duration_ms: duration };
  }
}

// Execute a plan (sequential topological order)
async function executePlan(planId, userId) {
  const plan = await Plan.findOne({ planId });
  if (!plan) throw new Error('Plan not found');

  await Plan.findOneAndUpdate({ planId }, { $set: { status: 'running', started_at: new Date() } });

  const sorted = topologicalSort(plan.steps);
  const results = [];

  for (const step of sorted) {
    // Check if all dependencies completed
    const depsCompleted = (step.depends_on || []).every(depOrder =>
      results.find(r => r.order === depOrder)?.status === 'completed'
    );

    if (!depsCompleted) {
      await ExecutionLog.create({ planId, stepOrder: step.order, event: 'skipped', error: 'Dependencies not met' });
      await Plan.updateOne({ planId, 'steps.order': step.order }, { $set: { 'steps.$.status': 'skipped' } });
      continue;
    }

    const result = await executeStep(planId, step, userId || plan.userId);

    // Update step in plan
    await Plan.updateOne(
      { planId, 'steps.order': step.order },
      { $set: { 'steps.$.status': result.status, 'steps.$.result': result.result, 'steps.$.error': result.error, 'steps.$.completed_at': new Date() } }
    );

    results.push({ order: step.order, ...result });

    // Check constraints
    const totalMs = results.reduce((sum, r) => sum + (r.duration_ms || 0), 0);
    if (totalMs > (plan.constraints?.max_total_ms || 300000)) {
      await Plan.findOneAndUpdate({ planId }, { $set: { status: 'failed', completed_at: new Date(), 'metadata.failure_reason': 'max_total_ms exceeded' } });
      return { status: 'failed', reason: 'max_total_ms exceeded', results };
    }
  }

  const failed = results.filter(r => r.status === 'failed').length;
  const totalMs = results.reduce((sum, r) => sum + (r.duration_ms || 0), 0);
  const progress = Math.round(((results.filter(r => r.status === 'completed').length) / plan.steps.length) * 100);

  const finalStatus = failed > 0 ? (failed === results.length ? 'failed' : 'completed') : 'completed';
  await Plan.findOneAndUpdate({ planId }, {
    $set: {
      status: finalStatus,
      completed_at: new Date(),
      progress,
      actual_total_ms: totalMs,
    }
  });

  return { status: finalStatus, results, total_ms: totalMs, progress };
}

// Seed step templates
async function seedTemplates() {
  const count = await StepTemplate.countDocuments();
  if (count > 0) return;

  const templates = [
    { name: 'auth_check', description: 'Verify user authentication', service: 'corpid', action: 'verify_token', est_ms: 50, category: 'security', tags: ['auth', 'security'] },
    { name: 'fetch_customer', description: 'Get customer profile', service: 'twins', action: 'get_customer', est_ms: 80, category: 'data', tags: ['customer', 'profile'] },
    { name: 'check_inventory', description: 'Check product inventory', service: 'twins', action: 'get_inventory', est_ms: 120, category: 'commerce', tags: ['inventory', 'product'] },
    { name: 'process_payment', description: 'Process payment', service: 'money', action: 'charge', est_ms: 300, est_cost: 0.029, category: 'commerce', tags: ['payment', 'transaction'] },
    { name: 'send_notification', description: 'Send push notification', service: 'memory', action: 'notify', est_ms: 50, category: 'communication', tags: ['notification', 'push'] },
    { name: 'update_twin', description: 'Update digital twin state', service: 'twins', action: 'update', est_ms: 60, category: 'data', tags: ['twin', 'state'] },
    { name: 'fetch_calendar', description: 'Get calendar events', service: 'calendar', action: 'get_events', est_ms: 100, category: 'productivity', tags: ['calendar', 'schedule'] },
    { name: 'fetch_wellness', description: 'Get wellness metrics', service: 'wellness', action: 'get_metrics', est_ms: 120, category: 'health', tags: ['health', 'wellness'] },
    { name: 'analyze_spending', description: 'Analyze spending patterns', service: 'money', action: 'analyze', est_ms: 200, category: 'finance', tags: ['budget', 'analysis'] },
    { name: 'search_courses', description: 'Search learning resources', service: 'lifeuni', action: 'search', est_ms: 180, category: 'learning', tags: ['learning', 'courses'] },
  ];

  await StepTemplate.insertMany(templates.map(t => ({ ...t, _id: undefined })));
  console.log(`[planning-engine] seeded ${templates.length} step templates`);
}

// ============================================================================
// Routes
// ============================================================================

// Health & readiness
app.get('/health', (_req, res) => send(res, 200, { service: 'planning-engine', port: PORT, status: 'healthy' }));
app.get('/ready', (_req, res) => res.json({ ready: true, timestamp: new Date().toISOString() }));

// Step templates
app.get('/api/templates', async (_req, res, next) => {
  try {
    const { category, tag } = _req.query;
    const filter = {};
    if (category) filter.category = category;
    if (tag) filter.tags = tag;
    const items = await StepTemplate.find(filter);
    send(res, 200, { count: items.length, templates: items });
  } catch (e) { next(e); }
});

app.post('/api/templates', reqI, async (req, res, next) => {
  try {
    const { name, description, service, action, est_ms, est_cost, tags, category } = req.body;
    if (!name) return errR(res, 400, 'VALIDATION_ERROR', 'name is required');
    const existing = await StepTemplate.findOne({ name });
    if (existing) return errR(res, 409, 'DUPLICATE', 'Template with this name already exists');
    const t = await StepTemplate.create({ name, description, service, action, est_ms, est_cost, tags, category });
    send(res, 201, { template: t });
  } catch (e) { next(e); }
});

// Plan CRUD
app.post('/api/plans', requireAuth, async (req, res, next) => {
  try {
    const data = createPlanSchema.parse(req.body);

    // Validate no cycles
    const cycle = detectCycle(data.steps);
    if (cycle !== null) return errR(res, 400, 'CYCLE_DETECTED', `Cycle detected at step order ${cycle}`);

    const planId = `PLN-${Date.now().toString(36).toUpperCase()}-${uuid().slice(0, 4).toUpperCase()}`;
    const critical = computeCriticalPath(data.steps);

    const plan = await Plan.create({
      ...data,
      planId,
      status: 'ready',
      critical_path: critical.critical_path,
      estimated_total_ms: critical.total_ms,
    });

    send(res, 201, { planId: plan.planId, goal: plan.goal, status: plan.status, step_count: plan.steps.length, estimated_total_ms: critical.total_ms, critical_path: critical.critical_path });
  } catch (e) {
    if (e instanceof z.ZodError) return errR(res, 400, 'VALIDATION_ERROR', e.errors.map(x => `${x.path.join('.')}: ${x.message}`).join(', '));
    next(e);
  }
});

app.get('/api/plans', reqI, async (req, res, next) => {
  try {
    const { userId, status, category, limit = 50 } = req.query;
    const filter = {};
    if (userId) filter.userId = userId;
    if (status) filter.status = status;
    if (category) filter.category = category;
    const items = await Plan.find(filter).sort({ createdAt: -1 }).limit(parseInt(limit, 10));
    send(res, 200, { count: items.length, plans: items.map(p => ({ planId: p.planId, goal: p.goal, status: p.status, progress: p.progress, category: p.category, priority: p.priority, step_count: p.steps.length, createdAt: p.createdAt })) });
  } catch (e) { next(e); }
});

app.get('/api/plans/:planId', reqI, async (req, res, next) => {
  try {
    const p = await Plan.findOne({ planId: req.params.planId });
    if (!p) return errR(res, 404, 'NOT_FOUND', 'Plan not found');
    send(res, 200, { plan: p });
  } catch (e) { next(e); }
});

app.delete('/api/plans/:planId', reqI, async (req, res, next) => {
  try {
    const result = await Plan.deleteOne({ planId: req.params.planId });
    if (result.deletedCount === 0) return errR(res, 404, 'NOT_FOUND', 'Plan not found');
    await ExecutionLog.deleteMany({ planId: req.params.planId });
    send(res, 200, { deleted: req.params.planId });
  } catch (e) { next(e); }
});

// LLM-powered plan generation
app.post('/api/plans/generate', requireAuth, async (req, res, next) => {
  try {
    const data = generatePlanSchema.parse(req.body);
    const steps = await generateStepsFromLLM(data.goal, data.category || 'personal', data.context);

    const cycle = detectCycle(steps);
    if (cycle !== null) return errR(res, 400, 'CYCLE_DETECTED', `Generated plan has cycle at step ${cycle}`);

    const planId = `PLN-${Date.now().toString(36).toUpperCase()}-${uuid().slice(0, 4).toUpperCase()}`;
    const critical = computeCriticalPath(steps);

    const plan = await Plan.create({
      userId: data.userId,
      goal: data.goal,
      category: data.category || 'personal',
      priority: data.priority || 3,
      steps,
      constraints: { max_total_ms: 300000, max_retries: 2 },
      status: 'ready',
      critical_path: critical.critical_path,
      estimated_total_ms: critical.total_ms,
      metadata: { generated: true, generation_method: 'llm_or_rule_based' },
    });

    send(res, 201, {
      planId: plan.planId,
      goal: plan.goal,
      status: plan.status,
      steps: plan.steps.map(s => ({ order: s.order, name: s.name, description: s.description, service: s.service, depends_on: s.depends_on, est_ms: s.est_ms })),
      estimated_total_ms: critical.total_ms,
      critical_path: critical.critical_path,
    });
  } catch (e) {
    if (e instanceof z.ZodError) return errR(res, 400, 'VALIDATION_ERROR', e.errors.map(x => `${x.path.join('.')}: ${x.message}`).join(', '));
    next(e);
  }
});

// Plan execution
app.post('/api/plans/:planId/execute', reqI, async (req, res, next) => {
  try {
    const p = await Plan.findOne({ planId: req.params.planId });
    if (!p) return errR(res, 404, 'NOT_FOUND', 'Plan not found');
    if (p.status === 'running') return errR(res, 409, 'ALREADY_RUNNING', 'Plan is already executing');
    if (p.status === 'completed') return errR(res, 409, 'ALREADY_COMPLETED', 'Plan is already completed');

    // Fire and forget
    const userId = req.body?.userId || p.userId;
    executePlan(p.planId, userId).catch(err => console.error(`[planning-engine] plan ${p.planId} execution error:`, err.message));

    send(res, 202, { planId: p.planId, status: 'running', message: 'Plan execution started' });
  } catch (e) { next(e); }
});

app.post('/api/plans/:planId/pause', reqI, async (req, res, next) => {
  try {
    const p = await Plan.findOneAndUpdate({ planId: req.params.planId, status: 'running' }, { $set: { status: 'paused' } }, { new: true });
    if (!p) return errR(res, 404, 'NOT_FOUND', 'Plan not found or not running');
    send(res, 200, { planId: p.planId, status: p.status });
  } catch (e) { next(e); }
});

app.post('/api/plans/:planId/resume', reqI, async (req, res, next) => {
  try {
    const p = await Plan.findOneAndUpdate({ planId: req.params.planId, status: 'paused' }, { $set: { status: 'running' } }, { new: true });
    if (!p) return errR(res, 404, 'NOT_FOUND', 'Plan not found or not paused');
    executePlan(p.planId, p.userId).catch(err => console.error(`[planning-engine] plan ${p.planId} resume error:`, err.message));
    send(res, 200, { planId: p.planId, status: 'running' });
  } catch (e) { next(e); }
});

// DAG validation
app.get('/api/plans/:planId/validate', reqI, async (req, res, next) => {
  try {
    const p = await Plan.findOne({ planId: req.params.planId });
    if (!p) return errR(res, 404, 'NOT_FOUND', 'Plan not found');
    const cycle = detectCycle(p.steps);
    const sorted = topologicalSort(p.steps);
    send(res, 200, { valid: cycle === null, has_cycle: cycle !== null, cycle_at: cycle, step_count: p.steps.length, execution_order: sorted.map(s => s.order) });
  } catch (e) { next(e); }
});

// Critical path analysis
app.get('/api/plans/:planId/critical-path', reqI, async (req, res, next) => {
  try {
    const p = await Plan.findOne({ planId: req.params.planId });
    if (!p) return errR(res, 404, 'NOT_FOUND', 'Plan not found');
    const cp = computeCriticalPath(p.steps);
    send(res, 200, { planId: p.planId, ...cp, steps: p.steps.map(s => ({ order: s.order, name: s.name, est_ms: s.est_ms, finish_ms: cp.step_finishes[s.order], on_critical_path: cp.critical_path.includes(s.order) })) });
  } catch (e) { next(e); }
});

// Execution logs
app.get('/api/plans/:planId/logs', reqI, async (req, res, next) => {
  try {
    const { limit = 100 } = req.query;
    const logs = await ExecutionLog.find({ planId: req.params.planId }).sort({ timestamp: -1 }).limit(parseInt(limit, 10));
    send(res, 200, { count: logs.length, logs });
  } catch (e) { next(e); }
});

// Stats
app.get('/api/stats', reqI, async (_req, res, next) => {
  try {
    const [total, draft, running, completed, failed] = await Promise.all([
      Plan.countDocuments(),
      Plan.countDocuments({ status: 'draft' }),
      Plan.countDocuments({ status: 'running' }),
      Plan.countDocuments({ status: 'completed' }),
      Plan.countDocuments({ status: 'failed' }),
    ]);
    send(res, 200, { plans: { total, draft, running, completed, failed }, templates: await StepTemplate.countDocuments() });
  } catch (e) { next(e); }
});

// Global error handler — ensures all errors return JSON (prevents Express HTML pages)
app.use((err, _req, res, _next) => {
  console.error(`[planning-engine] Error: ${err.message}`);
  const status = err.statusCode || err.status || 500;
  res.status(status).json({
    success: false,
    error: { code: err.name || 'INTERNAL_ERROR', message: err.message || 'Internal server error' },
    meta: { timestamp: new Date().toISOString() },
  });
});

// ============================================================================
// Startup
// ============================================================================
async function start() {
  try { await mongoose.connect(MONGODB_URI); console.log(`[planning-engine] MongoDB connected`); }
  catch (err) { console.error(`[planning-engine] MongoDB failed:`, err.message); setTimeout(start, 5000); return; }

  await seedTemplates();

  if (process.env.NODE_ENV !== 'test' && !process.env.SUPPRESS_LISTEN) {
    const server = app.listen(PORT, () => console.log(`[planning-engine] listening on :${PORT}`));
    installGracefulShutdown(server);
  }
}
start();
export { app };
