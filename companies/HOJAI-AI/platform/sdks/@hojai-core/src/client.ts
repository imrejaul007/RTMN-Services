/**
 * HOJAI Core Client
 */

import axios, { AxiosInstance } from 'axios';
import { Config } from './config';
import { Auth } from './auth';
import { Events } from './events';
import { Logger } from './logger';
import { MultiTenancy } from './multi-tenancy';

export class Client {
  public config: Config;
  public auth: Auth;
  public events: Events;
  public logger: Logger;
  public multiTenancy: MultiTenancy;

  private http: AxiosInstance;
  private tenantId?: string;

  constructor(config: Config) {
    this.config = config;
    this.auth = new Auth(config);
    this.events = new Events();
    this.logger = new Logger(config);
    this.multiTenancy = new MultiTenancy(config);

    this.http = axios.create({
      baseURL: config.apiUrl,
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add auth interceptor
    this.http.interceptors.request.use(async (req) => {
      const token = await this.auth.getToken();
      if (token) {
        req.headers.Authorization = `Bearer ${token}`;
      }
      if (this.tenantId) {
        req.headers['X-Tenant-ID'] = this.tenantId;
      }
      return req;
    });

    // Add response interceptor
    this.http.interceptors.response.use(
      (res) => res,
      async (err) => {
        if (err.response?.status === 401) {
          await this.auth.refresh();
          return this.http(err.config);
        }
        throw err;
      }
    );
  }

  setTenant(tenantId: string) {
    this.tenantId = tenantId;
    return this;
  }

  // Memory operations
  async memory() {
    const { MemoryOS } = await import('./modules/memory');
    return new MemoryOS(this);
  }

  // Twin operations
  async twins() {
    const { TwinOS } = await import('./modules/twins');
    return new TwinOS(this);
  }

  // Agent operations
  async agents() {
    const { AgentOS } = await import('./modules/agents');
    return new AgentOS(this);
  }

  // Flow operations
  async flows() {
    const { FlowOS } = await import('./modules/flows');
    return new FlowOS(this);
  }

  // Generic request
  async request<T>(method: string, path: string, data?: any): Promise<T> {
    const res = await this.http.request<T>({
      method,
      url: path,
      data,
    });
    return res.data;
  }

  // Health check
  async health(): Promise<boolean> {
    try {
      await this.http.get('/health');
      return true;
    } catch {
      return false;
    }
  }
}

export function createClient(config: Partial<Config> = {}): Client {
  const fullConfig = new Config(config);
  return new Client(fullConfig);
}
