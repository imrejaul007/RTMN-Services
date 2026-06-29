/**
 * @hojai/core-sdk — Base client and shared types
 */
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

export interface HojaiConfig {
  baseURL?: string;
  apiKey?: string;
  timeout?: number;
}

const DEFAULT_BASE = 'http://localhost';

export abstract class BaseClient {
  protected client: AxiosInstance;

  constructor(path: string, config: HojaiConfig = {}) {
    const base = config.baseURL || DEFAULT_BASE;
    this.client = axios.create({
      baseURL: `${base}${path}`,
      timeout: config.timeout || 10000,
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      },
    });
  }

  protected async get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
    const res = await this.client.get<T>(url, { params });
    return res.data;
  }

  protected async post<T>(url: string, data?: unknown): Promise<T> {
    const res = await this.client.post<T>(url, data);
    return res.data;
  }

  protected async put<T>(url: string, data?: unknown): Promise<T> {
    const res = await this.client.put<T>(url, data);
    return res.data;
  }

  protected async delete<T>(url: string): Promise<T> {
    const res = await this.client.delete<T>(url);
    return res.data;
  }

  async health(): Promise<{ status: string; service?: string }> {
    return this.get('/health');
  }

  async ready(): Promise<{ ready: boolean }> {
    return this.get('/ready');
  }
}