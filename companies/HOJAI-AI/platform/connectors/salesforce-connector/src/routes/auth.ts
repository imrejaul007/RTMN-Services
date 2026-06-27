/**
 * OAuth Routes
 * Authentication endpoints for Salesforce OAuth 2.0
 */

import { Router, Request, Response } from 'express';
import axios, { AxiosError } from 'axios';
import queryString from 'query-string';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import * as winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

const router = Router();

// Salesforce endpoints
const SF_PRODUCTION_LOGIN_URL = 'https://login.salesforce.com';
const SF_SANDBOX_LOGIN_URL = 'https://test.salesforce.com';
const SF_API_VERSION = 'v59.0';

// Token storage interface
interface TokenStorage {
  instanceUrl: string;
  token: {
    access_token: string;
    refresh_token?: string;
    instance_url: string;
    id: string;
    token_type: string;
    issued_at: string;
    signature: string;
  };
}

// State storage (will be injected)
let tokenStorage: Map<string, TokenStorage>;
let sessionStorage: Map<string, { id: string; instanceUrl: string; userName?: string; userEmail?: string; createdAt: number; lastActivity: number }>;
let oauthStateStorage: Map<string, { codeVerifier: string; sessionId: string; redirectUri: string; timestamp: number }>;

/**
 * Initialize the auth routes with storage references
 */
export function initAuthRoutes(
  tokens: Map<string, TokenStorage>,
  sessions: Map<string, { id: string; instanceUrl: string; userName?: string; userEmail?: string; createdAt: number; lastActivity: number }>,
  states: Map<string, { codeVerifier: string; sessionId: string; redirectUri: string; timestamp: number }>
): void {
  tokenStorage = tokens;
  sessionStorage = sessions;
  oauthStateStorage = states;
}

/**
 * Get OAuth configuration from environment
 */
function getOAuthConfig() {
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

/**
 * Generate PKCE code verifier and challenge
 */
function generatePKCE(): { verifier: string; challenge: string } {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

/**
 * POST /auth/login
 * Initiate OAuth flow
 */
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const config = getOAuthConfig();

    if (!config.clientId || !config.clientSecret) {
      res.status(500).json({
        success: false,
        error: {
          code: 'CONFIGURATION_ERROR',
          message: 'Salesforce OAuth not configured. Set SF_CLIENT_ID and SF_CLIENT_SECRET.',
        },
      });
      return;
    }

    const sessionId = req.headers['x-session-id'] as string;
    const session = sessionId ? sessionStorage.get(sessionId) : undefined;

    const { verifier, challenge } = generatePKCE();
    const state = uuidv4();

    oauthStateStorage.set(state, {
      codeVerifier: verifier,
      sessionId: session?.id || uuidv4(),
      redirectUri: config.redirectUri,
      timestamp: Date.now(),
    });

    const params = queryString.stringify({
      response_type: 'code',
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      scope: 'api refresh_token',
      state,
      code_challenge: challenge,
      code_challenge_method: 'S256',
    });

    const authUrl = `${config.loginUrl}/services/oauth2/authorize?${params}`;

    logger.info('OAuth login initiated', {
      sessionId: session?.id,
      environment: config.environment
    });

    res.json({
      success: true,
      data: {
        authUrl,
        state,
        environment: config.environment,
      },
    });
  } catch (error) {
    logger.error('OAuth login error', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      error: {
        code: 'OAUTH_ERROR',
        message: 'Failed to initiate OAuth flow',
      },
    });
  }
});

/**
 * GET /auth/callback
 * Handle OAuth callback
 */
router.get('/callback', async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, state, error, error_description } = req.query;

    if (error) {
      logger.error('OAuth error from Salesforce', { error, error_description });
      res.status(400).json({
        success: false,
        error: {
          code: 'OAUTH_ERROR',
          message: error_description as string || error as string,
        },
      });
      return;
    }

    if (!code || !state) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_CALLBACK',
          message: 'Missing code or state parameter',
        },
      });
      return;
    }

    const oauthState = oauthStateStorage.get(state as string);
    if (!oauthState) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATE',
          message: 'Invalid or expired OAuth state',
        },
      });
      return;
    }

    oauthStateStorage.delete(state as string);

    const config = getOAuthConfig();

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code as string,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: oauthState.redirectUri,
      code_verifier: oauthState.codeVerifier,
    });

    const response = await axios.post(
      `${config.loginUrl}/services/oauth2/token`,
      params.toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const tokenData = {
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token,
      instance_url: response.data.instance_url,
      id: response.data.id,
      token_type: response.data.token_type || 'Bearer',
      issued_at: response.data.issued_at,
      signature: response.data.signature,
    };

    tokenStorage.set(tokenData.instance_url, {
      instanceUrl: tokenData.instance_url,
      token: tokenData,
    });

    const session = sessionStorage.get(oauthState.sessionId);
    if (session) {
      session.instanceUrl = tokenData.instance_url;
      session.lastActivity = Date.now();
    }

    let userInfo: { name?: string; email?: string } = {};
    try {
      const userResponse = await axios.get(tokenData.id, {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      userInfo = {
        name: userResponse.data.name,
        email: userResponse.data.email,
      };
      if (session) {
        session.userName = userInfo.name;
        session.userEmail = userInfo.email;
      }
    } catch {
      logger.warn('Failed to fetch user info');
    }

    logger.info('OAuth authentication successful', {
      sessionId: oauthState.sessionId,
      instanceUrl: tokenData.instance_url,
    });

    res.json({
      success: true,
      data: {
        sessionId: oauthState.sessionId,
        instanceUrl: tokenData.instance_url,
        user: userInfo,
      },
    });
  } catch (error) {
    const axiosError = error as AxiosError<{ error_description?: string }>;
    logger.error('OAuth callback error', {
      error: axiosError.response?.data?.error_description || axiosError.message,
    });
    res.status(500).json({
      success: false,
      error: {
        code: 'CALLBACK_ERROR',
        message: axiosError.response?.data?.error_description || 'Failed to complete OAuth flow',
      },
    });
  }
});

/**
 * POST /auth/refresh
 * Refresh access token
 */
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    const instanceUrl = req.body.instanceUrl ||
      Array.from(tokenStorage.keys())[0];

    if (!instanceUrl) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_INSTANCE',
          message: 'Instance URL required',
        },
      });
      return;
    }

    const stored = tokenStorage.get(instanceUrl);
    if (!stored?.token.refresh_token) {
      res.status(401).json({
        success: false,
        error: {
          code: 'NO_REFRESH_TOKEN',
          message: 'No refresh token available. Please re-authenticate.',
        },
      });
      return;
    }

    const config = getOAuthConfig();

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: stored.token.refresh_token,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    });

    const response = await axios.post(
      `${config.loginUrl}/services/oauth2/token`,
      params.toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const newToken = {
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token || stored.token.refresh_token,
      instance_url: instanceUrl,
      id: response.data.id,
      token_type: response.data.token_type || 'Bearer',
      issued_at: response.data.issued_at,
      signature: response.data.signature,
    };

    tokenStorage.set(instanceUrl, { instanceUrl, token: newToken });

    logger.info('Token refreshed', { instanceUrl });

    res.json({
      success: true,
      data: {
        instanceUrl,
        expiresAt: Date.now() + (response.data.expires_in || 7200) * 1000,
      },
    });
  } catch (error) {
    const axiosError = error as AxiosError<{ error_description?: string }>;
    logger.error('Token refresh error', { error: axiosError.message });
    res.status(500).json({
      success: false,
      error: {
        code: 'REFRESH_ERROR',
        message: axiosError.response?.data?.error_description || 'Failed to refresh token',
      },
    });
  }
});

/**
 * POST /auth/logout
 * Logout and revoke token
 */
router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  try {
    const sessionId = req.headers['x-session-id'] as string;
    const session = sessionId ? sessionStorage.get(sessionId) : undefined;

    if (session?.instanceUrl) {
      const stored = tokenStorage.get(session.instanceUrl);
      if (stored?.token.access_token) {
        const config = getOAuthConfig();
        try {
          await axios.post(
            `${config.loginUrl}/services/oauth2/revoke`,
            new URLSearchParams({ token: stored.token.access_token }).toString(),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
          );
        } catch {
          // Ignore revocation errors
        }
      }
      tokenStorage.delete(session.instanceUrl);
      session.instanceUrl = '';
      session.userName = undefined;
      session.userEmail = undefined;
    }

    logger.info('User logged out', { sessionId: session?.id });

    res.json({
      success: true,
      data: { message: 'Successfully logged out' },
    });
  } catch (error) {
    logger.error('Logout error', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      error: {
        code: 'LOGOUT_ERROR',
        message: 'Failed to logout',
      },
    });
  }
});

/**
 * GET /auth/status
 * Get authentication status
 */
router.get('/status', (req: Request, res: Response): void => {
  const sessionId = req.headers['x-session-id'] as string;
  const session = sessionId ? sessionStorage.get(sessionId) : undefined;
  const instanceUrl = session?.instanceUrl || Array.from(tokenStorage.keys())[0];

  if (!instanceUrl || !tokenStorage.has(instanceUrl)) {
    res.json({
      success: true,
      data: {
        authenticated: false,
        instances: Array.from(tokenStorage.keys()),
      },
    });
    return;
  }

  res.json({
    success: true,
    data: {
      authenticated: true,
      instanceUrl,
      user: {
        name: session?.userName,
        email: session?.userEmail,
      },
      sessionId: session?.id,
      instances: Array.from(tokenStorage.keys()),
    },
  });
});

/**
 * POST /auth/token
 * Set token manually (for PAT or pre-configured tokens)
 */
router.post('/token', (req: Request, res: Response): void => {
  try {
    const { access_token, instance_url, id, token_type, issued_at, signature } = req.body;

    if (!access_token || !instance_url) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'access_token and instance_url are required',
        },
      });
      return;
    }

    const token = {
      access_token,
      instance_url,
      id: id || '',
      token_type: token_type || 'Bearer',
      issued_at: issued_at || new Date().toISOString(),
      signature: signature || '',
    };

    tokenStorage.set(instance_url, { instanceUrl: instance_url, token });

    logger.info('Manual token set', { instanceUrl: instance_url });

    res.json({
      success: true,
      data: {
        instanceUrl: instance_url,
        message: 'Token configured successfully',
      },
    });
  } catch (error) {
    logger.error('Token set error', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      error: {
        code: 'TOKEN_ERROR',
        message: 'Failed to set token',
      },
    });
  }
});

export default router;
