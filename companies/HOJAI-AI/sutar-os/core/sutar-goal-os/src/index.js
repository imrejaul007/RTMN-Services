/**
 * SUTAR OS — Goal OS
 *
 * Goal decomposition engine for autonomous agents.
 * Breaks high-level goals into actionable tasks with dependencies.
 *
 * Endpoints:
 *   POST /api/goals         — Create a goal
 *   GET  /api/goals         — List goals
 *   GET  /api/goals/:id     — Get goal with task tree
 *   POST /api/goals/:id/decompose — Decompose goal into tasks
 *   POST /api/goals/:id/execute — Execute goal plan
 *   GET  /api/goals/:id/progress — Get execution progress
 *   GET  /health
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { setupSecurity, requireAuth } = require('@rtmn/shared/security');

const app = express();
app.use(express.json());
setupSecurity(app, { serviceName: 'sutar-goal-os' });

const PORT = process.env.GOAL_PORT || 4242;

// ---------- Stores ----------
const goals = new Map();
const MAX_GOALS = 5000;

// ---------- Goal Creation ----------
function createGoal(params) {
  const goalId = uuidv4();
  const goal = {
    id: goalId,
    title: params.title,
    description: params.description,
    type: params.type || 'business', // business, personal, operational, strategic
    priority: params.priority || 'medium', // low, medium, high, critical
    deadline: params.deadline,
    createdBy: params.createdBy || 'system',
    status: 'created',
    tasks: [],
    progress: 0,
    createdAt: new Date().toISOString(),
    startedAt: null,
    completedAt: null,
    blockedBy: params.blockedBy || [],
    blocks: params.blocks || [],
  };
  goals.set(goalId, goal);
  return goal;
}

// ---------- Goal Decomposition ----------
function decomposeGoal(goalId, params) {
  const goal = goals.get(goalId);
  if (!goal) return { error: 'Goal not found' };

  const strategy = params.strategy || 'auto'; // auto, waterfall, agile, kanban
  const depth = params.depth || 3;
  const maxTasks = params.maxTasks || 50;

  const tasks = [];
  let taskIdCounter = 0;

  function generateTaskId() {
    return `task-${goalId.slice(0, 8)}-${++taskIdCounter}`;
  }

  function decompose(parentId, level, parentTasks = []) {
    if (level > depth || tasks.length >= maxTasks) return;

    const subtasks = generateSubtasks(level, parentTasks, params);
    for (const st of subtasks) {
      const task = {
        id: generateTaskId(),
        parentId,
        title: st.title,
        description: st.description,
        type: level === 1 ? 'milestone' : level === depth ? 'action' : 'subtask',
        estimatedHours: st.hours || Math.ceil(Math.random() * 8),
        priority: st.priority || goal.priority,
        status: 'pending',
        dependencies: st.dependencies || [],
        skills: st.skills || [],
        agents: st.agents || [],
        progress: 0,
        subtasks: [],
        createdAt: new Date().toISOString(),
      };
      tasks.push(task);
      if (level < depth) {
        decompose(task.id, level + 1, [...parentTasks, task]);
      }
    }
  }

  // Root level tasks
  decompose(null, 1, []);

  goal.tasks = tasks;
  goal.status = 'planned';
  goal.planningCompletedAt = new Date().toISOString();

  // Build dependency graph
  const criticalPath = buildCriticalPath(tasks);

  return { goal, taskCount: tasks.length, criticalPath };
}

function generateSubtasks(level, parentTasks, params) {
  const goalText = (params.title || '').toLowerCase();
  const subtasks = [];

  if (level === 1) {
    // Milestones
    subtasks.push({ title: 'Research & Discovery', hours: 8, priority: 'high', skills: ['research', 'analysis'] });
    subtasks.push({ title: 'Planning & Strategy', hours: 4, priority: 'high', skills: ['planning', 'strategy'], dependencies: [] });
    subtasks.push({ title: 'Execution', hours: 16, priority: 'high', skills: ['execution', 'coordination'], dependencies: [] });
    subtasks.push({ title: 'Review & Delivery', hours: 4, priority: 'medium', skills: ['review', 'delivery'], dependencies: [] });
  } else if (level === 2) {
    // Subtasks
    if (goalText.includes('negotiation')) {
      subtasks.push({ title: 'Prepare negotiation brief', hours: 2, priority: 'high', skills: ['research'] });
      subtasks.push({ title: 'Identify BATNA positions', hours: 1, priority: 'medium', skills: ['analysis'] });
      subtasks.push({ title: 'Draft initial offer', hours: 1, priority: 'high', skills: ['drafting'] });
    } else if (goalText.includes('contract')) {
      subtasks.push({ title: 'Review contract terms', hours: 2, priority: 'high', skills: ['legal', 'review'] });
      subtasks.push({ title: 'Risk assessment', hours: 1, priority: 'medium', skills: ['risk'] });
      subtasks.push({ title: 'Stakeholder sign-off', hours: 1, priority: 'high', skills: ['coordination'] });
    } else {
      subtasks.push({ title: 'Gather requirements', hours: 2, priority: 'high', skills: ['research'] });
      subtasks.push({ title: 'Analyze options', hours: 3, priority: 'medium', skills: ['analysis'] });
      subtasks.push({ title: 'Develop recommendations', hours: 3, priority: 'medium', skills: ['analysis', 'drafting'] });
    }
  } else {
    // Atomic actions
    subtasks.push({ title: 'Complete research', hours: 1, priority: 'medium', skills: ['research'] });
    subtasks.push({ title: 'Document findings', hours: 1, priority: 'low', skills: ['documentation'] });
    subtasks.push({ title: 'Get peer review', hours: 1, priority: 'low', skills: ['coordination'] });
  }

  // Link to parent dependencies
  for (let i = 1; i < subtasks.length; i++) {
    subtasks[i].dependencies = [tasks.length > 0 ? `task-${Date.now()}` : null].filter(Boolean);
  }

  return subtasks;
}

function buildCriticalPath(tasks) {
  const sorted = [...tasks].sort((a, b) => b.estimatedHours - a.estimatedHours);
  return sorted.slice(0, 5).map(t => ({ id: t.id, title: t.title, hours: t.estimatedHours }));
}

// ---------- Execution ----------
function executeGoal(goalId) {
  const goal = goals.get(goalId);
  if (!goal) return { error: 'Goal not found' };
  if (goal.status === 'running') return { error: 'Goal already running' };

  goal.status = 'running';
  goal.startedAt = new Date().toISOString();
  return goal;
}

function getProgress(goalId) {
  const goal = goals.get(goalId);
  if (!goal) return { error: 'Goal not found' };

  const totalTasks = goal.tasks.length;
  const completedTasks = goal.tasks.filter(t => t.status === 'completed').length;
  const blockedTasks = goal.tasks.filter(t => t.status === 'blocked').length;
  const inProgressTasks = goal.tasks.filter(t => t.status === 'in_progress').length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const totalHours = goal.tasks.reduce((s, t) => s + t.estimatedHours, 0);
  const completedHours = goal.tasks.filter(t => t.status === 'completed').reduce((s, t) => s + t.estimatedHours, 0);

  return {
    goalId,
    status: goal.status,
    progress,
    totalTasks,
    completedTasks,
    blockedTasks,
    inProgressTasks,
    totalHours,
    completedHours,
    remainingHours: totalHours - completedHours,
    estimatedCompletion: goal.deadline,
  };
}

// ---------- Routes ----------
app.post('/api/goals', requireAuth, (req, res) => {
  const goal = createGoal(req.body);
  res.status(201).json(goal);
});

app.get('/api/goals', requireAuth, (req, res) => {
  const { status, priority, type, createdBy, limit } = req.query;
  let list = Array.from(goals.values());
  if (status) list = list.filter(g => g.status === status);
  if (priority) list = list.filter(g => g.priority === priority);
  if (type) list = list.filter(g => g.type === type);
  if (createdBy) list = list.filter(g => g.createdBy === createdBy);
  list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const pageSize = Math.min(parseInt(limit) || 100, MAX_GOALS);
  res.json({ total: goals.size, returned: Math.min(list.length, pageSize), goals: list.slice(0, pageSize) });
});

app.get('/api/goals/:id', requireAuth, (req, res) => {
  const goal = goals.get(req.params.id);
  if (!goal) return res.status(404).json({ error: 'Goal not found' });
  res.json(goal);
});

app.post('/api/goals/:id/decompose', requireAuth, (req, res) => {
  const result = decomposeGoal(req.params.id, req.body);
  if (result.error) return res.status(404).json(result);
  res.json(result);
});

app.post('/api/goals/:id/execute', requireAuth, (req, res) => {
  const result = executeGoal(req.params.id);
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

app.get('/api/goals/:id/progress', requireAuth, (req, res) => {
  const result = getProgress(req.params.id);
  if (result.error) return res.status(404).json(result);
  res.json(result);
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'sutar-goal-os', port: PORT, layer: 'Decision + Execution', goals: goals.size, timestamp: new Date().toISOString() });
});

const server = app.listen(PORT, () => { console.log(`[sutar-goal-os] listening on :${PORT}`); });
process.on('SIGTERM', () => { server.close(); process.exit(0); });
process.on('SIGINT', () => { server.close(); process.exit(0); });
