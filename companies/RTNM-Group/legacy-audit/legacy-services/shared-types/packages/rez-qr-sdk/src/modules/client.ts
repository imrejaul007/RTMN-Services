/**
 * HTTP Client for QR SDK
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import type { QRConfig, APIResponse } from '../types';

export class QRClient {
  private client: AxiosInstance;
  private apiKey?: string;

  constructor(config: QRConfig) {
    this.apiKey = config.apiKey;

    const baseURL = config.baseUrl || config.environment
      ? this.getBaseUrl(config.environment!)
      : 'https://api.rez.money';

    this.client = axios.create({
      baseURL,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey && { 'X-API-Key': this.apiKey }),
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        if (config.debug) {
          logger.info([QRSDK] ${config.method?.toUpperCase()} ${config.url}`);
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        const message = error.response?.data?.message || error.message;
        logger.error([QRSDK] Error: ${message}`);
        return Promise.reject(new QRSDKError(message, error.response?.status, error.response?.data));
      }
    );
  }

  private getBaseUrl(env: 'development' | 'staging' | 'production'): string {
    const urls: Record<string, string> = {
      development: 'http://localhost:3001',
      staging: 'https://staging-api.rez.money',
      production: 'https://api.rez.money',
    };
    return urls[env] || urls.production;
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<APIResponse<T>> = await this.client.get(url, config);
    if (!response.data.success) {
      throw new QRSDKError(response.data.error?.message || 'Request failed');
    }
    return response.data.data as T;
  }

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<APIResponse<T>> = await this.client.post(url, data, config);
    if (!response.data.success) {
      throw new QRSDKError(response.data.error?.message || 'Request failed');
    }
    return response.data.data as T;
  }

  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<APIResponse<T>> = await this.client.put(url, data, config);
    if (!response.data.success) {
      throw new QRSDKError(response.data.error?.message || 'Request failed');
    }
    return response.data.data as T;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<APIResponse<T>> = await this.client.delete(url, config);
    if (!response.data.success) {
      throw new QRSDKError(response.data.error?.message || 'Request failed');
    }
    return response.data.data as T;
  }

  async patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<APIResponse<T>> = await this.client.patch(url, data, config);
    if (!response.data.success) {
      throw new QRSDKError(response.data.error?.message || 'Request failed');
    }
    return response.data.data as T;
  }
}

export class QRSDKError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: unknown
  ) {
    super(message);
    this.name = 'QRSDKError';
  }
}
