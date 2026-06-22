/**
 * RAZO Keyboard - CorpID/RABTUL Authentication Client
 *
 * Integrates with existing RTNM auth infrastructure:
 * - CorpID for identity management
 * - RABTUL for user authentication
 */

import crypto from 'crypto';

// Configuration
const CORPID_URL = process.env.CORPID_URL || 'http://localhost:4701';
const RABTUL_AUTH_URL = process.env.RABTUL_AUTH_URL || 'http://localhost:4002';
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || 'razo-internal-token';

/**
 * Auth response types
 */
export interface AuthVerifyResponse {
  valid: boolean;
  userId?: string;
  entityType?: string;
  corpId?: string;
  error?: string;
}

export interface TokenResponse {
  token: string;
  expiresIn: number;
  userId: string;
}

export interface UserProfile {
  userId: string;
  corpId: string;
  entityType: string;
  name?: string;
  email?: string;
  phone?: string;
}

/**
 * CorpID API client for identity management
 */
export class CorpIDClient {
  private baseUrl: string;
  private internalToken: string;

  constructor(baseUrl = CORPID_URL, internalToken = INTERNAL_TOKEN) {
    this.baseUrl = baseUrl;
    this.internalToken = internalToken;
  }

  /**
   * Internal service call helper
   */
  private async internalCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'x-internal-token': this.internalToken,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`CorpID API error ${response.status}: ${error}`);
    }

    return response.json();
  }

  /**
   * Get entity by CorpID
   */
  async getEntity(corpId: string): Promise<UserProfile | null> {
    try {
      const data = await this.internalCall<any>(`/api/identity/entity/${corpId}`);
      return {
        userId: data.userId || corpId,
        corpId: corpId,
        entityType: data.entityType || 'INDIVIDUAL',
        name: data.name,
        email: data.email,
        phone: data.phone,
      };
    } catch (error) {
      console.error('CorpID getEntity error:', error);
      return null;
    }
  }

  /**
   * Resolve user by ID (email, phone, or CorpID)
   */
  async resolveUser(identifier: string): Promise<UserProfile | null> {
    try {
      const data = await this.internalCall<any>('/api/identity/resolve', {
        method: 'POST',
        body: JSON.stringify({ identifier }),
      });
      return data;
    } catch (error) {
      console.error('CorpID resolveUser error:', error);
      return null;
    }
  }

  /**
   * Create CorpID for new user
   */
  async createEntity(userId: string, data: Partial<UserProfile>): Promise<string | null> {
    try {
      const result = await this.internalCall<{ corpId: string }>('/api/identity/entity', {
        method: 'POST',
        body: JSON.stringify({ userId, ...data }),
      });
      return result.corpId;
    } catch (error) {
      console.error('CorpID createEntity error:', error);
      return null;
    }
  }

  /**
   * Update entity profile
   */
  async updateEntity(corpId: string, data: Partial<UserProfile>): Promise<boolean> {
    try {
      await this.internalCall(`/api/identity/entity/${corpId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      return true;
    } catch (error) {
      console.error('CorpID updateEntity error:', error);
      return false;
    }
  }
}

/**
 * RABTUL Auth API client for user authentication
 */
export class RABTULAuthClient {
  private baseUrl: string;

  constructor(baseUrl = RABTUL_AUTH_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Verify user token
   */
  async verifyToken(token: string): Promise<AuthVerifyResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (response.ok && data.valid) {
        return {
          valid: true,
          userId: data.userId,
          entityType: data.entityType,
          corpId: data.corpId,
        };
      }

      return { valid: false, error: data.error || 'Invalid token' };
    } catch (error) {
      console.error('RABTUL verifyToken error:', error);
      return { valid: false, error: 'Auth service unavailable' };
    }
  }

  /**
   * Login with credentials
   */
  async login(identifier: string, password: string): Promise<TokenResponse | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          token: data.token,
          expiresIn: data.expiresIn || 86400,
          userId: data.userId,
        };
      }

      return null;
    } catch (error) {
      console.error('RABTUL login error:', error);
      return null;
    }
  }

  /**
   * Refresh token
   */
  async refreshToken(refreshToken: string): Promise<TokenResponse | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          token: data.token,
          expiresIn: data.expiresIn || 86400,
          userId: data.userId,
        };
      }

      return null;
    } catch (error) {
      console.error('RABTUL refreshToken error:', error);
      return null;
    }
  }

  /**
   * Logout / invalidate token
   */
  async logout(token: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      return response.ok;
    } catch (error) {
      console.error('RABTUL logout error:', error);
      return false;
    }
  }
}

// Singleton instances
let corpidClient: CorpIDClient | null = null;
let rabtulClient: RABTULAuthClient | null = null;

/**
 * Get CorpID client instance
 */
export function getCorpIDClient(): CorpIDClient {
  if (!corpidClient) {
    corpidClient = new CorpIDClient();
  }
  return corpidClient;
}

/**
 * Get RABTUL auth client instance
 */
export function getRABTULClient(): RABTULAuthClient {
  if (!rabtulClient) {
    rabtulClient = new RABTULAuthClient();
  }
  return rabtulClient;
}

/**
 * JWT middleware for Express - verifies JWT token
 */
export function createAuthMiddleware(options: {
  requireCorpID?: boolean;
  allowedEntityTypes?: string[];
} = {}) {
  const { requireCorpID = false, allowedEntityTypes = [] } = options;

  return async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Allow unauthenticated access for development
      if (process.env.NODE_ENV === 'development') {
        req.user = { userId: 'dev-user', corpId: 'CI-IND-DEVELOPER' };
        return next();
      }
      return res.status(401).json({ error: 'Authorization required' });
    }

    const token = authHeader.substring(7);

    try {
      const rabtul = getRABTULClient();
      const authResult = await rabtul.verifyToken(token);

      if (!authResult.valid) {
        return res.status(401).json({ error: authResult.error || 'Invalid token' });
      }

      req.user = {
        userId: authResult.userId,
        corpId: authResult.corpId,
        entityType: authResult.entityType,
      };

      // Check entity type if required
      if (allowedEntityTypes.length > 0 && authResult.entityType) {
        if (!allowedEntityTypes.includes(authResult.entityType)) {
          return res.status(403).json({ error: 'Entity type not allowed' });
        }
      }

      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      return res.status(500).json({ error: 'Authentication failed' });
    }
  };
}

/**
 * Internal service auth - validates x-internal-token header
 */
export function verifyInternalToken(req: any, res: any, next: any): void {
  const internalToken = req.headers['x-internal-token'];
  const expectedToken = process.env.INTERNAL_SERVICE_TOKEN || INTERNAL_TOKEN;

  if (!internalToken || !expectedToken) {
    // Allow in development
    if (process.env.NODE_ENV === 'development') {
      return next();
    }
    return res.status(401).json({ error: 'Internal token required' });
  }

  // Timing-safe comparison
  if (internalToken.length !== expectedToken.length) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const valid = crypto.timingSafeEqual(
    Buffer.from(internalToken),
    Buffer.from(expectedToken)
  );

  if (!valid) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  next();
}

/**
 * Generate a simple API key for service-to-service communication
 */
export function generateAPIKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash API key for storage
 */
export function hashAPIKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}