import { BaseClient, HojaiConfig } from '../base.js';

export class KnowledgeRegistryClient extends BaseClient {
  constructor(config: HojaiConfig = {}) { super('/api', { ...config, baseURL: config.baseURL || 'http://localhost:4900' }); }

  async listAssets(params?: { type?: string; tags?: string; taxonomy?: string; q?: string }) { return this.get<any>('/assets', params); }
  async getAsset(id: string) { return this.get<any>('/assets/' + id); }
  async createAsset(data: { name: string; type: string; content?: string; tags?: string[]; taxonomy?: string; source?: string; confidence?: number }) { return this.post<any>('/assets', data); }
  async updateAsset(id: string, data: Record<string, unknown>) { return this.put<any>('/assets/' + id, data); }
  async deleteAsset(id: string) { return this.delete<any>('/assets/' + id); }
  async listVersions(assetId: string) { return this.get<any>('/assets/' + assetId + '/versions'); }
  async getVersion(assetId: string, version: number) { return this.get<any>('/assets/' + assetId + '/versions/' + version); }
  async createVersion(assetId: string) { return this.post<any>('/assets/' + assetId + '/versions'); }
  async listTaxonomy() { return this.get<any>('/taxonomy'); }
  async createTaxonomy(data: { name: string; parentId?: string; description?: string }) { return this.post<any>('/taxonomy', data); }
  async getTaxonomyChildren(id: string) { return this.get<any>('/taxonomy/' + id + '/children'); }
  async search(params: { q?: string; type?: string; tags?: string; taxonomy?: string }) { return this.get<any>('/search', params); }
  async listDependencies(assetId: string) { return this.get<any>('/assets/' + assetId + '/dependencies'); }
  async addDependency(assetId: string, data: { toId: string; type?: string }) { return this.post<any>('/assets/' + assetId + '/dependencies', data); }
  async listDependents(assetId: string) { return this.get<any>('/assets/' + assetId + '/dependents'); }
  async removeDependency(assetId: string, depId: string) { return this.delete<any>('/assets/' + assetId + '/dependencies/' + depId); }
  async getStats() { return this.get<any>('/stats'); }
}
