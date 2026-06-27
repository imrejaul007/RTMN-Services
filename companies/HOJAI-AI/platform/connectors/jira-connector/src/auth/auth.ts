/**
 * Jira Authentication Handler
 * Supports Basic Auth (email + API token) and OAuth
 */

import axios, { AxiosInstance } from 'axios';
import type {
  JiraBasicAuth,
  JiraOAuth,
  JiraTokenInfo,
} from '../types/index.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('jira-auth');

// ============================================================================
// State
// ============================================================================

let currentAuth: JiraBasicAuth | JiraOAuth | null = null;
let jiraUrl: string = '';
let client: AxiosInstance | null = null;

// ============================================================================
// Token Management
// ============================================================================

/**
 * Set Basic Auth credentials (email + API token)
 * API token is generated from: https://id.atlassian.com/manage-profile/security/api-tokens
 */
export function setBasicAuth(
  email: string,
  apiToken: string,
  baseUrl?: string
): void {
  logger.info('Setting Basic Auth', { email });

  currentAuth = {
    type: 'basic',
    email,
    apiToken,
  };

  if (baseUrl) {
    jiraUrl = baseUrl.replace(/\/$/, '');
  }

  client = null; // Reset client to force re-creation
}

/**
 * Set OAuth token
 */
export function setOAuthToken(
  accessToken: string,
  refreshToken?: string,
  expiresAt?: number,
  baseUrl?: string
): void {
  logger.info('Setting OAuth token', { expiresAt: expiresAt ? new Date(expiresAt) : undefined });

  currentAuth = {
    type: 'oauth',
    accessToken,
    refreshToken,
    expiresAt,
  };

  if (baseUrl) {
    jiraUrl = baseUrl.replace(/\/$/, '');
  }

  client = null; // Reset client to force re-creation
}

/**
 * Get current auth info (without sensitive data)
 */
export function getTokenInfo(): JiraTokenInfo {
  if (!currentAuth) {
    return {
      type: 'basic',
      connected: false,
    };
  }

  if (currentAuth.type === 'basic') {
    return {
      type: 'basic',
      email: currentAuth.email,
      connected: true,
    };
  }

  return {
    type: 'oauth',
    connected: true,
    expiresAt: currentAuth.expiresAt,
  };
}

/**
 * Get the Jira URL
 */
export function getJiraUrl(): string {
  return jiraUrl;
}

/**
 * Set Jira URL
 */
export function setJiraUrl(url: string): void {
  jiraUrl = url.replace(/\/$/, '');
  client = null; // Reset client to force re-creation
}

/**
 * Get the current auth configuration
 */
export function getAuth(): JiraBasicAuth | JiraOAuth | null {
  return currentAuth;
}

/**
 * Clear auth credentials
 */
export function clearAuth(): void {
  logger.info('Clearing auth credentials');
  currentAuth = null;
  client = null;
}

// ============================================================================
// Client Creation
// ============================================================================

/**
 * Create or get the axios client with current auth
 */
export function getClient(): AxiosInstance {
  if (!jiraUrl) {
    throw new Error('Jira URL not set. Call setJiraUrl() first.');
  }

  if (!currentAuth) {
    throw new Error('Auth not configured. Call setBasicAuth() or setOAuthToken() first.');
  }

  if (!client) {
    // Create Authorization header based on auth type
    let authHeader: string;

    if (currentAuth.type === 'basic') {
      // Basic Auth: base64(email:apiToken)
      const credentials = Buffer.from(`${currentAuth.email}:${currentAuth.apiToken}`).toString('base64');
      authHeader = `Basic ${credentials}`;
    } else {
      // OAuth: Bearer token
      authHeader = `Bearer ${currentAuth.accessToken}`;
    }

    client = axios.create({
      baseURL: jiraUrl,
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: 30000,
    });

    // Add response interceptor for error handling
    client.interceptors.response.use(
      (response) => response,
      async (error) => {
        // Handle 401 - try to refresh token for OAuth
        if (error.response?.status === 401 && currentAuth?.type === 'oauth') {
          logger.warn('Received 401, OAuth token may be expired');
          // In a production system, you would refresh the token here
          // For now, we just log and reject
        }

        // Handle rate limiting (429)
        if (error.response?.status === 429) {
          const retryAfter = error.response.headers['retry-after'];
          const waitMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : 60000;
          logger.warn(`Rate limited. Waiting ${waitMs}ms`);
          await new Promise((resolve) => setTimeout(resolve, waitMs));
        }

        return Promise.reject(error);
      }
    );
  }

  return client;
}

// ============================================================================
// Credential Validation
// ============================================================================

/**
 * Validate credentials by calling /rest/api/3/myself
 * This endpoint returns the current user's profile if auth is valid
 */
export async function validateCredentials(): Promise<{
  valid: boolean;
  user?: {
    accountId: string;
    displayName: string;
    emailAddress?: string;
    active: boolean;
  };
  error?: string;
}> {
  if (!currentAuth || !jiraUrl) {
    return {
      valid: false,
      error: 'Auth or Jira URL not configured',
    };
  }

  try {
    const clientInstance = getClient();
    const response = await clientInstance.get('/rest/api/3/myself', {
      params: {
        expand: 'groups,applicationRoles',
      },
    });

    const user = response.data;

    logger.info('Credentials validated successfully', {
      accountId: user.accountId,
      displayName: user.displayName,
    });

    return {
      valid: true,
      user: {
        accountId: user.accountId,
        displayName: user.displayName,
        emailAddress: user.emailAddress,
        active: user.active ?? true,
      },
    };
  } catch (error: any) {
    const status = error.response?.status;
    const message = error.response?.data?.errorMessages?.[0] || error.message;

    logger.error('Credential validation failed', { status, message });

    if (status === 401) {
      return {
        valid: false,
        error: 'Invalid credentials. Check your email and API token.',
      };
    }

    if (status === 403) {
      return {
        valid: false,
        error: 'Access forbidden. Your account may not have permission to access Jira.',
      };
    }

    return {
      valid: false,
      error: `Validation failed: ${message}`,
    };
  }
}

// ============================================================================
// OAuth Helpers
// ============================================================================

/**
 * Generate OAuth authorization URL
 * Note: This is a helper for the OAuth flow. Actual OAuth implementation
 * requires setting up an Atlassian OAuth app with proper redirects.
 */
export function generateOAuthUrl(
  clientId: string,
  redirectUri: string,
  scopes: string[] = ['read:jira-work', 'write:jira-work', 'offline_access']
): string {
  const baseAuthUrl = 'https://auth.atlassian.com/authorize';
  const state = Buffer.from(`${Date.now()}-${Math.random()}`).toString('base64url');

  const params = new URLSearchParams({
    audience: 'api.atlassian.com',
    client_id: clientId,
    scope: scopes.join(' '),
    redirect_uri: redirectUri,
    state,
    response_type: 'code',
    prompt: 'consent',
  });

  return `${baseAuthUrl}?${params.toString()}`;
}

/**
 * Exchange OAuth authorization code for tokens
 */
export async function exchangeOAuthCode(
  clientId: string,
  clientSecret: string,
  code: string,
  redirectUri: string
): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  scope: string;
}> {
  const response = await axios.post(
    'https://auth.atlassian.com/oauth/token',
    {
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    },
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  const data = response.data;

  // Set the OAuth token in the auth handler
  setOAuthToken(
    data.access_token,
    data.refresh_token,
    Date.now() + data.expires_in * 1000
  );

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    scope: data.scope,
  };
}

/**
 * Refresh OAuth token
 */
export async function refreshOAuthToken(
  clientId: string,
  clientSecret: string
): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}> {
  if (currentAuth?.type !== 'oauth' || !currentAuth.refreshToken) {
    throw new Error('No refresh token available');
  }

  const response = await axios.post(
    'https://auth.atlassian.com/oauth/token',
    {
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: currentAuth.refreshToken,
    },
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  const data = response.data;

  // Update the OAuth token
  setOAuthToken(
    data.access_token,
    data.refresh_token,
    Date.now() + data.expires_in * 1000
  );

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

// ============================================================================
// Auth from Environment
// ============================================================================

/**
 * Initialize auth from environment variables
 * Supports both Basic Auth (JIRA_EMAIL + JIRA_API_TOKEN) and OAuth (JIRA_ACCESS_TOKEN)
 */
export function initAuthFromEnv(): boolean {
  const url = process.env.JIRA_URL || process.env.JIRA_BASE_URL;
  const email = process.env.JIRA_EMAIL;
  const apiToken = process.env.JIRA_API_TOKEN;
  const accessToken = process.env.JIRA_ACCESS_TOKEN;

  if (!url) {
    logger.warn('JIRA_URL not set in environment');
    return false;
  }

  setJiraUrl(url);

  if (email && apiToken) {
    setBasicAuth(email, apiToken);
    logger.info('Initialized with Basic Auth from environment');
    return true;
  }

  if (accessToken) {
    setOAuthToken(accessToken);
    logger.info('Initialized with OAuth from environment');
    return true;
  }

  logger.warn('No Jira credentials found in environment');
  return false;
}

// ============================================================================
// Check if Connected
// ============================================================================

/**
 * Check if the connector is connected and authenticated
 */
export function isConnected(): boolean {
  return currentAuth !== null && jiraUrl !== '';
}