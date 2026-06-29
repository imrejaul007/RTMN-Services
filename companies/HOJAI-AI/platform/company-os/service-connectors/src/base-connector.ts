/**
 * Service Connector Base
 *
 * Base class for connecting to REZ-Merchant services.
 * Provides tenant isolation and unified interface.
 */

import { TenantContext } from '../shared/types';

export interface ServiceConfig {
  baseUrl: string;
  timeout?: number;
  retries?: number;
}

export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
}

export interface HealthStatus {
  service: string;
  status: 'healthy' | 'degraded' | 'down';
  latency?: number;
  lastChecked: string;
}

/**
 * Base Service Connector
 * All industry connectors extend this class
 */
export abstract class BaseConnector {
  protected config: ServiceConfig;
  protected tenant?: TenantContext;

  constructor(config: ServiceConfig) {
    this.config = {
      timeout: 30000,
      retries: 3,
      ...config,
    };
  }

  /**
   * Set tenant context
   */
  setTenant(tenant: TenantContext): void {
    this.tenant = tenant;
  }

  /**
   * Get headers for requests
   */
  protected getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.tenant) {
      headers['X-Tenant-ID'] = this.tenant.tenantId;
      headers['X-Company-ID'] = this.tenant.companyId;
    }

    return headers;
  }

  /**
   * Make HTTP request with retries
   */
  protected async request<T>(
    method: string,
    path: string,
    body?: any,
    options: { retries?: number; timeout?: number } = {}
  ): Promise<ServiceResponse<T>> {
    const retries = options.retries ?? this.config.retries ?? 3;
    const timeout = options.timeout ?? this.config.timeout ?? 30000;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(`${this.config.baseUrl}${path}`, {
          method,
          headers: this.getHeaders(),
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const data = await response.json();

        return {
          success: response.ok,
          data: data as T,
          statusCode: response.status,
        };
      } catch (error) {
        lastError = error as Error;
        if (attempt < retries - 1) {
          await this.delay(1000 * Math.pow(2, attempt)); // Exponential backoff
        }
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Request failed',
    };
  }

  /**
   * GET request
   */
  protected async get<T>(path: string): Promise<ServiceResponse<T>> {
    return this.request<T>('GET', path);
  }

  /**
   * POST request
   */
  protected async post<T>(path: string, body?: any): Promise<ServiceResponse<T>> {
    return this.request<T>('POST', path, body);
  }

  /**
   * PUT request
   */
  protected async put<T>(path: string, body?: any): Promise<ServiceResponse<T>> {
    return this.request<T>('PUT', path, body);
  }

  /**
   * PATCH request
   */
  protected async patch<T>(path: string, body?: any): Promise<ServiceResponse<T>> {
    return this.request<T>('PATCH', path, body);
  }

  /**
   * DELETE request
   */
  protected async delete<T>(path: string): Promise<ServiceResponse<T>> {
    return this.request<T>('DELETE', path);
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<HealthStatus> {
    const start = Date.now();
    try {
      await this.get('/health');
      return {
        service: this.config.baseUrl,
        status: 'healthy',
        latency: Date.now() - start,
        lastChecked: new Date().toISOString(),
      };
    } catch {
      return {
        service: this.config.baseUrl,
        status: 'down',
        lastChecked: new Date().toISOString(),
      };
    }
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
