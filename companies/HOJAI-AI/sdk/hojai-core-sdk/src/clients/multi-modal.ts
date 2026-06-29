import { BaseClient, HojaiConfig } from '../base.js';

// Multi-Modal OS — Port 4897
export class MultiModalClient extends BaseClient {
  constructor(config: HojaiConfig = {}) { super('/api', { ...config, baseURL: config.baseURL || 'http://localhost:4897' }); }

  async detectType(filename: string) { return this.post<any>('/detect', { filename }); }
  async getFormats() { return this.get<any>('/formats'); }

  async processImage(filename: string, operation: string, params?: Record<string, unknown>, metadata?: Record<string, unknown>) {
    return this.post<any>('/image/process', { filename, operation, params, metadata });
  }
  async processAudio(filename: string, operation: string, params?: Record<string, unknown>, metadata?: Record<string, unknown>) {
    return this.post<any>('/audio/process', { filename, operation, params, metadata });
  }
  async processVideo(filename: string, operation: string, params?: Record<string, unknown>, metadata?: Record<string, unknown>) {
    return this.post<any>('/video/process', { filename, operation, params, metadata });
  }

  async runOCR(filename: string, metadata?: Record<string, unknown>, options?: Record<string, unknown>) {
    return this.post<any>('/ocr', { filename, metadata, options });
  }
  async transcribe(filename: string, mediaType: string, metadata?: Record<string, unknown>, options?: Record<string, unknown>) {
    return this.post<any>('/transcribe', { filename, mediaType, metadata, options });
  }

  async listJobs(params?: { type?: string; status?: string }) { return this.get<any>('/jobs', params); }
  async getJob(id: string) { return this.get<any>(`/jobs/${id}`); }

  async batchProcess(tasks: unknown[]) { return this.post<any>('/batch', { tasks }); }
}