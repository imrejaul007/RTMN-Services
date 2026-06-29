import { BaseClient, HojaiConfig } from '../base.js';

export class FineTuningClient extends BaseClient {
  constructor(config: HojaiConfig = {}) { super('/api', { ...config, baseURL: config.baseURL || 'http://localhost:4610' }); }

  async listDatasets(params?: { status?: string }) { return this.get<any>('/datasets', params); }
  async getDataset(id: string) { return this.get<any>('/datasets/' + id); }
  async createDataset(data: { name: string; source: string; description?: string }) { return this.post<any>('/datasets', data); }
  async prepareDataset(id: string) { return this.post<any>('/datasets/' + id + '/prepare'); }
  async deleteDataset(id: string) { return this.delete<any>('/datasets/' + id); }
  async listJobs(params?: { status?: string }) { return this.get<any>('/jobs', params); }
  async getJob(id: string) { return this.get<any>('/jobs/' + id); }
  async createJob(data: { name: string; datasetId: string; model: string; epochs?: number; batchSize?: number; learningRate?: number }) { return this.post<any>('/jobs', data); }
  async startJob(id: string) { return this.post<any>('/jobs/' + id + '/start'); }
  async queueJob(id: string) { return this.post<any>('/jobs/' + id + '/queue'); }
  async cancelJob(id: string) { return this.post<any>('/jobs/' + id + '/cancel'); }
  async listModels(params?: { status?: string; task?: string }) { return this.get<any>('/models', params); }
  async getModel(id: string) { return this.get<any>('/models/' + id); }
  async deployModel(id: string) { return this.post<any>('/models/' + id + '/deploy'); }
  async archiveModel(id: string) { return this.post<any>('/models/' + id + '/archive'); }
  async getMetrics(jobId: string) { return this.get<any>('/metrics/' + jobId); }
  async getMetricsTrend(jobId: string) { return this.get<any>('/metrics/' + jobId + '/trend'); }
}
