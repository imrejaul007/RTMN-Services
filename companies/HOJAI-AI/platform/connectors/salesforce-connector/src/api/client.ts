/**
 * Salesforce API Client
 * Production-ready HTTP client with automatic token refresh and rate limit handling
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as winston from 'winston';
import { getStoredToken, refreshAccessToken } from '../auth/oauth.js';
import type { SalesforceAPIError, SalesforceError } from '../types/index.js';

// Logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

// API version
const API_VERSION = 'v59.0';

// Rate limit tracking
const rateLimitState = new Map<string, { retryAfter: number; retryCount: number }>();

/**
 * Custom error class for Salesforce API errors
 */
export class SalesforceAPIException extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errorCode?: string,
    public fields?: string[]
  ) {
    super(message);
    this.name = 'SalesforceAPIException';
  }
}

/**
 * Create an authenticated API client for a specific instance
 */
export function createApiClient(instanceUrl?: string): AxiosInstance {
  const token = getStoredToken(instanceUrl);

  const client = axios.create({
    baseURL: token ? `${token.instance_url}/services/data/${API_VERSION}` : '',
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  // Request interceptor - add auth token
  client.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      const storedToken = getStoredToken(instanceUrl);

      if (!storedToken) {
        throw new Error('Not authenticated');
      }

      // Update base URL in case instance changed
      config.baseURL = `${storedToken.instance_url}/services/data/${API_VERSION}`;
      config.headers.Authorization = `Bearer ${storedToken.access_token}`;

      logger.debug('SF API Request', {
        method: config.method?.toUpperCase(),
        url: config.url,
        baseURL: config.baseURL,
      });

      return config;
    },
    (error) => {
      logger.error('SF API Request Error', { error: error.message });
      return Promise.reject(error);
    }
  );

  // Response interceptor - handle errors and token refresh
  client.interceptors.response.use(
    (response) => {
      logger.debug('SF API Response', {
        status: response.status,
        url: response.config.url,
      });
      return response;
    },
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

      // Handle 401 - attempt token refresh
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const currentToken = getStoredToken(instanceUrl);
          if (currentToken) {
            const newToken = await refreshAccessToken(currentToken.instance_url);

            // Update the Authorization header
            originalRequest.headers.Authorization = `Bearer ${newToken.access_token}`;

            logger.info('Token refreshed, retrying request');
            return client(originalRequest);
          }
        } catch (refreshError) {
          logger.error('Token refresh failed', { error: (refreshError as Error).message });
          throw new SalesforceAPIException('Authentication failed', 401, 'INVALID_SESSION');
        }
      }

      // Handle 429 - rate limited
      if (error.response?.status === 429) {
        const retryAfter = parseInt(error.response.headers['retry-after'] || '60', 10);
        const retryCount = (rateLimitState.get(instanceUrl || '')?.retryCount || 0) + 1;

        rateLimitState.set(instanceUrl || '', {
          retryAfter,
          retryCount,
        });

        if (retryCount < 5) {
          logger.warn(`Rate limited, retrying in ${retryAfter}s (attempt ${retryCount}/5)`);
          await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
          originalRequest._retry = true;
          return client(originalRequest);
        }

        throw new SalesforceAPIException(
          'Rate limit exceeded',
          429,
          'REQUEST_LIMIT_EXCEEDED'
        );
      }

      // Handle other errors
      const errorData = error.response?.data as SalesforceError | SalesforceAPIError | undefined;

      if (errorData && 'errorCode' in errorData) {
        throw new SalesforceAPIException(
          errorData.message,
          error.response?.status || 500,
          errorData.errorCode,
          errorData.fields
        );
      }

      if (errorData && 'error' in errorData) {
        throw new SalesforceAPIException(
          (errorData as SalesforceAPIError).error_description,
          error.response?.status || 500,
          (errorData as SalesforceAPIError).error
        );
      }

      throw new SalesforceAPIException(
        error.message || 'Unknown error',
        error.response?.status || 500
      );
    }
  );

  return client;
}

/**
 * Execute a SOQL query
 */
export async function executeQuery<T>(
  soql: string,
  instanceUrl?: string
): Promise<{ totalSize: number; done: boolean; records: T[]; nextRecordsUrl?: string }> {
  const client = createApiClient(instanceUrl);

  const response = await client.get('/query', {
    params: { q: soql },
  });

  return response.data;
}

/**
 * Execute a SOQL query with automatic pagination
 */
export async function* executeQueryAll<T>(
  soql: string,
  instanceUrl?: string
): AsyncGenerator<T[]> {
  const client = createApiClient(instanceUrl);
  let queryUrl = '/query';

  while (queryUrl) {
    const response = await client.get(queryUrl, {
      params: queryUrl === '/query' ? { q: soql } : undefined,
    });

    const data = response.data;

    yield data.records as T[];

    if (!data.done && data.nextRecordsUrl) {
      queryUrl = data.nextRecordsUrl.replace(
        /.*\/services\/data\/v[\d.]+/,
        ''
      );
    } else {
      break;
    }
  }
}

/**
 * Get metadata for an object
 */
export async function getObjectMetadata(
  objectType: string,
  instanceUrl?: string
): Promise<Record<string, unknown>> {
  const client = createApiClient(instanceUrl);
  const response = await client.get(`/sobjects/${objectType}`);
  return response.data;
}

/**
 * Get describe for an object (all fields)
 */
export async function describeObject(
  objectType: string,
  instanceUrl?: string
): Promise<Record<string, unknown>> {
  const client = createApiClient(instanceUrl);
  const response = await client.get(`/sobjects/${objectType}/describe`);
  return response.data;
}

export const api = {
  createApiClient,
  executeQuery,
  executeQueryAll,
  getObjectMetadata,
  describeObject,
  SalesforceAPIException,
};

export default api;