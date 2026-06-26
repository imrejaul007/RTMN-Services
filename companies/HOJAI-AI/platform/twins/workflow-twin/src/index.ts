/**
 * Workflow Twin Service
 * Port: 4741
 *
 * Captures and learns workflow patterns:
 * - Task sequences
 * - Approval chains
 * - Tool usage patterns
 * - SOP generation
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = parseInt(process.env.PORT || '4741', 10);
const VERSION = '1.0.0';

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));

app.use((req: Request, _res: Response, next: NextFunction) => {
  (req as any).requestId = req.headers['x-request-id'] as string || uuidv4();
  next();
});

morgan.token('request-id', (req: Request) => (req as any).requestId);
app.use(morgan(':request-id :method :url :status :response-time ms'));

// ============================================================
// TYPES
// ============================================================

interface WorkflowTrigger {
  type: 'event' | 'schedule' | 'manual';
  eventType?: string;
  schedule?: string;
  enabled: boolean;
}

interface WorkflowStep {
  id: string;
  order: number;
  name: string;
  action: string;
  tool: string;
  expectedOutput?: string;
  alternatePaths: string[];
  avgDuration: number;
  successConditions: string[];
  canBeSkipped: boolean;
  requiresApproval: boolean;
  approverRole?: string;
}

interface ApprovalStep {
  id: string;
  order: number;
  name: string;
  threshold: number;
  approvers: string[];
  escalationTimeout?: number;
}

interface WorkflowPattern {
  id: string;
  employeeId: string;
  name: string;
  description?: string;
  trigger: WorkflowTrigger;
  steps: WorkflowStep[];
  approvals: ApprovalStep[];
  tools: string[];
  avgDuration: number;
  frequency: number;
  successRate: number;
  confidence: number;
  variations: number;
  learnedFrom: number;
  lastTriggered?: string;
  status: 'active' | 'paused' | 'archived';
  createdAt: string;
  updatedAt: string;
}

interface TaskSequence {
  id: string;
  employeeId: string;
  workflowId?: string;
  name: string;
  steps: {
    type: string;
    tool?: string;
    action?: string;
    duration?: number;
    outcome?: string;
  }[];
  startTime: string;
  endTime?: string;
  totalDuration?: number;
  outcome?: 'completed' | 'failed' | 'cancelled' | 'pending';
}

interface ObservedAction {
  id: string;
  employeeId: string;
  tool: string;
  action: string;
  target: string;
  timestamp: string;
  duration?: number;
  outcome: 'success' | 'failure';
  context?: Record<string, any>;
}

// ============================================================
// STORAGE
// ============================================================

const workflows = new Map<string, WorkflowPattern>();
const sequences = new Map<string, TaskSequence>();
const actions = new Map<string, ObservedAction>();

// ============================================================
// HELPERS
// ============================================================

function generateId(prefix: string = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${uuidv4().slice(0, 8)}`;
}

// ============================================================
// ERROR HANDLER
// ============================================================

interface ApiError extends Error {
  statusCode?: number;
  code?: string;
}

const errorHandler = (err: ApiError, _req: Request, res: Response, _next: NextFunction): void => {
  console.error(`[Error] ${(_req as any).requestId}:`, err.message);
  res.status(err.statusCode || 500).json({
    success: false,
    error: { code: err.code || 'INTERNAL_ERROR', message: err.message }
  });
};

// ============================================================
// ROUTES
// ============================================================

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'workflow-twin',
    version: VERSION,
    timestamp: new Date().toISOString(),
    stats: {
      workflows: workflows.size,
      sequences: sequences.size,
      actions: actions.size
    }
  });
});

app.get('/ready', (_req: Request, res: Response) => {
  res.json({ ready: true, service: 'workflow-twin', timestamp: new Date().toISOString() });
});

// ============================================================
// OBSERVATION
// ============================================================

/**
 * Record a workflow action
 */
app.post('/api/twin/:employeeId/workflow/observe', (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const { tool, action, target, duration, outcome, context } = req.body;

    if (!tool || !action || !target) {
      const err: ApiError = new Error('tool, action, and target are required');
      err.statusCode = 400;
      throw err;
    }

    const observedAction: ObservedAction = {
      id: generateId('action'),
      employeeId,
      tool,
      action,
      target,
      timestamp: new Date().toISOString(),
      duration,
      outcome: outcome || 'success',
      context
    };

    actions.set(observedAction.id, observedAction);

    // Try to detect workflow patterns
    const employeeActions = Array.from(actions.values())
      .filter(a => a.employeeId === employeeId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Detect if this forms a workflow
    if (employeeActions.length >= 3) {
      const last3 = employeeActions.slice(-3);
      const pattern = detectWorkflowPattern(last3);
      if (pattern) {
        pattern.frequency += 1;
        pattern.lastTriggered = new Date().toISOString();
        pattern.learnedFrom += 1;
        pattern.confidence = Math.min(100, pattern.learnedFrom * 5);
      }
    }

    res.status(201).json({ success: true, data: { action: observedAction, suggestions: [] } });
  } catch (err) {
    const error = err as ApiError;
    res.status(error.statusCode || 500).json({ success: false, error: { code: 'OBSERVE_ERROR', message: error.message } });
  }
});

/**
 * Detect workflow patterns from action sequence
 */
function detectWorkflowPattern(actionSequence: ObservedAction[]): WorkflowPattern | null {
  if (actionSequence.length < 3) return null;

  const tools = actionSequence.map(a => a.tool);
  const actions = actionSequence.map(a => a.action);

  // Simple pattern detection
  const patternKey = tools.join('->');
  const existingPattern = Array.from(workflows.values()).find(
    p => p.tools.join('->') === patternKey
  );

  if (existingPattern) return existingPattern;

  // Create new pattern
  const newPattern: WorkflowPattern = {
    id: generateId('workflow'),
    employeeId: actionSequence[0].employeeId,
    name: `Auto-detected: ${tools.slice(0, 3).join(' -> ')}`,
    trigger: { type: 'event', enabled: true },
    steps: actionSequence.map((a, i) => ({
      id: generateId('step'),
      order: i,
      name: a.action,
      action: a.action,
      tool: a.tool,
      alternatePaths: [],
      avgDuration: a.duration || 0,
      successConditions: [],
      canBeSkipped: false,
      requiresApproval: false
    })),
    approvals: [],
    tools,
    avgDuration: actionSequence.reduce((sum, a) => sum + (a.duration || 0), 0),
    frequency: 1,
    successRate: actionSequence.filter(a => a.outcome === 'success').length / actionSequence.length,
    confidence: 20,
    variations: 1,
    learnedFrom: 1,
    lastTriggered: new Date().toISOString(),
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  workflows.set(newPattern.id, newPattern);
  return newPattern;
}

/**
 * Batch observe actions
 */
app.post('/api/twin/:employeeId/workflow/batch-observe', (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const { actions: actionList } = req.body;

    if (!Array.isArray(actionList)) {
      const err: ApiError = new Error('actions must be an array');
      err.statusCode = 400;
      throw err;
    }

    const created = [];
    for (const action of actionList) {
      const observedAction: ObservedAction = {
        id: generateId('action'),
        employeeId,
        tool: action.tool,
        action: action.action,
        target: action.target,
        timestamp: action.timestamp || new Date().toISOString(),
        duration: action.duration,
        outcome: action.outcome || 'success',
        context: action.context
      };
      actions.set(observedAction.id, observedAction);
      created.push(observedAction);
    }

    res.status(201).json({ success: true, data: { created: created.length, actions: created } });
  } catch (err) {
    const error = err as ApiError;
    res.status(error.statusCode || 500).json({ success: false, error: { code: 'BATCH_ERROR', message: error.message } });
  }
});

/**
 * Get observed actions
 */
app.get('/api/twin/:employeeId/workflow/actions', (req: Request, res: Response) => {
  const { employeeId } = req.params;
  const { limit = 50, tool, action: actionFilter } = req.query;

  let employeeActions = Array.from(actions.values())
    .filter(a => a.employeeId === employeeId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (tool) employeeActions = employeeActions.filter(a => a.tool === tool);
  if (actionFilter) employeeActions = employeeActions.filter(a => a.action === actionFilter);

  res.json({ success: true, data: { actions: employeeActions.slice(0, Number(limit)), total: employeeActions.length } });
});

// ============================================================
// WORKFLOWS
// ============================================================

/**
 * Get workflow patterns
 */
app.get('/api/twin/:employeeId/workflow/patterns', (req: Request, res: Response) => {
  const { employeeId } = req.params;
  const { status, tool } = req.query;

  let employeeWorkflows = Array.from(workflows.values())
    .filter(w => w.employeeId === employeeId)
    .sort((a, b) => b.confidence - a.confidence);

  if (status) employeeWorkflows = employeeWorkflows.filter(w => w.status === status);
  if (tool) employeeWorkflows = employeeWorkflows.filter(w => w.tools.includes(tool as string));

  res.json({ success: true, data: { workflows: employeeWorkflows, total: employeeWorkflows.length } });
});

/**
 * Create a workflow pattern
 */
app.post('/api/twin/:employeeId/workflow/patterns', (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const { name, description, trigger, steps, approvals, tools } = req.body;

    if (!name || !steps || !Array.isArray(steps)) {
      const err: ApiError = new Error('name and steps (array) are required');
      err.statusCode = 400;
      throw err;
    }

    const workflow: WorkflowPattern = {
      id: generateId('workflow'),
      employeeId,
      name,
      description,
      trigger: trigger || { type: 'manual', enabled: true },
      steps: steps.map((s: any, i: number) => ({
        id: s.id || generateId('step'),
        order: i,
        name: s.name || s.action,
        action: s.action,
        tool: s.tool,
        expectedOutput: s.expectedOutput,
        alternatePaths: s.alternatePaths || [],
        avgDuration: s.avgDuration || 0,
        successConditions: s.successConditions || [],
        canBeSkipped: s.canBeSkipped || false,
        requiresApproval: s.requiresApproval || false,
        approverRole: s.approverRole
      })),
      approvals: approvals || [],
      tools: tools || steps.map((s: any) => s.tool).filter(Boolean),
      avgDuration: steps.reduce((sum: number, s: any) => sum + (s.avgDuration || 0), 0),
      frequency: 0,
      successRate: 1,
      confidence: 100,
      variations: 1,
      learnedFrom: 0,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    workflows.set(workflow.id, workflow);
    res.status(201).json({ success: true, data: workflow });
  } catch (err) {
    const error = err as ApiError;
    res.status(error.statusCode || 500).json({ success: false, error: { code: 'CREATE_ERROR', message: error.message } });
  }
});

/**
 * Get workflow by ID
 */
app.get('/api/twin/:employeeId/workflow/patterns/:workflowId', (req: Request, res: Response) => {
  const { workflowId } = req.params;
  const workflow = workflows.get(workflowId);

  if (!workflow) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Workflow not found' } });
  }

  res.json({ success: true, data: workflow });
});

/**
 * Update workflow
 */
app.patch('/api/twin/:employeeId/workflow/patterns/:workflowId', (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;
    const updates = req.body;

    const workflow = workflows.get(workflowId);
    if (!workflow) {
      const err: ApiError = new Error('Workflow not found');
      err.statusCode = 404;
      throw err;
    }

    Object.assign(workflow, updates, { updatedAt: new Date().toISOString() });
    res.json({ success: true, data: workflow });
  } catch (err) {
    const error = err as ApiError;
    res.status(error.statusCode || 500).json({ success: false, error: { code: 'UPDATE_ERROR', message: error.message } });
  }
});

/**
 * Train workflow with more data
 */
app.post('/api/twin/:employeeId/workflow/patterns/:workflowId/train', (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;
    const workflow = workflows.get(workflowId);

    if (!workflow) {
      const err: ApiError = new Error('Workflow not found');
      err.statusCode = 404;
      throw err;
    }

    workflow.learnedFrom += 1;
    workflow.confidence = Math.min(100, workflow.learnedFrom * 5);
    workflow.updatedAt = new Date().toISOString();

    res.json({ success: true, data: { workflow, improvements: [] } });
  } catch (err) {
    const error = err as ApiError;
    res.status(error.statusCode || 500).json({ success: false, error: { code: 'TRAIN_ERROR', message: error.message } });
  }
});

// ============================================================
// SIMULATION
// ============================================================

/**
 * Simulate a workflow
 */
app.post('/api/twin/:employeeId/workflow/simulate', (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const { workflowId, context, dryRun = true } = req.body;

    let workflow: WorkflowPattern | undefined;
    if (workflowId) {
      workflow = workflows.get(workflowId);
    } else {
      // Find most similar workflow based on context
      const employeeWorkflows = Array.from(workflows.values())
        .filter(w => w.employeeId === employeeId && w.status === 'active')
        .sort((a, b) => b.confidence - a.confidence);
      workflow = employeeWorkflows[0];
    }

    if (!workflow) {
      const err: ApiError = new Error('No workflow found to simulate');
      err.statusCode = 404;
      throw err;
    }

    // Calculate estimated duration and confidence
    const estimatedDuration = workflow.avgDuration * (context?.multiplier || 1);
    const estimatedSuccessRate = workflow.successRate * (workflow.confidence / 100);

    res.json({
      success: true,
      data: {
        workflowId: workflow.id,
        workflowName: workflow.name,
        predictedSteps: workflow.steps,
        estimatedDuration,
        confidence: workflow.confidence,
        estimatedSuccessRate,
        warnings: [],
        suggestions: [
          workflow.confidence < 80 ? 'Consider running in dry-run mode first' : null,
          workflow.requiresApproval ? 'This workflow requires approval steps' : null
        ].filter(Boolean),
        dryRun
      }
    });
  } catch (err) {
    const error = err as ApiError;
    res.status(error.statusCode || 500).json({ success: false, error: { code: 'SIMULATE_ERROR', message: error.message } });
  }
});

// ============================================================
// STATS
// ============================================================

app.get('/api/twin/:employeeId/workflow/stats', (req: Request, res: Response) => {
  const { employeeId } = req.params;

  const employeeWorkflows = Array.from(workflows.values()).filter(w => w.employeeId === employeeId);
  const employeeActions = Array.from(actions.values()).filter(a => a.employeeId === employeeId);

  const toolUsage: Record<string, number> = {};
  employeeActions.forEach(a => { toolUsage[a.tool] = (toolUsage[a.tool] || 0) + 1; });

  res.json({
    success: true,
    data: {
      employeeId,
      totalWorkflows: employeeWorkflows.length,
      activeWorkflows: employeeWorkflows.filter(w => w.status === 'active').length,
      totalActions: employeeActions.length,
      avgWorkflowConfidence: employeeWorkflows.length > 0
        ? employeeWorkflows.reduce((sum, w) => sum + w.confidence, 0) / employeeWorkflows.length
        : 0,
      mostUsedTools: Object.entries(toolUsage).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([tool, count]) => ({ tool, count })),
      recentPatterns: employeeWorkflows
        .filter(w => w.lastTriggered)
        .sort((a, b) => new Date(b.lastTriggered!).getTime() - new Date(a.lastTriggered!).getTime())
        .slice(0, 5)
        .map(w => ({ id: w.id, name: w.name, lastTriggered: w.lastTriggered, confidence: w.confidence }))
    }
  });
});

// ============================================================
// CATCH-ALL
// ============================================================

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Endpoint not found' } });
});

app.use(errorHandler);

// ============================================================
// SERVER
// ============================================================

const server = app.listen(PORT, () => {
  console.log(`╔═══════════════════════════════════════════════════════════════╗`);
  console.log(`║          Workflow Twin Service - Started                      ║`);
  console.log(`╠═══════════════════════════════════════════════════════════════╣`);
  console.log(`║  Port: ${PORT}                                              ║`);
  console.log(`║  Features: Pattern Detection, Workflow Learning, Simulation     ║`);
  console.log(`╚═══════════════════════════════════════════════════════════════╝`);
});

process.on('SIGTERM', () => { server.close(() => process.exit(0)); });
process.on('SIGINT', () => { server.close(() => process.exit(0)); });

export default app;
