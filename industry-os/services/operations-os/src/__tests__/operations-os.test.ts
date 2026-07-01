/**
 * Operations OS - Test Suite
 *
 * Tests: Projects, Tasks, Incidents, Processes, SOPS
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Data stores
const mockProjects = new Map();
const mockTasks = new Map();
const mockIncidents = new Map();
const mockProcesses = new Map();
const mockSOPs = new Map();

let idCounter = 1;
const generateId = () => `ops_${String(idCounter++).padStart(6, '0')}`;

interface Project {
  id: string;
  name: string;
  description: string;
  status: 'planning' | 'active' | 'on-hold' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  startDate?: string;
  endDate?: string;
  budget?: number;
  ownerId?: string;
  createdAt: string;
}

interface Task {
  id: string;
  projectId: string;
  title: string;
  status: 'todo' | 'in-progress' | 'review' | 'done' | 'blocked';
  priority: 'low' | 'medium' | 'high';
  assigneeId?: string;
  dueDate?: string;
  estimatedHours?: number;
  actualHours?: number;
  createdAt: string;
}

interface Incident {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  category: string;
  assigneeId?: string;
  createdAt: string;
  resolvedAt?: string;
}

const opsService = {
  // Projects
  createProject(data: Partial<Project>): Project {
    const project: Project = {
      id: generateId(),
      name: data.name || '',
      description: data.description || '',
      status: data.status || 'planning',
      priority: data.priority || 'medium',
      startDate: data.startDate,
      endDate: data.endDate,
      budget: data.budget,
      ownerId: data.ownerId,
      createdAt: new Date().toISOString(),
    };
    mockProjects.set(project.id, project);
    return project;
  },

  getProject(id: string): Project | undefined {
    return mockProjects.get(id);
  },

  listProjects(filters?: { status?: Project['status']; priority?: Project['priority'] }): Project[] {
    let projects = Array.from(mockProjects.values());
    if (filters?.status) projects = projects.filter(p => p.status === filters.status);
    if (filters?.priority) projects = projects.filter(p => p.priority === filters.priority);
    return projects;
  },

  updateProjectStatus(id: string, status: Project['status']): Project | undefined {
    const project = mockProjects.get(id);
    if (!project) return undefined;
    project.status = status;
    mockProjects.set(id, project);
    return project;
  },

  // Tasks
  createTask(data: Partial<Task>): Task {
    const task: Task = {
      id: generateId(),
      projectId: data.projectId || '',
      title: data.title || '',
      status: data.status || 'todo',
      priority: data.priority || 'medium',
      assigneeId: data.assigneeId,
      dueDate: data.dueDate,
      estimatedHours: data.estimatedHours,
      actualHours: data.actualHours,
      createdAt: new Date().toISOString(),
    };
    mockTasks.set(task.id, task);
    return task;
  },

  listTasks(filters?: { projectId?: string; status?: Task['status']; assigneeId?: string }): Task[] {
    let tasks = Array.from(mockTasks.values());
    if (filters?.projectId) tasks = tasks.filter(t => t.projectId === filters.projectId);
    if (filters?.status) tasks = tasks.filter(t => t.status === filters.status);
    if (filters?.assigneeId) tasks = tasks.filter(t => t.assigneeId === filters.assigneeId);
    return tasks;
  },

  updateTaskStatus(id: string, status: Task['status']): Task | undefined {
    const task = mockTasks.get(id);
    if (!task) return undefined;
    task.status = status;
    mockTasks.set(id, task);
    return task;
  },

  // Incidents
  createIncident(data: Partial<Incident>): Incident {
    const incident: Incident = {
      id: generateId(),
      title: data.title || '',
      description: data.description || '',
      severity: data.severity || 'medium',
      status: data.status || 'open',
      category: data.category || '',
      assigneeId: data.assigneeId,
      createdAt: new Date().toISOString(),
      resolvedAt: data.resolvedAt,
    };
    mockIncidents.set(incident.id, incident);
    return incident;
  },

  listIncidents(filters?: { severity?: Incident['severity']; status?: Incident['status'] }): Incident[] {
    let incidents = Array.from(mockIncidents.values());
    if (filters?.severity) incidents = incidents.filter(i => i.severity === filters.severity);
    if (filters?.status) incidents = incidents.filter(i => i.status === filters.status);
    return incidents;
  },

  resolveIncident(id: string): Incident | undefined {
    const incident = mockIncidents.get(id);
    if (!incident) return undefined;
    incident.status = 'resolved';
    incident.resolvedAt = new Date().toISOString();
    mockIncidents.set(id, incident);
    return incident;
  },

  // Analytics
  getDashboard(): any {
    const projects = Array.from(mockProjects.values());
    const tasks = Array.from(mockTasks.values());
    const incidents = Array.from(mockIncidents.values());

    return {
      projects: {
        total: projects.length,
        active: projects.filter(p => p.status === 'active').length,
        completed: projects.filter(p => p.status === 'completed').length,
        onHold: projects.filter(p => p.status === 'on-hold').length,
      },
      tasks: {
        total: tasks.length,
        todo: tasks.filter(t => t.status === 'todo').length,
        inProgress: tasks.filter(t => t.status === 'in-progress').length,
        done: tasks.filter(t => t.status === 'done').length,
        blocked: tasks.filter(t => t.status === 'blocked').length,
      },
      incidents: {
        total: incidents.length,
        open: incidents.filter(i => i.status === 'open').length,
        critical: incidents.filter(i => i.severity === 'critical' && i.status !== 'closed').length,
        avgResolutionTime: this.calcAvgResolutionTime(),
      },
    };
  },

  calcAvgResolutionTime(): number {
    const resolved = Array.from(mockIncidents.values()).filter(i => i.resolvedAt);
    if (resolved.length === 0) return 0;

    const totalMs = resolved.reduce((sum, i) => {
      const created = new Date(i.createdAt).getTime();
      const resolved = new Date(i.resolvedAt!).getTime();
      return sum + (resolved - created);
    }, 0);

    return totalMs / resolved.length / 3600000; // Hours
  },

  reset() {
    mockProjects.clear();
    mockTasks.clear();
    mockIncidents.clear();
    mockProcesses.clear();
    mockSOPs.clear();
    idCounter = 1;
  },
};

describe('Operations OS - Projects', () => {
  beforeEach(() => opsService.reset());

  describe('createProject', () => {
    it('should create project with all fields', () => {
      const project = opsService.createProject({
        name: 'New ERP Implementation',
        description: 'Replace legacy system with cloud ERP',
        status: 'planning',
        priority: 'high',
        budget: 5000000,
        startDate: '2026-07-01',
        endDate: '2026-12-31',
      });

      expect(project.id).toBeDefined();
      expect(project.name).toBe('New ERP Implementation');
      expect(project.status).toBe('planning');
      expect(project.priority).toBe('high');
      expect(project.budget).toBe(5000000);
    });

    it('should create with all status types', () => {
      const statuses: Project['status'][] = ['planning', 'active', 'on-hold', 'completed', 'cancelled'];
      statuses.forEach(status => {
        const project = opsService.createProject({ name: status, status });
        expect(project.status).toBe(status);
      });
    });
  });

  describe('listProjects', () => {
    it('should filter by status', () => {
      opsService.createProject({ name: 'Active 1', status: 'active' });
      opsService.createProject({ name: 'Active 2', status: 'active' });
      opsService.createProject({ name: 'Planning', status: 'planning' });

      const active = opsService.listProjects({ status: 'active' });
      expect(active).toHaveLength(2);
    });

    it('should filter by priority', () => {
      opsService.createProject({ name: 'Critical', priority: 'critical' });
      opsService.createProject({ name: 'Low', priority: 'low' });

      const critical = opsService.listProjects({ priority: 'critical' });
      expect(critical).toHaveLength(1);
      expect(critical[0].priority).toBe('critical');
    });
  });

  describe('updateProjectStatus', () => {
    it('should transition through lifecycle', () => {
      const project = opsService.createProject({ name: 'Test', status: 'planning' });

      opsService.updateProjectStatus(project.id, 'active');
      opsService.updateProjectStatus(project.id, 'completed');

      const updated = opsService.getProject(project.id);
      expect(updated?.status).toBe('completed');
    });
  });
});

describe('Operations OS - Tasks', () => {
  beforeEach(() => opsService.reset());

  describe('createTask', () => {
    it('should create task for project', () => {
      const project = opsService.createProject({ name: 'Project' });
      const task = opsService.createTask({
        projectId: project.id,
        title: 'Design Database Schema',
        priority: 'high',
        estimatedHours: 40,
      });

      expect(task.id).toBeDefined();
      expect(task.projectId).toBe(project.id);
      expect(task.title).toBe('Design Database Schema');
      expect(task.status).toBe('todo');
    });
  });

  describe('listTasks', () => {
    it('should filter by project', () => {
      const p1 = opsService.createProject({ name: 'P1' });
      const p2 = opsService.createProject({ name: 'P2' });

      opsService.createTask({ projectId: p1.id, title: 'Task P1-1' });
      opsService.createTask({ projectId: p1.id, title: 'Task P1-2' });
      opsService.createTask({ projectId: p2.id, title: 'Task P2-1' });

      const p1Tasks = opsService.listTasks({ projectId: p1.id });
      expect(p1Tasks).toHaveLength(2);
    });

    it('should filter by status', () => {
      const project = opsService.createProject({ name: 'P' });
      opsService.createTask({ projectId: project.id, title: 'Todo', status: 'todo' });
      opsService.createTask({ projectId: project.id, title: 'Done', status: 'done' });

      const blocked = opsService.listTasks({ projectId: project.id, status: 'todo' });
      expect(blocked).toHaveLength(1);
    });
  });

  describe('updateTaskStatus', () => {
    it('should transition through workflow', () => {
      const project = opsService.createProject({ name: 'P' });
      const task = opsService.createTask({ projectId: project.id, title: 'T' });

      opsService.updateTaskStatus(task.id, 'in-progress');
      opsService.updateTaskStatus(task.id, 'review');
      opsService.updateTaskStatus(task.id, 'done');

      const updated = opsService.listTasks({ projectId: project.id }).find(t => t.id === task.id);
      expect(updated?.status).toBe('done');
    });
  });
});

describe('Operations OS - Incidents', () => {
  beforeEach(() => opsService.reset());

  describe('createIncident', () => {
    it('should create incident with severity', () => {
      const incident = opsService.createIncident({
        title: 'Production Server Down',
        description: 'Primary server unresponsive',
        severity: 'critical',
        category: 'infrastructure',
      });

      expect(incident.id).toBeDefined();
      expect(incident.severity).toBe('critical');
      expect(incident.status).toBe('open');
    });

    it('should create with all severity levels', () => {
      const severities: Incident['severity'][] = ['low', 'medium', 'high', 'critical'];
      severities.forEach(severity => {
        const incident = opsService.createIncident({ title: severity, severity });
        expect(incident.severity).toBe(severity);
      });
    });
  });

  describe('resolveIncident', () => {
    it('should mark as resolved with timestamp', () => {
      const incident = opsService.createIncident({ title: 'Test', severity: 'high' });
      expect(incident.resolvedAt).toBeUndefined();

      const resolved = opsService.resolveIncident(incident.id);
      expect(resolved?.status).toBe('resolved');
      expect(resolved?.resolvedAt).toBeDefined();
    });
  });

  describe('listIncidents', () => {
    it('should filter open critical incidents', () => {
      opsService.createIncident({ title: 'Critical Open', severity: 'critical', status: 'open' });
      opsService.createIncident({ title: 'Critical Resolved', severity: 'critical', status: 'resolved' });
      opsService.createIncident({ title: 'Low Open', severity: 'low', status: 'open' });

      const critical = opsService.listIncidents({ severity: 'critical', status: 'open' });
      expect(critical).toHaveLength(1);
      expect(critical[0].title).toBe('Critical Open');
    });
  });
});

describe('Operations OS - Dashboard', () => {
  beforeEach(() => opsService.reset());

  it('should aggregate all metrics', () => {
    // Create projects
    opsService.createProject({ name: 'P1', status: 'active' });
    opsService.createProject({ name: 'P2', status: 'active' });
    opsService.createProject({ name: 'P3', status: 'completed' });

    // Create tasks (all on same project)
    const project = opsService.createProject({ name: 'P4', status: 'active' });
    opsService.createTask({ projectId: project.id, title: 'T1', status: 'todo' });
    opsService.createTask({ projectId: project.id, title: 'T2', status: 'in-progress' });
    opsService.createTask({ projectId: project.id, title: 'T3', status: 'done' });
    opsService.createTask({ projectId: project.id, title: 'T4', status: 'blocked' });

    // Create incidents
    opsService.createIncident({ title: 'I1', severity: 'critical', status: 'open' });
    opsService.createIncident({ title: 'I2', severity: 'low', status: 'resolved', resolvedAt: '2026-07-01T10:00:00Z' });

    const dashboard = opsService.getDashboard();

    expect(dashboard.projects.total).toBe(4);
    expect(dashboard.projects.active).toBe(3); // P1, P2, P4 are active
    expect(dashboard.projects.completed).toBe(1);

    expect(dashboard.tasks.total).toBe(4);
    expect(dashboard.tasks.todo).toBe(1);
    expect(dashboard.tasks.inProgress).toBe(1);
    expect(dashboard.tasks.done).toBe(1);
    expect(dashboard.tasks.blocked).toBe(1);

    expect(dashboard.incidents.total).toBe(2);
    expect(dashboard.incidents.open).toBe(1);
    expect(dashboard.incidents.critical).toBe(1);
  });
});
