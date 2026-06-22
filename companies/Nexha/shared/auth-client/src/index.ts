/**
 * @rez/auth-client - Unified Auth Client for REZ Ecosystem
 *
 * Provides authentication for all REZ products:
 * - RABTUL Auth Service (primary)
 * - Partner OAuth2
 * - Internal service-to-service auth
 *
 * @example
 * ```typescript
 * import { createRezAuthClient } from '@rez/auth-client';
 *
 * const auth = createRezAuthClient({
 *   authServiceUrl: process.env.AUTH_SERVICE_URL,
 *   internalToken: process.env.INTERNAL_SERVICE_TOKEN
 * });
 *
 * const user = await auth.validateToken(token);
 * ```
 */

import { z } from 'zod';

// ============================================================================
// Types
// ============================================================================

export type UserRole =
  | 'merchant'
  | 'supplier'
  | 'distributor'
  | 'franchise'
  | 'manufacturer'
  | 'retailer'
  | 'consumer'
  | 'admin';

export interface RezAuthUser {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  merchantId?: string;
  supplierId?: string;
  distributorId?: string;
  franchiseId?: string;
  manufacturerId?: string;
  businessName?: string;
}

export interface TokenExchangeResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  user: RezAuthUser;
}

export interface ValidateTokenResponse {
  valid: boolean;
  user?: RezAuthUser;
  error?: string;
}

export interface OAuthCallbackResult {
  success: boolean;
  user?: RezAuthUser;
  token?: string;
  error?: string;
}

export interface AuthClientConfig {
  /** RABTUL Auth Service URL */
  authServiceUrl: string;
  /** Internal service token for service-to-service calls */
  internalToken?: string;
  /** Partner OAuth2 client ID */
  partnerClientId?: string;
  /** Partner OAuth2 client secret */
  partnerClientSecret?: string;
  /** Partner OAuth2 redirect URI */
  partnerRedirectUri?: string;
  /** Request timeout in ms */
  timeout?: number;
}

// ============================================================================
// Zod Schemas
// ============================================================================

const RezAuthUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().optional(),
  role: z.enum([
    'merchant', 'supplier', 'distributor', 'franchise',
    'manufacturer', 'retailer', 'consumer', 'admin'
  ]),
  merchantId: z.string().optional(),
  supplierId: z.string().optional(),
  distributorId: z.string().optional(),
  franchiseId: z.string().optional(),
  manufacturerId: z.string().optional(),
  businessName: z.string().optional(),
});

const TokenExchangeResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
  token_type: z.string(),
  user: RezAuthUserSchema,
});

const ValidateTokenResponseSchema = z.object({
  valid: z.boolean(),
  user: RezAuthUserSchema.optional(),
  error: z.string().optional(),
});

// ============================================================================
// Custom Error
// ============================================================================

export class RezAuthError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'RezAuthError';
  }
}

// ============================================================================
// Auth Client
// ============================================================================

export interface IRezAuthClient {
  /** Validate a JWT token */
  validateToken(token: string): Promise<ValidateTokenResponse>;

  /** Exchange OAuth2 code for tokens */
  exchangeCode(code: string, redirectUri: string): Promise<TokenExchangeResponse>;

  /** Get user info from token */
  getUserInfo(token: string): Promise<RezAuthUser>;

  /** Refresh access token */
  refreshToken(refreshToken: string): Promise<TokenExchangeResponse>;

  /** Verify internal service token */
  verifyInternalToken(token: string, serviceName?: string): Promise<boolean>;
}

export function createRezAuthClient(config: AuthClientConfig): IRezAuthClient {
  const {
    authServiceUrl,
    internalToken,
    partnerClientId,
    partnerClientSecret,
    timeout = 10000,
  } = config;

  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...(internalToken ? { 'X-Internal-Token': internalToken } : {}),
  };

  async function request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(`${authServiceUrl}${endpoint}`, {
        ...options,
        headers: {
          ...defaultHeaders,
          ...options.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new RezAuthError(
          errorBody.message || errorBody.error || `HTTP ${response.status}`,
          String(response.status),
          response.status
        );
      }

      return response.json();
    } catch (error) {
      clearTimeout(timer);
      if (error instanceof RezAuthError) throw error;
      if (error instanceof TypeError) {
        throw new RezAuthError(
          'Network error: Unable to connect to Auth Service',
          'NETWORK_ERROR'
        );
      }
      throw error;
    }
  }

  return {
    async validateToken(token: string): Promise<ValidateTokenResponse> {
      try {
        const response = await request<z.infer<typeof ValidateTokenResponseSchema>>(
          '/api/auth/verify',
          {
            method: 'POST',
            body: JSON.stringify({ token }),
          }
        );
        return response;
      } catch (error) {
        if (error instanceof RezAuthError) {
          return { valid: false, error: error.message };
        }
        return { valid: false, error: 'Unknown error' };
      }
    },

    async exchangeCode(code: string, redirectUri: string): Promise<TokenExchangeResponse> {
      if (!partnerClientId || !partnerClientSecret) {
        throw new RezAuthError(
          'OAuth2 partner credentials not configured',
          'CONFIG_MISSING'
        );
      }

      const response = await request<z.infer<typeof TokenExchangeResponseSchema>>(
        '/oauth/token',
        {
          method: 'POST',
          body: JSON.stringify({
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
            client_id: partnerClientId,
            client_secret: partnerClientSecret,
          }),
        }
      );

      return response;
    },

    async getUserInfo(token: string): Promise<RezAuthUser> {
      const response = await request<RezAuthUser>(
        '/oauth/userinfo',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return RezAuthUserSchema.parse(response);
    },

    async refreshToken(refreshToken: string): Promise<TokenExchangeResponse> {
      if (!partnerClientId || !partnerClientSecret) {
        throw new RezAuthError(
          'OAuth2 partner credentials not configured',
          'CONFIG_MISSING'
        );
      }

      const response = await request<z.infer<typeof TokenExchangeResponseSchema>>(
        '/oauth/token',
        {
          method: 'POST',
          body: JSON.stringify({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            client_id: partnerClientId,
            client_secret: partnerClientSecret,
          }),
        }
      );

      return response;
    },

    async verifyInternalToken(token: string, serviceName?: string): Promise<boolean> {
      try {
        const response = await request<{ valid: boolean }>(
          '/api/internal/verify',
          {
            method: 'POST',
            body: JSON.stringify({ token, serviceName }),
          }
        );
        return response.valid;
      } catch {
        return false;
      }
    },
  };
}

// ============================================================================
// Service Token Helper
// ============================================================================

export interface InternalServiceAuth {
  getHeaders: () => Record<string, string>;
  verifyToken: (token: string) => Promise<boolean>;
}

/**
 * Creates internal service authentication helper
 */
export function createInternalServiceAuth(internalToken: string, authServiceUrl: string): InternalServiceAuth {
  return {
    getHeaders: () => ({
      'Content-Type': 'application/json',
      'X-Internal-Token': internalToken,
    }),

    verifyToken: async (token: string): Promise<boolean> => {
      try {
        const response = await fetch(`${authServiceUrl}/api/internal/verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Token': internalToken,
          },
          body: JSON.stringify({ token }),
        });
        const data = await response.json();
        return data.valid === true;
      } catch {
        return false;
      }
    },
  };
}

// ============================================================================
// Express Middleware Factory
// ============================================================================

export interface AuthMiddlewareOptions {
  authClient: IRezAuthClient;
  requiredRole?: UserRole;
}

export function createAuthMiddleware(options: AuthMiddlewareOptions) {
  return async (
    req: { headers: { authorization?: string }; user?: RezAuthUser },
    res: { status: (code: number) => { json: (data: object) => void } },
    next: () => void
  ) => {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'No token provided' }
      });
      return;
    }

    const result = await options.authClient.validateToken(token);

    if (!result.valid || !result.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: result.error || 'Invalid token' }
      });
      return;
    }

    if (options.requiredRole && result.user.role !== options.requiredRole) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Insufficient permissions' }
      });
      return;
    }

    req.user = result.user;
    next();
  };
}
