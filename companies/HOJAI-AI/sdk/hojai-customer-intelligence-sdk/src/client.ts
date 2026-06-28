/**
 * HOJAI Customer Intelligence SDK - Base Client
 * HTTP client for communicating with Customer Intelligence services
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import type { CustomerIntelligenceConfig, SDKResponse } from './types.js';

/**
 * Base client class for all Customer Intelligence services
 */
export class BaseClient {
  protected client: AxiosInstance;
  protected config: CustomerIntelligenceConfig;
  protected debug: boolean;

  constructor(config: CustomerIntelligenceConfig, baseUrl?: string) {
    this.config = config;
    this.debug = config.debug || false;

    const url = baseUrl || config.gatewayUrl || 'http://localhost:4896';

    this.client = axios.create({
      baseURL: url,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey && { 'Authorization': `Bearer ${config.apiKey}` }),
      },
    });

    // Response interceptor for logging and error handling
    this.client.interceptors.response.use(
      (response) => {
        if (this.debug) {
          console.log(`[CustomerIntelligenceSDK] Response: ${response.status} ${response.config.url}`);
        }
        return response;
      },
      (error: AxiosError) => {
        if (this.debug) {
          console.error(`[CustomerIntelligenceSDK] Error: ${error.message}`);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Make a GET request
   */
  protected async get<T = unknown>(
    path: string,
    params?: Record<string, unknown>
  ): Promise<SDKResponse<T>> {
    try {
      const config = params ? { params } : undefined;
      const response = await this.client.get(path, config);
      return { success: true, data: response.data as T };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Make a POST request
   */
  protected async post<T = unknown>(
    path: string,
    data?: unknown
  ): Promise<SDKResponse<T>> {
    try {
      const response = await this.client.post(path, data);
      return { success: true, data: response.data as T };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Make a PUT request
   */
  protected async put<T = unknown>(
    path: string,
    data?: unknown
  ): Promise<SDKResponse<T>> {
    try {
      const response = await this.client.put(path, data);
      return { success: true, data: response.data as T };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Make a PATCH request
   */
  protected async patch<T = unknown>(
    path: string,
    data?: unknown
  ): Promise<SDKResponse<T>> {
    try {
      const response = await this.client.patch(path, data);
      return { success: true, data: response.data as T };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Make a DELETE request
   */
  protected async del<T = unknown>(path: string): Promise<SDKResponse<T>> {
    try {
      const response = await this.client.delete(path);
      return { success: true, data: response.data as T };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Handle errors consistently
   */
  private handleError<T>(error: unknown): SDKResponse<T> {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      if (axiosError.response) {
        return {
          success: false,
          data: null,
          error: axiosError.message,
          code: String(axiosError.response.status),
        };
      }
      if (axiosError.code === 'ECONNREFUSED') {
        return {
          success: false,
          data: null,
          error: 'Service unavailable. Please check your connection.',
          code: 'CONNECTION_ERROR',
        };
      }
      if (axiosError.code === 'ETIMEDOUT') {
        return {
          success: false,
          data: null,
          error: 'Request timeout. Please try again.',
          code: 'TIMEOUT',
        };
      }
    }
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      code: 'UNKNOWN_ERROR',
    };
  }
}

/**
 * Retry helper for resilient API calls
 */
export async function withRetry<T>(
  fn: () => Promise<SDKResponse<T>>,
  retries: number = 3,
  delay: number = 1000
): Promise<SDKResponse<T>> {
  let lastError: SDKResponse<T>;

  for (let i = 0; i < retries; i++) {
    const result = await fn();
    if (result.success) {
      return result;
    }
    lastError = result;

    // Wait before retry (exponential backoff)
    if (i < retries - 1) {
      await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }

  return lastError!;
}
