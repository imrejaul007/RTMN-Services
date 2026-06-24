/**
 * Operations OS SDK client (port 5250)
 *
 * Projects, processes, incidents, risks, SOPs, resources, capacity, quality,
 * change management, knowledge. 23 AI agents behind the scenes — the
 * central nervous system of every HOJAI-native business.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request, buildQueryString } from './utils.js';

export type ProjectStatus = 'planning' | 'active' | 'on-hold' | 'completed' | 'cancelled';
export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IncidentStatus = 'open' | 'investigating' | 'mitigated' | 'resolved' | 'closed';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  ownerId?: string;
  startDate?: string;
  endDate?: string;
  budget?: { amount: number; currency: string };
  progress: number; // 0-100
  tags?: string[];
  createdAt: string;
}

export interface Process {
  id: string;
  name: string;
  description?: string;
  /** Ordered steps */
  steps: Array<{ id: string; name: string; type: 'manual' | 'automated' | 'approval'; durationMin?: number }>;
  active: boolean;
  version: number;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  reportedBy?: string;
  assigneeId?: string;
  /** Linked project / service */
  linkedProjectId?: string;
  resolvedAt?: string;
  createdAt: string;
}

export interface Risk {
  id: string;
  title: string;
  description: string;
  level: RiskLevel;
  /** 0-100 likelihood */
  likelihood: number;
  /** 0-100 impact */
  impact: number;
  /** Risk score = likelihood × impact / 100 */
  score: number;
  mitigationPlan?: string;
  ownerId?: string;
  status: 'identified' | 'mitigating' | 'accepted' | 'closed';
}

export interface Sop {
  id: string;
  title: string;
  description: string;
  category?: string;
  steps: Array<{ id: string; title: string; description: string; order: number }>;
  version: number;
}

export class OperationsClient {
  public readonly config: HojaiConfig;

  constructor(config: HojaiConfig) {
    this.config = { ...config, baseUrl: `http://localhost:5250` };
  }

  // ─── Projects ───

  async listProjects(input: { status?: ProjectStatus; ownerId?: string; tag?: string; limit?: number } = {}): Promise<Project[]> {
    return request<Project[]>(this.config, 'GET', `/api/projects${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }

  async getProject(id: string): Promise<Project> {
    return request<Project>(this.config, 'GET', `/api/projects/${encodeURIComponent(id)}`);
  }

  async createProject(input: { name: string; description?: string; ownerId?: string; startDate?: string; endDate?: string; budget?: { amount: number; currency: string }; tags?: string[] }): Promise<Project> {
    return request<Project>(this.config, 'POST', '/api/projects', input);
  }

  async updateProject(id: string, patch: Partial<Project>): Promise<Project> {
    return request<Project>(this.config, 'PATCH', `/api/projects/${encodeURIComponent(id)}`, patch);
  }

  // ─── Processes ───

  async listProcesses(input: { active?: boolean; limit?: number } = {}): Promise<Process[]> {
    return request<Process[]>(this.config, 'GET', `/api/processes${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }

  async createProcess(input: { name: string; description?: string; steps: Process['steps'] }): Promise<Process> {
    return request<Process>(this.config, 'POST', '/api/processes', input);
  }

  // ─── Incidents ───

  async listIncidents(input: { status?: IncidentStatus; severity?: IncidentSeverity; assigneeId?: string; limit?: number } = {}): Promise<Incident[]> {
    return request<Incident[]>(this.config, 'GET', `/api/incidents${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }

  async reportIncident(input: { title: string; description: string; severity: IncidentSeverity; reportedBy?: string; linkedProjectId?: string }): Promise<Incident> {
    return request<Incident>(this.config, 'POST', '/api/incidents', input);
  }

  async resolveIncident(id: string, input: { resolution: string; rootCause?: string }): Promise<Incident> {
    return request<Incident>(this.config, 'POST', `/api/incidents/${encodeURIComponent(id)}/resolve`, input);
  }

  // ─── Risks ───

  async listRisks(input: { level?: RiskLevel; status?: Risk['status']; ownerId?: string; minScore?: number; limit?: number } = {}): Promise<Risk[]> {
    return request<Risk[]>(this.config, 'GET', `/api/risks${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }

  async createRisk(input: { title: string; description: string; likelihood: number; impact: number; mitigationPlan?: string; ownerId?: string }): Promise<Risk> {
    return request<Risk>(this.config, 'POST', '/api/risks', input);
  }

  // ─── SOPs ───

  async listSops(input: { category?: string; limit?: number } = {}): Promise<Sop[]> {
    return request<Sop[]>(this.config, 'GET', `/api/sops${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }

  async createSop(input: { title: string; description: string; category?: string; steps: Omit<Sop['steps'][0], 'order'>[] }): Promise<Sop> {
    return request<Sop>(this.config, 'POST', '/api/sops', input);
  }
}
