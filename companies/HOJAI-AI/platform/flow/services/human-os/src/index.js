/**
 * FlowOS HumanOS - Human Task Management
 *
 * Extends approval workflows with full human task lifecycle:
 * - SLAs with deadlines and escalations
 * - Escalation chains (Manager → Director → VP)
 * - Delegation and reassignment
 * - Task priorities and due dates
 * - Comments and collaboration
 *
 * Port: 5374
 */

import express from 'express';
import cors from 'cors';
import crypto from 'crypto';

const app = express();
const PORT = process.env.PORT || 5374;

app.use(cors());
app.use(express.json());

// ── Storage ────────────────────────────────────────────────────────────
const storage = {
  tasks: new Map(),
  escalationChains: new Map(),
  comments: new Map(),
  notifications: new Map(),
  slaTracker: new Map(),
};

// Default escalation chain template
const DEFAULT_ESCALATION_CHAIN = {
  id: 'default',
  name: 'Default Manager Escalation',
  levels: [
    { level: 1, role: 'manager', delayMinutes: 60 },
    { level: 2, role: 'director', delayMinutes: 120 },
    { level: 3, role: 'vp', delayMinutes: 240 }
  ]
};

// SLA Priority thresholds (in minutes)
const SLA_THRESHOLDS = {
  critical: 30,    // 30 minutes
  high: 60,        // 1 hour
  medium: 240,    // 4 hours
  low: 1440       // 24 hours
};

// ── Health ────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'human-os',
    version: '1.0.0',
    port: PORT,
    tasks: storage.tasks.size,
    escalationChains: storage.escalationChains.size,
    timestamp: new Date().toISOString()
  });
});

// ── Tasks ─────────────────────────────────────────────────────────────

/**
 * Create a new human task
 * POST /api/tasks
 */
app.post('/api/tasks', (req, res) => {
  try {
    const {
      title,
      description,
      priority = 'medium',
      assignee,
      assignees = [],
      deadline,
      escalationChain,
      formSchema,
      workflowId,
      workflowStepId,
      metadata = {}
    } = req.body || {};

    if (!title) {
      return res.status(400).json({ error: 'title is required' });
    }

    const id = `task_${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    // Calculate deadline from priority if not provided
    const calculatedDeadline = deadline || new Date(
      Date.now() + (SLA_THRESHOLDS[priority] || SLA_THRESHOLDS.medium) * 60 * 1000
    ).toISOString();

    const task = {
      id,
      title,
      description: description || null,
      priority,
      status: 'pending',
      assignee: assignee || null,
      assignees: assignees.length > 0 ? assignees : (assignee ? [assignee] : []),
      deadline: calculatedDeadline,
      escalationChain: escalationChain || DEFAULT_ESCALATION_CHAIN.id,
      currentEscalationLevel: 0,
      formSchema: formSchema || null,
      formData: {},
      workflowId: workflowId || null,
      workflowStepId: workflowStepId || null,
      comments: [],
      history: [
        { event: 'created', at: now, by: 'system' }
      ],
      sla: {
        deadline: calculatedDeadline,
        breached: false,
        breachedAt: null,
        escalated: false,
        escalatedAt: null
      },
      metadata,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
      completedBy: null
    };

    storage.tasks.set(id, task);

    // Start SLA tracker
    startSLATracker(id, calculatedDeadline);

    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get task by ID
 * GET /api/tasks/:id
 */
app.get('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  const task = storage.tasks.get(id);

  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  // Update SLA status
  checkSLABreach(task);

  res.json(task);
});

/**
 * List tasks with filtering
 * GET /api/tasks
 */
app.get('/api/tasks', (req, res) => {
  const { status, priority, assignee, limit = 50 } = req.query;

  let tasks = Array.from(storage.tasks.values());

  if (status) tasks = tasks.filter(t => t.status === status);
  if (priority) tasks = tasks.filter(t => t.priority === priority);
  if (assignee) tasks = tasks.filter(t =>
    t.assignee === assignee || t.assignees.includes(assignee)
  );

  // Sort by deadline (most urgent first)
  tasks.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

  res.json({
    count: tasks.length,
    tasks: tasks.slice(0, parseInt(limit))
  });
});

/**
 * Approve a task
 * POST /api/tasks/:id/approve
 */
app.post('/api/tasks/:id/approve', (req, res) => {
  const { id } = req.params;
  const { comment, approverId } = req.body || {};

  const task = storage.tasks.get(id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  task.status = 'approved';
  task.completedAt = new Date().toISOString();
  task.completedBy = approverId || 'anonymous';
  task.updatedAt = new Date().toISOString();
  task.sla.breached = false;
  task.history.push({
    event: 'approved',
    at: task.completedAt,
    by: approverId || 'anonymous',
    comment
  });

  res.json(task);
});

/**
 * Reject a task
 * POST /api/tasks/:id/reject
 */
app.post('/api/tasks/:id/reject', (req, res) => {
  const { id } = req.params;
  const { comment, rejectorId, reason } = req.body || {};

  const task = storage.tasks.get(id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  task.status = 'rejected';
  task.completedAt = new Date().toISOString();
  task.completedBy = rejectorId || 'anonymous';
  task.updatedAt = new Date().toISOString();
  task.sla.breached = false;
  task.history.push({
    event: 'rejected',
    at: task.completedAt,
    by: rejectorId || 'anonymous',
    comment,
    reason
  });

  res.json(task);
});

/**
 * Delegate a task to another user
 * POST /api/tasks/:id/delegate
 */
app.post('/api/tasks/:id/delegate', (req, res) => {
  const { id } = req.params;
  const { delegateTo, delegatorId, reason } = req.body || {};

  if (!delegateTo) {
    return res.status(400).json({ error: 'delegateTo is required' });
  }

  const task = storage.tasks.get(id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const previousAssignee = task.assignee;
  task.assignee = delegateTo;
  task.assignees.push(delegateTo);
  task.updatedAt = new Date().toISOString();
  task.history.push({
    event: 'delegated',
    at: task.updatedAt,
    by: delegatorId || 'system',
    from: previousAssignee,
    to: delegateTo,
    reason
  });

  // Create notification
  createNotification(delegateTo, 'task_delegated', {
    taskId: id,
    title: task.title,
    delegatedBy: delegatorId
  });

  res.json(task);
});

/**
 * Reassign a task (admin action)
 * POST /api/tasks/:id/reassign
 */
app.post('/api/tasks/:id/reassign', (req, res) => {
  const { id } = req.params;
  const { reassignTo, reassignorId, reason, removePrevious = false } = req.body || {};

  if (!reassignTo) {
    return res.status(400).json({ error: 'reassignTo is required' });
  }

  const task = storage.tasks.get(id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const previousAssignee = task.assignee;
  task.assignee = reassignTo;
  task.updatedAt = new Date().toISOString();
  task.history.push({
    event: 'reassigned',
    at: task.updatedAt,
    by: reassignorId || 'system',
    from: previousAssignee,
    to: reassignTo,
    reason
  });

  if (!removePrevious) {
    task.assignees.push(reassignTo);
  }

  // Create notification
  createNotification(reassignTo, 'task_reassigned', {
    taskId: id,
    title: task.title,
    reassignedBy: reassignorId
  });

  res.json(task);
});

/**
 * Escalate a task
 * POST /api/tasks/:id/escalate
 */
app.post('/api/tasks/:id/escalate', (req, res) => {
  const { id } = req.params;
  const { escalatorId, reason } = req.body || {};

  const task = storage.tasks.get(id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const chain = storage.escalationChains.get(task.escalationChain) || DEFAULT_ESCALATION_CHAIN;
  const nextLevel = task.currentEscalationLevel + 1;

  if (nextLevel >= chain.levels.length) {
    return res.status(400).json({
      error: 'Maximum escalation level reached',
      currentLevel: task.currentEscalationLevel
    });
  }

  const nextEscalation = chain.levels[nextLevel];

  task.currentEscalationLevel = nextLevel;
  task.assignee = nextEscalation.role;
  task.updatedAt = new Date().toISOString();
  task.sla.escalated = true;
  task.sla.escalatedAt = new Date().toISOString();
  task.history.push({
    event: 'escalated',
    at: task.updatedAt,
    by: escalatorId || 'system',
    toLevel: nextLevel,
    role: nextEscalation.role,
    reason
  });

  // Create notification
  createNotification(nextEscalation.role, 'task_escalated', {
    taskId: id,
    title: task.title,
    escalatedTo: nextEscalation.role,
    level: nextLevel
  });

  res.json(task);
});

/**
 * Add comment to task
 * POST /api/tasks/:id/comments
 */
app.post('/api/tasks/:id/comments', (req, res) => {
  const { id } = req.params;
  const { text, authorId, mentions = [] } = req.body || {};

  if (!text) {
    return res.status(400).json({ error: 'text is required' });
  }

  const task = storage.tasks.get(id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const comment = {
    id: `comment_${crypto.randomUUID()}`,
    text,
    authorId: authorId || 'anonymous',
    mentions,
    createdAt: new Date().toISOString()
  };

  task.comments.push(comment);
  task.history.push({
    event: 'comment_added',
    at: comment.createdAt,
    by: authorId || 'anonymous'
  });
  task.updatedAt = new Date().toISOString();

  res.status(201).json(comment);
});

/**
 * Get task comments
 * GET /api/tasks/:id/comments
 */
app.get('/api/tasks/:id/comments', (req, res) => {
  const { id } = req.params;
  const task = storage.tasks.get(id);

  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.json({ comments: task.comments });
});

/**
 * Complete task with form data
 * POST /api/tasks/:id/complete
 */
app.post('/api/tasks/:id/complete', (req, res) => {
  const { id } = req.params;
  const { formData, completerId, comment } = req.body || {};

  const task = storage.tasks.get(id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  // Validate form data against schema if provided
  if (task.formSchema && formData) {
    const validation = validateFormData(formData, task.formSchema);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Form validation failed',
        errors: validation.errors
      });
    }
  }

  task.status = 'completed';
  task.completedAt = new Date().toISOString();
  task.completedBy = completerId || 'anonymous';
  task.formData = formData || {};
  task.updatedAt = new Date().toISOString();
  task.sla.breached = false;
  task.history.push({
    event: 'completed',
    at: task.completedAt,
    by: completerId || 'anonymous',
    comment
  });

  res.json(task);
});

// ── Escalation Chains ─────────────────────────────────────────────────

/**
 * Create escalation chain
 * POST /api/escalation-chains
 */
app.post('/api/escalation-chains', (req, res) => {
  const { name, levels = [] } = req.body || {};

  if (!name) {
    return res.status(400).json({ error: 'name is required' });
  }

  const id = `chain_${crypto.randomUUID()}`;
  const chain = {
    id,
    name,
    levels,
    createdAt: new Date().toISOString()
  };

  storage.escalationChains.set(id, chain);

  res.status(201).json(chain);
});

/**
 * List escalation chains
 * GET /api/escalation-chains
 */
app.get('/api/escalation-chains', (req, res) => {
  const chains = Array.from(storage.escalationChains.values());
  chains.push(DEFAULT_ESCALATION_CHAIN);

  res.json({ chains });
});

/**
 * Get escalation chain
 * GET /api/escalation-chains/:id
 */
app.get('/api/escalation-chains/:id', (req, res) => {
  const { id } = req.params;
  const chain = storage.escalationChains.get(id) ||
    (id === DEFAULT_ESCALATION_CHAIN.id ? DEFAULT_ESCALATION_CHAIN : null);

  if (!chain) {
    return res.status(404).json({ error: 'Escalation chain not found' });
  }

  res.json(chain);
});

// ── SLA Management ────────────────────────────────────────────────────

/**
 * Get SLA dashboard
 * GET /api/sla/dashboard
 */
app.get('/api/sla/dashboard', (req, res) => {
  const tasks = Array.from(storage.tasks.values());

  const pending = tasks.filter(t => t.status === 'pending');
  const breached = pending.filter(t => new Date(t.sla.deadline) < new Date());
  const atRisk = pending.filter(t => {
    const timeLeft = new Date(t.sla.deadline) - new Date();
    return timeLeft > 0 && timeLeft < 30 * 60 * 1000; // < 30 min
  });

  res.json({
    total: tasks.length,
    pending: pending.length,
    breached: breached.length,
    atRisk: atRisk.length,
    compliance: pending.length > 0
      ? Math.round(((pending.length - breached.length) / pending.length) * 100)
      : 100
  });
});

/**
 * Get tasks by SLA status
 * GET /api/sla/tasks
 */
app.get('/api/sla/tasks', (req, res) => {
  const { status = 'breached' } = req.query;

  const tasks = Array.from(storage.tasks.values()).filter(t => t.status === 'pending');

  let filtered;
  if (status === 'breached') {
    filtered = tasks.filter(t => new Date(t.sla.deadline) < new Date());
  } else if (status === 'at_risk') {
    const threshold = 30 * 60 * 1000; // 30 minutes
    filtered = tasks.filter(t => {
      const timeLeft = new Date(t.sla.deadline) - new Date();
      return timeLeft > 0 && timeLeft < threshold;
    });
  } else {
    filtered = tasks;
  }

  res.json({
    status,
    count: filtered.length,
    tasks: filtered.slice(0, 100)
  });
});

// ── Notifications ─────────────────────────────────────────────────────

/**
 * Create notification
 */
function createNotification(recipient, type, data) {
  const notification = {
    id: `notif_${crypto.randomUUID()}`,
    recipient,
    type,
    data,
    read: false,
    createdAt: new Date().toISOString()
  };

  if (!storage.notifications.has(recipient)) {
    storage.notifications.set(recipient, []);
  }
  storage.notifications.get(recipient).push(notification);

  return notification;
}

/**
 * Get notifications for user
 * GET /api/notifications/:recipient
 */
app.get('/api/notifications/:recipient', (req, res) => {
  const { recipient } = req.params;
  const { unreadOnly = false } = req.query;

  const notifications = storage.notifications.get(recipient) || [];

  const filtered = unreadOnly
    ? notifications.filter(n => !n.read)
    : notifications;

  res.json({
    count: filtered.length,
    unread: notifications.filter(n => !n.read).length,
    notifications: filtered.slice(0, 50)
  });
});

/**
 * Mark notification as read
 * POST /api/notifications/:id/read
 */
app.post('/api/notifications/:id/read', (req, res) => {
  const { id } = req.params;

  for (const [recipient, notifications] of storage.notifications) {
    const notification = notifications.find(n => n.id === id);
    if (notification) {
      notification.read = true;
      return res.json(notification);
    }
  }

  res.status(404).json({ error: 'Notification not found' });
});

// ── SLA Tracker ───────────────────────────────────────────────────────

function startSLATracker(taskId, deadline) {
  const checkInterval = setInterval(() => {
    const task = storage.tasks.get(taskId);
    if (!task || task.status !== 'pending') {
      clearInterval(checkInterval);
      return;
    }

    checkSLABreach(task);

    // Auto-escalate if SLA is breached
    if (task.sla.breached && !task.sla.escalated) {
      const chain = storage.escalationChains.get(task.escalationChain) || DEFAULT_ESCALATION_CHAIN;

      if (task.currentEscalationLevel < chain.levels.length - 1) {
        // Auto-escalate
        task.currentEscalationLevel++;
        const nextLevel = chain.levels[task.currentEscalationLevel];
        task.assignee = nextLevel.role;
        task.sla.escalated = true;
        task.sla.escalatedAt = new Date().toISOString();
        task.history.push({
          event: 'auto_escalated',
          at: task.updatedAt,
          toLevel: task.currentEscalationLevel,
          role: nextLevel.role,
          reason: 'SLA breach'
        });
      }
    }
  }, 60000); // Check every minute
}

function checkSLABreach(task) {
  if (task.status !== 'pending') return;

  const now = new Date();
  const deadline = new Date(task.sla.deadline);

  if (now > deadline && !task.sla.breached) {
    task.sla.breached = true;
    task.sla.breachedAt = now.toISOString();
    task.history.push({
      event: 'sla_breached',
      at: now.toISOString()
    });
  }
}

// ── Form Validation ───────────────────────────────────────────────────

function validateFormData(data, schema) {
  const errors = [];

  if (schema.required) {
    for (const field of schema.required) {
      if (!data[field]) {
        errors.push({ field, error: 'Required field missing' });
      }
    }
  }

  if (schema.types) {
    for (const [field, type] of Object.entries(schema.types)) {
      if (data[field] !== undefined && typeof data[field] !== type) {
        errors.push({ field, error: `Expected type ${type}` });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// ── Startup ───────────────────────────────────────────────────────────

app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});

const server = app.listen(PORT, () => {
  console.log(`[human-os] listening on :${PORT}`);
});

process.on('SIGTERM', () => {
  console.log('[human-os] Shutting down...');
  server.close();
});

export { app };
