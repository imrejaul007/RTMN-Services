/**
 * Slack Web API Client
 * Wrapper around @slack/web-api with retry logic and error handling
 */

import { WebClient, WebClientEvent } from '@slack/web-api';
import { Agent } from 'http';
import type {
  Logger,
  SlackAPIError,
  SlackAPIException,
  SlackRateLimitException,
} from '../types/index.js';

// Rate limit configuration
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_INITIAL_DELAY_MS = 1000;
const DEFAULT_MAX_DELAY_MS = 30000;
const RATE_LIMIT_HEADERS = {
  RETRY_AFTER: 'retry-after',
  X_BOUNCE_AFTER: 'x-bounce-after',
};

export interface SlackClientConfig {
  token?: string;
  logger?: Logger;
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  timeout?: number;
  userAgent?: string;
  slackApiUrl?: string;
}

export interface RequestLogEntry {
  method: string;
  endpoint: string;
  headers?: Record<string, string>;
  body?: unknown;
  response?: unknown;
  duration?: number;
  retryCount?: number;
}

/**
 * Slack API client with automatic retry on rate limits
 */
export class SlackClient {
  private client: WebClient;
  private token: string;
  private logger: Logger;
  private maxRetries: number;
  private initialDelayMs: number;
  private maxDelayMs: number;
  private requestLog: RequestLogEntry[] = [];

  constructor(config: SlackClientConfig) {
    this.token = config.token || '';
    this.logger = config.logger || console;
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.initialDelayMs = config.initialDelayMs ?? DEFAULT_INITIAL_DELAY_MS;
    this.maxDelayMs = config.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;

    const clientOptions: ConstructorParameters<typeof WebClient>[1] = {
      timeout: config.timeout || 30000,
      userAgent: config.userAgent,
      slackApiUrl: config.slackApiUrl || 'https://slack.com/api',
      agent: new Agent({ keepAlive: true, maxSockets: 100 }),
    };

    this.client = new WebClient(this.token, clientOptions);

    // Log rate limit events
    this.client.on(WebClientEvent.RATE_LIMITED, (retryCount: number) => {
      this.logger.warn('Rate limited by Slack API', { retryCount });
    });
  }

  /**
   * Set or update the token
   */
  setToken(token: string): void {
    this.token = token;
    this.client = new WebClient(token, {
      timeout: 30000,
      agent: new Agent({ keepAlive: true, maxSockets: 100 }),
    });
  }

  /**
   * Get the raw WebClient for advanced operations
   */
  getWebClient(): WebClient {
    return this.client;
  }

  /**
   * Execute an API call with automatic retry on rate limits
   */
  async call<T>(
    method: string,
    params?: Record<string, unknown>
  ): Promise<T> {
    const startTime = Date.now();
    const endpoint = method.replace(/\./g, '/');

    this.logger.debug('Calling Slack API', { method: endpoint, params });

    let lastError: Error | null = null;
    let retryCount = 0;

    while (retryCount <= this.maxRetries) {
      try {
        // Dynamically call the method on the WebClient
        const methodFn = this.getMethodFunction(method);
        const result = await methodFn(params || {}) as T;

        const duration = Date.now() - startTime;
        this.logRequest({
          method: endpoint,
          headers: { Authorization: `Bearer ${this.token.slice(0, 10)}...` },
          response: { ok: (result as any).ok, ts: (result as any).ts },
          duration,
          retryCount,
        });

        // Check if the response indicates an error
        const resultAny = result as any;
        if (resultAny.ok === false) {
          throw this.transformError(resultAny as SlackAPIError);
        }

        return result;
      } catch (error) {
        lastError = error as Error;

        // Check if it's a rate limit error
        if (this.isRateLimitError(error)) {
          const retryAfter = this.getRetryAfter(error);
          retryCount++;

          if (retryCount <= this.maxRetries) {
            const delay = this.calculateDelay(retryCount, retryAfter);
            this.logger.warn('Rate limited, retrying...', {
              retryCount,
              delayMs: delay,
              retryAfter,
            });

            await this.sleep(delay);
            continue;
          }
        }

        // Non-retryable error or max retries exceeded
        this.logger.error('Slack API call failed', {
          method: endpoint,
          error: lastError.message,
          retryCount,
        });

        throw lastError;
      }
    }

    throw lastError;
  }

  /**
   * Get a method function from the WebClient
   */
  private getMethodFunction(method: string): Function {
    const parts = method.split('.');
    let fn: any = this.client;

    for (const part of parts) {
      if (fn[part] === undefined) {
        throw new Error(`Unknown Slack API method: ${method}`);
      }
      fn = fn[part];
    }

    if (typeof fn !== 'function') {
      throw new Error(`Slack API method is not callable: ${method}`);
    }

    return fn;
  }

  /**
   * Check if an error is a rate limit error
   */
  private isRateLimitError(error: unknown): boolean {
    if (error instanceof SlackRateLimitException) return true;
    if (error instanceof SlackAPIException) {
      return error.code === 'rate_limited' || error.code === 'ratelimited';
    }
    if (error instanceof Error) {
      return (
        error.message.includes('rate_limited') ||
        error.message.includes('ratelimited') ||
        error.message.includes('retry after') ||
        error.message.includes('Too Many Requests')
      );
    }
    return false;
  }

  /**
   * Get retry-after value from error
   */
  private getRetryAfter(error: unknown): number {
    if (error instanceof SlackRateLimitException) {
      return error.retryAfter || 1;
    }
    if (error instanceof SlackAPIException) {
      return error.retryAfter || 1;
    }
    if (error instanceof Error && error.message.includes('retry after ')) {
      const match = error.message.match(/retry after (\d+)/);
      if (match) return parseInt(match[1], 10);
    }
    return 1;
  }

  /**
   * Calculate delay with exponential backoff
   */
  private calculateDelay(retryCount: number, retryAfter?: number): number {
    // Use retry-after header if available
    if (retryAfter) {
      return Math.min(retryAfter * 1000, this.maxDelayMs);
    }

    // Exponential backoff with jitter
    const baseDelay = this.initialDelayMs * Math.pow(2, retryCount - 1);
    const jitter = Math.random() * 0.3 * baseDelay;
    return Math.min(baseDelay + jitter, this.maxDelayMs);
  }

  /**
   * Sleep for a given duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Transform API error response to typed exception
   */
  private transformError(error: SlackAPIError): SlackAPIException {
    const errorCode = error.error || 'unknown_error';
    const retryAfter = error.response_metadata?.retryAfter;

    if (errorCode === 'rate_limited' || errorCode === 'ratelimited') {
      return new SlackRateLimitException(retryAfter || 1);
    }

    return new SlackAPIException(
      errorCode,
      this.getErrorMessage(errorCode),
      retryAfter
    );
  }

  /**
   * Get human-readable error message
   */
  private getErrorMessage(errorCode: string): string {
    const messages: Record<string, string> = {
      channel_not_found: 'Channel not found',
      user_not_found: 'User not found',
      message_not_found: 'Message not found',
      file_not_found: 'File not found',
      not_authed: 'Not authenticated',
      invalid_auth: 'Invalid authentication',
      token_revoked: 'Token has been revoked',
      token_expired: 'Token has expired',
      insufficient_scope: 'Insufficient scope',
      not_allowed_token_type: 'Token type not allowed',
      method_not_supported: 'Method not supported',
      not_archive: 'Channel is not archived',
      already_archived: 'Channel is already archived',
      channel_not_archived: 'Channel is not archived',
      general_error: 'An error occurred',
      unknown_error: 'An unknown error occurred',
    };

    return messages[errorCode] || errorCode;
  }

  /**
   * Log a request
   */
  private logRequest(entry: RequestLogEntry): void {
    this.requestLog.push(entry);
    if (this.requestLog.length > 1000) {
      this.requestLog.shift();
    }

    this.logger.debug('Slack API request completed', {
      method: entry.method,
      duration: entry.duration,
      retryCount: entry.retryCount,
    });
  }

  /**
   * Get recent request log
   */
  getRequestLog(): RequestLogEntry[] {
    return [...this.requestLog];
  }

  /**
   * Clear request log
   */
  clearRequestLog(): void {
    this.requestLog = [];
  }
}

/**
 * Create a new SlackClient from environment config
 */
export function createSlackClient(token?: string, logger?: Logger): SlackClient {
  const botToken = token || process.env.SLACK_BOT_TOKEN;

  if (!botToken) {
    throw new Error('SLACK_BOT_TOKEN environment variable is required');
  }

  return new SlackClient({
    token: botToken,
    logger,
    maxRetries: parseInt(process.env.SLACK_MAX_RETRIES || '3', 10),
    initialDelayMs: parseInt(process.env.SLACK_INITIAL_DELAY_MS || '1000', 10),
    maxDelayMs: parseInt(process.env.SLACK_MAX_DELAY_MS || '30000', 10),
  });
}

export default SlackClient;