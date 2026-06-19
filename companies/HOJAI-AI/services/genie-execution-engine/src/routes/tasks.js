const express = require('express');
const router = express.Router();

// In-memory task storage
const tasks = new Map();
const projects = new Map();

// Task priorities
const priorities = [
  { id: 'urgent-important', name: 'Urgent & Important', color: '#E74C3C', priority: 1 },
  { id: 'important-not-urgent', name: 'Important, Not Urgent', color: '#F39C12', priority: 2 },
  { id: 'urgent-not-important', name: 'Urgent, Not Important', color: '#3498DB', priority: 3 },
  { id: 'not-urgent-not-important', name: 'Not Urgent, Not Important', color: '#95A5A6', priority: 4 }
];

// Task statuses
const statuses = ['todo', 'in-progress', 'review', 'done', 'cancelled'];

// Create task
router.post('/', (req, res) => {
  const { userId, title, description, projectId, priority, dueDate, tags, subtasks } = req.body;

  if (!userId || !title) {
    return res.status(400).json({
      success: false,
      error: 'userId and title are required'
    });
  }

  const task = {
    id: `task-${Date.now()}`,
    userId,
    title,
    description: description || '',
    projectId: projectId || null,
    priority: priority || 'important-not-urgent',
    status: 'todo',
    dueDate: dueDate || null,
    tags: tags || [],
    subtasks: (subtasks || []).map(st => ({
      id: `subtask-${Date.now()}-${Math.random()}`,
      title: st.title,
      completed: false
    })),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null
  };

  if (!tasks.has(userId)) {
    tasks.set(userId, []);
  }
  tasks.get(userId).push(task);

  res.json({
    success: true,
    message: 'Task created',
    data: {
      task,
      priority: priorities.find(p => p.id === priority)
    }
  });
});

// Get tasks
router.get('/:userId', (req, res) => {
  const { userId } = req.params;
  const { status, priority, projectId, dueToday, overdue } = req.query;

  let userTasks = tasks.get(userId) || [];

  // Apply filters
  if (status) {
    userTasks = userTasks.filter(t => t.status === status);
  }

  if (priority) {
    userTasks = userTasks.filter(t => t.priority === priority);
  }

  if (projectId) {
    userTasks = userTasks.filter(t => t.projectId === projectId);
  }

  if (dueToday) {
    const today = new Date().toDateString();
    userTasks = userTasks.filter(t => t.dueDate && new Date(t.dueDate).toDateString() === today);
  }

  if (overdue) {
    const now = new Date();
    userTasks = userTasks.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== 'done');
  }

  // Sort by priority then due date
  userTasks.sort((a, b) => {
    const aPriority = priorities.find(p => p.id === a.priority)?.priority || 5;
    const bPriority = priorities.find(p => p.id === b.priority)?.priority || 5;
    if (aPriority !== bPriority) return aPriority - bPriority;
    if (a.dueDate && b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate);
    return 0;
  });

  res.json({
    success: true,
    data: {
      tasks: userTasks,
      count: userTasks.length,
      byStatus: getTaskCountsByStatus(userTasks)
    }
  });
});

// Update task
router.put('/:taskId', (req, res) => {
  const { taskId } = req.params;
  const { title, description, priority, status, dueDate, tags } = req.body;

  let task = null;
  for (const userTasks of tasks.values()) {
    const found = userTasks.find(t => t.id === taskId);
    if (found) {
      task = found;
      break;
    }
  }

  if (!task) {
    return res.status(404).json({
      success: false,
      error: 'Task not found'
    });
  }

  if (title !== undefined) task.title = title;
  if (description !== undefined) task.description = description;
  if (priority !== undefined) task.priority = priority;
  if (status !== undefined) {
    task.status = status;
    if (status === 'done' && !task.completedAt) {
      task.completedAt = new Date().toISOString();
    }
  }
  if (dueDate !== undefined) task.dueDate = dueDate;
  if (tags !== undefined) task.tags = tags;
  task.updatedAt = new Date().toISOString();

  res.json({
    success: true,
    message: 'Task updated',
    data: task
  });
});

// Complete task
router.post('/:taskId/complete', (req, res) => {
  const { taskId } = req.params;

  let task = null;
  for (const userTasks of tasks.values()) {
    const found = userTasks.find(t => t.id === taskId);
    if (found) {
      task = found;
      break;
    }
  }

  if (!task) {
    return res.status(404).json({
      success: false,
      error: 'Task not found'
    });
  }

  task.status = 'done';
  task.completedAt = new Date().toISOString();
  task.updatedAt = new Date().toISOString();

  res.json({
    success: true,
    message: 'Task completed! 🎉',
    data: {
      task,
      productivity: calculateProductivityBoost(task)
    }
  });
});

// Add subtask
router.post('/:taskId/subtask', (req, res) => {
  const { taskId } = req.params;
  const { title } = req.body;

  if (!title) {
    return res.status(400).json({
      success: false,
      error: 'title is required'
    });
  }

  let task = null;
  for (const userTasks of tasks.values()) {
    const found = userTasks.find(t => t.id === taskId);
    if (found) {
      task = found;
      break;
    }
  }

  if (!task) {
    return res.status(404).json({
      success: false,
      error: 'Task not found'
    });
  }

  const subtask = {
    id: `subtask-${Date.now()}`,
    title,
    completed: false
  };

  task.subtasks.push(subtask);
  task.updatedAt = new Date().toISOString();

  res.json({
    success: true,
    data: {
      subtask,
      subtasks: task.subtasks
    }
  });
});

// Toggle subtask
router.put('/:taskId/subtask/:subtaskId', (req, res) => {
  const { taskId, subtaskId } = req.params;

  let task = null;
  for (const userTasks of tasks.values()) {
    const found = userTasks.find(t => t.id === taskId);
    if (found) {
      task = found;
      break;
    }
  }

  if (!task) {
    return res.status(404).json({
      success: false,
      error: 'Task not found'
    });
  }

  const subtask = task.subtasks.find(st => st.id === subtaskId);
  if (!subtask) {
    return res.status(404).json({
      success: false,
      error: 'Subtask not found'
    });
  }

  subtask.completed = !subtask.completed;

  // Auto-complete parent if all subtasks done
  const allDone = task.subtasks.every(st => st.completed);
  if (allDone && task.subtasks.length > 0) {
    task.status = 'done';
    task.completedAt = task.completedAt || new Date().toISOString();
  }

  res.json({
    success: true,
    data: {
      subtask,
      parentComplete: allDone
    }
  });
});

// Delete task
router.delete('/:taskId', (req, res) => {
  const { taskId } = req.params;

  for (const [userId, userTasks] of tasks.entries()) {
    const index = userTasks.findIndex(t => t.id === taskId);
    if (index !== -1) {
      userTasks.splice(index, 1);
      res.json({ success: true, message: 'Task deleted' });
      return;
    }
  }

  res.status(404).json({ success: false, error: 'Task not found' });
});

// Create project
router.post('/project', (req, res) => {
  const { userId, name, description, color } = req.body;

  if (!userId || !name) {
    return res.status(400).json({
      success: false,
      error: 'userId and name are required'
    });
  }

  const project = {
    id: `project-${Date.now()}`,
    userId,
    name,
    description: description || '',
    color: color || '#3498DB',
    createdAt: new Date().toISOString()
  };

  if (!projects.has(userId)) {
    projects.set(userId, []);
  }
  projects.get(userId).push(project);

  res.json({
    success: true,
    message: 'Project created',
    data: project
  });
});

// Get projects
router.get('/project/:userId', (req, res) => {
  const { userId } = req.params;

  const userProjects = projects.get(userId) || [];

  // Add task counts
  const userTasks = tasks.get(userId) || [];
  const projectsWithStats = userProjects.map(p => ({
    ...p,
    tasks: {
      total: userTasks.filter(t => t.projectId === p.id).length,
      completed: userTasks.filter(t => t.projectId === p.id && t.status === 'done').length,
      inProgress: userTasks.filter(t => t.projectId === p.id && t.status === 'in-progress').length
    }
  }));

  res.json({
    success: true,
    data: projectsWithStats
  });
});

// Get Eisenhower Matrix
router.get('/:userId/matrix', (req, res) => {
  const { userId } = req.params;

  const userTasks = tasks.get(userId) || [];
  const pending = userTasks.filter(t => t.status !== 'done' && t.status !== 'cancelled');

  const matrix = {
    urgentImportant: pending.filter(t => t.priority === 'urgent-important'),
    importantNotUrgent: pending.filter(t => t.priority === 'important-not-urgent'),
    urgentNotImportant: pending.filter(t => t.priority === 'urgent-not-important'),
    notUrgentNotImportant: pending.filter(t => t.priority === 'not-urgent-not-important')
  };

  res.json({
    success: true,
    data: {
      matrix,
      quadrants: priorities
    }
  });
});

// Get priorities
router.get('/priorities/all', (req, res) => {
  res.json({
    success: true,
    data: priorities
  });
});

// Helper functions
function getTaskCountsByStatus(userTasks) {
  const counts = {};
  statuses.forEach(s => {
    counts[s] = userTasks.filter(t => t.status === s).length;
  });
  return counts;
}

function calculateProductivityBoost(task) {
  const basePoints = 10;
  const priorityBonus = task.priority === 'urgent-important' ? 20 :
                        task.priority === 'important-not-urgent' ? 15 : 5;
  const subtaskBonus = (task.subtasks?.filter(st => st.completed).length || 0) * 3;

  return {
    points: basePoints + priorityBonus + subtaskBonus,
    streak: Math.floor(Math.random() * 5) + 1
  };
}

module.exports = router;