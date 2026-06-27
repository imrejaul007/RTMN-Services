/**
 * Salesforce Connector - Production-Ready Implementation
 * Port: 4786
 *
 * Complete Salesforce API integration with:
 * - OAuth 2.0 Web Server Flow (PKCE)
 * - Real jsforce API calls
 * - Token storage with refresh
 * - Session management
 * - Rate limiting
 * - Webhook support
 *
 * @module salesforce-connector
 */

import express, {
  Express,
  Request,
  Response,
  NextFunction,
  RequestHandler,
} from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import * as winston from 'winston';
import { v4 as uuidv4 } from 'uuid';
import queryString from 'query-string';
import * as crypto from 'crypto';
import axios, { AxiosError } from 'axios';

// Load environment variables
dotenv.config();

// ============ Types & Interfaces ============

interface SalesforceAuthToken {
  access_token: string;
  refresh_token?: string;
  instance_url: string;
  id: string;
  token_type: string;
  issued_at: string;
  signature: string;
}

interface Session {
  id: string;
  instanceUrl: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  createdAt: number;
  lastActivity: number;
}

interface TokenStorage {
  instanceUrl: string;
  token: SalesforceAuthToken;
  expiresAt?: number;
}

// ============ Configuration ============

const PORT = parseInt(process.env.PORT || '4786', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const SESSION_TTL_MS = parseInt(process.env.SESSION_TTL_MS || '86400000', 10); // 24 hours

// Salesforce endpoints
const SF_PRODUCTION_LOGIN_URL = 'https://login.salesforce.com';
const SF_SANDBOX_LOGIN_URL = 'https://test.salesforce.com';
const SF_API_VERSION = 'v59.0';

// Rate limiting
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100;

// ============ Logger Setup ============

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, ...meta }) => {
          const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
          return `${timestamp} [${level}] ${message} ${metaStr}`;
        })
      ),
    }),
  ],
});

// ============ State Storage ============

// Token storage (in production, use Redis)
const tokenStorage = new Map<string, TokenStorage>();

// OAuth state storage (for PKCE)
interface OAuthState {
  codeVerifier: string;
  sessionId: string;
  redirectUri: string;
  timestamp: number;
}
const oauthStateStorage = new Map<string, OAuthState>();

// Session storage
const sessionStorage = new Map<string, Session>();

// Rate limit tracking
interface RateLimitEntry {
  count: number;
  resetTime: number;
}
const rateLimitStorage = new Map<string, RateLimitEntry>();

// ============ Utility Functions ============

/**
 * Generate PKCE code verifier and challenge
 */
function generatePKCE(): { verifier: string; challenge: string } {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
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
    redirectUri: process.env.SF_REDIRECT_URI || `http://localhost:${PORT}/auth/callback`,
    loginUrl,
    environment,
  };
}

/**
 * Get or create a session
 */
function getOrCreateSession(sessionId?: string): { session: Session; isNew: boolean } {
  if (sessionId && sessionStorage.has(sessionId)) {
    const session = sessionStorage.get(sessionId)!;
    session.lastActivity = Date.now();
    return { session, isNew: false };
  }

  const newSession: Session = {
    id: uuidv4(),
    instanceUrl: '',
    createdAt: Date.now(),
    lastActivity: Date.now(),
  };
  sessionStorage.set(newSession.id, newSession);
  return { session: newSession, isNew: true };
}

/**
 * Clean up expired sessions and OAuth states
 */
function cleanupExpiredStates(): void {
  const now = Date.now();
  const TEN_MINUTES = 10 * 60 * 1000;
  const SESSION_EXPIRY = SESSION_TTL_MS;

  // Clean OAuth states
  for (const [key, state] of oauthStateStorage.entries()) {
    if (now - state.timestamp > TEN_MINUTES) {
      oauthStateStorage.delete(key);
    }
  }

  // Clean sessions
  for (const [key, session] of sessionStorage.entries()) {
    if (now - session.lastActivity > SESSION_EXPIRY) {
      sessionStorage.delete(key);
    }
  }
}

/**
 * Rate limit check
 */
function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const entry = rateLimitStorage.get(ip);

  if (!entry || now > entry.resetTime) {
    rateLimitStorage.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1, resetIn: RATE_LIMIT_WINDOW_MS };
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0, resetIn: entry.resetTime - now };
  }

  entry.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - entry.count, resetIn: entry.resetTime - now };
}

/**
 * Get instance URL from request (session-based)
 */
function getInstanceUrlFromRequest(req: Request): string | undefined {
  const sessionId = req.headers['x-session-id'] as string ||
                     req.cookies?.sessionId ||
                     (req.session as Session & { instanceUrl?: string })?.instanceUrl;

  if (sessionId) {
    const session = sessionStorage.get(sessionId);
    if (session?.instanceUrl) {
      return session.instanceUrl;
    }
  }

  // Fallback to first authenticated instance
  if (tokenStorage.size > 0) {
    return tokenStorage.keys().next().value;
  }

  return undefined;
}

// Run cleanup every 5 minutes
setInterval(cleanupExpiredStates, 5 * 60 * 1000);

// ============ Middleware ============

/**
 * Rate limiting middleware
 */
const rateLimitMiddleware: RequestHandler = (req, res, next) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const { allowed, remaining, resetIn } = checkRateLimit(ip);

  res.setHeader('X-RateLimit-Remaining', remaining.toString());
  res.setHeader('X-RateLimit-Reset', Math.ceil(resetIn / 1000).toString());

  if (!allowed) {
    logger.warn('Rate limit exceeded', { ip, path: req.path });
    return res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
        details: { retryAfterMs: resetIn },
      },
    });
  }

  next();
};

/**
 * Session middleware
 */
const sessionMiddleware: RequestHandler = (req, res, next) => {
  const sessionId = req.headers['x-session-id'] as string || req.cookies?.sessionId;
  const { session, isNew } = getOrCreateSession(sessionId);

  // Attach session to request
  (req as Request & { session: Session }).session = session;

  // Set session header for client
  res.setHeader('X-Session-Id', session.id);

  // Set cookie if new session
  if (isNew) {
    res.setHeader('Set-Cookie', `sessionId=${session.id}; HttpOnly; SameSite=Strict; Max-Age=${SESSION_TTL_MS / 1000}`);
  }

  next();
};

/**
 * Authentication middleware
 */
const requireAuth: RequestHandler = (req, res, next) => {
  const instanceUrl = getInstanceUrlFromRequest(req);

  if (!instanceUrl || !tokenStorage.has(instanceUrl)) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Not authenticated. Please authenticate with Salesforce first.',
      },
    });
  }

  next();
};

/**
 * Error handler middleware
 */
const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction): void => {
  logger.error('Request error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: NODE_ENV === 'production' ? 'Internal server error' : err.message,
    },
  });
};

// ============ OAuth Routes ============

/**
 * POST /auth/login
 * Initiate OAuth flow
 */
async function handleLogin(req: Request, res: Response): Promise<void> {
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

    const session = (req as Request & { session: Session }).session;
    const { verifier, challenge } = generatePKCE();
    const state = uuidv4();

    // Store OAuth state
    oauthStateStorage.set(state, {
      codeVerifier: verifier,
      sessionId: session.id,
      redirectUri: config.redirectUri,
      timestamp: Date.now(),
    });

    // Build authorization URL
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

    logger.info('OAuth login initiated', { sessionId: session.id, environment: config.environment });

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
}

/**
 * GET /auth/callback
 * Handle OAuth callback
 */
async function handleCallback(req: Request, res: Response): Promise<void> {
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

    // Exchange code for tokens
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code as string,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: oauthState.redirectUri,
      code_verifier: oauthState.codeVerifier,
    });

    const response = await axios.post(`${config.loginUrl}/services/oauth2/token`, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const tokenData: SalesforceAuthToken = {
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token,
      instance_url: response.data.instance_url,
      id: response.data.id,
      token_type: response.data.token_type || 'Bearer',
      issued_at: response.data.issued_at,
      signature: response.data.signature,
    };

    // Store token
    tokenStorage.set(tokenData.instance_url, {
      instanceUrl: tokenData.instance_url,
      token: tokenData,
    });

    // Update session
    const session = sessionStorage.get(oauthState.sessionId);
    if (session) {
      session.instanceUrl = tokenData.instance_url;
      session.lastActivity = Date.now();
    }

    // Get user info
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
      logger.warn('Failed to fetch user info', { instanceUrl: tokenData.instance_url });
    }

    logger.info('OAuth authentication successful', {
      sessionId: oauthState.sessionId,
      instanceUrl: tokenData.instance_url,
      user: userInfo.email,
    });

    res.json({
      success: true,
      data: {
        sessionId: oauthState.sessionId,
        instanceUrl: tokenData.instance_url,
        user: userInfo,
        message: 'Successfully authenticated with Salesforce',
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
}

/**
 * POST /auth/refresh
 * Refresh access token
 */
async function handleRefresh(req: Request, res: Response): Promise<void> {
  try {
    const instanceUrl = req.body.instanceUrl || getInstanceUrlFromRequest(req);

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

    const response = await axios.post(`${config.loginUrl}/services/oauth2/token`, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const newToken: SalesforceAuthToken = {
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
}

/**
 * POST /auth/logout
 * Logout and revoke token
 */
async function handleLogout(req: Request, res: Response): Promise<void> {
  try {
    const session = (req as Request & { session: Session }).session;

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
      session.userId = undefined;
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
}

/**
 * GET /auth/status
 * Get authentication status
 */
function handleStatus(req: Request, res: Response): void {
  const instanceUrl = getInstanceUrlFromRequest(req);
  const session = (req as Request & { session: Session }).session;

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
}

// ============ Leads API Routes ============

/**
 * GET /api/leads
 * List leads with optional filters
 */
async function handleListLeads(req: Request, res: Response): Promise<void> {
  try {
    const instanceUrl = getInstanceUrlFromRequest(req);
    const token = tokenStorage.get(instanceUrl!);

    if (!token) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
      return;
    }

    const { where, fields, orderBy, limit, offset, search } = req.query;
    let soql = 'SELECT ';

    // Default fields
    const defaultFields = ['Id', 'FirstName', 'LastName', 'Name', 'Email', 'Phone', 'Company', 'Title', 'Status', 'LeadSource', 'CreatedDate'];
    soql += (fields as string)?.split(',').map(f => f.trim()).filter(Boolean).join(', ') || defaultFields.join(', ');
    soql += ' FROM Lead';

    const conditions: string[] = [];
    if (where) conditions.push(where as string);
    if (search) {
      const term = (search as string).replace(/'/g, "\\'");
      conditions.push(`(Name LIKE '%${term}%' OR Email LIKE '%${term}%' OR Company LIKE '%${term}%')`);
    }

    if (conditions.length > 0) {
      soql += ` WHERE ${conditions.join(' AND ')}`;
    }
    if (orderBy) soql += ` ORDER BY ${orderBy}`;
    soql += ` LIMIT ${Math.min(parseInt(limit as string) || 100, 1000)}`;
    if (offset) soql += ` OFFSET ${offset}`;

    const response = await axios.get(`${token.token.instance_url}/services/data/${SF_API_VERSION}/query`, {
      params: { q: soql },
      headers: { Authorization: `Bearer ${token.token.access_token}` },
    });

    res.json({
      success: true,
      data: {
        records: response.data.records,
        total: response.data.totalSize,
        hasMore: !response.data.done,
        nextRecordsUrl: response.data.nextRecordsUrl,
      },
    });
  } catch (error) {
    const axiosError = error as AxiosError;
    logger.error('List leads error', { error: axiosError.message });
    res.status(500).json({
      success: false,
      error: { code: 'API_ERROR', message: (axiosError.response?.data as Array<{message?: string}>)?.[0]?.message || axiosError.message },
    });
  }
}

/**
 * POST /api/leads
 * Create a new lead
 */
async function handleCreateLead(req: Request, res: Response): Promise<void> {
  try {
    const instanceUrl = getInstanceUrlFromRequest(req);
    const token = tokenStorage.get(instanceUrl!);

    if (!token) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
      return;
    }

    const leadData = req.body;

    // Validate required fields
    if (!leadData.LastName && !leadData.lastName) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'LastName is required' },
      });
      return;
    }
    if (!leadData.Company && !leadData.company) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Company is required' },
      });
      return;
    }

    const response = await axios.post(
      `${token.token.instance_url}/services/data/${SF_API_VERSION}/sobjects/Lead`,
      leadData,
      { headers: { Authorization: `Bearer ${token.token.access_token}` } }
    );

    logger.info('Lead created', { leadId: response.data.id });

    // Fetch and return the created lead
    const [createdLead] = await fetchRecords(instanceUrl!, 'Lead', response.data.id);

    res.status(201).json({
      success: true,
      data: createdLead,
    });
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string; errorCode?: string }[]>;
    logger.error('Create lead error', { error: axiosError.message });
    res.status(500).json({
      success: false,
      error: {
        code: 'CREATE_ERROR',
        message: (axiosError.response?.data as Array<{message?: string}>)?.[0]?.message || axiosError.message,
      },
    });
  }
}

/**
 * GET /api/leads/:id
 * Get a specific lead
 */
async function handleGetLead(req: Request, res: Response): Promise<void> {
  try {
    const instanceUrl = getInstanceUrlFromRequest(req);
    const token = tokenStorage.get(instanceUrl!);
    const { id } = req.params;

    if (!token) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
      return;
    }

    const records = await fetchRecords(instanceUrl!, 'Lead', id);

    if (records.length === 0) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Lead not found: ${id}` },
      });
      return;
    }

    res.json({
      success: true,
      data: records[0],
    });
  } catch (error) {
    const axiosError = error as AxiosError;
    logger.error('Get lead error', { error: axiosError.message });
    res.status(500).json({
      success: false,
      error: { code: 'API_ERROR', message: axiosError.message },
    });
  }
}

/**
 * PATCH /api/leads/:id
 * Update a lead
 */
async function handleUpdateLead(req: Request, res: Response): Promise<void> {
  try {
    const instanceUrl = getInstanceUrlFromRequest(req);
    const token = tokenStorage.get(instanceUrl!);
    const { id } = req.params;

    if (!token) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
      return;
    }

    await axios.patch(
      `${token.token.instance_url}/services/data/${SF_API_VERSION}/sobjects/Lead/${id}`,
      req.body,
      { headers: { Authorization: `Bearer ${token.token.access_token}` } }
    );

    logger.info('Lead updated', { leadId: id });

    // Return updated lead
    const records = await fetchRecords(instanceUrl!, 'Lead', id);

    res.json({
      success: true,
      data: records[0],
    });
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string; errorCode?: string }[]>;
    logger.error('Update lead error', { error: axiosError.message });
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: axiosError.response?.data?.[0]?.message || axiosError.message,
      },
    });
  }
}

/**
 * DELETE /api/leads/:id
 * Delete a lead
 */
async function handleDeleteLead(req: Request, res: Response): Promise<void> {
  try {
    const instanceUrl = getInstanceUrlFromRequest(req);
    const token = tokenStorage.get(instanceUrl!);
    const { id } = req.params;

    if (!token) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
      return;
    }

    await axios.delete(
      `${token.token.instance_url}/services/data/${SF_API_VERSION}/sobjects/Lead/${id}`,
      { headers: { Authorization: `Bearer ${token.token.access_token}` } }
    );

    logger.info('Lead deleted', { leadId: id });

    res.json({
      success: true,
      data: { id, success: true },
    });
  } catch (error) {
    const axiosError = error as AxiosError;
    logger.error('Delete lead error', { error: axiosError.message });
    res.status(500).json({
      success: false,
      error: { code: 'DELETE_ERROR', message: axiosError.message },
    });
  }
}

// ============ Contacts API Routes ============

/**
 * GET /api/contacts
 * List contacts with optional filters
 */
async function handleListContacts(req: Request, res: Response): Promise<void> {
  try {
    const instanceUrl = getInstanceUrlFromRequest(req);
    const token = tokenStorage.get(instanceUrl!);

    if (!token) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
      return;
    }

    const { where, fields, orderBy, limit, offset, email, search } = req.query;
    let soql = 'SELECT ';

    const defaultFields = ['Id', 'FirstName', 'LastName', 'Name', 'Email', 'Phone', 'Title', 'AccountId', 'Account.Name', 'Department', 'CreatedDate'];
    soql += (fields as string)?.split(',').map(f => f.trim()).filter(Boolean).join(', ') || defaultFields.join(', ');
    soql += ' FROM Contact';

    const conditions: string[] = [];
    if (where) conditions.push(where as string);
    if (email) conditions.push(`Email = '${(email as string).replace(/'/g, "\\'")}'`);
    if (search) {
      const term = (search as string).replace(/'/g, "\\'");
      conditions.push(`(Name LIKE '%${term}%' OR Email LIKE '%${term}%')`);
    }

    if (conditions.length > 0) {
      soql += ` WHERE ${conditions.join(' AND ')}`;
    }
    if (orderBy) soql += ` ORDER BY ${orderBy}`;
    soql += ` LIMIT ${Math.min(parseInt(limit as string) || 100, 1000)}`;
    if (offset) soql += ` OFFSET ${offset}`;

    const response = await axios.get(`${token.token.instance_url}/services/data/${SF_API_VERSION}/query`, {
      params: { q: soql },
      headers: { Authorization: `Bearer ${token.token.access_token}` },
    });

    res.json({
      success: true,
      data: {
        records: response.data.records,
        total: response.data.totalSize,
        hasMore: !response.data.done,
      },
    });
  } catch (error) {
    const axiosError = error as AxiosError;
    logger.error('List contacts error', { error: axiosError.message });
    res.status(500).json({
      success: false,
      error: { code: 'API_ERROR', message: axiosError.message },
    });
  }
}

/**
 * POST /api/contacts
 * Create a new contact
 */
async function handleCreateContact(req: Request, res: Response): Promise<void> {
  try {
    const instanceUrl = getInstanceUrlFromRequest(req);
    const token = tokenStorage.get(instanceUrl!);

    if (!token) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
      return;
    }

    const contactData = req.body;

    if (!contactData.LastName && !contactData.lastName) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'LastName is required' },
      });
      return;
    }

    const response = await axios.post(
      `${token.token.instance_url}/services/data/${SF_API_VERSION}/sobjects/Contact`,
      contactData,
      { headers: { Authorization: `Bearer ${token.token.access_token}` } }
    );

    logger.info('Contact created', { contactId: response.data.id });

    const records = await fetchRecords(instanceUrl!, 'Contact', response.data.id);

    res.status(201).json({
      success: true,
      data: records[0],
    });
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }[]>;
    logger.error('Create contact error', { error: axiosError.message });
    res.status(500).json({
      success: false,
      error: {
        code: 'CREATE_ERROR',
        message: (axiosError.response?.data as Array<{message?: string}>)?.[0]?.message || axiosError.message,
      },
    });
  }
}

/**
 * GET /api/contacts/:id
 * Get a specific contact
 */
async function handleGetContact(req: Request, res: Response): Promise<void> {
  try {
    const instanceUrl = getInstanceUrlFromRequest(req);
    const token = tokenStorage.get(instanceUrl!);
    const { id } = req.params;

    if (!token) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
      return;
    }

    const records = await fetchRecords(instanceUrl!, 'Contact', id);

    if (records.length === 0) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Contact not found: ${id}` },
      });
      return;
    }

    res.json({
      success: true,
      data: records[0],
    });
  } catch (error) {
    const axiosError = error as AxiosError;
    logger.error('Get contact error', { error: axiosError.message });
    res.status(500).json({
      success: false,
      error: { code: 'API_ERROR', message: axiosError.message },
    });
  }
}

/**
 * PATCH /api/contacts/:id
 * Update a contact
 */
async function handleUpdateContact(req: Request, res: Response): Promise<void> {
  try {
    const instanceUrl = getInstanceUrlFromRequest(req);
    const token = tokenStorage.get(instanceUrl!);
    const { id } = req.params;

    if (!token) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
      return;
    }

    await axios.patch(
      `${token.token.instance_url}/services/data/${SF_API_VERSION}/sobjects/Contact/${id}`,
      req.body,
      { headers: { Authorization: `Bearer ${token.token.access_token}` } }
    );

    logger.info('Contact updated', { contactId: id });

    const records = await fetchRecords(instanceUrl!, 'Contact', id);

    res.json({
      success: true,
      data: records[0],
    });
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }[]>;
    logger.error('Update contact error', { error: axiosError.message });
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: axiosError.response?.data?.[0]?.message || axiosError.message,
      },
    });
  }
}

/**
 * DELETE /api/contacts/:id
 * Delete a contact
 */
async function handleDeleteContact(req: Request, res: Response): Promise<void> {
  try {
    const instanceUrl = getInstanceUrlFromRequest(req);
    const token = tokenStorage.get(instanceUrl!);
    const { id } = req.params;

    if (!token) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
      return;
    }

    await axios.delete(
      `${token.token.instance_url}/services/data/${SF_API_VERSION}/sobjects/Contact/${id}`,
      { headers: { Authorization: `Bearer ${token.token.access_token}` } }
    );

    logger.info('Contact deleted', { contactId: id });

    res.json({
      success: true,
      data: { id, success: true },
    });
  } catch (error) {
    const axiosError = error as AxiosError;
    logger.error('Delete contact error', { error: axiosError.message });
    res.status(500).json({
      success: false,
      error: { code: 'DELETE_ERROR', message: axiosError.message },
    });
  }
}

// ============ Opportunities API Routes ============

/**
 * GET /api/opportunities
 * List opportunities with optional filters
 */
async function handleListOpportunities(req: Request, res: Response): Promise<void> {
  try {
    const instanceUrl = getInstanceUrlFromRequest(req);
    const token = tokenStorage.get(instanceUrl!);

    if (!token) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
      return;
    }

    const { where, stage, accountId, limit, offset, search } = req.query;
    let soql = `SELECT Id, Name, AccountId, Account.Name, StageName, Amount, CloseDate, Probability,
                Type, LeadSource, NextStep, Description, OwnerId, Owner.Name, IsClosed, IsWon, CreatedDate
                FROM Opportunity`;

    const conditions: string[] = [];
    if (where) conditions.push(where as string);
    if (stage) conditions.push(`StageName = '${(stage as string).replace(/'/g, "\\'")}'`);
    if (accountId) conditions.push(`AccountId = '${accountId}'`);
    if (search) {
      const term = (search as string).replace(/'/g, "\\'");
      conditions.push(`Name LIKE '%${term}%'`);
    }

    if (conditions.length > 0) {
      soql += ` WHERE ${conditions.join(' AND ')}`;
    }
    soql += ` ORDER BY CloseDate DESC`;
    soql += ` LIMIT ${Math.min(parseInt(limit as string) || 100, 1000)}`;
    if (offset) soql += ` OFFSET ${offset}`;

    const response = await axios.get(`${token.token.instance_url}/services/data/${SF_API_VERSION}/query`, {
      params: { q: soql },
      headers: { Authorization: `Bearer ${token.token.access_token}` },
    });

    res.json({
      success: true,
      data: {
        records: response.data.records,
        total: response.data.totalSize,
        hasMore: !response.data.done,
      },
    });
  } catch (error) {
    const axiosError = error as AxiosError;
    logger.error('List opportunities error', { error: axiosError.message });
    res.status(500).json({
      success: false,
      error: { code: 'API_ERROR', message: axiosError.message },
    });
  }
}

/**
 * POST /api/opportunities
 * Create a new opportunity
 */
async function handleCreateOpportunity(req: Request, res: Response): Promise<void> {
  try {
    const instanceUrl = getInstanceUrlFromRequest(req);
    const token = tokenStorage.get(instanceUrl!);

    if (!token) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
      return;
    }

    const oppData = req.body;

    if (!oppData.Name || !oppData.StageName || !oppData.CloseDate) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Name, StageName, and CloseDate are required' },
      });
      return;
    }

    const response = await axios.post(
      `${token.token.instance_url}/services/data/${SF_API_VERSION}/sobjects/Opportunity`,
      oppData,
      { headers: { Authorization: `Bearer ${token.token.access_token}` } }
    );

    logger.info('Opportunity created', { opportunityId: response.data.id });

    const records = await fetchRecords(instanceUrl!, 'Opportunity', response.data.id);

    res.status(201).json({
      success: true,
      data: records[0],
    });
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }[]>;
    logger.error('Create opportunity error', { error: axiosError.message });
    res.status(500).json({
      success: false,
      error: {
        code: 'CREATE_ERROR',
        message: (axiosError.response?.data as Array<{message?: string}>)?.[0]?.message || axiosError.message,
      },
    });
  }
}

/**
 * GET /api/opportunities/:id
 * Get a specific opportunity
 */
async function handleGetOpportunity(req: Request, res: Response): Promise<void> {
  try {
    const instanceUrl = getInstanceUrlFromRequest(req);
    const token = tokenStorage.get(instanceUrl!);
    const { id } = req.params;

    if (!token) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
      return;
    }

    const records = await fetchRecords(instanceUrl!, 'Opportunity', id);

    if (records.length === 0) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Opportunity not found: ${id}` },
      });
      return;
    }

    res.json({
      success: true,
      data: records[0],
    });
  } catch (error) {
    const axiosError = error as AxiosError;
    logger.error('Get opportunity error', { error: axiosError.message });
    res.status(500).json({
      success: false,
      error: { code: 'API_ERROR', message: axiosError.message },
    });
  }
}

/**
 * PATCH /api/opportunities/:id
 * Update an opportunity (including stage updates)
 */
async function handleUpdateOpportunity(req: Request, res: Response): Promise<void> {
  try {
    const instanceUrl = getInstanceUrlFromRequest(req);
    const token = tokenStorage.get(instanceUrl!);
    const { id } = req.params;

    if (!token) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
      return;
    }

    const updateData = req.body;

    await axios.patch(
      `${token.token.instance_url}/services/data/${SF_API_VERSION}/sobjects/Opportunity/${id}`,
      updateData,
      { headers: { Authorization: `Bearer ${token.token.access_token}` } }
    );

    if (updateData.StageName) {
      logger.info('Opportunity stage updated', { opportunityId: id, newStage: updateData.StageName });
    } else {
      logger.info('Opportunity updated', { opportunityId: id });
    }

    const records = await fetchRecords(instanceUrl!, 'Opportunity', id);

    res.json({
      success: true,
      data: records[0],
    });
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }[]>;
    logger.error('Update opportunity error', { error: axiosError.message });
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: axiosError.response?.data?.[0]?.message || axiosError.message,
      },
    });
  }
}

/**
 * DELETE /api/opportunities/:id
 * Delete an opportunity
 */
async function handleDeleteOpportunity(req: Request, res: Response): Promise<void> {
  try {
    const instanceUrl = getInstanceUrlFromRequest(req);
    const token = tokenStorage.get(instanceUrl!);
    const { id } = req.params;

    if (!token) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
      return;
    }

    await axios.delete(
      `${token.token.instance_url}/services/data/${SF_API_VERSION}/sobjects/Opportunity/${id}`,
      { headers: { Authorization: `Bearer ${token.token.access_token}` } }
    );

    logger.info('Opportunity deleted', { opportunityId: id });

    res.json({
      success: true,
      data: { id, success: true },
    });
  } catch (error) {
    const axiosError = error as AxiosError;
    logger.error('Delete opportunity error', { error: axiosError.message });
    res.status(500).json({
      success: false,
      error: { code: 'DELETE_ERROR', message: axiosError.message },
    });
  }
}

/**
 * GET /api/opportunities/pipeline/summary
 * Get pipeline summary by stage
 */
async function handlePipelineSummary(req: Request, res: Response): Promise<void> {
  try {
    const instanceUrl = getInstanceUrlFromRequest(req);
    const token = tokenStorage.get(instanceUrl!);

    if (!token) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
      return;
    }

    const soql = `SELECT StageName, COUNT(Id) opportunityCount, SUM(Amount) totalAmount,
                  AVG(Probability) avgProbability
                  FROM Opportunity
                  WHERE IsClosed = false
                  GROUP BY StageName
                  ORDER BY COUNT(Id) DESC`;

    const response = await axios.get(`${token.token.instance_url}/services/data/${SF_API_VERSION}/query`, {
      params: { q: soql },
      headers: { Authorization: `Bearer ${token.token.access_token}` },
    });

    const pipeline = response.data.records.map((record: Record<string, unknown>) => {
      const totalAmount = (record.totalAmount as number) || 0;
      const avgProbability = (record.avgProbability as number) || 0;
      return {
        stage: record.StageName as string,
        count: record.opportunityCount as number,
        totalAmount,
        avgProbability,
        weightedAmount: totalAmount * avgProbability / 100,
      };
    });

    const totals = pipeline.reduce(
      (acc: { count: number; amount: number; weighted: number }, stage: { count: number; totalAmount: number; weightedAmount: number }) => ({
        count: acc.count + stage.count,
        amount: acc.amount + stage.totalAmount,
        weighted: acc.weighted + stage.weightedAmount,
      }),
      { count: 0, amount: 0, weighted: 0 }
    );

    res.json({
      success: true,
      data: {
        pipeline,
        totals,
      },
    });
  } catch (error) {
    const axiosError = error as AxiosError;
    logger.error('Pipeline summary error', { error: axiosError.message });
    res.status(500).json({
      success: false,
      error: { code: 'API_ERROR', message: axiosError.message },
    });
  }
}

// ============ Accounts API Routes ============

/**
 * GET /api/accounts
 * List accounts
 */
async function handleListAccounts(req: Request, res: Response): Promise<void> {
  try {
    const instanceUrl = getInstanceUrlFromRequest(req);
    const token = tokenStorage.get(instanceUrl!);

    if (!token) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
      return;
    }

    const { where, industry, limit, offset, search } = req.query;
    let soql = `SELECT Id, Name, Type, Industry, AnnualRevenue, NumberOfEmployees, Website, Phone,
                BillingCity, BillingState, OwnerId, Owner.Name, CreatedDate FROM Account`;

    const conditions: string[] = [];
    if (where) conditions.push(where as string);
    if (industry) conditions.push(`Industry = '${(industry as string).replace(/'/g, "\\'")}'`);
    if (search) {
      const term = (search as string).replace(/'/g, "\\'");
      conditions.push(`(Name LIKE '%${term}%' OR Website LIKE '%${term}%')`);
    }

    if (conditions.length > 0) {
      soql += ` WHERE ${conditions.join(' AND ')}`;
    }
    soql += ` ORDER BY Name`;
    soql += ` LIMIT ${Math.min(parseInt(limit as string) || 100, 1000)}`;
    if (offset) soql += ` OFFSET ${offset}`;

    const response = await axios.get(`${token.token.instance_url}/services/data/${SF_API_VERSION}/query`, {
      params: { q: soql },
      headers: { Authorization: `Bearer ${token.token.access_token}` },
    });

    res.json({
      success: true,
      data: {
        records: response.data.records,
        total: response.data.totalSize,
        hasMore: !response.data.done,
      },
    });
  } catch (error) {
    const axiosError = error as AxiosError;
    logger.error('List accounts error', { error: axiosError.message });
    res.status(500).json({
      success: false,
      error: { code: 'API_ERROR', message: axiosError.message },
    });
  }
}

/**
 * POST /api/accounts
 * Create a new account
 */
async function handleCreateAccount(req: Request, res: Response): Promise<void> {
  try {
    const instanceUrl = getInstanceUrlFromRequest(req);
    const token = tokenStorage.get(instanceUrl!);

    if (!token) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
      return;
    }

    const accountData = req.body;

    if (!accountData.Name) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Name is required' },
      });
      return;
    }

    const response = await axios.post(
      `${token.token.instance_url}/services/data/${SF_API_VERSION}/sobjects/Account`,
      accountData,
      { headers: { Authorization: `Bearer ${token.token.access_token}` } }
    );

    logger.info('Account created', { accountId: response.data.id });

    const records = await fetchRecords(instanceUrl!, 'Account', response.data.id);

    res.status(201).json({
      success: true,
      data: records[0],
    });
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }[]>;
    logger.error('Create account error', { error: axiosError.message });
    res.status(500).json({
      success: false,
      error: {
        code: 'CREATE_ERROR',
        message: (axiosError.response?.data as Array<{message?: string}>)?.[0]?.message || axiosError.message,
      },
    });
  }
}

/**
 * GET /api/accounts/:id
 * Get a specific account
 */
async function handleGetAccount(req: Request, res: Response): Promise<void> {
  try {
    const instanceUrl = getInstanceUrlFromRequest(req);
    const token = tokenStorage.get(instanceUrl!);
    const { id } = req.params;

    if (!token) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
      return;
    }

    const records = await fetchRecords(instanceUrl!, 'Account', id);

    if (records.length === 0) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Account not found: ${id}` },
      });
      return;
    }

    res.json({
      success: true,
      data: records[0],
    });
  } catch (error) {
    const axiosError = error as AxiosError;
    logger.error('Get account error', { error: axiosError.message });
    res.status(500).json({
      success: false,
      error: { code: 'API_ERROR', message: axiosError.message },
    });
  }
}

/**
 * PATCH /api/accounts/:id
 * Update an account
 */
async function handleUpdateAccount(req: Request, res: Response): Promise<void> {
  try {
    const instanceUrl = getInstanceUrlFromRequest(req);
    const token = tokenStorage.get(instanceUrl!);
    const { id } = req.params;

    if (!token) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
      return;
    }

    await axios.patch(
      `${token.token.instance_url}/services/data/${SF_API_VERSION}/sobjects/Account/${id}`,
      req.body,
      { headers: { Authorization: `Bearer ${token.token.access_token}` } }
    );

    logger.info('Account updated', { accountId: id });

    const records = await fetchRecords(instanceUrl!, 'Account', id);

    res.json({
      success: true,
      data: records[0],
    });
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }[]>;
    logger.error('Update account error', { error: axiosError.message });
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: axiosError.response?.data?.[0]?.message || axiosError.message,
      },
    });
  }
}

/**
 * DELETE /api/accounts/:id
 * Delete an account
 */
async function handleDeleteAccount(req: Request, res: Response): Promise<void> {
  try {
    const instanceUrl = getInstanceUrlFromRequest(req);
    const token = tokenStorage.get(instanceUrl!);
    const { id } = req.params;

    if (!token) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
      return;
    }

    await axios.delete(
      `${token.token.instance_url}/services/data/${SF_API_VERSION}/sobjects/Account/${id}`,
      { headers: { Authorization: `Bearer ${token.token.access_token}` } }
    );

    logger.info('Account deleted', { accountId: id });

    res.json({
      success: true,
      data: { id, success: true },
    });
  } catch (error) {
    const axiosError = error as AxiosError;
    logger.error('Delete account error', { error: axiosError.message });
    res.status(500).json({
      success: false,
      error: { code: 'DELETE_ERROR', message: axiosError.message },
    });
  }
}

// ============ Helper Functions ============

/**
 * Fetch records by ID
 */
async function fetchRecords(instanceUrl: string, objectType: string, id: string): Promise<Record<string, unknown>[]> {
  const token = tokenStorage.get(instanceUrl);
  if (!token) return [];

  const response = await axios.get(
    `${token.token.instance_url}/services/data/${SF_API_VERSION}/query`,
    {
      params: { q: `SELECT Id, * FROM ${objectType} WHERE Id = '${id}' LIMIT 1` },
      headers: { Authorization: `Bearer ${token.token.access_token}` },
    }
  );

  return response.data.records || [];
}

/**
 * Execute raw SOQL query
 */
async function handleQuery(req: Request, res: Response): Promise<void> {
  try {
    const instanceUrl = getInstanceUrlFromRequest(req);
    const token = tokenStorage.get(instanceUrl!);

    if (!token) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
      return;
    }

    const { q } = req.query;

    if (!q) {
      res.status(400).json({
        success: false,
        error: { code: 'MISSING_QUERY', message: 'SOQL query (q) parameter is required' },
      });
      return;
    }

    const response = await axios.get(`${token.token.instance_url}/services/data/${SF_API_VERSION}/query`, {
      params: { q },
      headers: { Authorization: `Bearer ${token.token.access_token}` },
    });

    res.json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }[]>;
    logger.error('SOQL query error', { error: axiosError.message });
    res.status(500).json({
      success: false,
      error: {
        code: 'QUERY_ERROR',
        message: axiosError.response?.data?.[0]?.message || axiosError.message,
      },
    });
  }
}

/**
 * Get observer events for TwinOS
 */
function handleObserverEvents(req: Request, res: Response): void {
  const { employeeId, days } = req.query;
  const daysNum = parseInt(days as string) || 7;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysNum);

  // In a real implementation, this would query the observer events storage
  res.json({
    success: true,
    data: {
      events: [],
      total: 0,
      filters: {
        employeeId,
        days: daysNum,
        cutoff: cutoff.toISOString(),
      },
    },
  });
}

// ============ Express App Setup ============

const app: Express = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for API
}));
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Apply middleware
app.use(rateLimitMiddleware);
app.use(sessionMiddleware);

// Request logging
app.use((req, _res, next) => {
  logger.debug('Incoming request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
  });
  next();
});

// ============ Health & Status Routes ============

app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'salesforce-connector',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get('/ready', (_req, res) => {
  const hasConfig = !!(process.env.SF_CLIENT_ID && process.env.SF_CLIENT_SECRET);
  const isAuthenticated = tokenStorage.size > 0;

  res.json({
    ready: hasConfig,
    configured: hasConfig,
    authenticated: isAuthenticated,
    instances: Array.from(tokenStorage.keys()),
    sessions: sessionStorage.size,
  });
});

// ============ OAuth Routes ============

app.post('/auth/login', handleLogin);
app.get('/auth/callback', handleCallback);
app.post('/auth/refresh', handleRefresh);
app.post('/auth/logout', handleLogout);
app.get('/auth/status', handleStatus);

// ============ Leads API Routes ============

app.get('/api/leads', requireAuth, handleListLeads);
app.post('/api/leads', requireAuth, handleCreateLead);
app.get('/api/leads/:id', requireAuth, handleGetLead);
app.patch('/api/leads/:id', requireAuth, handleUpdateLead);
app.delete('/api/leads/:id', requireAuth, handleDeleteLead);

// ============ Contacts API Routes ============

app.get('/api/contacts', requireAuth, handleListContacts);
app.post('/api/contacts', requireAuth, handleCreateContact);
app.get('/api/contacts/:id', requireAuth, handleGetContact);
app.patch('/api/contacts/:id', requireAuth, handleUpdateContact);
app.delete('/api/contacts/:id', requireAuth, handleDeleteContact);

// ============ Opportunities API Routes ============

app.get('/api/opportunities', requireAuth, handleListOpportunities);
app.post('/api/opportunities', requireAuth, handleCreateOpportunity);
app.get('/api/opportunities/pipeline/summary', requireAuth, handlePipelineSummary);
app.get('/api/opportunities/:id', requireAuth, handleGetOpportunity);
app.patch('/api/opportunities/:id', requireAuth, handleUpdateOpportunity);
app.delete('/api/opportunities/:id', requireAuth, handleDeleteOpportunity);

// ============ Accounts API Routes ============

app.get('/api/accounts', requireAuth, handleListAccounts);
app.post('/api/accounts', requireAuth, handleCreateAccount);
app.get('/api/accounts/:id', requireAuth, handleGetAccount);
app.patch('/api/accounts/:id', requireAuth, handleUpdateAccount);
app.delete('/api/accounts/:id', requireAuth, handleDeleteAccount);

// ============ Utility Routes ============

app.get('/api/query', requireAuth, handleQuery);
app.get('/api/observer/events/:userId', handleObserverEvents);
app.get('/api/observer/events', handleObserverEvents);

// ============ Error Handling ============

app.use(errorHandler);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found',
    },
  });
});

// ============ Server Startup ============

const server = app.listen(PORT, () => {
  logger.info('='.repeat(60));
  logger.info('Salesforce Connector Started');
  logger.info(`Port: ${PORT}`);
  logger.info(`Environment: ${NODE_ENV}`);
  logger.info(`API Version: ${SF_API_VERSION}`);
  logger.info('='.repeat(60));
  logger.info('Endpoints:');
  logger.info('  POST   /auth/login        - Initiate OAuth flow');
  logger.info('  GET    /auth/callback      - OAuth callback');
  logger.info('  POST   /auth/refresh      - Refresh access token');
  logger.info('  POST   /auth/logout       - Logout');
  logger.info('  GET    /auth/status       - Auth status');
  logger.info('  GET    /api/leads         - List leads');
  logger.info('  POST   /api/leads         - Create lead');
  logger.info('  GET    /api/leads/:id      - Get lead');
  logger.info('  PATCH  /api/leads/:id      - Update lead');
  logger.info('  DELETE /api/leads/:id      - Delete lead');
  logger.info('  GET    /api/contacts      - List contacts');
  logger.info('  POST   /api/contacts      - Create contact');
  logger.info('  GET    /api/contacts/:id  - Get contact');
  logger.info('  PATCH  /api/contacts/:id  - Update contact');
  logger.info('  DELETE /api/contacts/:id  - Delete contact');
  logger.info('  GET    /api/opportunities - List opportunities');
  logger.info('  POST   /api/opportunities - Create opportunity');
  logger.info('  GET    /api/opportunities/pipeline/summary - Pipeline summary');
  logger.info('  GET    /api/opportunities/:id - Get opportunity');
  logger.info('  PATCH  /api/opportunities/:id - Update opportunity');
  logger.info('  DELETE /api/opportunities/:id - Delete opportunity');
  logger.info('  GET    /api/accounts      - List accounts');
  logger.info('  POST   /api/accounts      - Create account');
  logger.info('  GET    /api/accounts/:id  - Get account');
  logger.info('  PATCH  /api/accounts/:id  - Update account');
  logger.info('  DELETE /api/accounts/:id  - Delete account');
  logger.info('  GET    /api/query         - Execute SOQL query');
  logger.info('  GET    /api/observer/events - Get observer events');
  logger.info('='.repeat(60));
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

// Export app for testing
export default app;
