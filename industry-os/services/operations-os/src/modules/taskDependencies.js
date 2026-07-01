/**
 * Operations OS - Task Dependencies Module
 * Implements task dependencies with topological sort for Gantt charts
 */

const { db } = require('../db/database');

class TaskDependencies {
  constructor() {
    this.db = db;
  }

  /**
   * Add dependency between tasks
   */
  async addDependency(taskId, dependsOnId, type = 'blocks') {
    const id = this.db.generateId('DEP');

    const dependency = {
      id,
      taskId,
      dependsOnId,
      type, // blocks, blocked_by, related_to, finish_to_start, start_to_start
      createdAt: new Date().toISOString(),
    };

    this.db.set('taskDependencies', id, dependency);
    return dependency;
  }

  /**
   * Get all dependencies for a task
   */
  async getDependencies(taskId) {
    const all = this.db.getAll('taskDependencies');
    return all.filter(d =>
      d.taskId === taskId || d.dependsOnId === taskId
    );
  }

  /**
   * Get blocking tasks (what this task is waiting on)
   */
  async getBlockingTasks(taskId) {
    const all = this.db.getAll('taskDependencies');
    return all.filter(d =>
      d.taskId === taskId && d.type === 'blocks'
    ).map(d => ({
      ...d,
      blockedBy: this.db.get('tasks', d.dependsOnId),
    }));
  }

  /**
   * Get tasks blocked by this task
   */
  async getBlockedTasks(taskId) {
    const all = this.db.getAll('taskDependencies');
    return all.filter(d =>
      d.dependsOnId === taskId && d.type === 'blocks'
    ).map(d => ({
      ...d,
      blocks: this.db.get('tasks', d.taskId),
    }));
  }

  /**
   * Calculate critical path for a set of tasks
   * Uses Critical Path Method (CPM)
   */
  async calculateCriticalPath(taskIds) {
    const tasks = taskIds.map(id => this.db.get('tasks', id)).filter(Boolean);
    const allDeps = this.db.getAll('taskDependencies')
      .filter(d => taskIds.includes(d.taskId) || taskIds.includes(d.dependsOnId));

    // Build adjacency list
    const graph = new Map();
    const reverseGraph = new Map();

    tasks.forEach(t => {
      graph.set(t.id, []);
      reverseGraph.set(t.id, []);
    });

    allDeps.forEach(dep => {
      if (dep.type === 'blocks') {
        graph.get(dep.dependsOnId)?.push(dep.taskId);
        reverseGraph.get(dep.taskId)?.push(dep.dependsOnId);
      }
    });

    // Calculate EST (Early Start Time) and EFT (Early Finish Time)
    const est = new Map(); // Earliest Start Time
    const eft = new Map(); // Earliest Finish Time
    const lst = new Map(); // Latest Start Time
    const lft = new Map(); // Latest Finish Time

    // Forward pass
    const visited = new Set();
    const calculateForward = (taskId, duration = 1) => {
      if (visited.has(taskId)) return est.get(taskId);

      visited.add(taskId);

      const predecessors = reverseGraph.get(taskId) || [];
      let maxEft = 0;

      predecessors.forEach(predId => {
        const predEft = calculateForward(predId, 1);
        maxEft = Math.max(maxEft, predEft);
      });

      est.set(taskId, maxEft);
      eft.set(taskId, maxEft + duration);

      return eft.get(taskId);
    };

    tasks.forEach(t => {
      const duration = this.estimateDuration(t);
      calculateForward(t.id, duration);
    });

    // Find project end
    let projectEnd = 0;
    eft.forEach(value => {
      projectEnd = Math.max(projectEnd, value);
    });

    // Backward pass
    const calculateBackward = (taskId, duration = 1) => {
      const successors = graph.get(taskId) || [];

      if (successors.length === 0) {
        lst.set(taskId, projectEnd - duration);
      } else {
        let minLst = Infinity;
        successors.forEach(succId => {
          if (lst.has(succId)) {
            minLst = Math.min(minLst, lst.get(succId));
          }
        });
        lst.set(taskId, minLst === Infinity ? projectEnd - duration : minLst - duration);
      }

      lft.set(taskId, lst.get(taskId) + duration);
    };

    [...tasks].reverse().forEach(t => {
      const duration = this.estimateDuration(t);
      calculateBackward(t.id, duration);
    });

    // Calculate slack and find critical path
    const criticalPath = [];
    tasks.forEach(t => {
      const slack = (lst.get(t.id) || 0) - (est.get(t.id) || 0);
      if (slack === 0) {
        criticalPath.push({
          ...t,
          est: est.get(t.id) || 0,
          eft: eft.get(t.id) || 0,
          lst: lst.get(t.id) || 0,
          lft: lft.get(t.id) || 0,
          slack: 0,
        });
      }
    });

    return {
      criticalPath,
      projectDuration: projectEnd,
      taskMetrics: tasks.map(t => ({
        id: t.id,
        title: t.title,
        est: est.get(t.id) || 0,
        eft: eft.get(t.id) || 0,
        lst: lst.get(t.id) || 0,
        lft: lft.get(t.id) || 0,
        slack: (lst.get(t.id) || 0) - (est.get(t.id) || 0),
        isCritical: (lst.get(t.id) || 0) - (est.get(t.id) || 0) === 0,
      })),
    };
  }

  /**
   * Estimate task duration in days
   */
  estimateDuration(task) {
    if (task.estimatedHours && task.estimatedHours > 0) {
      return Math.ceil(task.estimatedHours / 8); // 8 hours per day
    }
    // Default: 3 days
    return 3;
  }

  /**
   * Topological sort for execution order
   */
  async topologicalSort(taskIds) {
    const allDeps = this.db.getAll('taskDependencies')
      .filter(d => taskIds.includes(d.taskId) || taskIds.includes(d.dependsOnId));

    const graph = new Map();
    const inDegree = new Map();

    taskIds.forEach(id => {
      graph.set(id, []);
      inDegree.set(id, 0);
    });

    allDeps.forEach(dep => {
      if (dep.type === 'blocks') {
        graph.get(dep.dependsOnId)?.push(dep.taskId);
        inDegree.set(dep.taskId, (inDegree.get(dep.taskId) || 0) + 1);
      }
    });

    const queue = [];
    const result = [];

    // Find all nodes with no incoming edges
    inDegree.forEach((degree, id) => {
      if (degree === 0) queue.push(id);
    });

    while (queue.length > 0) {
      const current = queue.shift();
      result.push(current);

      const neighbors = graph.get(current) || [];
      neighbors.forEach(neighbor => {
        inDegree.set(neighbor, inDegree.get(neighbor) - 1);
        if (inDegree.get(neighbor) === 0) {
          queue.push(neighbor);
        }
      });
    }

    // Check for cycles
    if (result.length !== taskIds.length) {
      const remaining = taskIds.filter(id => !result.includes(id));
      return {
        sorted: result,
        hasCycle: true,
        cycleTasks: remaining,
        error: 'Circular dependency detected',
      };
    }

    return { sorted: result, hasCycle: false };
  }

  /**
   * Check if task can start (all blockers completed)
   */
  async canStart(taskId) {
    const blocking = await this.getBlockingTasks(taskId);

    return blocking.every(dep => {
      const blocker = this.db.get('tasks', dep.dependsOnId);
      return blocker && blocker.status === 'completed';
    });
  }

  /**
   * Get available tasks (not blocked and not started)
   */
  async getAvailableTasks(projectId = null) {
    let tasks = this.db.getAll('tasks');

    if (projectId) {
      tasks = tasks.filter(t => t.projectId === projectId);
    }

    tasks = tasks.filter(t => t.status === 'pending' || t.status === 'todo');

    const available = [];
    for (const task of tasks) {
      if (await this.canStart(task.id)) {
        available.push(task);
      }
    }

    return available;
  }
}

// Express routes
function registerTaskDependencyRoutes(app) {
  const deps = new TaskDependencies();

  // Add dependency
  app.post('/api/tasks/:id/dependencies', (req, res) => {
    const { dependsOn, type } = req.body;
    const taskId = req.params.id;

    const task = db.get('tasks', taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const blockedBy = db.get('tasks', dependsOn);
    if (!blockedBy) return res.status(404).json({ error: 'Dependent task not found' });

    const dependency = deps.addDependency(taskId, dependsOn, type || 'blocks');
    res.status(201).json(dependency);
  });

  // Get task dependencies
  app.get('/api/tasks/:id/dependencies', async (req, res) => {
    const blocking = await deps.getBlockingTasks(req.params.id);
    const blocked = await deps.getBlockedTasks(req.params.id);
    const canStart = await deps.canStart(req.params.id);

    res.json({
      taskId: req.params.id,
      canStart,
      blocking,
      blocked,
    });
  });

  // Get critical path
  app.get('/api/projects/:id/critical-path', async (req, res) => {
    const project = db.get('projects', req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const tasks = db.query('tasks', { projectId: req.params.id });
    const taskIds = tasks.map(t => t.id);

    const result = await deps.calculateCriticalPath(taskIds);
    res.json({
      project: project.name,
      ...result,
    });
  });

  // Get Gantt data
  app.get('/api/projects/:id/gantt', (req, res) => {
    const project = db.get('projects', req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const tasks = db.query('tasks', { projectId: req.params.id });
    const allDeps = db.getAll('taskDependencies');

    const gantt = tasks.map(task => {
      const duration = deps.estimateDuration(task);
      const startDate = task.startDate || task.createdAt || new Date();
      const endDate = task.dueDate || new Date(new Date(startDate).getTime() + duration * 86400000);

      return {
        id: task.id,
        title: task.title,
        startDate,
        endDate,
        duration,
        progress: task.progress || 0,
        status: task.status,
        priority: task.priority,
        assignee: task.assignee,
        dependencies: allDeps
          .filter(d => d.taskId === task.id && d.type === 'blocks')
          .map(d => d.dependsOnId),
        blockedBy: allDeps
          .filter(d => d.taskId === task.id && d.type === 'blocks')
          .map(d => d.dependsOnId)
          .length,
      };
    });

    res.json({
      project: {
        id: project.id,
        name: project.name,
        startDate: project.startDate || project.createdAt,
        endDate: project.endDate,
        progress: project.progress,
      },
      gantt,
    });
  });

  // Get Kanban board
  app.get('/api/projects/:id/kanban', (req, res) => {
    const project = db.get('projects', req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const tasks = db.query('tasks', { projectId: req.params.id });

    const columns = {
      backlog: { name: 'Backlog', tasks: [] },
      todo: { name: 'To Do', tasks: [] },
      in_progress: { name: 'In Progress', tasks: [] },
      review: { name: 'In Review', tasks: [] },
      done: { name: 'Done', tasks: [] },
    };

    tasks.forEach(task => {
      const column = columns[task.status] || columns.backlog;
      column.tasks.push({
        id: task.id,
        title: task.title,
        priority: task.priority,
        assignee: task.assignee,
        dueDate: task.dueDate,
        blocked: deps.getBlockingTasks(task.id).length > 0,
      });
    });

    res.json({
      project: {
        id: project.id,
        name: project.name,
      },
      board: columns,
    });
  });

  // Get available tasks
  app.get('/api/tasks/available', async (req, res) => {
    const { projectId } = req.query;
    const available = await deps.getAvailableTasks(projectId);
    res.json({ tasks: available, count: available.length });
  });

  // Check for cycles
  app.get('/api/projects/:id/validate-dependencies', async (req, res) => {
    const tasks = db.query('tasks', { projectId: req.params.id });
    const taskIds = tasks.map(t => t.id);

    const result = await deps.topologicalSort(taskIds);
    res.json(result);
  });
}

module.exports = { TaskDependencies, registerTaskDependencyRoutes };
