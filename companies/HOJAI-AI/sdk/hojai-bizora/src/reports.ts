/**
 * Bizora Reports client.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request, buildQueryString } from './utils.js';
import type { Report, ReportRequest } from './types.js';

export class ReportsClient {
  public readonly config: HojaiConfig;
  constructor(config: HojaiConfig) { this.config = { ...config, baseUrl: `http://localhost:4874` }; }

  async list(input: { status?: Report['status']; format?: Report['format']; limit?: number } = {}): Promise<Report[]> {
    return request<Report[]>(this.config, 'GET', `/api/reports${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }

  async get(id: string): Promise<Report> {
    return request<Report>(this.config, 'GET', `/api/reports/${encodeURIComponent(id)}`);
  }

  /** Trigger a new report generation. Async — poll the returned report for status. */
  async generate(input: ReportRequest): Promise<Report> {
    return request<Report>(this.config, 'POST', '/api/reports/generate', input);
  }

  /** Get the download URL for a ready report. */
  async getDownloadUrl(id: string): Promise<{ url: string; expiresAt: string }> {
    return request(this.config, 'GET', `/api/reports/${encodeURIComponent(id)}/download`);
  }

  /** One-call: generate + wait for ready + return download URL. Polls every `pollMs` up to `timeoutMs`. */
  async generateAndWait(input: ReportRequest, opts: { pollMs?: number; timeoutMs?: number } = {}): Promise<Report> {
    const { pollMs = 2000, timeoutMs = 60_000 } = opts;
    const report = await this.generate(input);
    const start = Date.now();
    while (report.status === 'pending' || report.status === 'generating') {
      if (Date.now() - start > timeoutMs) throw new Error(`Report ${report.id} timed out after ${timeoutMs}ms`);
      await new Promise(r => setTimeout(r, pollMs));
      const updated = await this.get(report.id);
      Object.assign(report, updated);
    }
    return report;
  }
}
