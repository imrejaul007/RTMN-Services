/**
 * Nexha Mission Planner Client
 *
 * Wraps nexha-mission-planner: multi-step mission orchestration,
 * subtask lifecycle, mission templates.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request } from './utils.js';

export type MissionStatus = 'planned' | 'active' | 'paused' | 'completed' | 'failed' | 'cancelled';
export type SubtaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export interface Subtask {
  id: string;
  type: string;
  agentRole: string;
  input: Record<string, unknown>;
  dependsOn?: string[];
  status: SubtaskStatus;
  output?: Record<string, unknown>;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface Mission {
  id: string;
  tenantId: string;
  title: string;
  description?: string;
  status: MissionStatus;
  subtasks: Subtask[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface MissionInput {
  title: string;
  description?: string;
  subtasks: Array<{ id: string; type: string; agentRole: string; input: Record<string, unknown>; dependsOn?: string[] }>;
  metadata?: Record<string, unknown>;
}

export interface MissionTemplate {
  id: string;
  name: string;
  description?: string;
  subtaskTemplate: Array<{ type: string; agentRole: string; input: Record<string, unknown> }>;
  createdAt: string;
}

export class MissionClient {
  constructor(private config: HojaiConfig) {}

  async createMission(input: MissionInput): Promise<Mission> {
    return request<Mission>(this.config, 'POST', '/api/missions', input);
  }

  async listMissions(input: { status?: MissionStatus; limit?: number } = {}): Promise<Mission[]> {
    const params = new URLSearchParams();
    Object.entries(input).forEach(([k, v]) => { if (v !== undefined && v !== null) params.set(k, String(v)); });
    return request<Mission[]>(this.config, 'GET', `/api/missions?${params.toString()}`);
  }

  async getMission(missionId: string): Promise<Mission> {
    return request<Mission>(this.config, 'GET', `/api/missions/${encodeURIComponent(missionId)}`);
  }

  async updateMission(missionId: string, patch: Partial<MissionInput>): Promise<Mission> {
    return request<Mission>(this.config, 'PATCH', `/api/missions/${encodeURIComponent(missionId)}`, patch);
  }

  async plan(missionId: string): Promise<Mission> {
    return request<Mission>(this.config, 'POST', `/api/missions/${encodeURIComponent(missionId)}/plan`);
  }

  async start(missionId: string): Promise<Mission> {
    return request<Mission>(this.config, 'POST', `/api/missions/${encodeURIComponent(missionId)}/start`);
  }

  async pause(missionId: string): Promise<Mission> {
    return request<Mission>(this.config, 'POST', `/api/missions/${encodeURIComponent(missionId)}/pause`);
  }

  async cancel(missionId: string): Promise<Mission> {
    return request<Mission>(this.config, 'POST', `/api/missions/${encodeURIComponent(missionId)}/cancel`);
  }

  async retry(missionId: string): Promise<Mission> {
    return request<Mission>(this.config, 'POST', `/api/missions/${encodeURIComponent(missionId)}/retry`);
  }

  async startSubtask(missionId: string, subtaskId: string): Promise<Subtask> {
    return request<Subtask>(this.config, 'POST', `/api/missions/${encodeURIComponent(missionId)}/subtasks/${encodeURIComponent(subtaskId)}/start`);
  }

  async completeSubtask(missionId: string, subtaskId: string, output: Record<string, unknown>): Promise<Subtask> {
    return request<Subtask>(this.config, 'POST', `/api/missions/${encodeURIComponent(missionId)}/subtasks/${encodeURIComponent(subtaskId)}/complete`, { output });
  }

  async failSubtask(missionId: string, subtaskId: string, error: string): Promise<Subtask> {
    return request<Subtask>(this.config, 'POST', `/api/missions/${encodeURIComponent(missionId)}/subtasks/${encodeURIComponent(subtaskId)}/fail`, { error });
  }

  async skipSubtask(missionId: string, subtaskId: string): Promise<Subtask> {
    return request<Subtask>(this.config, 'POST', `/api/missions/${encodeURIComponent(missionId)}/subtasks/${encodeURIComponent(subtaskId)}/skip`);
  }

  async listTemplates(input: { industry?: string } = {}): Promise<MissionTemplate[]> {
    const params = new URLSearchParams();
    Object.entries(input).forEach(([k, v]) => { if (v !== undefined && v !== null) params.set(k, String(v)); });
    return request<MissionTemplate[]>(this.config, 'GET', `/api/templates?${params.toString()}`);
  }

  async getTemplate(templateId: string): Promise<MissionTemplate> {
    return request<MissionTemplate>(this.config, 'GET', `/api/templates/${encodeURIComponent(templateId)}`);
  }

  async createTemplate(input: { name: string; description?: string; subtaskTemplate: Array<{ type: string; agentRole: string; input: Record<string, unknown> }> }): Promise<MissionTemplate> {
    return request<MissionTemplate>(this.config, 'POST', '/api/templates', input);
  }
}