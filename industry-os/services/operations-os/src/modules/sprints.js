/**
 * Operations OS - Sprint Planning Module
 * Sprint management for agile teams
 */

const { db } = require('../db/database');

class SprintManager {
  constructor() {
    this.db = db;
  }

  /**
   * Create a new sprint
   */
  async createSprint(data) {
    const id = this.db.generateId('SPRINT');

    const sprint = {
      id,
      name: data.name,
      goal: data.goal || '',
      startDate: data.startDate,
      endDate: data.endDate,
      capacity: data.capacity || 0, // story points or hours
      velocity: 0,
      status: 'planning', // planning, active, completed
      tasks: [],
      createdAt: new Date().toISOString(),
      createdBy: data.userId,
    };

    this.db.set('sprints', id, sprint);
    return sprint;
  }

  /**
   * Add task to sprint
   */
  async addTaskToSprint(sprintId, taskId) {
    const sprint = this.db.get('sprints', sprintId);
    if (!sprint) return null;

    const task = this.db.get('tasks', taskId);
    if (!task) return null;

    // Update task with sprint reference
    task.sprintId = sprintId;
    task.updatedAt = new Date().toISOString();
    this.db.set('tasks', taskId, task);

    // Add to sprint task list
    if (!sprint.tasks.includes(taskId)) {
      sprint.tasks.push(taskId);
    }

    return { sprint, task };
  }

  /**
   * Remove task from sprint
   */
  async removeTaskFromSprint(sprintId, taskId) {
    const sprint = this.db.get('sprints', sprintId);
    if (!sprint) return null;

    const task = this.db.get('tasks', taskId);
    if (task) {
      task.sprintId = null;
      task.updatedAt = new Date().toISOString();
      this.db.set('tasks', taskId, task);
    }

    sprint.tasks = sprint.tasks.filter(id => id !== taskId);
    return sprint;
  }

  /**
   * Start sprint
   */
  async startSprint(sprintId) {
    const sprint = this.db.get('sprints', sprintId);
    if (!sprint) return null;

    // Deactivate any other active sprints
    const allSprints = this.db.getAll('sprints');
    allSprints.forEach(s => {
      if (s.id !== sprintId && s.status === 'active') {
        s.status = 'completed';
        s.completedAt = new Date().toISOString();
        this.db.set('sprints', s.id, s);
      }
    });

    sprint.status = 'active';
    sprint.startedAt = new Date().toISOString();
    this.db.set('sprints', sprintId, sprint);

    return sprint;
  }

  /**
   * Complete sprint
   */
  async completeSprint(sprintId) {
    const sprint = this.db.get('sprints', sprintId);
    if (!sprint) return null;

    // Calculate velocity
    const completedTasks = sprint.tasks
      .map(id => this.db.get('tasks', id))
      .filter(t => t && t.status === 'completed');

    const totalPoints = completedTasks.reduce((sum, t) => sum + (t.storyPoints || t.estimatedHours || 0), 0);

    sprint.status = 'completed';
    sprint.completedAt = new Date().toISOString();
    sprint.velocity = totalPoints;
    sprint.completedTasks = completedTasks.length;

    this.db.set('sprints', sprintId, sprint);
    return sprint;
  }

  /**
   * Get sprint with tasks
   */
  async getSprintWithTasks(sprintId) {
    const sprint = this.db.get('sprints', sprintId);
    if (!sprint) return null;

    const tasks = sprint.tasks
      .map(id => this.db.get('tasks', id))
      .filter(Boolean);

    const completedTasks = tasks.filter(t => t.status === 'completed');
    const totalPoints = tasks.reduce((sum, t) => sum + (t.storyPoints || t.estimatedHours || 0), 0);
    const completedPoints = completedTasks.reduce((sum, t) => sum + (t.storyPoints || t.estimatedHours || 0), 0);

    return {
      ...sprint,
      tasks,
      summary: {
        total: tasks.length,
        completed: completedTasks.length,
        remaining: tasks.length - completedTasks.length,
        totalPoints,
        completedPoints,
        progress: totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0,
      },
    };
  }

  /**
   * Calculate sprint burndown
   */
  async getBurndown(sprintId) {
    const sprint = await this.getSprintWithTasks(sprintId);
    if (!sprint) return null;

    const startDate = new Date(sprint.startDate);
    const endDate = new Date(sprint.endDate);
    const today = new Date();

    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const daysPassed = Math.ceil((today - startDate) / (1000 * 60 * 60 * 24));

    const totalPoints = sprint.summary.totalPoints;
    const idealBurndown = [];

    for (let i = 0; i <= totalDays; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      idealBurndown.push({
        date: date.toISOString().split('T')[0],
        ideal: Math.round(totalPoints - (totalPoints / totalDays) * i),
      });
    }

    // Actual burndown based on completed tasks
    const actual = [];
    for (let i = 0; i <= daysPassed && i <= totalDays; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      const completedByDate = sprint.tasks
        .map(id => this.db.get('tasks', id))
        .filter(t => t && t.completedAt && new Date(t.completedAt) <= date)
        .reduce((sum, t) => sum + (t.storyPoints || t.estimatedHours || 0), 0);

      actual.push({
        date: date.toISOString().split('T')[0],
        remaining: totalPoints - completedByDate,
      });
    }

    return {
      sprintId,
      sprintName: sprint.name,
      totalPoints,
      remainingPoints: sprint.summary.totalPoints - sprint.summary.completedPoints,
      idealBurndown,
      actualBurndown: actual,
    };
  }

  /**
   * Get velocity history
   */
  async getVelocityHistory() {
    const sprints = this.db.getAll('sprints')
      .filter(s => s.status === 'completed')
      .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
      .slice(0, 10);

    return sprints.map(s => ({
      sprintId: s.id,
      sprintName: s.name,
      velocity: s.velocity || 0,
      completedAt: s.completedAt,
    }));
  }

  /**
   * Predict completion based on velocity
   */
  async predictCompletion(sprintId) {
    const sprint = await this.getSprintWithTasks(sprintId);
    if (!sprint) return null;

    const velocities = await this.getVelocityHistory();
    const avgVelocity = velocities.length > 0
      ? velocities.reduce((sum, v) => sum + v.velocity, 0) / velocities.length
      : sprint.summary.totalPoints;

    const remainingPoints = sprint.summary.totalPoints - sprint.summary.completedPoints;
    const daysRemaining = Math.ceil((new Date(sprint.endDate) - new Date()) / (1000 * 60 * 60 * 24));

    const pointsPerDay = avgVelocity / (sprint.summary.totalPoints > 0 ? 14 : 7); // Assume 2-week sprint
    const predictedDays = remainingPoints / pointsPerDay;

    return {
      sprintId,
      remainingPoints,
      daysRemaining,
      predictedDaysToComplete: Math.ceil(predictedDays),
      willCompleteOnTime: predictedDays <= daysRemaining,
      confidence: velocities.length > 2 ? 'high' : 'medium',
      avgVelocity,
    };
  }
}

// Express routes
function registerSprintRoutes(app) {
  const sprints = new SprintManager();

  // Create sprint
  app.post('/api/sprints', (req, res) => {
    const sprint = sprints.createSprint({
      ...req.body,
      userId: req.user?.userId,
    });
    res.status(201).json(sprint);
  });

  // Get all sprints
  app.get('/api/sprints', (req, res) => {
    const { status, projectId } = req.query;
    let all = db.getAll('sprints');

    if (status) {
      all = all.filter(s => s.status === status);
    }

    // Filter by tasks belonging to project
    if (projectId) {
      const projectTasks = db.query('tasks', { projectId });
      const sprintIds = new Set(projectTasks.map(t => t.sprintId).filter(Boolean));
      all = all.filter(s => sprintIds.has(s.id));
    }

    res.json({ sprints: all, total: all.length });
  });

  // Get sprint with tasks
  app.get('/api/sprints/:id', async (req, res) => {
    const sprint = await sprints.getSprintWithTasks(req.params.id);
    if (!sprint) return res.status(404).json({ error: 'Sprint not found' });
    res.json(sprint);
  });

  // Add task to sprint
  app.post('/api/sprints/:id/tasks', async (req, res) => {
    const { taskId } = req.body;
    const result = await sprints.addTaskToSprint(req.params.id, taskId);
    if (!result) return res.status(404).json({ error: 'Sprint or task not found' });
    res.json(result);
  });

  // Remove task from sprint
  app.delete('/api/sprints/:id/tasks/:taskId', async (req, res) => {
    const result = await sprints.removeTaskFromSprint(req.params.id, req.params.taskId);
    if (!result) return res.status(404).json({ error: 'Sprint not found' });
    res.json(result);
  });

  // Start sprint
  app.post('/api/sprints/:id/start', async (req, res) => {
    const sprint = await sprints.startSprint(req.params.id);
    if (!sprint) return res.status(404).json({ error: 'Sprint not found' });
    res.json(sprint);
  });

  // Complete sprint
  app.post('/api/sprints/:id/complete', async (req, res) => {
    const sprint = await sprints.completeSprint(req.params.id);
    if (!sprint) return res.status(404).json({ error: 'Sprint not found' });
    res.json(sprint);
  });

  // Get burndown
  app.get('/api/sprints/:id/burndown', async (req, res) => {
    const burndown = await sprints.getBurndown(req.params.id);
    if (!burndown) return res.status(404).json({ error: 'Sprint not found' });
    res.json(burndown);
  });

  // Get velocity history
  app.get('/api/sprints/velocity', async (req, res) => {
    const history = await sprints.getVelocityHistory();
    res.json({ history });
  });

  // Predict completion
  app.get('/api/sprints/:id/predict', async (req, res) => {
    const prediction = await sprints.predictCompletion(req.params.id);
    if (!prediction) return res.status(404).json({ error: 'Sprint not found' });
    res.json(prediction);
  });
}

module.exports = { SprintManager, registerSprintRoutes };
