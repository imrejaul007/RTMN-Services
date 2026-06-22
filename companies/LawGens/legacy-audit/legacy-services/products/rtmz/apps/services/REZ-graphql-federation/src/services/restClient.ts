import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { logger } from '../utils/logger.js';

export interface RestClientConfig {
  baseURL: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export interface RequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, unknown>;
  tenantId?: string;
  userId?: string;
}

const DEFAULT_TIMEOUT = 10000;
const DEFAULT_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 1000;

export class RestClient {
  private client: AxiosInstance;
  private serviceName: string;
  private baseURL: string;

  constructor(serviceName: string, config: RestClientConfig) {
    this.serviceName = serviceName;
    this.baseURL = config.baseURL;

    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || DEFAULT_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    this.client.interceptors.request.use(
      (config) => {
        logger.debug('rest_client_request', {
          service: this.serviceName,
          method: config.method?.toUpperCase(),
          url: config.url
        });
        return config;
      },
      (error) => {
        logger.error('rest_client_request_error', {
          service: this.serviceName,
          error: error.message
        });
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => {
        logger.debug('rest_client_response', {
          service: this.serviceName,
          status: response.status,
          url: response.config.url
        });
        return response;
      },
      async (error) => {
        const config = error.config as AxiosRequestConfig & { _retryCount?: number };
        const retryCount = config._retryCount || 0;
        const maxRetries = config.baseURL?.includes('company-memory') ? 0 :
          (config.baseURL?.includes('agent-protocol') ? 0 : DEFAULT_RETRIES);

        if (retryCount < maxRetries && this.shouldRetry(error)) {
          config._retryCount = retryCount + 1;
          const delay = (config.baseURL?.includes('company-memory') ? 0 : DEFAULT_RETRY_DELAY) * Math.pow(2, retryCount);
          await this.delay(delay);
          logger.info('rest_client_retry', {
            service: this.serviceName,
            attempt: retryCount + 1,
            maxRetries,
            url: error.config?.url
          });
          return this.client(config);
        }

        logger.error('rest_client_error', {
          service: this.serviceName,
          status: error.response?.status,
          error: error.message,
          url: error.config?.url
        });
        return Promise.reject(error);
      }
    );
  }

  private shouldRetry(error: { code?: string; response?: { status: number } }): boolean {
    const retryableCodes = ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'ENETUNREACH'];
    if (retryableCodes.includes(error.code || '')) return true;
    if (error.response?.status === 429) return true;
    return false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private buildHeaders(options?: RequestOptions): Record<string, string> {
    const headers: Record<string, string> = {
      ...(options?.headers || {})
    };

    if (options?.tenantId) {
      headers['x-tenant-id'] = options.tenantId;
    }
    if (options?.userId) {
      headers['x-user-id'] = options.userId;
    }

    return headers;
  }

  async get<T = unknown>(path: string, options?: RequestOptions): Promise<T> {
    const response: AxiosResponse<T> = await this.client.get(path, {
      headers: this.buildHeaders(options),
      params: options?.params
    });
    return response.data;
  }

  async post<T = unknown>(path: string, data?: unknown, options?: RequestOptions): Promise<T> {
    const response: AxiosResponse<T> = await this.client.post(path, data, {
      headers: this.buildHeaders(options),
      params: options?.params
    });
    return response.data;
  }

  async put<T = unknown>(path: string, data?: unknown, options?: RequestOptions): Promise<T> {
    const response: AxiosResponse<T> = await this.client.put(path, data, {
      headers: this.buildHeaders(options),
      params: options?.params
    });
    return response.data;
  }

  async patch<T = unknown>(path: string, data?: unknown, options?: RequestOptions): Promise<T> {
    const response: AxiosResponse<T> = await this.client.patch(path, data, {
      headers: this.buildHeaders(options),
      params: options?.params
    });
    return response.data;
  }

  async delete<T = unknown>(path: string, options?: RequestOptions): Promise<T> {
    const response: AxiosResponse<T> = await this.client.delete(path, {
      headers: this.buildHeaders(options),
      params: options?.params
    });
    return response.data;
  }

  getServiceName(): string {
    return this.serviceName;
  }

  getBaseURL(): string {
    return this.baseURL;
  }
}

// Service URLs from environment
const COMPANY_MEMORY_URL = process.env.COMPANY_MEMORY_SERVICE_URL || 'http://localhost:4801';
const AGENT_PROTOCOL_URL = process.env.AGENT_PROTOCOL_SERVICE_URL || 'http://localhost:4201';
const HOJAI_API_URL = process.env.HOJAI_API_SERVICE_URL || 'http://localhost:4500';

// Pre-configured clients for each REST service
export const companyMemoryClient = new RestClient('company-memory', {
  baseURL: `${COMPANY_MEMORY_URL}/api/company-memory`
});

export const agentProtocolClient = new RestClient('agent-protocol', {
  baseURL: `${AGENT_PROTOCOL_URL}/api`
});

export const hojaiApiClient = new RestClient('hojai-api', {
  baseURL: `${HOJAI_API_URL}/api`
});

// Generic REST client factory for dynamic services
export function createRestClient(serviceName: string, baseURL: string, timeout?: number): RestClient {
  return new RestClient(serviceName, { baseURL, timeout });
}
