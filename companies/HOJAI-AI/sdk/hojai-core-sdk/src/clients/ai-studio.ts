import { BaseClient, HojaiConfig } from '../base.js';

export class AIStudioClient extends BaseClient {
  constructor(config: HojaiConfig = {}) { super('/api', { ...config, baseURL: config.baseURL || 'http://localhost:4890' }); }

  async listWorkflows() { return this.get<any>('/workflows'); }
  async getWorkflow(id: string) { return this.get<any>('/workflows/' + id); }
  async createWorkflow(data: { name: string; description?: string; nodes?: unknown[]; edges?: unknown[]; tags?: string[] }) { return this.post<any>('/workflows', data); }
  async updateWorkflow(id: string, data: Record<string, unknown>) { return this.put<any>('/workflows/' + id, data); }
  async deleteWorkflow(id: string) { return this.delete<any>('/workflows/' + id); }
  async validateWorkflow(workflow: unknown) { return this.post<any>('/workflows/validate', workflow); }
  async executeWorkflow(id: string, inputs?: Record<string, unknown>) { return this.post<any>('/workflows/' + id + '/execute', { inputs }); }
  async getExecution(workflowId: string, execId: string) { return this.get<any>('/executions/' + execId); }
  async listExecutions(limit?: number) { return this.get<any>('/executions', { limit }); }
  async exportWorkflow(id: string, format?: string) { return this.get<any>('/workflows/' + id + '/export', { format: format || 'json' }); }
  async importWorkflow(data: unknown, format?: string) { return this.post<any>('/workflows/import', { workflow: data, format }); }
  async getExecutionSummary(workflowId: string, execId: string) { return this.get<any>('/executions/' + execId + '/summary'); }
}
