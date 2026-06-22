/**
 * Reminders Routes - Relationship reminders
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

/**
 * POST /api/reminders
 * Create a reminder
 */
router.post('/api/reminders', async (req, res) => {
  const { userId, personId, personName, type, remindAt, reason, recurring, recurringInterval } = req.body;
  const storage = req.app.locals.storage;

  if (!userId || !personId) {
    return res.status(400).json({ success: false, error: 'userId and personId are required' });
  }

  if (!storage.reminders.has(userId)) {
    storage.reminders.set(userId, []);
  }

  const reminder = {
    id: uuidv4(),
    userId,
    personId,
    personName,
    type: type || 'reconnect', // reconnect, birthday, anniversary, follow_up, check_in
    remindAt: remindAt || getNextReminderDate(type),
    reason: reason || '',
    recurring: recurring || false,
    recurringInterval: recurringInterval || null, // weekly, monthly, yearly
    status: 'pending', // pending, completed, snoozed
    snoozedUntil: null,
    completedAt: null,
    createdAt: new Date().toISOString()
  };

  storage.reminders.get(userId).push(reminder);

  res.json({ success: true, reminder });
});

/**
 * GET /api/reminders/:userId
 * Get all reminders
 */
router.get('/api/reminders/:userId', async (req, res) => {
  const { userId } = req.params;
  const { status, personId, upcoming } = req.query;
  const storage = req.app.locals.storage;

  let reminders = storage.reminders.get(userId) || [];

  // Filter by status
  if (status) {
    reminders = reminders.filter(r => r.status === status);
  }

  // Filter by person
  if (personId) {
    reminders = reminders.filter(r => r.personId === personId);
  }

  // Filter upcoming (next 7 days)
  if (upcoming === 'true') {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    reminders = reminders.filter(r =>
      r.status === 'pending' &&
      new Date(r.remindAt) <= nextWeek
    );
  }

  // Sort by remindAt
  reminders.sort((a, b) => new Date(a.remindAt) - new Date(b.remindAt));

  res.json({
    success: true,
    reminders,
    count: reminders.length
  });
});

/**
 * PUT /api/reminders/:userId/:reminderId
 * Update reminder
 */
router.put('/api/reminders/:userId/:reminderId', async (req, res) => {
  const { userId, reminderId } = req.params;
  const updates = req.body;
  const storage = req.app.locals.storage;

  const reminders = storage.reminders.get(userId) || [];
  const index = reminders.findIndex(r => r.id === reminderId);

  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Reminder not found' });
  }

  reminders[index] = { ...reminders[index], ...updates };
  storage.reminders.set(userId, reminders);

  res.json({ success: true, reminder: reminders[index] });
});

/**
 * POST /api/reminders/:userId/:reminderId/complete
 * Complete reminder
 */
router.post('/api/reminders/:userId/:reminderId/complete', async (req, res) => {
  const { userId, reminderId } = req.params;
  const storage = req.app.locals.storage;

  const reminders = storage.reminders.get(userId) || [];
  const index = reminders.findIndex(r => r.id === reminderId);

  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Reminder not found' });
  }

  reminders[index].status = 'completed';
  reminders[index].completedAt = new Date().toISOString();

  // If recurring, create next reminder
  if (reminders[index].recurring) {
    const nextDate = getNextRecurringDate(reminders[index].remindingInterval || reminders[index].recurringInterval);
    storage.reminders.get(userId).push({
      ...reminders[index],
      id: uuidv4(),
      remindAt: nextDate,
      status: 'pending',
      completedAt: null,
      createdAt: new Date().toISOString()
    });
  }

  storage.reminders.set(userId, reminders);

  res.json({ success: true, reminder: reminders[index] });
});

/**
 * POST /api/reminders/:userId/:reminderId/snooze
 * Snooze reminder
 */
router.post('/api/reminders/:userId/:reminderId/snooze', async (req, res) => {
  const { userId, reminderId } = req.params;
  const { snoozeFor } = req.body; // hours
  const storage = req.app.locals.storage;

  const reminders = storage.reminders.get(userId) || [];
  const index = reminders.findIndex(r => r.id === reminderId);

  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Reminder not found' });
  }

  const snoozeHours = snoozeFor || 24;
  const snoozeUntil = new Date();
  snoozeUntil.setHours(snoozeUntil.getHours() + snoozeHours);

  reminders[index].status = 'snoozed';
  reminders[index].snoozedUntil = snoozeUntil.toISOString();

  storage.reminders.set(userId, reminders);

  res.json({ success: true, reminder: reminders[index] });
});

/**
 * DELETE /api/reminders/:userId/:reminderId
 * Delete reminder
 */
router.delete('/api/reminders/:userId/:reminderId', async (req, res) => {
  const { userId, reminderId } = req.params;
  const storage = req.app.locals.storage;

  const reminders = storage.reminders.get(userId) || [];
  const filtered = reminders.filter(r => r.id !== reminderId);

  if (filtered.length === reminders.length) {
    return res.status(404).json({ success: false, error: 'Reminder not found' });
  }

  storage.reminders.set(userId, filtered);

  res.json({ success: true, message: 'Reminder deleted' });
});

/**
 * POST /api/reminders/:userId/automatic
 * Create automatic reminders based on relationship
 */
router.post('/api/reminders/:userId/automatic', async (req, res) => {
  const { userId } = req.params;
  const storage = req.app.locals.storage;

  const people = storage.people.get(userId) || [];
  const reminders = storage.reminders.get(userId) || [];
  const created = [];

  people.forEach(person => {
    // Check if reminder already exists
    const existing = reminders.find(r =>
      r.personId === person.id &&
      r.type === 'reconnect' &&
      r.status === 'pending'
    );

    if (existing) return;

    // Calculate next reminder based on importance
    const expectedFrequency = person.importance >= 8 ? 7 : person.importance >= 5 ? 14 : 30;
    const lastContact = person.lastContact ? new Date(person.lastContact) : new Date(person.createdAt);
    const nextReminder = new Date(lastContact);
    nextReminder.setDate(nextReminder.getDate() + expectedFrequency);

    // Only create if overdue
    if (nextReminder < new Date()) {
      const reminder = {
        id: uuidv4(),
        userId,
        personId: person.id,
        personName: person.name,
        type: 'reconnect',
        remindAt: new Date().toISOString(),
        reason: `Time to reconnect with ${person.name} (${person.relationshipType})`,
        recurring: true,
        recurringInterval: expectedFrequency <= 7 ? 'weekly' : expectedFrequency <= 14 ? 'biweekly' : 'monthly',
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      reminders.push(reminder);
      created.push(reminder);
    }
  });

  storage.reminders.set(userId, reminders);

  res.json({
    success: true,
    created: created.length,
    reminders: created
  });
});

// Helper functions
function getNextReminderDate(type) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString();
}

function getNextRecurringDate(interval) {
  const next = new Date();

  switch (interval) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'biweekly':
      next.setDate(next.getDate() + 14);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'yearly':
      next.setFullYear(next.getFullYear() + 1);
      break;
    default:
      next.setDate(next.getDate() + 7);
  }

  return next.toISOString();
}

export default router;
