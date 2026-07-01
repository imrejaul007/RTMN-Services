/**
 * Operations Department Pack - Runtime Connector
 *
 * This connector delegates to the actual Operations OS service (5250).
 * Provides operational management for Company OS tenants.
 */

import axios, { AxiosInstance } from 'axios';

export interface OperationsConfig {
  operationsOsUrl: string;
  tenantId: string;
  apiKey?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'planning' | 'active' | 'on-hold' | 'completed' | 'cancelled';
  startDate?: string;
  endDate?: string;
  ownerId?: string;
  budget?: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'review' | 'done' | 'blocked';
  assigneeId?: string;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high';
  estimatedHours?: number;
  actualHours?: number;
  createdAt: string;
}

export interface Process {
  id: string;
  name: string;
  description?: string;
  category: string;
  steps: ProcessStep[];
  status: 'active' | 'inactive' | 'draft';
  ownerId?: string;
  createdAt: string;
}

export interface ProcessStep {
  id: string;
  name: string;
  type: 'manual' | 'automated' | 'approval' | 'notification';
  config: any;
  order: number;
}

export interface Incident {
  id: string;
  title: string;
  description?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  category: string;
  assigneeId?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface SOP {
  id: string;
  title: string;
  department: string;
  content: string;
  version: string;
  status: 'draft' | 'active' | 'archived';
  ownerId?: string;
  lastReviewed?: string;
  createdAt: string;
}

export class OperationsRuntimeConnector {
  private client: AxiosInstance;
  private tenantId: string;

  constructor(config: OperationsConfig) {
    this.tenantId = config.tenantId;
    this.client = axios.create({
      baseURL: config.operationsOsUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': config.tenantId,
        ...(config.apiKey && { 'Authorization': `Bearer ${config.apiKey}` }),
      },
    });
  }

  // ============================================
  // PROJECTS
  // ============================================

  async listProjects(filters?: { status?: string; ownerId?: string }): Promise<Project[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.ownerId) params.append('ownerId', filters.ownerId);

    const response = await this.client.get(`/api/projects?${params.toString()}`);
    return response.data.projects || [];
  }

  async getProject(id: string): Promise<Project | null> {
    try {
      const response = await this.client.get(`/api/projects/${id}`);
      return response.data.project || null;
    } catch {
      return null;
    }
  }

  async createProject(data: Partial<Project>): Promise<Project> {
    const response = await this.client.post('/api/projects', data);
    return response.data.project;
  }

  async updateProject(id: string, data: Partial<Project>): Promise<Project> {
    const response = await this.client.put(`/api/projects/${id}`, data);
    return response.data.project;
  }

  async deleteProject(id: string): Promise<boolean> {
    try {
      await this.client.delete(`/api/projects/${id}`);
      return true;
    } catch {
      return false;
    }
  }

  // ============================================
  // TASKS
  // ============================================

  async listTasks(filters?: { projectId?: string; status?: string; assigneeId?: string }): Promise<Task[]> {
    const params = new URLSearchParams();
    if (filters?.projectId) params.append('projectId', filters.projectId);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.assigneeId) params.append('assigneeId', filters.assigneeId);

    const response = await this.client.get(`/api/tasks?${params.toString()}`);
    return response.data.tasks || [];
  }

  async getTask(id: string): Promise<Task | null> {
    try {
      const response = await this.client.get(`/api/tasks/${id}`);
      return response.data.task || null;
    } catch {
      return null;
    }
  }

  async createTask(data: Partial<Task>): Promise<Task> {
    const response = await this.client.post('/api/tasks', data);
    return response.data.task;
  }

  async updateTask(id: string, data: Partial<Task>): Promise<Task> {
    const response = await this.client.put(`/api/tasks/${id}`, data);
    return response.data.task;
  }

  async updateTaskStatus(id: string, status: Task['status']): Promise<Task> {
    const response = await this.client.put(`/api/tasks/${id}/status`, { status });
    return response.data.task;
  }

  // ============================================
  // PROCESSES
  // ============================================

  async listProcesses(filters?: { category?: string; status?: string }): Promise<Process[]> {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.status) params.append('status', filters.status);

    const response = await this.client.get(`/api/processes?${params.toString()}`);
    return response.data.processes || [];
  }

  async getProcess(id: string): Promise<Process | null> {
    try {
      const response = await this.client.get(`/api/processes/${id}`);
      return response.data.process || null;
    } catch {
      return null;
    }
  }

  async createProcess(data: Partial<Process>): Promise<Process> {
    const response = await this.client.post('/api/processes', data);
    return response.data.process;
  }

  async executeProcess(id: string, input: any): Promise<any> {
    const response = await this.client.post(`/api/processes/${id}/execute`, { input });
    return response.data;
  }

  // ============================================
  // INCIDENTS
  // ============================================

  async listIncidents(filters?: { severity?: string; status?: string }): Promise<Incident[]> {
    const params = new URLSearchParams();
    if (filters?.severity) params.append('severity', filters.severity);
    if (filters?.status) params.append('status', filters.status);

    const response = await this.client.get(`/api/incidents?${params.toString()}`);
    return response.data.incidents || [];
  }

  async getIncident(id: string): Promise<Incident | null> {
    try {
      const response = await this.client.get(`/api/incidents/${id}`);
      return response.data.incident || null;
    } catch {
      return null;
    }
  }

  async createIncident(data: Partial<Incident>): Promise<Incident> {
    const response = await this.client.post('/api/incidents', data);
    return response.data.incident;
  }

  async updateIncident(id: string, data: Partial<Incident>): Promise<Incident> {
    const response = await this.client.put(`/api/incidents/${id}`, data);
    return response.data.incident;
  }

  async resolveIncident(id: string): Promise<Incident> {
    const response = await this.client.post(`/api/incidents/${id}/resolve`);
    return response.data.incident;
  }

  // ============================================
  // SOPS
  // ============================================

  async listSOPs(filters?: { department?: string; status?: string }): Promise<SOP[]> {
    const params = new URLSearchParams();
    if (filters?.department) params.append('department', filters.department);
    if (filters?.status) params.append('status', filters.status);

    const response = await this.client.get(`/api/sops?${params.toString()}`);
    return response.data.sops || [];
  }

  async getSOP(id: string): Promise<SOP | null> {
    try {
      const response = await this.client.get(`/api/sops/${id}`);
      return response.data.sop || null;
    } catch {
      return null;
    }
  }

  async createSOP(data: Partial<SOP>): Promise<SOP> {
    const response = await this.client.post('/api/sops', data);
    return response.data.sop;
  }

  async updateSOP(id: string, data: Partial<SOP>): Promise<SOP> {
    const response = await this.client.put(`/api/sops/${id}`, data);
    return response.data.sop;
  }

  // ============================================
  // WORKFLOWS
  // ============================================

  async listWorkflows(): Promise<any[]> {
    const response = await this.client.get('/api/workflows');
    return response.data.workflows || [];
  }

  async executeWorkflow(id: string, input: any): Promise<any> {
    const response = await this.client.post(`/api/workflows/${id}/execute`, { input });
    return response.data;
  }

  // ============================================
  // ANALYTICS
  // ============================================

  async getDashboard(): Promise<any> {
    const response = await this.client.get('/api/dashboard');
    return response.data;
  }

  async getMetrics(): Promise<any> {
    const response = await this.client.get('/api/metrics');
    return response.data;
  }

  // ============================================
  // HEALTH CHECK
  // ============================================

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.data.status === 'healthy';
    } catch {
      return false;
    }
  }
}

// ============================================
// DEFAULT EXPORT
// ============================================

export function createOperationsConnector(tenantId: string): OperationsRuntimeConnector {
  return new OperationsRuntimeConnector({
    operationsOsUrl: process.env.OPERATIONS_OS_URL || 'http://localhost:5250',
    tenantId,
    apiKey: process.env.INTERNAL_SERVICE_TOKEN,
  });
}

export default OperationsRuntimeConnector;
