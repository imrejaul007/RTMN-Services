/**
 * Reminders Module - Reminder Setting & Tracking
 *
 * Handles setting, tracking, and managing reminders
 */

import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import {
  Reminder,
  CreateReminderInput,
  RecurrencePattern,
  SnoozeOption,
  ApiResponse
} from '../types.js';

const router = Router();

// ============================================================================
// IN-MEMORY STORE (Mock Implementation)
// In production, use a persistent store with scheduled jobs
// ============================================================================

const reminders: Map<string, Reminder> = new Map();

// ============================================================================
// HELPERS
// ============================================================================

function generateReminderId(): string {
  return `rem_${Date.now()}_${uuid().split('-')[0]}`;
}

function parseDate(dateStr: string): Date {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${dateStr}`);
  }
  return date;
}

function validateReminderInput(input: CreateReminderInput): void {
  if (!input.title?.trim()) {
    throw new Error('Title is required');
  }
  if (!input.triggerTime) {
    throw new Error('Trigger time is required');
  }

  const triggerDate = parseDate(input.triggerTime);
  if (triggerDate <= new Date()) {
    throw new Error('Trigger time must be in the future');
  }
}

function serializeReminder(reminder: Reminder): Reminder {
  return {
    ...reminder,
    triggerTime: new Date(reminder.triggerTime),
    recurrence: reminder.recurrence ? {
      ...reminder.recurrence,
      until: reminder.recurrence.until ? new Date(reminder.recurrence.until) : undefined
    } : undefined,
    snoozeOptions: reminder.snoozeOptions,
    completedAt: reminder.completedAt ? new Date(reminder.completedAt) : undefined,
    createdAt: new Date(reminder.createdAt),
    updatedAt: new Date(reminder.updatedAt)
  };
}

function getUserId(req: Request): string {
  return (req.headers['x-user-id'] as string) || 'default-user';
}

function getTenantId(req: Request): string {
  return (req.headers['x-tenant-id'] as string) || 'default';
}

// Default snooze options
const DEFAULT_SNOOZE_OPTIONS: SnoozeOption[] = [
  { minutes: 5, label: '5 minutes' },
  { minutes: 10, label: '10 minutes' },
  { minutes: 30, label: '30 minutes' },
  { minutes: 60, label: '1 hour' },
  { minutes: 120, label: '2 hours' },
  { minutes: 1440, label: '1 day' }
];

// ============================================================================
// ROUTES
// ============================================================================

/**
 * POST /api/reminders
 * Create a new reminder
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const input: CreateReminderInput = req.body;
    const userId = getUserId(req);
    const tenantId = getTenantId(req);

    validateReminderInput(input);

    const reminder: Reminder = {
      id: generateReminderId(),
      userId,
      tenantId,
      title: input.title.trim(),
      description: input.description?.trim(),
      type: input.type || 'once',
      triggerTime: parseDate(input.triggerTime),
      recurrence: input.recurrence,
      channel: input.channel || 'push',
      isActive: true,
      isCompleted: false,
      isDismissed: false,
      linkedEntityType: input.linkedEntityType,
      linkedEntityId: input.linkedEntityId,
      snoozeOptions: DEFAULT_SNOOZE_OPTIONS,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date()
    };

    reminders.set(reminder.id, reminder);

    // Log for production scheduler integration
    console.log(`[Reminder] Created: ${reminder.id} for ${reminder.triggerTime.toISOString()}`);

    const response: ApiResponse<Reminder> = {
      success: true,
      data: serializeReminder(reminder),
      message: 'Reminder created successfully'
    };

    res.status(201).json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create reminder';
    res.status(400).json({ success: false, error: message });
  }
});

/**
 * GET /api/reminders
 * List all reminders for the user
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const tenantId = getTenantId(req);
    const {
      isActive,
      isCompleted,
      type,
      channel,
      linkedEntityType,
      upcoming,
      search,
      page = '1',
      limit = '20'
    } = req.query;

    let filtered = Array.from(reminders.values()).filter(
      r => r.userId === userId && r.tenantId === tenantId
    );

    // Filter by active status
    if (isActive !== undefined) {
      const active = isActive === 'true';
      filtered = filtered.filter(r => r.isActive === active);
    }

    // Filter by completed status
    if (isCompleted !== undefined) {
      const completed = isCompleted === 'true';
      filtered = filtered.filter(r => r.isCompleted === completed);
    }

    // Filter by type
    if (type) {
      filtered = filtered.filter(r => r.type === type);
    }

    // Filter by channel
    if (channel) {
      filtered = filtered.filter(r => r.channel === channel);
    }

    // Filter by linked entity type
    if (linkedEntityType) {
      filtered = filtered.filter(r => r.linkedEntityType === linkedEntityType);
    }

    // Filter upcoming reminders
    if (upcoming === 'true') {
      const now = new Date();
      filtered = filtered.filter(r =>
        r.isActive &&
        !r.isCompleted &&
        !r.isDismissed &&
        new Date(r.triggerTime) >= now
      );
    }

    // Search
    if (search) {
      const searchLower = (search as string).toLowerCase();
      filtered = filtered.filter(r =>
        r.title.toLowerCase().includes(searchLower) ||
        r.description?.toLowerCase().includes(searchLower)
      );
    }

    // Sort by trigger time
    filtered.sort((a, b) =>
      new Date(a.triggerTime).getTime() - new Date(b.triggerTime).getTime()
    );

    // Pagination
    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const total = filtered.length;
    const totalPages = Math.ceil(total / limitNum);
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedReminders = filtered.slice(startIndex, startIndex + limitNum);

    // Stats
    const stats = {
      total: filtered.length,
      active: filtered.filter(r => r.isActive && !r.isCompleted && !r.isDismissed).length,
      completed: filtered.filter(r => r.isCompleted).length,
      upcoming: filtered.filter(r =>
        r.isActive && !r.isCompleted && new Date(r.triggerTime) > new Date()
      ).length
    };

    const response: ApiResponse<Reminder[]> = {
      success: true,
      data: paginatedReminders.map(serializeReminder),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages
      }
    };

    res.json({ ...response, stats });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list reminders';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * GET /api/reminders/:id
 * Get a specific reminder
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const tenantId = getTenantId(req);

    const reminder = reminders.get(id);

    if (!reminder || reminder.userId !== userId || reminder.tenantId !== tenantId) {
      return res.status(404).json({ success: false, error: 'Reminder not found' });
    }

    const response: ApiResponse<Reminder> = {
      success: true,
      data: serializeReminder(reminder)
    };

    res.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get reminder';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * PATCH /api/reminders/:id
 * Update a reminder
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, triggerTime, recurrence, channel, isActive } = req.body;
    const userId = getUserId(req);
    const tenantId = getTenantId(req);

    const reminder = reminders.get(id);

    if (!reminder || reminder.userId !== userId || reminder.tenantId !== tenantId) {
      return res.status(404).json({ success: false, error: 'Reminder not found' });
    }

    // Validate trigger time if being updated
    if (triggerTime) {
      const newTrigger = parseDate(triggerTime);
      if (newTrigger <= new Date()) {
        return res.status(400).json({
          success: false,
          error: 'Trigger time must be in the future'
        });
      }
      reminder.triggerTime = newTrigger;
    }

    if (title !== undefined) reminder.title = title.trim();
    if (description !== undefined) reminder.description = description?.trim();
    if (recurrence !== undefined) reminder.recurrence = recurrence;
    if (channel !== undefined) reminder.channel = channel;
    if (isActive !== undefined) reminder.isActive = isActive;

    reminder.updatedAt = new Date();

    console.log(`[Reminder] Updated: ${reminder.id}`);

    const response: ApiResponse<Reminder> = {
      success: true,
      data: serializeReminder(reminder),
      message: 'Reminder updated'
    };

    res.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update reminder';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * DELETE /api/reminders/:id
 * Delete a reminder
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const tenantId = getTenantId(req);

    const reminder = reminders.get(id);

    if (!reminder || reminder.userId !== userId || reminder.tenantId !== tenantId) {
      return res.status(404).json({ success: false, error: 'Reminder not found' });
    }

    reminders.delete(id);

    console.log(`[Reminder] Deleted: ${id}`);

    const response: ApiResponse<null> = {
      success: true,
      message: 'Reminder deleted'
    };

    res.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete reminder';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /api/reminders/:id/complete
 * Mark a reminder as completed
 */
router.post('/:id/complete', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const tenantId = getTenantId(req);

    const reminder = reminders.get(id);

    if (!reminder || reminder.userId !== userId || reminder.tenantId !== tenantId) {
      return res.status(404).json({ success: false, error: 'Reminder not found' });
    }

    reminder.isCompleted = true;
    reminder.isActive = false;
    reminder.completedAt = new Date();
    reminder.updatedAt = new Date();

    // If recurring, create next occurrence
    if (reminder.type === 'recurring' && reminder.recurrence) {
      const nextTrigger = calculateNextOccurrence(
        new Date(reminder.triggerTime),
        reminder.recurrence
      );

      if (nextTrigger) {
        const newReminder: Reminder = {
          ...reminder,
          id: generateReminderId(),
          triggerTime: nextTrigger,
          isCompleted: false,
          isActive: true,
          isDismissed: false,
          completedAt: undefined,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        reminders.set(newReminder.id, newReminder);
        console.log(`[Reminder] Created next occurrence: ${newReminder.id} for ${nextTrigger.toISOString()}`);
      }
    }

    const response: ApiResponse<Reminder> = {
      success: true,
      data: serializeReminder(reminder),
      message: 'Reminder completed'
    };

    res.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to complete reminder';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /api/reminders/:id/snooze
 * Snooze a reminder
 */
router.post('/:id/snooze', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { minutes } = req.body;
    const userId = getUserId(req);
    const tenantId = getTenantId(req);

    const reminder = reminders.get(id);

    if (!reminder || reminder.userId !== userId || reminder.tenantId !== tenantId) {
      return res.status(404).json({ success: false, error: 'Reminder not found' });
    }

    if (minutes === undefined) {
      return res.status(400).json({ success: false, error: 'Snooze duration (minutes) is required' });
    }

    const snoozeMinutes = parseInt(minutes as string);
    if (isNaN(snoozeMinutes) || snoozeMinutes <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid snooze duration' });
    }

    const newTriggerTime = new Date(Date.now() + snoozeMinutes * 60 * 1000);
    reminder.triggerTime = newTriggerTime;
    reminder.updatedAt = new Date();

    console.log(`[Reminder] Snoozed: ${id} until ${newTriggerTime.toISOString()}`);

    const response: ApiResponse<Reminder> = {
      success: true,
      data: serializeReminder(reminder),
      message: `Reminder snoozed for ${snoozeMinutes} minutes`
    };

    res.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to snooze reminder';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /api/reminders/:id/dismiss
 * Dismiss a reminder (without completing)
 */
router.post('/:id/dismiss', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const tenantId = getTenantId(req);

    const reminder = reminders.get(id);

    if (!reminder || reminder.userId !== userId || reminder.tenantId !== tenantId) {
      return res.status(404).json({ success: false, error: 'Reminder not found' });
    }

    reminder.isDismissed = true;
    reminder.isActive = false;
    reminder.updatedAt = new Date();

    const response: ApiResponse<Reminder> = {
      success: true,
      data: serializeReminder(reminder),
      message: 'Reminder dismissed'
    };

    res.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to dismiss reminder';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /api/reminders/:id/reactivate
 * Reactivate a dismissed reminder
 */
router.post('/:id/reactivate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const tenantId = getTenantId(req);

    const reminder = reminders.get(id);

    if (!reminder || reminder.userId !== userId || reminder.tenantId !== tenantId) {
      return res.status(404).json({ success: false, error: 'Reminder not found' });
    }

    reminder.isDismissed = false;
    reminder.isActive = true;
    reminder.updatedAt = new Date();

    const response: ApiResponse<Reminder> = {
      success: true,
      data: serializeReminder(reminder),
      message: 'Reminder reactivated'
    };

    res.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to reactivate reminder';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * GET /api/reminders/upcoming
 * Get upcoming reminders (next 24 hours)
 */
router.get('/status/upcoming', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const tenantId = getTenantId(req);
    const { hours = '24' } = req.query;

    const hoursAhead = parseInt(hours as string);
    const now = new Date();
    const endTime = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

    const upcoming = Array.from(reminders.values())
      .filter(r =>
        r.userId === userId &&
        r.tenantId === tenantId &&
        r.isActive &&
        !r.isCompleted &&
        !r.isDismissed &&
        new Date(r.triggerTime) >= now &&
        new Date(r.triggerTime) <= endTime
      )
      .sort((a, b) =>
        new Date(a.triggerTime).getTime() - new Date(b.triggerTime).getTime()
      )
      .map(serializeReminder);

    const response: ApiResponse<Reminder[]> = {
      success: true,
      data: upcoming
    };

    res.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get upcoming reminders';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /api/reminders/bulk-complete
 * Complete multiple reminders
 */
router.post('/bulk-complete', async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    const userId = getUserId(req);
    const tenantId = getTenantId(req);

    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ success: false, error: 'IDs array is required' });
    }

    const completed: string[] = [];
    const notFound: string[] = [];

    ids.forEach(id => {
      const reminder = reminders.get(id);
      if (reminder && reminder.userId === userId && reminder.tenantId === tenantId) {
        reminder.isCompleted = true;
        reminder.isActive = false;
        reminder.completedAt = new Date();
        reminder.updatedAt = new Date();
        completed.push(id);
      } else {
        notFound.push(id);
      }
    });

    res.json({
      success: true,
      message: `${completed.length} reminders completed`,
      data: { completed, notFound }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to bulk complete';
    res.status(500).json({ success: false, error: message });
  }
});

// ============================================================================
// HELPERS
// ============================================================================

function calculateNextOccurrence(current: Date, recurrence: RecurrencePattern): Date | null {
  const interval = recurrence.interval || 1;
  let next = new Date(current);

  switch (recurrence.frequency) {
    case 'daily':
      next.setDate(next.getDate() + interval);
      break;
    case 'weekly':
      next.setDate(next.getDate() + interval * 7);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + interval);
      break;
    case 'yearly':
      next.setFullYear(next.getFullYear() + interval);
      break;
  }

  // Check if we've exceeded the until date or count
  if (recurrence.until && next > new Date(recurrence.until)) {
    return null;
  }

  return next;
}

export default router;
