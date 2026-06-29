import { BaseClient, HojaiConfig } from '../base.js';

export class WorkflowRegistryClient extends BaseClient {
  constructor(config: HojaiConfig = {}) { super('/api', { ...config, baseURL: config.baseURL || 'http://localhost:4902' }); }

  async listTemplates(params?: { category?: string; industry?: string; tags?: string; q?: string }) { return this.get<any>('/templates', params); }
  async getTemplate(id: string) { return this.get<any>('/templates/' + id); }
  async createTemplate(data: { name: string; nodes?: unknown[]; edges?: unknown[]; category?: string; industry?: string; complexity?: string; tags?: string[] }) { return this.post<any>('/templates', data); }
  async updateTemplate(id: string, data: Record<string, unknown>) { return this.put<any>('/templates/' + id, data); }
  async deleteTemplate(id: string) { return this.delete<any>('/templates/' + id); }
  async listVersions(templateId: string) { return this.get<any>('/templates/' + templateId + '/versions'); }
  async createVersion(templateId: string) { return this.post<any>('/templates/' + templateId + '/versions'); }
  async listCategories() { return this.get<any>('/categories'); }
  async createCategory(data: { name: string; type?: string; description?: string }) { return this.post<any>('/categories', data); }
  async search(params: { q?: string; category?: string; industry?: string; complexity?: string; tags?: string }) { return this.get<any>('/search', params); }
  async getAnalytics() { return this.get<any>('/analytics'); }
}
