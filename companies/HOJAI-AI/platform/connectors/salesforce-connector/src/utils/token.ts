/**
 * Token Storage Utilities
 * In-memory token storage with refresh support
 */

import axios, { AxiosError } from 'axios';
import * as winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

export interface SalesforceToken {
  access_token: string;
  refresh_token?: string;
  instance_url: string;
  id: string;
  token_type: string;
  issued_at: string;
  signature: string;
  expires_at?: number;
}

export interface TokenStorageEntry {
  instanceUrl: string;
  token: SalesforceToken;
  expiresAt?: number;
}

// Rate limit tracking for token refresh
interface RateLimitEntry {
  retries: number;
  lastRetry: number;
}

const rateLimitStorage = new Map<string, RateLimitEntry>();

// Salesforce endpoints
const SF_PRODUCTION_LOGIN_URL = 'https://login.salesforce.com';
const SF_SANDBOX_LOGIN_URL = 'https://test.salesforce.com';

/**
 * Get OAuth configuration from environment
 */
export function getOAuthConfig() {
  const environment = (process.env.SF_ENVIRONMENT as 'production' | 'sandbox' | 'test') || 'production';
  const loginUrl = environment === 'production' ? SF_PRODUCTION_LOGIN_URL : SF_SANDBOX_LOGIN_URL;

  return {
    clientId: process.env.SF_CLIENT_ID || '',
    clientSecret: process.env.SF_CLIENT_SECRET || '',
    redirectUri: process.env.SF_REDIRECT_URI || `http://localhost:${process.env.PORT || 4786}/auth/callback`,
    loginUrl,
    environment,
  };
}

class TokenManager {
  private tokens: Map<string, TokenStorageEntry> = new Map();

  /**
   * Store a token
   */
  set(instanceUrl: string, token: SalesforceToken): void {
    const entry: TokenStorageEntry = {
      instanceUrl,
      token,
      expiresAt: token.expires_at,
    };

    this.tokens.set(instanceUrl, entry);
    logger.debug('Token stored', { instanceUrl });
  }

  /**
   * Get a token by instance URL
   */
  get(instanceUrl: string): SalesforceToken | undefined {
    const entry = this.tokens.get(instanceUrl);
    return entry?.token;
  }

  /**
   * Get a storage entry by instance URL
   */
  getEntry(instanceUrl: string): TokenStorageEntry | undefined {
    return this.tokens.get(instanceUrl);
  }

  /**
   * Check if a token exists for an instance
   */
  has(instanceUrl: string): boolean {
    return this.tokens.has(instanceUrl);
  }

  /**
   * Get first available token
   */
  getFirst(): SalesforceToken | undefined {
    const entries = Array.from(this.tokens.values());
    return entries[0]?.token;
  }

  /**
   * Get first available instance URL
   */
  getFirstInstanceUrl(): string | undefined {
    return this.tokens.keys().next().value;
  }

  /**
   * Delete a token
   */
  delete(instanceUrl: string): boolean {
    const deleted = this.tokens.delete(instanceUrl);
    rateLimitStorage.delete(instanceUrl);

    if (deleted) {
      logger.debug('Token deleted', { instanceUrl });
    }

    return deleted;
  }

  /**
   * Delete all tokens
   */
  clear(): void {
    this.tokens.clear();
    rateLimitStorage.clear();
    logger.info('All tokens cleared');
  }

  /**
   * Refresh a token
   */
  async refresh(instanceUrl: string): Promise<SalesforceToken> {
    const entry = this.tokens.get(instanceUrl);

    if (!entry?.token.refresh_token) {
      throw new Error('No refresh token available');
    }

    // Rate limit check
    const tracking = rateLimitStorage.get(instanceUrl) || { retries: 0, lastRetry: 0 };
    const now = Date.now();

    if (now - tracking.lastRetry < 1000 && tracking.retries >= 3) {
      throw new Error('Rate limited: too many token refresh attempts');
    }

    const config = getOAuthConfig();

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: entry.token.refresh_token,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    });

    try {
      const response = await axios.post(
        `${config.loginUrl}/services/oauth2/token`,
        params.toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );

      const newToken: SalesforceToken = {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token || entry.token.refresh_token,
        instance_url: instanceUrl,
        id: response.data.id,
        token_type: response.data.token_type || 'Bearer',
        issued_at: response.data.issued_at,
        signature: response.data.signature,
        expires_at: response.data.expires_in
          ? Date.now() + response.data.expires_in * 1000
          : undefined,
      };

      this.set(instanceUrl, newToken);

      // Reset rate limit tracking
      rateLimitStorage.set(instanceUrl, { retries: 0, lastRetry: 0 });

      logger.info('Token refreshed', { instanceUrl });

      return newToken;
    } catch (error) {
      const axiosError = error as AxiosError<{ error_description?: string }>;

      // Track failed retry
      rateLimitStorage.set(instanceUrl, {
        retries: tracking.retries + 1,
        lastRetry: now,
      });

      throw new Error(
        `Failed to refresh token: ${axiosError.response?.data?.error_description || axiosError.message}`
      );
    }
  }

  /**
   * Revoke a token
   */
  async revoke(instanceUrl: string): Promise<void> {
    const entry = this.tokens.get(instanceUrl);

    if (!entry?.token.access_token) {
      return;
    }

    const config = getOAuthConfig();

    try {
      await axios.post(
        `${config.loginUrl}/services/oauth2/revoke`,
        new URLSearchParams({ token: entry.token.access_token }).toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
    } catch (error) {
      logger.warn('Token revocation failed', { instanceUrl, error: (error as Error).message });
    }

    this.delete(instanceUrl);
    logger.info('Token revoked', { instanceUrl });
  }

  /**
   * List all instance URLs
   */
  listInstances(): string[] {
    return Array.from(this.tokens.keys());
  }

  /**
   * Get token count
   */
  count(): number {
    return this.tokens.size;
  }

  /**
   * Check if any tokens exist
   */
  hasAny(): boolean {
    return this.tokens.size > 0;
  }
}

// Export singleton instance
export const tokenManager = new TokenManager();

export default tokenManager;
