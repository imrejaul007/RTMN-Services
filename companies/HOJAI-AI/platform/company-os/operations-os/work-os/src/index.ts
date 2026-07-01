/**
 * WorkOS - Project & Work Management
 *
 * Project coordination for OperationsOS
 * Inspired by: Monday.com + Asana + Linear
 *
 * Modules:
 * - Project OS
 * - Task OS
 * - OKR Tracking
 * - Resource Planning
 * - Timeline/Gantt
 */

import { Router } from 'express';

const router = Router();

// ============================================================
// TYPES
// ============================================================

export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'urgent';

  // Timeline
  startDate?: Date;
  endDate?: Date;
  milestones: Milestone[];

  // Team
  owner: string;
  team: string[];

  // Budget
  budget?: { allocated: number; spent: number; currency: string };

  // Tasks
  tasks: number;
  completedTasks: number;

  // Progress
  progress: number; // 0-100

  // Dependencies
  dependencies: string[]; // Project IDs

  createdAt: Date;
  updatedAt: Date;
}

export interface Milestone {
  id: string;
  name: string;
  dueDate: Date;
  status: 'pending' | 'achieved' | 'missed';
}

export interface Task {
  id: string;
  projectId: string;

  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'review' | 'done' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'urgent';

  assignee?: string;
  reporter?: string;

  dueDate?: Date;
  estimatedHours?: number;
  loggedHours?: number;

  subtasks: number;

  labels: string[];
  dependencies: string[]; // Task IDs

  comments: number;
  attachments: number;

  createdAt: Date;
  updatedAt: Date;
}

export interface OKR {
  id: string;
  cycle: 'Q1' | 'Q2' | 'Q3' | 'Q4' | string;
  year: number;

  objectives: Objective[];

  status: 'draft' | 'active' | 'completed';
  createdAt: Date;
}

export interface Objective {
  id: string;
  title: string;
  description?: string;

  keyResults: KeyResult[];

  progress: number;
  status: 'on_track' | 'at_risk' | 'behind';
}

export interface KeyResult {
  id: string;
  metric: string;
  target: number;
  current: number;
  unit: string;

  progress: number;
}

export interface Timeline {
  id: string;
  name: string;

  phases: Phase[];
  criticalPath: string[];

  milestones: Milestone[];

  resources: ResourceAllocation[];
}

export interface Phase {
  id: string;
  name: string;
  start: Date;
  end: Date;
  progress: number;
  tasks: number;
  completed: number;
}

export interface ResourceAllocation {
  resourceId: string;
  resourceName: string;
  allocation: number; // percentage
  start: Date;
  end: Date;
}

// ============================================================
// STORAGE
// ============================================================

const projects = new Map<string, Project>();
const tasks = new Map<string, Task>();
const okrs = new Map<string, OKR>();
const timelines = new Map<string, Timeline>();

// ============================================================
// PROJECT ROUTES
// ============================================================

router.post('/projects', async (req, res) => {
  try {
    const project: Project = {
      id: crypto.randomUUID(),
      name: req.body.name,
      description: req.body.description || '',
      status: req.body.status || 'planning',
      priority: req.body.priority || 'medium',
      milestones: req.body.milestones || [],
      owner: req.body.owner || '',
      team: req.body.team || [],
      budget: req.body.budget,
      tasks: 0,
      completedTasks: 0,
      progress: 0,
      dependencies: req.body.dependencies || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    projects.set(project.id, project);
    res.status(201).json({ success: true, project });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/projects', async (req, res) => {
  try {
    const { status, priority } = req.query;
    let result = Array.from(projects.values());

    if (status) result = result.filter(p => p.status === status);
    if (priority) result = result.filter(p => p.priority === priority);

    res.json({ success: true, projects: result, count: result.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/projects/:id', async (req, res) => {
  try {
    const project = projects.get(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    // Get project tasks
    const projectTasks = Array.from(tasks.values())
      .filter(t => t.projectId === req.params.id);

    res.json({ success: true, project, tasks: projectTasks });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch('/projects/:id', async (req, res) => {
  try {
    const project = projects.get(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    Object.assign(project, req.body, { updatedAt: new Date() });
    projects.set(req.params.id, project);

    res.json({ success: true, project });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// TASK ROUTES
// ============================================================

router.post('/tasks', async (req, res) => {
  try {
    const task: Task = {
      id: crypto.randomUUID(),
      projectId: req.body.projectId,
      title: req.body.title,
      description: req.body.description,
      status: req.body.status || 'todo',
      priority: req.body.priority || 'medium',
      assignee: req.body.assignee,
      reporter: req.body.reporter,
      dueDate: req.body.dueDate ? new Date(req.body.dueDate) : undefined,
      estimatedHours: req.body.estimatedHours,
      loggedHours: 0,
      subtasks: 0,
      labels: req.body.labels || [],
      dependencies: req.body.dependencies || [],
      comments: 0,
      attachments: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    tasks.set(task.id, task);

    // Update project task count
    const project = projects.get(task.projectId);
    if (project) {
      project.tasks++;
      projects.set(task.projectId, project);
    }

    res.status(201).json({ success: true, task });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/tasks', async (req, res) => {
  try {
    const { projectId, status, assignee } = req.query;
    let result = Array.from(tasks.values());

    if (projectId) result = result.filter(t => t.projectId === projectId);
    if (status) result = result.filter(t => t.status === status);
    if (assignee) result = result.filter(t => t.assignee === assignee);

    res.json({ success: true, tasks: result, count: result.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch('/tasks/:id', async (req, res) => {
  try {
    const task = tasks.get(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    // Track status changes
    if (req.body.status === 'done' && task.status !== 'done') {
      const project = projects.get(task.projectId);
      if (project) {
        project.completedTasks++;
        project.progress = (project.completedTasks / project.tasks) * 100;
        projects.set(project.id, project);
      }
    }

    Object.assign(task, req.body, { updatedAt: new Date() });
    tasks.set(req.params.id, task);

    res.json({ success: true, task });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// OKR ROUTES
// ============================================================

router.post('/okrs', async (req, res) => {
  try {
    const okr: OKR = {
      id: crypto.randomUUID(),
      cycle: req.body.cycle || 'Q3',
      year: req.body.year || 2026,
      objectives: req.body.objectives || [],
      status: 'draft',
      createdAt: new Date(),
    };

    okrs.set(okr.id, okr);
    res.status(201).json({ success: true, okr });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/okrs', async (req, res) => {
  try {
    const { cycle, year } = req.query;
    let result = Array.from(okrs.values());

    if (cycle) result = result.filter(o => o.cycle === cycle);
    if (year) result = result.filter(o => o.year === Number(year));

    res.json({ success: true, okrs: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// TIMELINE/GANTT ROUTES
// ============================================================

router.post('/timelines', async (req, res) => {
  try {
    const timeline: Timeline = {
      id: crypto.randomUUID(),
      name: req.body.name,
      phases: req.body.phases || [],
      criticalPath: req.body.criticalPath || [],
      milestones: req.body.milestones || [],
      resources: req.body.resources || [],
    };

    timelines.set(timeline.id, timeline);
    res.status(201).json({ success: true, timeline });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/timelines', async (req, res) => {
  try {
    const result = Array.from(timelines.values());
    res.json({ success: true, timelines: result, count: result.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// DASHBOARD
// ============================================================

router.get('/dashboard', async (req, res) => {
  try {
    const allProjects = Array.from(projects.values());
    const allTasks = Array.from(tasks.values());
    const allOKRs = Array.from(okrs.values());

    const activeProjects = allProjects.filter(p => p.status === 'active');
    const overdueTasks = allTasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done');

    const summary = {
      projects: {
        total: allProjects.length,
        active: activeProjects.length,
        onHold: allProjects.filter(p => p.status === 'on_hold').length,
        completion: allProjects.filter(p => p.status === 'completed').length,
      },
      tasks: {
        total: allTasks.length,
        todo: allTasks.filter(t => t.status === 'todo').length,
        inProgress: allTasks.filter(t => t.status === 'in_progress').length,
        review: allTasks.filter(t => t.status === 'review').length,
        done: allTasks.filter(t => t.status === 'done').length,
        overdue: overdueTasks.length,
      },
      okrs: {
        total: allOKRs.length,
        active: allOKRs.filter(o => o.status === 'active').length,
      },
    };

    res.json({ success: true, summary });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
