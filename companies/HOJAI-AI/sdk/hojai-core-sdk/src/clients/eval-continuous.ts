import { BaseClient, HojaiConfig } from '../base.js';

// Eval Continuous — Port 4888
export class EvalContinuousClient extends BaseClient {
  constructor(config: HojaiConfig = {}) { super('/api', { ...config, baseURL: config.baseURL || 'http://localhost:4888' }); }

  async listRuns(params?: { status?: string; service?: string }) { return this.get<any>('/runs', params); }
  async getRun(id: string) { return this.get<any>(`/runs/${id}`); }
  async createRun(data: { name: string; service: string; suite?: string; config?: Record<string, unknown> }) { return this.post<any>('/runs', data); }
  async triggerRun(id: string) { return this.post<any>(`/runs/${id}/trigger`); }

  async listMetrics(params?: { service?: string; from?: string; to?: string }) { return this.get<any>('/metrics', params); }
  async getMetricsTrend(params?: { service?: string; window?: string }) { return this.get<any>('/metrics/trend', params); }

  async getBaseline(service: string) { return this.get<any>(`/baseline/${service}`); }
  async setBaseline(service: string, data: { score: number; config?: Record<string, unknown> }) { return this.post<any>(`/baseline/${service}`, data); }

  async listGates(service: string) { return this.get<any>(`/gates/${service}`); }
  async createGate(data: { name: string; service: string; metric: string; threshold: number; direction?: string }) { return this.post<any>('/gates', data); }
}