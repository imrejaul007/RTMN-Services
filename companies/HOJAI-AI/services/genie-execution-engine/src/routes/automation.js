const express = require('express');
const router = express.Router();

// In-memory automation storage
const automations = new Map();
const routines = new Map();

// Automation types
const automationTypes = [
  { id: 'scheduled', name: 'Scheduled', description: 'Runs at specific times' },
  { id: 'triggered', name: 'Trigger-Based', description: 'Runs when specific events occur' },
  { id: 'conditional', name: 'Conditional', description: 'Runs based on conditions' },
  { id: 'recurring', name: 'Recurring', description: 'Repeats on a schedule' }
];

// Trigger types
const triggerTypes = [
  { id: 'time', name: 'Time', fields: ['hour', 'minute', 'days'] },
  { id: 'date', name: 'Date', fields: ['date', 'recurrence'] },
  { id: 'location', name: 'Location', fields: ['location', 'distance'] },
  { id: 'event', name: 'Event', fields: ['event_type'] }
];

// Action types
const actionTypes = [
  { id: 'notification', name: 'Send Notification', icon: '🔔' },
  { id: 'email', name: 'Send Email', icon: '📧' },
  { id: 'task', name: 'Create Task', icon: '✅' },
  { id: 'reminder', name: 'Set Reminder', icon: '⏰' },
  { id: 'calendar', name: 'Add to Calendar', icon: '📅' },
  { id: 'message', name: 'Send Message', icon: '💬' },
  { id: 'data', name: 'Update Data', icon: '📝' },
  { id: 'webhook', name: 'Trigger Webhook', icon: '🔗' }
];

// Create automation
router.post('/', (req, res) => {
  const { userId, name, type, trigger, actions, enabled, schedule } = req.body;

  if (!userId || !name || !trigger) {
    return res.status(400).json({
      success: false,
      error: 'userId, name, and trigger are required'
    });
  }

  const automation = {
    id: `auto-${Date.now()}`,
    userId,
    name,
    type: type || 'scheduled',
    trigger,
    actions: actions || [],
    enabled: enabled !== false,
    schedule: schedule || { type: 'daily', time: '09:00' },
    stats: {
      runs: 0,
      lastRun: null,
      successRate: 100
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (!automations.has(userId)) {
    automations.set(userId, []);
  }
  automations.get(userId).push(automation);

  res.json({
    success: true,
    message: 'Automation created',
    data: {
      automation,
      nextRun: calculateNextRun(automation)
    }
  });
});

// Get automations
router.get('/:userId', (req, res) => {
  const { userId } = req.params;
  const { enabled, type } = req.query;

  let userAutomations = automations.get(userId) || [];

  if (enabled !== undefined) {
    userAutomations = userAutomations.filter(a => a.enabled === (enabled === 'true'));
  }

  if (type) {
    userAutomations = userAutomations.filter(a => a.type === type);
  }

  userAutomations.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({
    success: true,
    data: {
      automations: userAutomations,
      count: userAutomations.length,
      activeCount: userAutomations.filter(a => a.enabled).length
    }
  });
});

// Update automation
router.put('/:automationId', (req, res) => {
  const { automationId } = req.params;
  const { name, trigger, actions, enabled, schedule } = req.body;

  let automation = null;
  for (const userAutos of automations.values()) {
    const found = userAutos.find(a => a.id === automationId);
    if (found) {
      automation = found;
      break;
    }
  }

  if (!automation) {
    return res.status(404).json({
      success: false,
      error: 'Automation not found'
    });
  }

  if (name !== undefined) automation.name = name;
  if (trigger !== undefined) automation.trigger = trigger;
  if (actions !== undefined) automation.actions = actions;
  if (enabled !== undefined) automation.enabled = enabled;
  if (schedule !== undefined) automation.schedule = schedule;
  automation.updatedAt = new Date().toISOString();

  res.json({
    success: true,
    message: 'Automation updated',
    data: automation
  });
});

// Run automation (manual trigger)
router.post('/:automationId/run', (req, res) => {
  const { automationId } = req.params;

  let automation = null;
  for (const userAutos of automations.values()) {
    const found = userAutos.find(a => a.id === automationId);
    if (found) {
      automation = found;
      break;
    }
  }

  if (!automation) {
    return res.status(404).json({
      success: false,
      error: 'Automation not found'
    });
  }

  // Simulate running automation
  const results = automation.actions.map(action => ({
    actionId: action.id,
    status: 'completed',
    output: simulateActionExecution(action)
  }));

  automation.stats.runs++;
  automation.stats.lastRun = new Date().toISOString();

  res.json({
    success: true,
    message: 'Automation executed',
    data: {
      automation: { id: automation.id, name: automation.name },
      results,
      executionTime: Math.round(Math.random() * 1000) + 'ms'
    }
  });
});

// Delete automation
router.delete('/:automationId', (req, res) => {
  const { automationId } = req.params;

  for (const [userId, userAutos] of automations.entries()) {
    const index = userAutos.findIndex(a => a.id === automationId);
    if (index !== -1) {
      userAutos.splice(index, 1);
      res.json({ success: true, message: 'Automation deleted' });
      return;
    }
  }

  res.status(404).json({ success: false, error: 'Automation not found' });
});

// Create routine (compound automation)
router.post('/routine', (req, res) => {
  const { userId, name, steps, trigger } = req.body;

  if (!userId || !name) {
    return res.status(400).json({
      success: false,
      error: 'userId and name are required'
    });
  }

  const routine = {
    id: `routine-${Date.now()}`,
    userId,
    name,
    steps: steps || [],
    trigger: trigger || { type: 'manual' },
    enabled: true,
    stats: {
      completions: 0,
      averageTime: 0,
      streak: 0
    },
    createdAt: new Date().toISOString()
  };

  if (!routines.has(userId)) {
    routines.set(userId, []);
  }
  routines.get(userId).push(routine);

  res.json({
    success: true,
    message: 'Routine created',
    data: routine
  });
});

// Execute routine
router.post('/routine/:routineId/execute', (req, res) => {
  const { routineId } = req.params;

  let routine = null;
  for (const userRoutines of routines.values()) {
    const found = userRoutines.find(r => r.id === routineId);
    if (found) {
      routine = found;
      break;
    }
  }

  if (!routine) {
    return res.status(404).json({
      success: false,
      error: 'Routine not found'
    });
  }

  const startTime = Date.now();
  const results = routine.steps.map((step, i) => ({
    step: i + 1,
    name: step.name || `Step ${i + 1}`,
    status: 'completed',
    duration: Math.round(Math.random() * 500) + 100
  }));

  const executionTime = Date.now() - startTime;

  routine.stats.completions++;
  routine.stats.averageTime = (routine.stats.averageTime + executionTime) / 2;
  routine.stats.lastCompleted = new Date().toISOString();

  res.json({
    success: true,
    message: 'Routine completed!',
    data: {
      routine: { id: routine.id, name: routine.name },
      stepsCompleted: results.length,
      executionTime: executionTime + 'ms',
      results
    }
  });
});

// Get routines
router.get('/routine/:userId', (req, res) => {
  const { userId } = req.params;

  const userRoutines = routines.get(userId) || [];

  res.json({
    success: true,
    data: userRoutines
  });
});

// Get automation types
router.get('/types/all', (req, res) => {
  res.json({
    success: true,
    data: {
      automationTypes,
      triggerTypes,
      actionTypes
    }
  });
});

// Get suggested automations
router.get('/suggestions/:userId', (req, res) => {
  const { userId } = req.params;

  const suggestions = [
    {
      name: 'Morning Briefing',
      description: 'Daily summary at 8 AM',
      type: 'scheduled',
      trigger: { type: 'time', hour: 8, minute: 0, days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
      actions: [
        { id: 'notif-1', type: 'notification', config: { message: 'Good morning! Here\'s your day ahead.' } }
      ]
    },
    {
      name: 'Weekly Review',
      description: 'Every Sunday evening',
      type: 'recurring',
      trigger: { type: 'time', hour: 18, minute: 0, days: ['Sun'] },
      actions: [
        { id: 'task-1', type: 'task', config: { title: 'Weekly Review' } }
      ]
    },
    {
      name: 'Meeting Reminder',
      description: '15 minutes before meetings',
      type: 'triggered',
      trigger: { type: 'event', event_type: 'calendar_event' },
      actions: [
        { id: 'remind-1', type: 'reminder', config: { minutes_before: 15 } }
      ]
    }
  ];

  res.json({
    success: true,
    data: suggestions
  });
});

// Helper functions
function calculateNextRun(automation) {
  if (!automation.enabled) return null;

  const now = new Date();
  const schedule = automation.schedule;

  if (schedule.type === 'daily') {
    const [hours, minutes] = (schedule.time || '09:00').split(':');
    const next = new Date(now);
    next.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    if (next < now) next.setDate(next.getDate() + 1);
    return next.toISOString();
  }

  return now.toISOString();
}

function simulateActionExecution(action) {
  return {
    message: `${actionTypes.find(a => a.id === action.type)?.name || 'Action'} executed successfully`,
    details: action.config || {}
  };
}

module.exports = router;