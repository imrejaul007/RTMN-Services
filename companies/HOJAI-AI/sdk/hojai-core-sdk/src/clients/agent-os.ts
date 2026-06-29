import { BaseClient, HojaiConfig } from '../base.js';

// Agent OS — Port 4892
export class AgentOSClient extends BaseClient {
  constructor(config: HojaiConfig = {}) { super('/api', { ...config, baseURL: config.baseURL || 'http://localhost:4892' }); }

  async listAgents(params?: { type?: string; status?: string }) { return this.get<any>('/agents', params); }
  async getAgent(id: string) { return this.get<any>(`/agents/${id}`); }
  async createAgent(data: { name: string; type: string; config?: Record<string, unknown> }) { return this.post<any>('/agents', data); }
  async updateAgent(id: string, data: Record<string, unknown>) { return this.put<any>(`/agents/${id}`, data); }
  async deleteAgent(id: string) { return this.delete<any>(`/agents/${id}`); }

  async startAgent(id: string) { return this.post<any>(`/agents/${id}/start`); }
  async pauseAgent(id: string) { return this.post<any>(`/agents/${id}/pause`); }
  async resumeAgent(id: string) { return this.post<any>(`/agents/${id}/resume`); }
  async stopAgent(id: string) { return this.post<any>(`/agents/${id}/stop`); }
  async restartAgent(id: string) { return this.post<any>(`/agents/${id}/restart`); }

  async executeAgent(id: string, task: string) { return this.post<any>(`/agents/${id}/execute`, { task }); }
  async getExecution(agentId: string, execId: string) { return this.get<any>(`/agents/${agentId}/executions/${execId}`); }
  async agentHealth(id: string) { return this.get<any>(`/agents/${id}/health`); }
  async listMessages(agentId: string) { return this.get<any>(`/agents/${agentId}/messages`); }
  async sendMessage(agentId: string, message: string, sender?: string) { return this.post<any>(`/agents/${agentId}/messages`, { message, sender }); }
}
