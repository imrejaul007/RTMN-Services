/**
 * Jira REST API Client
 * Base axios instance with authentication, rate limiting, and pagination
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { getClient, getJiraUrl } from '../auth/auth.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('jira-client');

// ============================================================================
// Constants
// ============================================================================

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const RATE_LIMIT_DELAY_MS = 60000; // Default delay when rate limited
const REQUEST_TIMEOUT_MS = 30000;

// ============================================================================
// Request Helpers
// ============================================================================

export interface PaginationParams {
  startAt?: number;
  maxResults?: number;
}

export interface ExpandParams {
  expand?: string | string[];
}

export interface FieldParams {
  fields?: string | string[];
  fieldsByKeys?: boolean;
}

export interface SearchParams extends PaginationParams, FieldParams {
  jql?: string;
  validateQuery?: 'strict' | 'warn' | 'none' | 'good faith';
  properties?: string | string[];
}

/**
 * Build expand parameter string
 */
export function buildExpandParam(expand?: string | string[]): string | undefined {
  if (!expand) return undefined;
  if (Array.isArray(expand)) return expand.join(',');
  return expand;
}

/**
 * Build fields parameter string
 */
export function buildFieldsParam(fields?: string | string[]): string | undefined {
  if (!fields) return undefined;
  if (Array.isArray(fields)) return fields.join(',');
  return fields;
}

// ============================================================================
// Rate Limit Handling
// ============================================================================

let rateLimitRemaining: number | null = null;
let rateLimitReset: number | null = null;

/**
 * Update rate limit info from response headers
 */
export function updateRateLimitInfo(headers: Record<string, string>): void {
  const remaining = headers['x-rate-limit-remaining'];
  const reset = headers['x-rate-limit-reset'];

  if (remaining !== undefined) {
    rateLimitRemaining = parseInt(remaining, 10);
  }
  if (reset !== undefined) {
    rateLimitReset = parseInt(reset, 10) * 1000; // Convert to ms
  }
}

/**
 * Check if we should wait before making a request
 */
export async function checkRateLimit(): Promise<void> {
  if (rateLimitReset && rateLimitRemaining !== null && rateLimitRemaining < 5) {
    const waitTime = rateLimitReset - Date.now();
    if (waitTime > 0) {
      logger.warn(`Rate limit low (${rateLimitRemaining} remaining). Waiting ${waitTime}ms`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }
}

/**
 * Wait for rate limit to reset
 */
export async function waitForRateLimitReset(headers: Record<string, string>): Promise<void> {
  const retryAfter = headers['retry-after'];
  if (retryAfter) {
    const waitMs = parseInt(retryAfter, 10) * 1000;
    logger.warn(`Rate limited. Waiting ${waitMs}ms (Retry-After header)`);
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    return;
  }

  const reset = headers['x-rate-limit-reset'];
  if (reset) {
    const resetMs = parseInt(reset, 10) * 1000;
    const waitTime = resetMs - Date.now();
    if (waitTime > 0) {
      logger.warn(`Rate limited. Waiting until ${new Date(resetMs)}`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }
}

// ============================================================================
// Retry Logic
// ============================================================================

/**
 * Execute a request with retry logic for transient errors
 */
export async function withRetry<T>(
  requestFn: () => Promise<T>,
  retries: number = MAX_RETRIES
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await requestFn();
    } catch (error: any) {
      lastError = error;

      // Don't retry client errors (4xx) except 429 (rate limit)
      if (error.response?.status >= 400 && error.response?.status < 500 && error.response?.status !== 429) {
        throw error;
      }

      // Don't retry if we've exhausted retries
      if (attempt >= retries) {
        break;
      }

      // Wait before retrying
      const delay = RETRY_DELAY_MS * Math.pow(2, attempt); // Exponential backoff
      logger.warn(`Request failed (attempt ${attempt + 1}/${retries + 1}). Retrying in ${delay}ms`, {
        error: error.message,
        status: error.response?.status,
      });

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// ============================================================================
// Pagination Helpers
// ============================================================================

export interface PaginatedResult<T> {
  values: T[];
  startAt: number;
  maxResults: number;
  total: number;
  isLast: boolean;
}

/**
 * Fetch all pages for a paginated endpoint
 */
export async function fetchAllPages<T>(
  fetchPage: (startAt: number, maxResults: number) => Promise<PaginatedResult<T>>,
  maxResultsPerPage: number = 100
): Promise<T[]> {
  const allValues: T[] = [];
  let startAt = 0;
  let isLast = false;

  while (!isLast) {
    const page = await fetchPage(startAt, maxResultsPerPage);
    allValues.push(...page.values);
    startAt += page.maxResults;
    isLast = page.isLast;

    if (allValues.length >= page.total) {
      break;
    }
  }

  return allValues;
}

/**
 * Get total count from pagination response
 */
export function getTotalCount(response: PaginatedResult<unknown>): number {
  return response.total;
}

// ============================================================================
// API Methods
// ============================================================================

/**
 * Make a GET request to the Jira API
 */
export async function jiraGet<T>(
  endpoint: string,
  params?: Record<string, unknown>
): Promise<T> {
  const client = getClient();

  logger.debug(`GET ${endpoint}`, { params });

  const response = await withRetry(() =>
    client.get<T>(endpoint, { params })
  );

  updateRateLimitInfo(response.headers as Record<string, string>);
  return response.data;
}

/**
 * Make a POST request to the Jira API
 */
export async function jiraPost<T, D = unknown>(
  endpoint: string,
  data?: D,
  params?: Record<string, unknown>
): Promise<T> {
  const client = getClient();

  logger.debug(`POST ${endpoint}`, { data, params });

  const response = await withRetry(() =>
    client.post<T>(endpoint, data, { params })
  );

  updateRateLimitInfo(response.headers as Record<string, string>);
  return response.data;
}

/**
 * Make a PUT request to the Jira API
 */
export async function jiraPut<T, D = unknown>(
  endpoint: string,
  data?: D,
  params?: Record<string, unknown>
): Promise<T> {
  const client = getClient();

  logger.debug(`PUT ${endpoint}`, { data, params });

  const response = await withRetry(() =>
    client.put<T>(endpoint, data, { params })
  );

  updateRateLimitInfo(response.headers as Record<string, string>);
  return response.data;
}

/**
 * Make a DELETE request to the Jira API
 */
export async function jiraDelete<T>(
  endpoint: string,
  params?: Record<string, unknown>
): Promise<T> {
  const client = getClient();

  logger.debug(`DELETE ${endpoint}`, { params });

  const response = await withRetry(() =>
    client.delete<T>(endpoint, { params })
  );

  updateRateLimitInfo(response.headers as Record<string, string>);
  return response.data;
}

/**
 * Upload a file to Jira
 */
export async function jiraUpload<T>(
  endpoint: string,
  file: Buffer,
  filename: string,
  mimeType: string = 'application/octet-stream'
): Promise<T> {
  const client = getClient();

  logger.debug(`UPLOAD ${endpoint}`, { filename, size: file.length });

  const FormData = (await import('form-data')).default;
  const form = new FormData();
  form.append('file', file, {
    filename,
    contentType: mimeType,
  });

  const response = await withRetry(() =>
    client.post<T>(endpoint, form, {
      headers: {
        ...form.getHeaders(),
        'X-Atlassian-Token': 'no-check',
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    })
  );

  updateRateLimitInfo(response.headers as Record<string, string>);
  return response.data;
}

// ============================================================================
// JQL Helpers
// ============================================================================

export interface JQLQuery {
  query: string;
  params: Record<string, unknown>;
}

/**
 * Build a JQL query string with named parameters
 */
export function buildJQL(
  conditions: string[],
  orderBy?: { field: string; direction?: 'ASC' | 'DESC' }[]
): string {
  const query = conditions.filter(Boolean).join(' AND ');

  if (orderBy && orderBy.length > 0) {
    const orderClauses = orderBy.map(
      ({ field, direction }) => `${field} ${direction || 'ASC'}`
    );
    return `${query} ORDER BY ${orderClauses.join(', ')}`;
  }

  return query;
}

/**
 * Escape JQL special characters in a value
 */
export function escapeJQL(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

/**
 * Format a date for JQL
 */
export function formatJQLDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Format a datetime for JQL
 */
export function formatJQLDateTime(date: Date): string {
  return date.toISOString();
}

// ============================================================================
// Error Handling
// ============================================================================

export interface JiraAPIError {
  errorMessages: string[];
  errors?: Record<string, string>;
  status?: number;
}

/**
 * Extract error message from Jira API error
 */
export function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<JiraAPIError>;
    if (axiosError.response?.data?.errorMessages?.length) {
      return axiosError.response.data.errorMessages[0];
    }
    if (axiosError.response?.data?.errors) {
      const errors = axiosError.response.data.errors;
      return Object.entries(errors)
        .map(([field, msg]) => `${field}: ${msg}`)
        .join(', ');
    }
    return axiosError.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unknown error';
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate that required config is set
 */
export function validateConfig(): void {
  const url = getJiraUrl();
  if (!url) {
    throw new Error('Jira URL not configured. Call setJiraUrl() or set JIRA_URL environment variable.');
  }
}