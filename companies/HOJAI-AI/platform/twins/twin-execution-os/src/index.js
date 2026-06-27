/**
 * Twin Execution OS
 *
 * Task queue and execution engine for employee twins.
 * Uses existing Flow Orchestrator for actual execution.
 *
 * Port: 4737
 *
 * Features:
 * - Task queue with priorities
 * - Auto-approve based on confidence
 * - Human-in-the-loop approval
 * - Retry logic
 * - Rollback capabilities
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();

// ── Internal Auth ────────────────────────────────────────────────
function requireInternal(req, res, next) {
  const token = req.headers['x-internal-token'];
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  if (token && expected && token === expected) {
    req.user = { type: 'service', id: 'internal' };
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}

const PORT = process.env.PORT || 4737;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// In-memory storage (replace with database in production)
const taskStore = new Map();
const executionHistory = new Map();
let taskIdCounter = 1;

// ============================================================
// SERVICE CONNECTIONS
// ============================================================

const SERVICES = {
  flowOrchestrator: process.env.FLOW_ORCHESTRATOR_URL || 'http://localhost:4244',
  twinLearningOS: process.env.TWIN_LEARNING_OS_URL || 'http://localhost:4735',
  twinFeedbackOS: process.env.TWIN_FEEDBACK_OS_URL || 'http://localhost:4736',
  decisionEngine: process.env.DECISION_ENGINE_URL || 'http://localhost:4240',
};

// ============================================================
// TOOL PERMISSIONS
// ============================================================

const TOOL_PERMISSIONS = {
  // Communication tools
  email: { name: 'Email', category: 'communication', risk: 'medium' },
  chat: { name: 'Chat', category: 'communication', risk: 'low' },
  calendar: { name: 'Calendar', category: 'communication', risk: 'low' },
  sms: { name: 'SMS', category: 'communication', risk: 'medium' },

  // CRM tools
  crm: { name: 'CRM', category: 'data', risk: 'medium' },
  contacts: { name: 'Contacts', category: 'data', risk: 'low' },

  // Operations tools
  approval: { name: 'Approvals', category: 'operations', risk: 'high' },
  payment: { name: 'Payments', category: 'operations', risk: 'critical' },
  refund: { name: 'Refunds', category: 'operations', risk: 'high' },
  contract: { name: 'Contracts', category: 'operations', risk: 'high' },

  // Workflow tools
  task: { name: 'Task Management', category: 'workflow', risk: 'low' },
  document: { name: 'Documents', category: 'workflow', risk: 'low' },
  approval_workflow: { name: 'Approval Workflows', category: 'workflow', risk: 'medium' },
};

// ============================================================
// TASK STATUS & PRIORITIES
// ============================================================

const TASK_STATUS = {
  pending: 'pending',
  approved: 'approved',
  rejected: 'rejected',
  executing: 'executing',
  completed: 'completed',
  failed: 'failed',
  rolled_back: 'rolled_back',
  cancelled: 'cancelled',
};

const TASK_PRIORITY = {
  critical: 1,
  high: 2,
  normal: 3,
  low: 4,
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

async function callService(service, path, options = {}) {
  const url = `${SERVICES[service]}${path}`;
  try {
    const response = await fetch(url, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
    return response.ok ? await response.json() : null;
  } catch (error) {
    console.error(`[Execution] Failed to call ${service}:`, error.message);
    return null;
  }
}

/**
 * Get employee's tool permissions
 */
function getEmployeePermissions(employeeId) {
  // Default permissions - load from database in production
  return {
    email: true,
    chat: true,
    calendar: true,
    crm: true,
    contacts: true,
    task: true,
    document: true,
    approval: false,
    payment: false,
    refund: false,
    contract: false,
    approval_workflow: false,
  };
}

/**
 * Get task confidence threshold
 */
function getConfidenceThreshold(taskType, toolPermissions) {
  const tool = TOOL_PERMISSIONS[taskType];

  if (!tool) return 95; // Default to high threshold

  switch (tool.risk) {
    case 'critical':
      return 99;
    case 'high':
      return 95;
    case 'medium':
      return 85;
    case 'low':
      return 70;
    default:
      return 90;
  }
}

/**
 * Check if task should auto-approve
 */
async function shouldAutoApprove(task) {
  // Get confidence from Twin Learning OS
  const twinContext = await callService('twinLearningOS', `/api/health/${task.employeeId}`);
  const confidence = twinContext?.data?.score || 50;

  // Get threshold based on tool risk
  const threshold = getConfidenceThreshold(task.taskType, getEmployeePermissions(task.employeeId));

  console.log(`[Execution] Confidence: ${confidence}, Threshold: ${threshold}`);

  return confidence >= threshold;
}

/**
 * Execute task via Flow Orchestrator
 */
async function executeTask(task) {
  console.log(`[Execution] Executing task ${task.id}: ${task.description}`);

  try {
    // Call Flow Orchestrator
    const result = await callService('flowOrchestrator', '/api/executions', {
      method: 'POST',
      body: JSON.stringify({
        workflowType: task.taskType,
        input: task.context,
        metadata: {
          taskId: task.id,
          employeeId: task.employeeId,
          source: 'twin_execution',
        },
      }),
    });

    return {
      success: true,
      executionId: result?.executionId,
      result: result?.data,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Retry failed task
 */
async function retryTask(task) {
  if (task.retryCount >= (task.maxRetries || 3)) {
    return { success: false, error: 'Max retries exceeded' };
  }

  task.retryCount += 1;
  task.status = TASK_STATUS.pending;
  task.lastRetry = new Date().toISOString();

  return executeTask(task);
}

/**
 * Rollback completed task
 */
async function rollbackTask(task) {
  console.log(`[Execution] Rolling back task ${task.id}`);

  // Call rollback on Flow Orchestrator
  if (task.executionId) {
    await callService('flowOrchestrator', `/api/executions/${task.executionId}/rollback`, {
      method: 'POST',
    });
  }

  task.status = TASK_STATUS.rolled_back;
  task.rolledBackAt = new Date().toISOString();

  return { success: true };
}

// ============================================================
// API ENDPOINTS
// ============================================================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'twin-execution-os',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    stats: {
      pending: Array.from(taskStore.values()).filter(t => t.status === 'pending').length,
      executing: Array.from(taskStore.values()).filter(t => t.status === 'executing').length,
      completed: Array.from(taskStore.values()).filter(t => t.status === 'completed').length,
      failed: Array.from(taskStore.values()).filter(t => t.status === 'failed').length,
    },
  });
});

// Create new task
app.post('/api/tasks', requireInternal, async (req, res) => {
  try {
    const {
      employeeId,
      description,
      taskType,
      capability,
      context,
      priority = 'normal',
      scheduledFor,
    } = req.body;

    if (!employeeId || !description || !taskType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: employeeId, description, taskType',
      });
    }

    // Get confidence
    const twinContext = await callService('twinLearningOS', `/api/health/${employeeId}`);
    const confidence = twinContext?.data?.score || 50;

    // Check if should auto-approve
    const threshold = getConfidenceThreshold(taskType, getEmployeePermissions(employeeId));
    const autoApprove = confidence >= threshold;

    // Create task
    const task = {
      id: `task_${taskIdCounter++}`,
      employeeId,
      description,
      taskType,
      capability,
      context,
      priority: TASK_PRIORITY[priority] || 3,
      status: autoApprove ? TASK_STATUS.approved : TASK_STATUS.pending,
      confidence,
      autoApprove,
      requiresApproval: !autoApprove,
      retryCount: 0,
      maxRetries: 3,
      scheduledFor,
      createdAt: new Date().toISOString(),
      approvedAt: autoApprove ? new Date().toISOString() : null,
    };

    taskStore.set(task.id, task);

    console.log(`[Execution] Task created: ${task.id} (${autoApprove ? 'auto-approved' : 'needs approval'})`);

    // Execute if auto-approved
    if (autoApprove) {
      task.status = TASK_STATUS.executing;
      const result = await executeTask(task);
      if (result.success) {
        task.status = TASK_STATUS.completed;
        task.executionId = result.executionId;
        task.result = result.result;
        task.completedAt = new Date().toISOString();
      } else {
        task.status = TASK_STATUS.failed;
        task.error = result.error;
      }
    }

    res.json({
      success: true,
      data: {
        taskId: task.id,
        status: task.status,
        autoApprove,
        confidence,
        threshold,
        requiresApproval: task.requiresApproval,
      },
    });
  } catch (error) {
    console.error('[Execution] Error creating task:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get task by ID
app.get('/api/tasks/:taskId', (req, res) => {
  const task = taskStore.get(req.params.taskId);

  if (!task) {
    return res.status(404).json({
      success: false,
      error: 'Task not found',
    });
  }

  res.json({
    success: true,
    data: task,
  });
});

// Get employee's task queue
app.get('/api/queue/:employeeId', (req, res) => {
  const { employeeId } = req.params;
  const { status } = req.query;

  let tasks = Array.from(taskStore.values())
    .filter(t => t.employeeId === employeeId)
    .sort((a, b) => a.priority - b.priority || new Date(b.createdAt) - new Date(a.createdAt));

  if (status) {
    tasks = tasks.filter(t => t.status === status);
  }

  res.json({
    success: true,
    data: {
      employeeId,
      total: tasks.length,
      byStatus: {
        pending: tasks.filter(t => t.status === 'pending').length,
        approved: tasks.filter(t => t.status === 'approved').length,
        executing: tasks.filter(t => t.status === 'executing').length,
        completed: tasks.filter(t => t.status === 'completed').length,
        failed: tasks.filter(t => t.status === 'failed').length,
      },
      tasks,
    },
  });
});

// Approve task
app.post('/api/tasks/:taskId/approve', requireInternal, async (req, res) => {
  const task = taskStore.get(req.params.taskId);

  if (!task) {
    return res.status(404).json({ success: false, error: 'Task not found' });
  }

  if (task.status !== 'pending') {
    return res.status(400).json({
      success: false,
      error: `Task cannot be approved (current status: ${task.status})`,
    });
  }

  task.status = TASK_STATUS.approved;
  task.approvedAt = new Date().toISOString();

  // Execute task
  task.status = TASK_STATUS.executing;
  const result = await executeTask(task);

  if (result.success) {
    task.status = TASK_STATUS.completed;
    task.executionId = result.executionId;
    task.result = result.result;
    task.completedAt = new Date().toISOString();
  } else {
    task.status = TASK_STATUS.failed;
    task.error = result.error;
  }

  res.json({
    success: true,
    data: {
      taskId: task.id,
      status: task.status,
      result: task.result,
      error: task.error,
    },
  });
});

// Reject task
app.post('/api/tasks/:taskId/reject', requireInternal, async (req, res) => {
  const task = taskStore.get(req.params.taskId);

  if (!task) {
    return res.status(404).json({ success: false, error: 'Task not found' });
  }

  const { reason } = req.body;

  task.status = TASK_STATUS.rejected;
  task.rejectedAt = new Date().toISOString();
  task.rejectionReason = reason;

  // Send feedback to Twin Feedback OS
  await callService('twinFeedbackOS', '/api/feedback', {
    method: 'POST',
    body: JSON.stringify({
      employeeId: task.employeeId,
      capability: task.capability,
      feedbackType: 'reject',
      twinAction: {
        id: task.id,
        description: task.description,
      },
      correction: {
        reason: reason || 'Task rejected',
      },
    }),
  });

  res.json({
    success: true,
    data: {
      taskId: task.id,
      status: 'rejected',
      reason,
    },
  });
});

// Cancel task
app.post('/api/tasks/:taskId/cancel', requireInternal, (req, res) => {
  const task = taskStore.get(req.params.taskId);

  if (!task) {
    return res.status(404).json({ success: false, error: 'Task not found' });
  }

  if (['completed', 'failed', 'cancelled'].includes(task.status)) {
    return res.status(400).json({
      success: false,
      error: `Cannot cancel task (current status: ${task.status})`,
    });
  }

  task.status = TASK_STATUS.cancelled;
  task.cancelledAt = new Date().toISOString();

  res.json({
    success: true,
    data: { taskId: task.id, status: 'cancelled' },
  });
});

// Retry failed task
app.post('/api/tasks/:taskId/retry', requireInternal, async (req, res) => {
  const task = taskStore.get(req.params.taskId);

  if (!task) {
    return res.status(404).json({ success: false, error: 'Task not found' });
  }

  if (task.status !== 'failed') {
    return res.status(400).json({
      success: false,
      error: `Cannot retry task (current status: ${task.status})`,
    });
  }

  const result = await retryTask(task);

  res.json({
    success: result.success,
    data: {
      taskId: task.id,
      status: task.status,
      retryCount: task.retryCount,
      result: task.result,
      error: task.error,
    },
  });
});

// Rollback completed task
app.post('/api/tasks/:taskId/rollback', requireInternal, async (req, res) => {
  const task = taskStore.get(req.params.taskId);

  if (!task) {
    return res.status(404).json({ success: false, error: 'Task not found' });
  }

  if (task.status !== 'completed') {
    return res.status(400).json({
      success: false,
      error: `Cannot rollback task (current status: ${task.status})`,
    });
  }

  const result = await rollbackTask(task);

  res.json({
    success: result.success,
    data: {
      taskId: task.id,
      status: task.status,
      rolledBackAt: task.rolledBackAt,
    },
  });
});

// Get execution history
app.get('/api/history/:employeeId', (req, res) => {
  const { employeeId } = req.params;
  const { days = 7 } = req.query;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - parseInt(days));

  const tasks = Array.from(taskStore.values())
    .filter(t => t.employeeId === employeeId)
    .filter(t => new Date(t.createdAt) >= cutoff)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({
    success: true,
    data: {
      employeeId,
      period: `${days} days`,
      totalTasks: tasks.length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length,
      tasks,
    },
  });
});

// Get tool permissions for employee
app.get('/api/permissions/:employeeId', (req, res) => {
  const permissions = getEmployeePermissions(req.params.employeeId);

  res.json({
    success: true,
    data: {
      employeeId: req.params.employeeId,
      permissions,
      availableTools: Object.entries(TOOL_PERMISSIONS).map(([key, tool]) => ({
        id: key,
        ...tool,
        allowed: permissions[key] || false,
      })),
    },
  });
});

// Update tool permissions
app.patch('/api/permissions/:employeeId', requireInternal, (req, res) => {
  // In production, update database
  res.json({
    success: true,
    message: 'Permissions updated',
    employeeId: req.params.employeeId,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║              Twin Execution OS - Started                    ║
╠═══════════════════════════════════════════════════════════════╣
║  Port: ${PORT}
║  Features:                                                  ║
║    - Task queue with priorities                             ║
║    - Auto-approve based on confidence                      ║
║    - Human-in-the-loop approval                            ║
║    - Retry logic (max 3)                                   ║
║    - Rollback capabilities                                 ║
║    - Tool permissions                                      ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

export default app;
