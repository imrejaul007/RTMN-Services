const express = require('express');
const router = express.Router();

// In-memory reminder storage
const reminders = new Map();

// Reminder types
const reminderTypes = [
  { id: 'notification', name: 'Push Notification', icon: '🔔' },
  { id: 'email', name: 'Email', icon: '📧' },
  { id: 'sms', name: 'SMS', icon: '📱' },
  { id: 'smart', name: 'Smart Reminder', icon: '🧠' }
];

// Create reminder
router.post('/', (req, res) => {
  const { userId, title, message, type, trigger, recurrence, linkedTaskId, linkedEventId } = req.body;

  if (!userId || !title) {
    return res.status(400).json({
      success: false,
      error: 'userId and title are required'
    });
  }

  const reminder = {
    id: `reminder-${Date.now()}`,
    userId,
    title,
    message: message || '',
    type: type || 'notification',
    trigger: trigger || { type: 'time', datetime: new Date(Date.now() + 60 * 60 * 1000).toISOString() },
    recurrence: recurrence || null,
    linkedTaskId: linkedTaskId || null,
    linkedEventId: linkedEventId || null,
    status: 'pending',
    triggered: false,
    snoozed: [],
    createdAt: new Date().toISOString()
  };

  if (!reminders.has(userId)) {
    reminders.set(userId, []);
  }
  reminders.get(userId).push(reminder);

  res.json({
    success: true,
    message: 'Reminder created',
    data: {
      reminder,
      nextTrigger: calculateNextTrigger(reminder)
    }
  });
});

// Get reminders
router.get('/:userId', (req, res) => {
  const { userId } = req.params;
  const { status, upcoming, overdue } = req.query;

  let userReminders = reminders.get(userId) || [];

  if (status) {
    userReminders = userReminders.filter(r => r.status === status);
  }

  if (upcoming === 'true') {
    const now = new Date();
    userReminders = userReminders.filter(r => {
      if (r.status !== 'pending') return false;
      const triggerDate = new Date(r.trigger.datetime);
      return triggerDate > now;
    });
  }

  if (overdue === 'true') {
    const now = new Date();
    userReminders = userReminders.filter(r => {
      if (r.status !== 'pending') return false;
      const triggerDate = new Date(r.trigger.datetime);
      return triggerDate < now;
    });
  }

  userReminders.sort((a, b) => new Date(a.trigger.datetime) - new Date(b.trigger.datetime));

  res.json({
    success: true,
    data: {
      reminders: userReminders,
      count: userReminders.length,
      byStatus: {
        pending: userReminders.filter(r => r.status === 'pending').length,
        triggered: userReminders.filter(r => r.status === 'triggered').length,
        snoozed: userReminders.filter(r => r.snoozed?.length > 0).length
      }
    }
  });
});

// Snooze reminder
router.post('/:reminderId/snooze', (req, res) => {
  const { reminderId } = req.params;
  const { minutes } = req.body;

  let reminder = null;
  for (const userReminders of reminders.values()) {
    const found = userReminders.find(r => r.id === reminderId);
    if (found) {
      reminder = found;
      break;
    }
  }

  if (!reminder) {
    return res.status(404).json({
      success: false,
      error: 'Reminder not found'
    });
  }

  const snoozeMinutes = minutes || 15;
  const newTime = new Date(Date.now() + snoozeMinutes * 60 * 1000);

  reminder.snoozed.push({
    originalTime: reminder.trigger.datetime,
    snoozedAt: new Date().toISOString(),
    snoozedFor: snoozeMinutes
  });

  reminder.trigger.datetime = newTime.toISOString();
  reminder.status = 'pending';

  res.json({
    success: true,
    message: `Reminder snoozed for ${snoozeMinutes} minutes`,
    data: {
      reminder,
      newTrigger: newTime.toISOString()
    }
  });
});

// Dismiss reminder
router.post('/:reminderId/dismiss', (req, res) => {
  const { reminderId } = req.params;

  let reminder = null;
  for (const userReminders of reminders.values()) {
    const found = userReminders.find(r => r.id === reminderId);
    if (found) {
      reminder = found;
      break;
    }
  }

  if (!reminder) {
    return res.status(404).json({
      success: false,
      error: 'Reminder not found'
    });
  }

  reminder.status = 'dismissed';
  reminder.dismissedAt = new Date().toISOString();

  res.json({
    success: true,
    message: 'Reminder dismissed',
    data: reminder
  });
});

// Complete reminder action
router.post('/:reminderId/complete', (req, res) => {
  const { reminderId } = req.params;

  let reminder = null;
  for (const userReminders of reminders.values()) {
    const found = userReminders.find(r => r.id === reminderId);
    if (found) {
      reminder = found;
      break;
    }
  }

  if (!reminder) {
    return res.status(404).json({
      success: false,
      error: 'Reminder not found'
    });
  }

  reminder.status = 'triggered';
  reminder.triggeredAt = new Date().toISOString();
  reminder.triggered = true;

  res.json({
    success: true,
    message: 'Reminder completed! 🎉',
    data: {
      reminder,
      completionTime: reminder.triggeredAt
    }
  });
});

// Delete reminder
router.delete('/:reminderId', (req, res) => {
  const { reminderId } = req.params;

  for (const [userId, userReminders] of reminders.entries()) {
    const index = userReminders.findIndex(r => r.id === reminderId);
    if (index !== -1) {
      userReminders.splice(index, 1);
      res.json({ success: true, message: 'Reminder deleted' });
      return;
    }
  }

  res.status(404).json({ success: false, error: 'Reminder not found' });
});

// Get reminder types
router.get('/types/all', (req, res) => {
  res.json({
    success: true,
    data: reminderTypes
  });
});

// Create smart reminder
router.post('/smart', (req, res) => {
  const { userId, title, context, conditions, actions } = req.body;

  if (!userId || !title || !conditions) {
    return res.status(400).json({
      success: false,
      error: 'userId, title, and conditions are required'
    });
  }

  const smartReminder = {
    id: `smart-${Date.now()}`,
    userId,
    title,
    type: 'smart',
    context: context || {},
    conditions,
    actions: actions || [],
    status: 'active',
    triggeredCount: 0,
    lastTriggered: null,
    createdAt: new Date().toISOString()
  };

  if (!reminders.has(userId)) {
    reminders.set(userId, []);
  }
  reminders.get(userId).push(smartReminder);

  res.json({
    success: true,
    message: 'Smart reminder created',
    data: smartReminder
  });
});

// Get smart reminder suggestions
router.get('/suggestions/:userId', (req, res) => {
  const { userId } = req.params;

  const suggestions = [
    {
      title: 'Drink Water',
      context: { category: 'health' },
      conditions: [
        { type: 'time', interval: '2h' }
      ],
      actions: [
        { type: 'notification', message: 'Time to hydrate! 💧' }
      ]
    },
    {
      title: 'Take a Break',
      context: { category: 'productivity' },
      conditions: [
        { type: 'focus', duration: 90 }
      ],
      actions: [
        { type: 'notification', message: 'Time for a 5-minute break!' }
      ]
    },
    {
      title: 'Stand Up',
      context: { category: 'health' },
      conditions: [
        { type: 'sedentary', duration: 60 }
      ],
      actions: [
        { type: 'notification', message: 'You\'ve been sitting for a while. Stand up and stretch! 🧘' }
      ]
    }
  ];

  res.json({
    success: true,
    data: suggestions
  });
});

// Helper functions
function calculateNextTrigger(reminder) {
  if (reminder.status !== 'pending') return null;

  if (reminder.trigger.type === 'time') {
    return reminder.trigger.datetime;
  }

  if (reminder.trigger.type === 'relative') {
    return new Date(Date.now() + reminder.trigger.minutes * 60 * 1000).toISOString();
  }

  return null;
}

module.exports = router;