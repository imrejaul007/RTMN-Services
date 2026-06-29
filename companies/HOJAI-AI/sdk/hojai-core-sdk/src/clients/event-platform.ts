import { BaseClient, HojaiConfig } from '../base.js';

// Event Platform — Port 4901
export class EventPlatformClient extends BaseClient {
  constructor(config: HojaiConfig = {}) { super('/api', { ...config, baseURL: config.baseURL || 'http://localhost:4901' }); }

  async listSchemas() { return this.get<any>('/schemas'); }
  async getSchema(name: string) { return this.get<any>(`/schemas/${name}`); }
  async createSchema(data: { name: string; version?: number; fields: string[] }) { return this.post<any>('/schemas', data); }
  async deprecateSchema(name: string, version: number) { return this.delete<any>(`/schemas/${name}/${version}`); }

  async publishEvent(data: { type: string; source: string; eventData?: Record<string, unknown>; schemaVersion?: number }) { return this.post<any>('/events', data); }
  async queryEvents(params?: { type?: string; source?: string; from?: string; to?: string; limit?: number }) { return this.get<any>('/events', params); }

  async listSubscriptions() { return this.get<any>('/subscriptions'); }
  async createSubscription(data: { name: string; type: string; callback: string; filter?: string }) { return this.post<any>('/subscriptions', data); }
  async deleteSubscription(id: string) { return this.delete<any>(`/subscriptions/${id}`); }

  async listRules() { return this.get<any>('/rules'); }
  async createRule(data: { name: string; eventType: string; condition?: string; destination: string }) { return this.post<any>('/rules', data); }
  async deleteRule(id: string) { return this.delete<any>(`/rules/${id}`); }

  async replay(params: { from: string; to: string; eventType?: string; target: string }) { return this.post<any>('/replay', params); }
  async getReplay(id: string) { return this.get<any>(`/replay/${id}`); }

  async getAnalytics() { return this.get<any>('/analytics'); }
}