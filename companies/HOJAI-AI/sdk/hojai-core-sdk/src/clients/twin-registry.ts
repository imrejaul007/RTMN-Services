import { BaseClient, HojaiConfig } from '../base.js';

export class TwinRegistryClient extends BaseClient {
  constructor(config: HojaiConfig = {}) { super('/api', { ...config, baseURL: config.baseURL || 'http://localhost:4903' }); }

  async listTypes() { return this.get<any>('/types'); }
  async getType(id: string) { return this.get<any>('/types/' + id); }
  async createType(data: { name: string; description?: string; schema?: Record<string, unknown>; attributes?: string[]; relationships?: string[] }) { return this.post<any>('/types', data); }
  async updateType(id: string, data: Record<string, unknown>) { return this.put<any>('/types/' + id, data); }
  async deleteType(id: string) { return this.delete<any>('/types/' + id); }
  async listInstances(params?: { typeId?: string; tags?: string; q?: string }) { return this.get<any>('/instances', params); }
  async getInstance(id: string) { return this.get<any>('/instances/' + id); }
  async createInstance(data: { typeId: string; name: string; data?: Record<string, unknown>; tags?: string[]; status?: string }) { return this.post<any>('/instances', data); }
  async updateInstance(id: string, data: Record<string, unknown>) { return this.put<any>('/instances/' + id, data); }
  async deleteInstance(id: string) { return this.delete<any>('/instances/' + id); }
  async listInstanceVersions(instanceId: string) { return this.get<any>('/instances/' + instanceId + '/versions'); }
  async createInstanceVersion(instanceId: string) { return this.post<any>('/instances/' + instanceId + '/versions'); }
  async listRelationships(instanceId: string) { return this.get<any>('/instances/' + instanceId + '/relationships'); }
  async createRelationship(instanceId: string, data: { toId: string; type: string; metadata?: Record<string, unknown> }) { return this.post<any>('/instances/' + instanceId + '/relationships', data); }
  async deleteRelationship(instanceId: string, relId: string) { return this.delete<any>('/instances/' + instanceId + '/relationships/' + relId); }
  async getStats() { return this.get<any>('/stats'); }
}
