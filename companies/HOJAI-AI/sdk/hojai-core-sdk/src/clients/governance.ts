import { BaseClient, HojaiConfig } from '../base.js';

// Governance OS — Port 4895
export class GovernanceClient extends BaseClient {
  constructor(config: HojaiConfig = {}) { super('/api', { ...config, baseURL: config.baseURL || 'http://localhost:4895' }); }

  async listPolicies(params?: { type?: string; status?: string }) { return this.get<any>('/policies', params); }
  async getPolicy(id: string) { return this.get<any>(`/policies/${id}`); }
  async createPolicy(data: { name: string; type: string; rules: unknown[]; description?: string }) { return this.post<any>('/policies', data); }
  async updatePolicy(id: string, data: Record<string, unknown>) { return this.put<any>(`/policies/${id}`, data); }
  async deletePolicy(id: string) { return this.delete<any>(`/policies/${id}`); }

  async evaluate(entityType: string, entityId: string, policyId: string) { return this.post<any>('/evaluate', { entityType, entityId, policyId }); }
  async evaluateBulk(requests: unknown[]) { return this.post<any>('/evaluate/bulk', { requests }); }
  async getAuditTrail(params?: { entityType?: string; entityId?: string }) { return this.get<any>('/audit', params); }

  async getComplianceReport(params?: { period?: string }) { return this.get<any>('/reports/compliance', params); }
  async getPolicyAnalytics() { return this.get<any>('/analytics'); }
}