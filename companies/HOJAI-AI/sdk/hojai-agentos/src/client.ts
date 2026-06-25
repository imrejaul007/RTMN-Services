/**
 * AgentOS SDK — Base HTTP client with retry, auth, and timeout.
 */

import type { AgentOSConfig } from './types.js';
import { AgentOSConnectionError, AgentOSError } from './errors.js';

// Lazy-import axios so the package works without it installed
let _axios: typeof import('axios').default | null = null;
async function ax() {
  if (!_axios) {
    const { default: a } = await import('axios');
    _axios = a;
  }
  return _axios;
}

export class AgentOSClient {
  readonly baseUrl: string;
  readonly apiKey: string;
  readonly timeout: number;
  readonly retries: number;

  constructor(config: AgentOSConfig = {}) {
    const { baseUrl = 'http://localhost:7300', apiKey = '', timeout = 30_000, retries = 3 } = config;
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
    this.timeout = timeout;
    this.retries = retries;
  }

  /** Build a full URL: baseUrl + port + path */
  url(port: number, path: string): string {
    const p = path.startsWith('/') ? path : `/${path}`;
    return `${this.baseUrl}:${port}${p}`;
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.apiKey) h['Authorization'] = `Bearer ${this.apiKey}`;
    return h;
  }

  private async http<T>(
    method: 'get' | 'post' | 'patch' | 'delete',
    url: string,
    body?: unknown,
    attempt = 1
  ): Promise<T> {
    const axios = await ax();
    try {
      const response = await axios.request<T>({
        method,
        url,
        headers: this.headers(),
        data: body,
        timeout: this.timeout,
        validateStatus: () => true,
      });

      if (response.status === 404) {
        const data = response.data as Record<string, unknown>;
        throw new AgentOSError((data?.error as string) ?? `Not found: ${url}`, 'NOT_FOUND', 404);
      }
      if (response.status === 400) {
        const data = response.data as Record<string, unknown>;
        throw new AgentOSError(
          (data?.error as string) ?? `Bad request: ${url}`,
          'BAD_REQUEST',
          400,
          (data?.details as string[]) ?? []
        );
      }
      if (response.status >= 400) {
        const data = response.data as Record<string, unknown>;
        throw new AgentOSError(
          (data?.error as string) ?? `HTTP ${response.status}: ${url}`,
          'HTTP_ERROR',
          response.status
        );
      }
      return response.data as T;
    } catch (err) {
      if (err instanceof AgentOSError) throw err;
      if (attempt < this.retries) {
        await new Promise((r) => setTimeout(r, 2 ** attempt * 100));
        return this.http<T>(method, url, body, attempt + 1);
      }
      throw new AgentOSConnectionError(url, err as Error);
    }
  }

  async get<T>(url: string): Promise<T> { return this.http<T>('get', url); }
  async post<T>(url: string, body?: unknown): Promise<T> { return this.http<T>('post', url, body); }
  async patch<T>(url: string, body?: unknown): Promise<T> { return this.http<T>('patch', url, body); }
  async del<T>(url: string): Promise<T> { return this.http<T>('delete', url); }

  async ping(port: number): Promise<boolean> {
    try {
      await this.get<{ status: string }>(this.url(port, '/health'));
      return true;
    } catch { return false; }
  }
}
