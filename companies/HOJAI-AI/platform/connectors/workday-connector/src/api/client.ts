/**
 * Workday REST API Client
 *
 * Provides a base axios instance configured for Workday API with:
 * - OAuth Bearer token authentication
 * - Automatic token refresh
 * - Rate limit handling
 * - XML response parsing
 * - Error transformation
 * - Request/response logging
 */

import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import { parseStringPromise } from 'xml2js';
import {
  WorkdayConfig,
  WorkdayCredentials,
  WorkdayError,
  WorkdayApiResponse,
  WorkdayRequestConfig
} from '../types/index.js';
import { TokenManager } from '../auth/oauth.js';
import { logger, createChildLogger } from '../utils/logger.js';

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_BASE_URL = 'https://wd2-impl-services1.workday.com/ccx/api/v1';
const DEFAULT_TIMEOUT = 30000;
const MAX_RETRIES = 3;
const RATE_LIMIT_DELAY = 1000; // 1 second between requests

// ============================================================================
// Rate Limiter
// ============================================================================

class RateLimiter {
  private lastRequestTime: number = 0;
  private minInterval: number = RATE_LIMIT_DELAY;
  private requestsThisMinute: number = 0;
  private minuteStartTime: number = Date.now();

  async throttle(): Promise<void> {
    const now = Date.now();

    // Reset counter if minute has passed
    if (now - this.minuteStartTime >= 60000) {
      this.requestsThisMinute = 0;
      this.minuteStartTime = now;
    }

    // Respect rate limits
    if (this.requestsThisMinute >= 60) {
      const waitTime = 60000 - (now - this.minuteStartTime);
      logger.debug(`Rate limit approaching, waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.requestsThisMinute = 0;
      this.minuteStartTime = Date.now();
    }

    // Enforce minimum interval between requests
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.minInterval) {
      await new Promise(resolve => setTimeout(resolve, this.minInterval - timeSinceLastRequest));
    }

    this.lastRequestTime = Date.now();
    this.requestsThisMinute++;
  }

  setMinInterval(ms: number): void {
    this.minInterval = ms;
  }
}

// ============================================================================
// Workday API Client
// ============================================================================

export class WorkdayClient {
  private client: AxiosInstance;
  private config: WorkdayConfig;
  private tokenManager: TokenManager;
  private rateLimiter: RateLimiter;
  private requestLog: createChildLogger;

  constructor(config: WorkdayConfig) {
    this.config = config;
    this.tokenManager = new TokenManager(config);
    this.rateLimiter = new RateLimiter();
    this.requestLog = createChildLogger({ component: 'WorkdayClient' });

    // Create base axios instance
    this.client = axios.create({
      baseURL: config.apiBaseUrl
        ? `${config.apiBaseUrl}/ccx/api/v1`
        : `${DEFAULT_BASE_URL}/${config.tenantId}`,
      timeout: DEFAULT_TIMEOUT,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'HOJAI-Workday-Connector/1.0.0'
      }
    });

    // Add request interceptor for authentication
    this.client.interceptors.request.use(
      async (config) => {
        // Throttle requests
        await this.rateLimiter.throttle();

        // Get fresh access token
        const accessToken = await this.tokenManager.getAccessToken();
        config.headers.Authorization = `Bearer ${accessToken}`;

        // Add tenant ID to URL if not present
        if (!config.url?.includes(config.baseURL!)) {
          config.url = `/${config.tenantId}${config.url}`;
        }

        this.requestLog.debug('API Request', {
          method: config.method?.toUpperCase(),
          url: config.url,
          params: config.params
        });

        return config;
      },
      (error) => {
        logger.error('Request interceptor error', { error: error.message });
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling and logging
    this.client.interceptors.response.use(
      (response) => {
        this.requestLog.debug('API Response', {
          status: response.status,
          url: response.config.url,
          duration: response.headers['x-response-time']
        });
        return response;
      },
      async (error: AxiosError) => {
        return this.handleError(error);
      }
    );
  }

  /**
   * Handle API errors with retry logic
   */
  private async handleError(error: AxiosError): Promise<never> {
    const config = error.config as AxiosRequestConfig & { _retryCount?: number };
    const retryCount = config._retryCount || 0;

    // Check if we should retry
    if (this.shouldRetry(error) && retryCount < MAX_RETRIES) {
      config._retryCount = retryCount + 1;

      // Exponential backoff
      const delay = Math.pow(2, retryCount) * 1000;
      logger.warn(`Retrying request (attempt ${retryCount + 1}/${MAX_RETRIES})`, {
        delay,
        url: config.url
      });

      await new Promise(resolve => setTimeout(resolve, delay));
      return this.client.request(config);
    }

    // Transform Workday error
    const workdayError = this.transformError(error);
    logger.error('API Error', {
      code: workdayError.errorCode,
      message: workdayError.errorMessage,
      statusCode: workdayError.statusCode,
      url: config?.url
    });

    throw workdayError;
  }

  /**
   * Determine if a request should be retried
   */
  private shouldRetry(error: AxiosError): boolean {
    if (!error.config) return false;

    // Retry on network errors
    if (error.code === 'ECONNABORTED' || error.code === 'ENOTFOUND') {
      return true;
    }

    // Retry on 5xx errors
    if (error.response?.status && error.response.status >= 500) {
      return true;
    }

    // Retry on rate limit (429)
    if (error.response?.status === 429) {
      return true;
    }

    // Retry on token expiration
    if (error.response?.status === 401) {
      return true;
    }

    return false;
  }

  /**
   * Transform Axios error to WorkdayError
   */
  private transformError(error: AxiosError): WorkdayError {
    const statusCode = error.response?.status || 500;
    let errorCode = 'UNKNOWN_ERROR';
    let errorMessage = error.message;
    let details: string | undefined;
    let validationErrors: WorkdayError['validationErrors'] = undefined;

    if (error.response?.data) {
      const data = error.response.data as Record<string, unknown>;

      // Try to extract Workday error format
      if (data.error) {
        errorCode = String(data.error);
        errorMessage = String(data.error_description || data.errorMessage || errorMessage);
      } else if (data.Error) {
        // Workday XML error format
        errorCode = String(data.Error?.Code || 'API_ERROR');
        errorMessage = String(data.Error?.Message || errorMessage);
      } else if (data.ValidationErrors) {
        errorCode = 'VALIDATION_ERROR';
        validationErrors = this.parseValidationErrors(data.ValidationErrors);
        errorMessage = 'Validation failed';
      } else if (typeof data === 'string') {
        details = this.tryParseXmlError(data);
      }
    }

    return {
      errorCode,
      errorMessage,
      details,
      validationErrors,
      statusCode
    };
  }

  /**
   * Parse validation errors from Workday response
   */
  private parseValidationErrors(data: unknown): WorkdayError['validationErrors'] {
    if (!data || typeof data !== 'object') return undefined;

    const errors: WorkdayError['validationErrors'] = [];

    if (Array.isArray(data)) {
      for (const item of data) {
        if (typeof item === 'object' && item !== null) {
          const obj = item as Record<string, unknown>;
          errors.push({
            field: String(obj.Field || obj.field || 'unknown'),
            message: String(obj.Message || obj.message || 'Validation error'),
            code: String(obj.Code || obj.code || 'INVALID')
          });
        }
      }
    }

    return errors.length > 0 ? errors : undefined;
  }

  /**
   * Try to parse XML error response
   */
  private tryParseXmlError(xml: string): string | undefined {
    try {
      // Check if it looks like XML
      if (xml.trim().startsWith('<')) {
        const result = parseStringPromise(xml, { explicitArray: false });
        result.then((parsed) => {
          if (parsed?.Fault?.Reason?.Text) {
            return String(parsed.Fault.Reason.Text);
          }
        });
      }
    } catch {
      // Not XML, return as plain text
      return xml.substring(0, 500);
    }
    return undefined;
  }

  // ============================================================================
  // Public Methods
  // ============================================================================

  /**
   * Initialize the client by performing initial authentication
   */
  async initialize(): Promise<void> {
    try {
      await this.tokenManager.authenticate();
      logger.info('Workday client initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Workday client', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Make a GET request
   */
  async get<T>(
    url: string,
    config?: WorkdayRequestConfig
  ): Promise<WorkdayApiResponse<T>> {
    const response = await this.client.get<T>(url, {
      params: config?.params,
      headers: config?.headers,
      timeout: config?.timeout
    });

    return {
      data: response.data,
      meta: {
        total: this.parseTotalFromHeaders(response.headers),
        requestId: response.headers['x-correlation-id'] as string
      }
    };
  }

  /**
   * Make a POST request
   */
  async post<T>(
    url: string,
    data?: unknown,
    config?: WorkdayRequestConfig
  ): Promise<WorkdayApiResponse<T>> {
    const response = await this.client.post<T>(url, data, {
      params: config?.params,
      headers: config?.headers,
      timeout: config?.timeout
    });

    return {
      data: response.data,
      meta: {
        requestId: response.headers['x-correlation-id'] as string
      }
    };
  }

  /**
   * Make a PUT request
   */
  async put<T>(
    url: string,
    data?: unknown,
    config?: WorkdayRequestConfig
  ): Promise<WorkdayApiResponse<T>> {
    const response = await this.client.put<T>(url, data, {
      params: config?.params,
      headers: config?.headers,
      timeout: config?.timeout
    });

    return {
      data: response.data,
      meta: {
        requestId: response.headers['x-correlation-id'] as string
      }
    };
  }

  /**
   * Make a PATCH request
   */
  async patch<T>(
    url: string,
    data?: unknown,
    config?: WorkdayRequestConfig
  ): Promise<WorkdayApiResponse<T>> {
    const response = await this.client.patch<T>(url, data, {
      params: config?.params,
      headers: config?.headers,
      timeout: config?.timeout
    });

    return {
      data: response.data,
      meta: {
        requestId: response.headers['x-correlation-id'] as string
      }
    };
  }

  /**
   * Make a DELETE request
   */
  async delete<T>(
    url: string,
    config?: WorkdayRequestConfig
  ): Promise<WorkdayApiResponse<T>> {
    const response = await this.client.delete<T>(url, {
      params: config?.params,
      headers: config?.headers,
      timeout: config?.timeout
    });

    return {
      data: response.data,
      meta: {
        requestId: response.headers['x-correlation-id'] as string
      }
    };
  }

  /**
   * Parse XML response to JSON
   */
  async parseXmlResponse<T>(xml: string): Promise<T> {
    try {
      const result = await parseStringPromise(xml, {
        explicitArray: false,
        mergeAttrs: true,
        ignoreAttrs: false,
        tagNameProcessors: [(name) => name.replace(/^wd:/, '')],
        attrNameProcessors: [(name) => name.replace(/^wd:/, '')]
      });
      return result as T;
    } catch (error) {
      logger.error('Failed to parse XML response', { error: (error as Error).message });
      throw new Error('Failed to parse XML response');
    }
  }

  /**
   * Parse total count from response headers
   */
  private parseTotalFromHeaders(headers: Record<string, string>): number | undefined {
    // Workday may return total count in various header formats
    const totalHeader = headers['x-total-count'] || headers['x-total'] || headers['wd-total'];
    if (totalHeader) {
      return parseInt(totalHeader, 10);
    }
    return undefined;
  }

  /**
   * Get the tenant ID
   */
  getTenantId(): string {
    return this.config.tenantId;
  }

  /**
   * Set rate limit interval
   */
  setRateLimit(ms: number): void {
    this.rateLimiter.setMinInterval(ms);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

let clientInstance: WorkdayClient | null = null;

/**
 * Get or create a singleton WorkdayClient instance
 */
export function getWorkdayClient(config?: WorkdayConfig): WorkdayClient {
  if (!clientInstance && config) {
    clientInstance = new WorkdayClient(config);
  }
  if (!clientInstance) {
    throw new Error('WorkdayClient not initialized. Provide config on first call.');
  }
  return clientInstance;
}

/**
 * Reset the client instance (for testing)
 */
export function resetWorkdayClient(): void {
  clientInstance = null;
}

export default WorkdayClient;