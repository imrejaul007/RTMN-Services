import { BaseClient, HojaiConfig } from '../base.js';

// Memory Lifecycle — Port 4899
export class MemoryLifecycleClient extends BaseClient {
  constructor(config: HojaiConfig = {}) { super('/api', { ...config, baseURL: config.baseURL || 'http://localhost:4899' }); }

  async listMemories(params?: { owner?: string; type?: string; tags?: string; minConfidence?: number }) { return this.get<any>('/memories', params); }
  async getMemory(id: string) { return this.get<any>(`/memories/${id}`); }
  async createMemory(data: { owner: string; content: string; type?: string; confidence?: number; tags?: string[]; expiresAt?: string }) { return this.post<any>('/memories', data); }
  async updateMemory(id: string, data: Record<string, unknown>) { return this.put<any>(`/memories/${id}`, data); }
  async deleteMemory(id: string) { return this.delete<any>(`/memories/${id}`); }

  async getExpired() { return this.get<any>('/memories/expired'); }
  async compact(params?: { confidenceThreshold?: number }) { return this.post<any>('/compact', params); }
  async prune(params?: { minConfidence?: number }) { return this.post<any>('/prune', params); }
  async archive(params?: { olderThanDays?: number }) { return this.post<any>('/archive', params); }
  async gdprDelete(owner: string) { return this.post<any>('/gdpr/delete', { owner }); }

  async listHooks() { return this.get<any>('/hooks'); }
  async createHook(data: { name: string; event: string; callback: string }) { return this.post<any>('/hooks', data); }
  async deleteHook(id: string) { return this.delete<any>(`/hooks/${id}`); }

  async getStats() { return this.get<any>('/stats'); }
}