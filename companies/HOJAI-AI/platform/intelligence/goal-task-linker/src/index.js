import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 4293;

app.use(helmet());
app.use(cors());
app.use(express.json());

const goalTaskLinks = new Map();
const taskGoals = new Map();

// Link task to goal
function linkTaskToGoal(taskId, goalId, contribution = 0.1) {
  const key = `${taskId}:${goalId}`;
  const link = {
    taskId,
    goalId,
    contribution,
    linkedAt: new Date().toISOString()
  };
  goalTaskLinks.set(key, link);

  // Bidirectional
  const taskLinks = taskGoals.get(taskId) || [];
  taskLinks.push({ goalId, contribution });
  taskGoals.set(taskId, taskLinks);

  return link;
}

// Get goals for task
function getGoalsForTask(taskId) {
  return taskGoals.get(taskId) || [];
}

// Get tasks for goal
function getTasksForGoal(goalId) {
  const tasks = [];
  for (const [key, link] of goalTaskLinks) {
    if (link.goalId === goalId) {
      tasks.push({ taskId: link.taskId, contribution: link.contribution });
    }
  }
  return tasks;
}

// Calculate goal progress
function calculateProgress(goalId) {
  const tasks = getTasksForGoal(goalId);
  const totalContribution = tasks.reduce((sum, t) => sum + t.contribution, 0);
  return Math.min(100, totalContribution * 100);
}

app.post('/link', (req, res) => {
  const { taskId, goalId, contribution } = req.body;

  if (!taskId || !goalId) {
    return res.status(400).json({ error: 'taskId and goalId required' });
  }

  const link = linkTaskToGoal(taskId, goalId, contribution || 0.1);
  res.json({ success: true, link });
});

app.get('/task/:taskId/goals', (req, res) => {
  const { taskId } = req.params;
  const goals = getGoalsForTask(taskId);
  res.json({ taskId, goals });
});

app.get('/goal/:goalId/tasks', (req, res) => {
  const { goalId } = req.params;
  const tasks = getTasksForGoal(goalId);
  const progress = calculateProgress(goalId);
  res.json({ goalId, tasks, progress });
});

app.delete('/link', (req, res) => {
  const { taskId, goalId } = req.body;
  const key = `${taskId}:${goalId}`;
  goalTaskLinks.delete(key);
  res.json({ success: true });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'goal-task-linker', port: PORT });
});

app.listen(PORT, () => console.log(`Goal Task Linker running on port ${PORT}`));
export default app;