import { BaseClient, HojaiConfig } from '../base.js';

// Planning Engine — Port 4896
export class PlanningEngineClient extends BaseClient {
  constructor(config: HojaiConfig = {}) { super('/api', { ...config, baseURL: config.baseURL || 'http://localhost:4896' }); }

  // Plans CRUD
  async listPlans() { return this.get<any>('/plans'); }
  async getPlan(id: string) { return this.get<any>(`/plans/${id}`); }
  async createPlan(data: { name: string; nodes?: unknown[]; edges?: unknown[]; description?: string }) { return this.post<any>('/plans', data); }
  async updatePlan(id: string, data: Record<string, unknown>) { return this.put<any>(`/plans/${id}`, data); }
  async deletePlan(id: string) { return this.delete<any>(`/plans/${id}`); }

  // Goal decomposition
  async decomposeGoal(goal: string, params?: { strategy?: string; maxDepth?: number }) { return this.post<any>('/decompose', { goal, ...params }); }

  // Validation
  async validatePlan(plan: unknown) { return this.post<any>('/validate', plan); }

  // Execution
  async executePlan(id: string, inputs?: Record<string, unknown>) { return this.post<any>(`/plans/${id}/execute`, { inputs }); }
  async getExecution(id: string, execId: string) { return this.get<any>(`/executions/${execId}`); }

  // Utilities
  async topologicalSort(nodes: unknown[], edges: unknown[]) { return this.post<any>('/toposort', { nodes, edges }); }
  async detectCycles(nodes: unknown[], edges: unknown[]) { return this.post<any>('/cycles', { nodes, edges }); }
  async suggestStrategy(plan: unknown) { return this.post<any>('/strategy', plan); }
}