/**
 * Actions Routes - Smart Actions & Approvals
 *
 * NOT "tasks" - this is Hojai's action engine
 * Suggests, schedules, requires approval
 */

import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';

const router = Router();

// ============================================================================
// ACTION MODEL
// ============================================================================

const ActionSchema = new mongoose.Schema({
  actionId: { type: String, required: true, unique: true, index: true },
  userId: { type: String, required: true, index: true },
  tenantId: { type: String, required: true, index: true },

  // What Hojai understood
  intent: { type: String, required: true },
  originalText: String,

  // Action details
  type: {
    type: String,
    enum: ['message', 'email', 'call', 'meeting', 'task', 'campaign', 'follow_up', 'reminder', 'approval', 'research', 'draft'],
    required: true,
  },

  // Status tracking
  status: {
    type: String,
    enum: ['suggested', 'scheduled', 'pending_approval', 'approved', 'executing', 'completed', 'rejected', 'failed'],
    default: 'suggested',
  },

  // Who/what it's about
  target: {
    type: {
      type: String,
      enum: ['contact', 'project', 'team', 'customer', 'merchant'],
    },
    id: String,
    name: String,
    channel: String, // whatsapp, email, sms, call
  },

  // The content
  content: {
    subject: String,
    body: String,
    summary: String,
  },

  // Scheduling
  scheduledFor: Date,
  scheduledRecurrence: String, // daily, weekly, monthly

  // Approval
  approval: {
    required: { type: Boolean, default: false },
    approvedBy: String,
    approvedAt: Date,
    rejectedReason: String,
  },

  // Execution
  executedAt: Date,
  executionResult: mongoose.Schema.Types.Mixed,

  // Suggestion context
  context: {
    why: String, // "User mentioned this 3 times this week"
    confidence: Number, // 0-1
    similarPastActions: [String],
  },

  priority: { type: Number, default: 5 }, // 1-10

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

ActionSchema.index({ userId: 1, tenantId: 1, status: 1 });
ActionSchema.index({ userId: 1, tenantId: 1, type: 1 });

export const Action = mongoose.model('Action', ActionSchema);

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /api/actions
 * Get all actions
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { userId, status, type, limit = 50 } = req.query;
    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId required' });
    }

    const filter: Record<string, unknown> = { userId, tenantId };
    if (status) filter.status = status;
    if (type) filter.type = type;

    const actions = await Action.find(filter)
      .sort({ priority: -1, createdAt: -1 })
      .limit(parseInt(limit as string));

    res.json({ success: true, data: actions });
  } catch (error) {
    console.error('[Actions] List error:', error);
    res.status(500).json({ success: false, error: 'Failed to list actions' });
  }
});

/**
 * GET /api/actions/suggestions
 * Get suggested actions
 */
router.get('/suggestions', async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;
    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId required' });
    }

    // Get recent actions for context
    const recentActions = await Action.find({ userId, tenantId })
      .sort({ createdAt: -1 })
      .limit(20);

    // Generate suggestions based on patterns
    const suggestions = generateSuggestions(recentActions);

    res.json({ success: true, data: suggestions });
  } catch (error) {
    console.error('[Actions] Suggestions error:', error);
    res.status(500).json({ success: false, error: 'Failed to get suggestions' });
  }
});

/**
 * GET /api/actions/pending
 * Get pending approval actions
 */
router.get('/pending', async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;
    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    const pending = await Action.find({
      userId, tenantId,
      status: 'pending_approval',
    })
      .sort({ priority: -1, createdAt: -1 });

    res.json({ success: true, data: pending });
  } catch (error) {
    console.error('[Actions] Pending error:', error);
    res.status(500).json({ success: false, error: 'Failed to get pending' });
  }
});

/**
 * GET /api/actions/today
 * Get today's actions
 */
router.get('/today', async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;
    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayActions = await Action.find({
      userId, tenantId,
      $or: [
        { createdAt: { $gte: today, $lt: tomorrow } },
        { scheduledFor: { $gte: today, $lt: tomorrow } },
      ],
      status: { $in: ['approved', 'scheduled', 'executing', 'completed'] },
    })
      .sort({ scheduledFor: 1, priority: -1 });

    const completed = todayActions.filter(a => a.status === 'completed').length;
    const total = todayActions.length;

    res.json({
      success: true,
      data: {
        actions: todayActions,
        stats: { completed, total, remaining: total - completed }
      }
    });
  } catch (error) {
    console.error('[Actions] Today error:', error);
    res.status(500).json({ success: false, error: 'Failed to get today' });
  }
});

/**
 * POST /api/actions
 * Create action (from intent detection)
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { userId, intent, type, target, content, scheduledFor, approvalRequired } = req.body;
    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    if (!userId || !intent || !type) {
      return res.status(400).json({ success: false, error: 'userId, intent, and type required' });
    }

    const action = await Action.create({
      actionId: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      tenantId,
      intent,
      originalText: intent,
      type,
      status: approvalRequired ? 'pending_approval' : 'suggested',
      target,
      content,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
      approval: {
        required: approvalRequired ?? (type === 'message' || type === 'campaign'),
      },
      priority: 5,
    });

    res.status(201).json({ success: true, data: action });
  } catch (error) {
    console.error('[Actions] Create error:', error);
    res.status(500).json({ success: false, error: 'Failed to create action' });
  }
});

/**
 * PATCH /api/actions/:id/approve
 * Approve action
 */
router.patch('/:id/approve', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    const action = await Action.findOneAndUpdate(
      { actionId: req.params.id, userId, tenantId },
      {
        status: 'approved',
        'approval.approvedBy': userId,
        'approval.approvedAt': new Date(),
      },
      { new: true }
    );

    if (!action) {
      return res.status(404).json({ success: false, error: 'Action not found' });
    }

    res.json({ success: true, data: action });
  } catch (error) {
    console.error('[Actions] Approve error:', error);
    res.status(500).json({ success: false, error: 'Failed to approve' });
  }
});

/**
 * PATCH /api/actions/:id/reject
 * Reject action
 */
router.patch('/:id/reject', async (req: Request, res: Response) => {
  try {
    const { userId, reason } = req.body;
    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    const action = await Action.findOneAndUpdate(
      { actionId: req.params.id, userId, tenantId },
      {
        status: 'rejected',
        'approval.rejectedReason': reason,
      },
      { new: true }
    );

    if (!action) {
      return res.status(404).json({ success: false, error: 'Action not found' });
    }

    res.json({ success: true, data: action });
  } catch (error) {
    console.error('[Actions] Reject error:', error);
    res.status(500).json({ success: false, error: 'Failed to reject' });
  }
});

/**
 * POST /api/actions/:id/execute
 * Execute action
 */
router.post('/:id/execute', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    const action = await Action.findOne({ actionId: req.params.id, userId, tenantId });

    if (!action) {
      return res.status(404).json({ success: false, error: 'Action not found' });
    }

    if (action.status === 'executing') {
      return res.status(400).json({ success: false, error: 'Already executing' });
    }

    // Update to executing
    action.status = 'executing';
    await action.save();

    // Execute asynchronously
    executeAction(action).catch(console.error);

    res.json({ success: true, data: action });
  } catch (error) {
    console.error('[Actions] Execute error:', error);
    res.status(500).json({ success: false, error: 'Failed to execute' });
  }
});

/**
 * DELETE /api/actions/:id
 * Delete action
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const result = await Action.deleteOne({ actionId: req.params.id });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, error: 'Action not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[Actions] Delete error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete' });
  }
});

// ============================================================================
// HELPERS
// ============================================================================

function generateSuggestions(recentActions: any[]): any[] {
  const suggestions = [];

  // Follow up with inactive contacts
  const followUpContacts = recentActions
    .filter(a => a.type === 'message' && a.status === 'completed')
    .reduce((acc, a) => {
      if (a.target?.name) acc[a.target.name] = (acc[a.target.name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  if (Object.keys(followUpContacts).length > 0) {
    suggestions.push({
      type: 'follow_up',
      title: 'Follow up with contacts',
      description: 'You messaged 3 contacts this week',
      priority: 6,
      context: { reason: 'Weekly follow-up suggested' }
    });
  }

  // Weekly review
  suggestions.push({
    type: 'review',
    title: 'Weekly action review',
    description: 'Review pending approvals and scheduled actions',
    priority: 7,
    context: { reason: 'Weekly review recommended' }
  });

  // Monthly newsletter
  const newsletterActions = recentActions.filter(a => a.type === 'campaign');
  if (newsletterActions.length === 0) {
    suggestions.push({
      type: 'campaign',
      title: 'Monthly newsletter',
      description: 'Time for your monthly update',
      priority: 5,
      context: { reason: 'Monthly cadence' }
    });
  }

  return suggestions;
}

async function executeAction(action: any): Promise<void> {
  try {
    // Simulate execution
    await new Promise(resolve => setTimeout(resolve, 1000));

    action.status = 'completed';
    action.executedAt = new Date();
    action.executionResult = { success: true };
    await action.save();
  } catch (error) {
    action.status = 'failed';
    action.executionResult = { error: String(error) };
    await action.save();
  }
}

export default router;
