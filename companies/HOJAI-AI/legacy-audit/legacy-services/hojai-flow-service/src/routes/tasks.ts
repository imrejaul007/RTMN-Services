/**
 * Tasks Routes - Task execution and management
 */

import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';

const router = Router();

// ============================================================================
// TASK MODEL
// ============================================================================

const TaskSchema = new mongoose.Schema({
  taskId: { type: String, required: true, unique: true, index: true },
  userId: { type: String, required: true, index: true },
  tenantId: { type: String, required: true, index: true },

  title: { type: String, required: true },
  description: String,

  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'failed', 'requires_approval'],
    default: 'pending'
  },

  // Action to be executed
  action: {
    type: {
      type: String,
      enum: ['send_message', 'send_email', 'create_meeting', 'create_campaign', 'schedule', 'search', 'remember'],
      required: true
    },
    params: mongoose.Schema.Types.Mixed,
    preview: String,
  },

  // Execution details
  execution: {
    startedAt: Date,
    completedAt: Date,
    result: mongoose.Schema.Types.Mixed,
    error: String,
    retryCount: { type: Number, default: 0 },
  },

  // Approval details
  approval: {
    required: { type: Boolean, default: false },
    approvedBy: String,
    approvedAt: Date,
    notes: String,
  },

  priority: { type: Number, default: 5 }, // 1-10
  dueDate: Date,

  tags: [String],

  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

TaskSchema.index({ userId: 1, tenantId: 1, status: 1 });

export const Task = mongoose.model('Task', TaskSchema);

// ============================================================================
// ROUTES
// ============================================================================

/**
 * POST /api/tasks
 * Create task
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { userId, title, description, action, priority, dueDate, tags } = req.body;
    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    if (!userId || !title) {
      return res.status(400).json({ success: false, error: 'userId and title required' });
    }

    // Determine if approval is needed
    const requiresApproval = determineApprovalRequired(action);

    const task = await Task.create({
      taskId: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      tenantId,
      title,
      description,
      action,
      priority: priority || 5,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      tags: tags || [],
      status: requiresApproval ? 'requires_approval' : 'pending',
      approval: { required: requiresApproval }
    });

    res.status(201).json({ success: true, data: task });
  } catch (error) {
    console.error('[Tasks] Create error:', error);
    res.status(500).json({ success: false, error: 'Failed to create task' });
  }
});

/**
 * GET /api/tasks
 * List tasks
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { userId, status, limit = 50 } = req.query;
    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId required' });
    }

    const filter: Record<string, unknown> = { userId, tenantId };
    if (status) filter.status = status;

    const tasks = await Task.find(filter)
      .sort({ priority: -1, createdAt: -1 })
      .limit(parseInt(limit as string));

    res.json({ success: true, data: tasks });
  } catch (error) {
    console.error('[Tasks] List error:', error);
    res.status(500).json({ success: false, error: 'Failed to list tasks' });
  }
});

/**
 * GET /api/tasks/:id
 * Get task
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const task = await Task.findOne({ taskId: req.params.id });

    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    res.json({ success: true, data: task });
  } catch (error) {
    console.error('[Tasks] Get error:', error);
    res.status(500).json({ success: false, error: 'Failed to get task' });
  }
});

/**
 * PATCH /api/tasks/:id
 * Update task
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { status, action, notes } = req.body;

    const update: Record<string, unknown> = {};
    if (status) update.status = status;
    if (action) update.action = action;

    // Handle approval
    if (notes !== undefined) {
      update['approval.approvedBy'] = 'user';
      update['approval.approvedAt'] = new Date();
      update['approval.notes'] = notes;
    }

    const task = await Task.findOneAndUpdate(
      { taskId: req.params.id },
      { $set: update },
      { new: true }
    );

    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    res.json({ success: true, data: task });
  } catch (error) {
    console.error('[Tasks] Update error:', error);
    res.status(500).json({ success: false, error: 'Failed to update task' });
  }
});

/**
 * POST /api/tasks/:id/execute
 * Execute task
 */
router.post('/:id/execute', async (req: Request, res: Response) => {
  try {
    const task = await Task.findOne({ taskId: req.params.id });

    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    if (task.status === 'in_progress') {
      return res.status(400).json({ success: false, error: 'Task already executing' });
    }

    // Update status
    task.status = 'in_progress';
    task.execution = {
      startedAt: new Date(),
      retryCount: task.execution?.retryCount || 0
    };
    await task.save();

    // Execute action (async)
    executeTaskAction(task).catch((error) => {
      console.error('[Tasks] Execution failed:', error);
      task.status = 'failed';
      task.execution = { ...task.execution, error: String(error) };
      task.save();
    });

    res.json({ success: true, data: task });
  } catch (error) {
    console.error('[Tasks] Execute error:', error);
    res.status(500).json({ success: false, error: 'Failed to execute task' });
  }
});

/**
 * DELETE /api/tasks/:id
 * Delete task
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const result = await Task.deleteOne({ taskId: req.params.id });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    res.json({ success: true, message: 'Task deleted' });
  } catch (error) {
    console.error('[Tasks] Delete error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete task' });
  }
});

// ============================================================================
// HELPERS
// ============================================================================

function determineApprovalRequired(action: any): boolean {
  if (!action) return false;

  // Actions requiring approval
  const approvalRequired = [
    'send_email', // Sending emails
    'create_campaign', // Creating campaigns
    'send_message', // Sending messages
  ];

  return approvalRequired.includes(action.type);
}

async function executeTaskAction(task: any): Promise<void> {
  const { type, params } = task.action;

  let result: unknown;

  switch (type) {
    case 'send_email':
      // Call email service
      result = await sendEmail(params);
      break;

    case 'send_message':
      // Call messaging service
      result = await sendMessage(params);
      break;

    case 'create_meeting':
      // Call calendar service
      result = await createMeeting(params);
      break;

    case 'create_campaign':
      // Call campaign service
      result = await createCampaign(params);
      break;

    case 'schedule':
      // Schedule for later
      result = { scheduled: true, at: params.scheduledAt };
      break;

    case 'remember':
      // Store in memory
      result = await storeMemory(params);
      break;

    default:
      result = { success: true, action: type };
  }

  task.status = 'completed';
  task.execution.completedAt = new Date();
  task.execution.result = result;
  await task.save();
}

// Action executors (stubs - would integrate with actual services)
async function sendEmail(params: any): Promise<any> {
  console.log('[Tasks] Sending email:', params);
  return { success: true, emailId: `email_${Date.now()}` };
}

async function sendMessage(params: any): Promise<any> {
  console.log('[Tasks] Sending message:', params);
  return { success: true, messageId: `msg_${Date.now()}` };
}

async function createMeeting(params: any): Promise<any> {
  console.log('[Tasks] Creating meeting:', params);
  return { success: true, meetingId: `meet_${Date.now()}` };
}

async function createCampaign(params: any): Promise<any> {
  console.log('[Tasks] Creating campaign:', params);
  return { success: true, campaignId: `camp_${Date.now()}` };
}

async function storeMemory(params: any): Promise<any> {
  console.log('[Tasks] Storing memory:', params);
  return { success: true, memoryId: `mem_${Date.now()}` };
}

export default router;
