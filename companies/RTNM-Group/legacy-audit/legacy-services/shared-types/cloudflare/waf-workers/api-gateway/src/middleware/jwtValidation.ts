/**
 * JWT Validation Middleware
 * Validates JWT tokens at the API Gateway level
 * - Reduces load on individual services
 * - Centralized auth enforcement
 * - Rejects invalid/expired tokens before they reach upstream
 */

import type { Middleware } from 'itty-router';
import { jwtVerify, decodeJwt } from 'jose';

interface JWTPayload {
  sub: string; // User ID
  iat: number; // Issued at
  exp: number; // Expiration
  iss: string; // Issuer
  scope?: string[]; // Permissions
  client_id?: string; // OAuth client ID
}

interface JWTValidationResult {
  valid: boolean;
  payload?: JWTPayload;
  error?: string;
}

/**
 * Decode and validate a JWT token with cryptographic signature verification
 */
async function verifyJWT(token: string, secret: Uint8Array): Promise<JWTValidationResult> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'Invalid token format' };
    }

    // First decode header to check algorithm (without verification)
    const headerData = JSON.parse(atob(parts[0]));
    if (headerData.alg !== 'HS256' && headerData.alg !== 'RS256') {
      return { valid: false, error: `Unsupported algorithm: ${headerData.alg}` };
    }

    // Verify signature and decode payload using jose
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ['HS256', 'RS256']
    });

    // Validate required fields
    if (!payload.sub) {
      return { valid: false, error: 'Missing subject (sub) claim' };
    }

    const jwtPayload: JWTPayload = {
      sub: payload.sub as string,
      iat: payload.iat || 0,
      exp: payload.exp || 0,
      iss: payload.iss || '',
      scope: payload.scope as string[] | undefined,
      client_id: payload.client_id as string | undefined
    };

    return { valid: true, payload: jwtPayload };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Token verification failed';
    return { valid: false, error: message };
  }
}

/**
 * Extract Bearer token from Authorization header
 */
function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
}

export function withJWTValidation(options: {
  required?: boolean; // If true, rejects requests without valid JWT
  passthrough?: boolean; // If true, passes request through even without valid JWT (logs only)
  skipPaths?: string[]; // Paths to skip JWT validation
} = {}): Middleware {
  const {
    required = false,
    passthrough = true,
    skipPaths = ['/health', '/health/socket', '/api/health'],
  } = options;

  return async (request: Request, env: Env): Promise<Response | undefined> => {
    const url = new URL(request.url);

    // Skip validation for certain paths
    if (skipPaths.some(path => url.pathname.startsWith(path))) {
      return undefined;
    }

    const authHeader = request.headers.get('Authorization');
    const token = extractBearerToken(authHeader);

    if (!token) {
      if (required) {
        console.warn('[JWTValidation] Missing token on protected route:', { path: url.pathname });
        return new Response(JSON.stringify({
          error: 'Unauthorized',
          message: 'Missing or invalid Authorization header',
          code: 'MISSING_TOKEN',
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return undefined;
    }

    // Get JWT secret from environment
    const jwtSecret = env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('[JWTValidation] JWT_SECRET not configured');
      return new Response(JSON.stringify({
        error: 'Internal Server Error',
        message: 'Authentication service misconfigured',
        code: 'CONFIG_ERROR',
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Convert secret to Uint8Array for jose
    const secretKey = new TextEncoder().encode(jwtSecret);

    // Verify JWT with signature validation
    const result = await verifyJWT(token, secretKey);

    if (!result.valid) {
      console.warn('[JWTValidation] Invalid token:', {
        path: url.pathname,
        error: result.error,
        ip: request.headers.get('CF-Connecting-IP'),
      });

      if (required) {
        return new Response(JSON.stringify({
          error: 'Unauthorized',
          message: result.error || 'Invalid token',
          code: 'INVALID_TOKEN',
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return undefined;
    }

    // Token is valid — attach payload to request for downstream use
    (request as Record<string, unknown>).__jwt = result.payload;

    // Log successful validation
    console.info('[JWTValidation] Token valid:', {
      path: url.pathname,
      sub: result.payload?.sub,
      client_id: result.payload?.client_id,
    });

    return undefined;
  };
}

/**
 * Get JWT payload from request (set by withJWTValidation middleware)
 */
export function getJWTPayload(request: Request): JWTPayload | null {
  return (request as any).__jwt || null;
}

/**
 * Require specific scopes for a route
 */
export function requireScopes(requiredScopes: string[]): Middleware {
  return async (request: Request): Promise<Response | undefined> => {
    const payload = getJWTPayload(request);

    if (!payload) {
      return new Response(JSON.stringify({
        error: 'Unauthorized',
        message: 'Authentication required',
        code: 'NO_TOKEN',
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const tokenScopes = payload.scope || [];
    const hasAllScopes = requiredScopes.every(scope => tokenScopes.includes(scope));

    if (!hasAllScopes) {
      console.warn('[JWTValidation] Insufficient scopes:', {
        required: requiredScopes,
        has: tokenScopes,
        sub: payload.sub,
      });

      return new Response(JSON.stringify({
        error: 'Forbidden',
        message: 'Insufficient permissions',
        code: 'INSUFFICIENT_SCOPE',
        required: requiredScopes,
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return undefined;
  };
}
