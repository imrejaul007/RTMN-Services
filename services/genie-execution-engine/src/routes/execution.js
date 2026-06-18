const express = require('express');
const router = express.Router();

// In-memory execution storage
const executions = new Map();
const actionHistory = new Map();

// Action types
const actionTypes = [
  { id: 'send-email', name: 'Send Email', icon: '📧', category: 'communication' },
  { id: 'send-message', name: 'Send Message', icon: '💬', category: 'communication' },
  { id: 'create-task', name: 'Create Task', icon: '✅', category: 'productivity' },
  { id: 'schedule-event', name: 'Schedule Event', icon: '📅', category: 'productivity' },
  { id: 'make-call', name: 'Make Call', icon: '📞', category: 'communication' },
  { id: 'book-meeting', name: 'Book Meeting', icon: '🗓️', category: 'productivity' },
  { id: 'set-reminder', name: 'Set Reminder', icon: '⏰', category: 'productivity' },
  { id: 'update-status', name: 'Update Status', icon: '📝', category: 'data' },
  { id: 'share-file', name: 'Share File', icon: '📁', category: 'data' },
  { id: 'post-content', name: 'Post Content', icon: '📤', category: 'social' }
];

// Execute action
router.post('/action', (req, res) => {
  const { userId, actionType, config, priority } = req.body;

  if (!userId || !actionType) {
    return res.status(400).json({
      success: false,
      error: 'userId and actionType are required'
    });
  }

  const action = {
    id: `action-${Date.now()}`,
    userId,
    actionType,
    config: config || {},
    priority: priority || 'normal',
    status: 'executing',
    startedAt: new Date().toISOString(),
    completedAt: null,
    result: null,
    error: null
  };

  // Execute action (simulate)
  const result = executeAction(actionType, config);
  action.status = result.success ? 'completed' : 'failed';
  action.completedAt = new Date().toISOString();
  action.result = result;

  // Store in history
  if (!actionHistory.has(userId)) {
    actionHistory.set(userId, []);
  }
  actionHistory.get(userId).push(action);

  res.json({
    success: result.success,
    message: result.success ? 'Action executed successfully' : 'Action failed',
    data: action
  });
});

// Batch execute actions
router.post('/batch', (req, res) => {
  const { userId, actions } = req.body;

  if (!userId || !actions || !Array.isArray(actions)) {
    return res.status(400).json({
      success: false,
      error: 'userId and actions array are required'
    });
  }

  const results = [];
  let successCount = 0;

  for (const action of actions) {
    const result = executeAction(action.type, action.config);
    results.push({
      type: action.type,
      success: result.success,
      result
    });
    if (result.success) successCount++;
  }

  res.json({
    success: true,
    message: `${successCount}/${actions.length} actions completed`,
    data: {
      results,
      summary: {
        total: actions.length,
        succeeded: successCount,
        failed: actions.length - successCount
      }
    }
  });
});

// Schedule action
router.post('/schedule', (req, res) => {
  const { userId, actionType, config, scheduledFor, recurrence } = req.body;

  if (!userId || !actionType || !scheduledFor) {
    return res.status(400).json({
      success: false,
      error: 'userId, actionType, and scheduledFor are required'
    });
  }

  const execution = {
    id: `scheduled-${Date.now()}`,
    userId,
    actionType,
    config: config || {},
    scheduledFor,
    recurrence: recurrence || null,
    status: 'scheduled',
    createdAt: new Date().toISOString(),
    executedAt: null
  };

  if (!executions.has(userId)) {
    executions.set(userId, []);
  }
  executions.get(userId).push(execution);

  res.json({
    success: true,
    message: 'Action scheduled',
    data: {
      execution,
      scheduledFor: new Date(scheduledFor).toLocaleString()
    }
  });
});

// Get scheduled actions
router.get('/:userId/scheduled', (req, res) => {
  const { userId } = req.params;

  const userExecutions = (executions.get(userId) || []).filter(e => e.status === 'scheduled');

  userExecutions.sort((a, b) => new Date(a.scheduledFor) - new Date(b.scheduledFor));

  res.json({
    success: true,
    data: {
      scheduled: userExecutions,
      count: userExecutions.length
    }
  });
});

// Get execution history
router.get('/:userId/history', (req, res) => {
  const { userId } = req.params;
  const { limit = 50, actionType } = req.query;

  let history = actionHistory.get(userId) || [];

  if (actionType) {
    history = history.filter(h => h.actionType === actionType);
  }

  history.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
  history = history.slice(0, parseInt(limit));

  res.json({
    success: true,
    data: {
      history,
      summary: {
        totalActions: (actionHistory.get(userId) || []).length,
        byType: getActionCountsByType(actionHistory.get(userId) || []),
        successRate: calculateSuccessRate(actionHistory.get(userId) || [])
      }
    }
  });
});

// Get execution stats
router.get('/:userId/stats', (req, res) => {
  const { userId } = req.params;

  const history = actionHistory.get(userId) || [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayActions = history.filter(h => new Date(h.startedAt) >= today);
  const thisWeek = history.filter(h => {
    const d = new Date(h.startedAt);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    return d >= weekAgo;
  });

  res.json({
    success: true,
    data: {
      total: history.length,
      today: {
        count: todayActions.length,
        completed: todayActions.filter(h => h.status === 'completed').length
      },
      thisWeek: {
        count: thisWeek.length,
        completed: thisWeek.filter(h => h.status === 'completed').length
      },
      successRate: calculateSuccessRate(history),
      byCategory: getActionCountsByCategory(history),
      mostUsed: getMostUsedActions(history)
    }
  });
});

// Cancel scheduled execution
router.delete('/scheduled/:executionId', (req, res) => {
  const { executionId } = req.params;

  for (const [userId, userExecutions] of executions.entries()) {
    const index = userExecutions.findIndex(e => e.id === executionId);
    if (index !== -1) {
      userExecutions.splice(index, 1);
      res.json({ success: true, message: 'Scheduled action cancelled' });
      return;
    }
  }

  res.status(404).json({ success: false, error: 'Scheduled action not found' });
});

// Retry failed action
router.post('/retry/:actionId', (req, res) => {
  const { actionId } = req.params;

  let originalAction = null;
  for (const userHistory of actionHistory.values()) {
    const found = userHistory.find(h => h.id === actionId);
    if (found) {
      originalAction = found;
      break;
    }
  }

  if (!originalAction) {
    return res.status(404).json({
      success: false,
      error: 'Action not found'
    });
  }

  if (originalAction.status !== 'failed') {
    return res.status(400).json({
      success: false,
      error: 'Can only retry failed actions'
    });
  }

  // Retry the action
  const result = executeAction(originalAction.actionType, originalAction.config);

  const retryAction = {
    ...originalAction,
    id: `action-${Date.now()}`,
    status: result.success ? 'completed' : 'failed',
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    result,
    retryOf: actionId
  };

  actionHistory.get(originalAction.userId).push(retryAction);

  res.json({
    success: result.success,
    message: result.success ? 'Action retried successfully' : 'Retry failed',
    data: retryAction
  });
});

// Get action types
router.get('/types/all', (req, res) => {
  res.json({
    success: true,
    data: actionTypes
  });
});

// Get action suggestions
router.get('/:userId/suggestions', (req, res) => {
  const { userId } = req.params;

  const suggestions = [
    { actionType: 'send-email', suggestion: 'Send a follow-up email', frequency: 'high' },
    { actionType: 'set-reminder', suggestion: 'Set a reminder for next steps', frequency: 'high' },
    { actionType: 'create-task', suggestion: 'Create a task for this item', frequency: 'medium' },
    { actionType: 'schedule-event', suggestion: 'Schedule a follow-up meeting', frequency: 'medium' }
  ];

  res.json({
    success: true,
    data: suggestions
  });
});

// Helper functions
function executeAction(actionType, config) {
  // Simulate action execution
  try {
    const actionDef = actionTypes.find(a => a.id === actionType);

    switch (actionType) {
      case 'send-email':
        return {
          success: true,
          message: `Email sent to ${config.to || 'recipient'}`,
          details: {
            to: config.to,
            subject: config.subject || 'No subject',
            sentAt: new Date().toISOString()
          }
        };

      case 'send-message':
        return {
          success: true,
          message: `Message sent`,
          details: {
            recipient: config.recipient,
            content: config.content?.substring(0, 50) + '...',
            sentAt: new Date().toISOString()
          }
        };

      case 'create-task':
        return {
          success: true,
          message: `Task created: ${config.title || 'Untitled'}`,
          details: {
            taskId: `task-${Date.now()}`,
            title: config.title,
            priority: config.priority
          }
        };

      case 'schedule-event':
        return {
          success: true,
          message: `Event scheduled`,
          details: {
            eventId: `event-${Date.now()}`,
            title: config.title,
            start: config.start
          }
        };

      case 'set-reminder':
        return {
          success: true,
          message: `Reminder set for ${config.datetime || 'later'}`,
          details: {
            reminderId: `reminder-${Date.now()}`,
            title: config.title
          }
        };

      case 'make-call':
        return {
          success: true,
          message: `Call initiated`,
          details: {
            to: config.phone,
            duration: config.duration || 'in progress'
          }
        };

      case 'book-meeting':
        return {
          success: true,
          message: `Meeting booked`,
          details: {
            meetingId: `meeting-${Date.now()}`,
            title: config.title,
            attendees: config.attendees?.length || 0
          }
        };

      case 'post-content':
        return {
          success: true,
          message: `Content posted to ${config.platform || 'social'}`,
          details: {
            platform: config.platform,
            content: config.content?.substring(0, 50) + '...'
          }
        };

      default:
        return {
          success: true,
          message: `Action ${actionType} executed`,
          details: config
        };
    }
  } catch (error) {
    return {
      success: false,
      message: `Action failed: ${error.message}`,
      error: error.message
    };
  }
}

function getActionCountsByType(history) {
  const counts = {};
  history.forEach(h => {
    counts[h.actionType] = (counts[h.actionType] || 0) + 1;
  });
  return counts;
}

function getActionCountsByCategory(history) {
  const categoryCounts = {};
  history.forEach(h => {
    const actionDef = actionTypes.find(a => a.id === h.actionType);
    const category = actionDef?.category || 'other';
    categoryCounts[category] = (categoryCounts[category] || 0) + 1;
  });
  return categoryCounts;
}

function getMostUsedActions(history) {
  const counts = getActionCountsByType(history);
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([type, count]) => ({
      type,
      name: actionTypes.find(a => a.id === type)?.name || type,
      count
    }));
}

function calculateSuccessRate(history) {
  if (history.length === 0) return 100;
  const completed = history.filter(h => h.status === 'completed').length;
  return Math.round((completed / history.length) * 100);
}

module.exports = router;