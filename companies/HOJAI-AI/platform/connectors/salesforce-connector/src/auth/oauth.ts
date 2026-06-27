/**
 * Salesforce OAuth 2.0 Authentication Handler
 * Production-ready OAuth flow with token management and refresh
 */

import axios, { AxiosError } from 'axios';
import * as crypto from 'crypto';
import * as queryString from 'query-string';
import { v4 as uuidv4 } from 'uuid';
import type {
  SalesforceAuthToken,
  SalesforceTokenResponse,
  SalesforceUserInfo,
  SalesforceOAuthConfig,
  SalesforceOAuthState,
  SalesforceAPIError,
} from '../types/index.js';

// Environment URLs
const SF_PRODUCTION_LOGIN_URL = 'https://login.salesforce.com';
const SF_SANDBOX_LOGIN_URL = 'https://test.salesforce.com';
const SF_API_VERSION = 'v59.0';

// Token storage - in production, use Redis or database
const tokenStorage = new Map<string, SalesforceAuthToken>();
const oauthStateStorage = new Map<string, SalesforceOAuthState>();

// Rate limit tracking
const rateLimitTracking = new Map<string, { retries: number; lastRetry: number }>();

/**
 * Get OAuth configuration from environment
 */
export function getOAuthConfig(): SalesforceOAuthConfig {
  const environment = (process.env.SF_ENVIRONMENT as 'production' | 'sandbox' | 'test') || 'production';

  return {
    clientId: process.env.SF_CLIENT_ID || '',
    clientSecret: process.env.SF_CLIENT_SECRET || '',
    redirectUri: process.env.SF_REDIRECT_URI || 'http://localhost:4786/auth/callback',
    environment,
  };
}

/**
 * Get the login URL based on environment
 */
function getLoginUrl(environment: 'production' | 'sandbox' | 'test'): string {
  switch (environment) {
    case 'sandbox':
      return SF_SANDBOX_LOGIN_URL;
    case 'test':
      return SF_SANDBOX_LOGIN_URL; // Test uses sandbox URL
    default:
      return SF_PRODUCTION_LOGIN_URL;
  }
}

/**
 * Generate PKCE code verifier and challenge
 */
function generatePKCE(): { verifier: string; challenge: string } {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

/**
 * Build the OAuth authorization URL
 */
export function buildAuthorizationUrl(stateId?: string): string {
  const config = getOAuthConfig();
  const loginUrl = getLoginUrl(config.environment);
  const { verifier, challenge } = generatePKCE();

  const state = stateId || uuidv4();

  // Store state for verification
  oauthStateStorage.set(state, {
    codeVerifier: verifier,
    redirectUri: config.redirectUri,
    timestamp: Date.now(),
  });

  // Clean up old states (older than 10 minutes)
  const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
  for (const [key, value] of oauthStateStorage.entries()) {
    if (value.timestamp < tenMinutesAgo) {
      oauthStateStorage.delete(key);
    }
  }

  const params = queryString.stringify({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: 'api refresh_token',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });

  return `${loginUrl}/services/oauth2/authorize?${params}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string, state: string): Promise<SalesforceAuthToken> {
  const config = getOAuthConfig();
  const loginUrl = getLoginUrl(config.environment);
  const storedState = oauthStateStorage.get(state);

  if (!storedState) {
    throw new Error('Invalid or expired state parameter');
  }

  // Clean up used state
  oauthStateStorage.delete(state);

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: storedState.redirectUri,
    code_verifier: storedState.codeVerifier,
  });

  try {
    const response = await axios.post<SalesforceTokenResponse>(
      `${loginUrl}/services/oauth2/token`,
      params.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const tokenData: SalesforceAuthToken = {
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token,
      instance_url: response.data.instance_url,
      id: response.data.id,
      token_type: response.data.token_type || 'Bearer',
      issued_at: response.data.issued_at,
      signature: response.data.signature,
    };

    // Store token with instance_url as key
    tokenStorage.set(response.data.instance_url, tokenData);

    return tokenData;
  } catch (error) {
    const axiosError = error as AxiosError<SalesforceAPIError>;
    throw new Error(
      `Failed to exchange code: ${axiosError.response?.data?.error_description || axiosError.message}`
    );
  }
}

/**
 * Refresh an expired access token
 */
export async function refreshAccessToken(instanceUrl: string): Promise<SalesforceAuthToken> {
  const config = getOAuthConfig();
  const loginUrl = getLoginUrl(config.environment);
  const storedToken = tokenStorage.get(instanceUrl);

  if (!storedToken?.refresh_token) {
    throw new Error('No refresh token available');
  }

  // Rate limit tracking for refresh
  const tracking = rateLimitTracking.get(instanceUrl) || { retries: 0, lastRetry: 0 };
  const now = Date.now();

  // If we retried recently, wait
  if (now - tracking.lastRetry < 1000 && tracking.retries >= 3) {
    throw new Error('Rate limited: too many token refresh attempts');
  }

  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: storedToken.refresh_token,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });

  try {
    const response = await axios.post<SalesforceTokenResponse>(
      `${loginUrl}/services/oauth2/token`,
      params.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const newToken: SalesforceAuthToken = {
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token || storedToken.refresh_token,
      instance_url: instanceUrl,
      id: response.data.id,
      token_type: response.data.token_type || 'Bearer',
      issued_at: response.data.issued_at,
      signature: response.data.signature,
    };

    tokenStorage.set(instanceUrl, newToken);

    // Reset rate limit tracking
    rateLimitTracking.set(instanceUrl, { retries: 0, lastRetry: 0 });

    return newToken;
  } catch (error) {
    const axiosError = error as AxiosError<SalesforceAPIError>;

    // Track failed retry
    rateLimitTracking.set(instanceUrl, {
      retries: tracking.retries + 1,
      lastRetry: now,
    });

    throw new Error(
      `Failed to refresh token: ${axiosError.response?.data?.error_description || axiosError.message}`
    );
  }
}

/**
 * Revoke an access token
 */
export async function revokeToken(instanceUrl: string): Promise<void> {
  const config = getOAuthConfig();
  const loginUrl = getLoginUrl(config.environment);
  const token = tokenStorage.get(instanceUrl);

  if (!token) {
    return; // Already revoked
  }

  const params = new URLSearchParams({
    token: token.access_token,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });

  try {
    await axios.post(
      `${loginUrl}/services/oauth2/revoke`,
      params.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
  } catch (error) {
    // Log but don't throw - revocation failure shouldn't block logout
    console.error('Token revocation failed:', error);
  } finally {
    tokenStorage.delete(instanceUrl);
  }
}

/**
 * Get user info from Salesforce
 */
export async function getUserInfo(instanceUrl: string): Promise<SalesforceUserInfo> {
  const token = tokenStorage.get(instanceUrl);

  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await axios.get<SalesforceUserInfo>(`${token.id}`, {
    headers: {
      Authorization: `Bearer ${token.access_token}`,
    },
  });

  return response.data;
}

/**
 * Get stored token for an instance
 */
export function getStoredToken(instanceUrl?: string): SalesforceAuthToken | undefined {
  if (instanceUrl) {
    return tokenStorage.get(instanceUrl);
  }

  // Return first available token
  const tokens = Array.from(tokenStorage.values());
  return tokens[0];
}

/**
 * Set token manually (for PAT or pre-configured tokens)
 */
export function setToken(token: SalesforceAuthToken): void {
  tokenStorage.set(token.instance_url, token);
}

/**
 * Check if authenticated
 */
export function isAuthenticated(instanceUrl?: string): boolean {
  if (instanceUrl) {
    return tokenStorage.has(instanceUrl);
  }
  return tokenStorage.size > 0;
}

/**
 * Get all authenticated instances
 */
export function getAuthenticatedInstances(): string[] {
  return Array.from(tokenStorage.keys());
}

/**
 * Clear all tokens
 */
export function clearAllTokens(): void {
  tokenStorage.clear();
  oauthStateStorage.clear();
  rateLimitTracking.clear();
}

export const oauth = {
  buildAuthorizationUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
  revokeToken,
  getUserInfo,
  getStoredToken,
  setToken,
  isAuthenticated,
  getAuthenticatedInstances,
  clearAllTokens,
  getOAuthConfig,
};

export default oauth;