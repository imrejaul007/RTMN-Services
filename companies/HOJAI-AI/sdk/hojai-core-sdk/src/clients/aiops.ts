import { BaseClient, HojaiConfig } from '../base.js';

// AIOps OS — Port 4898
export class AIOpsClient extends BaseClient {
  constructor(config: HojaiConfig = {}) { super('/api', { ...config, baseURL: config.baseURL || 'http://localhost:4898' }); }

  // Metrics
  async listMetrics(params?: { service?: string; from?: string; to?: string; limit?: number }) { return this.get<any>('/metrics', params); }
  async ingestMetric(data: { service: string; name: string; value: number; unit?: string; labels?: Record<string, string> }) { return this.post<any>('/metrics', data); }
  async getMetricSummary(params?: { service?: string; window?: string }) { return this.get<any>('/metrics/summary', params); }

  // Alerts
  async listAlerts(params?: { state?: string; severity?: string; service?: string }) { return this.get<any>('/alerts', params); }
  async getAlert(id: string) { return this.get<any>(`/alerts/${id}`); }
  async createAlert(data: { name: string; severity?: string; service: string; condition?: string; threshold?: number }) { return this.post<any>('/alerts', data); }
  async acknowledgeAlert(id: string) { return this.post<any>(`/alerts/${id}/acknowledge`); }
  async resolveAlert(id: string) { return this.post<any>(`/alerts/${id}/resolve`); }
  async snoozeAlert(id: string, duration?: number) { return this.post<any>(`/alerts/${id}/snooze`, { duration }); }

  // Incidents
  async listIncidents(params?: { state?: string; severity?: string }) { return this.get<any>('/incidents', params); }
  async getIncident(id: string) { return this.get<any>(`/incidents/${id}`); }
  async createIncident(data: { title: string; severity?: string; service: string; description?: string }) { return this.post<any>('/incidents', data); }
  async addTimelineEvent(id: string, event: string, note?: string) { return this.post<any>(`/incidents/${id}/timeline`, { event, note }); }
  async transitionIncident(id: string, toState: string) { return this.post<any>(`/incidents/${id}/transition`, { toState }); }

  // Dashboards
  async listDashboards() { return this.get<any>('/dashboards'); }
  async getDashboard(id: string) { return this.get<any>(`/dashboards/${id}`); }
  async createDashboard(data: { name: string; description?: string; widgets?: unknown[]; filters?: Record<string, unknown> }) { return this.post<any>('/dashboards', data); }
  async deleteDashboard(id: string) { return this.delete<any>(`/dashboards/${id}`); }

  // Status
  async getSystemStatus() { return this.get<any>('/status'); }
  async getServiceHealth(service: string) { return this.get<any>(`/health/${service}`); }
}