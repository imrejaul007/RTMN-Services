/**
 * JWT Validation Middleware
 * Validates JWT tokens at the API Gateway level
 * - Reduces load on individual services
 * - Centralized auth enforcement
 * - Rejects invalid/expired tokens before they reach upstream
 */

import type { Middleware } from 'itty-router';

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
 * Decode and validate a JWT token
 * Does NOT verify the signature (requires secret) — signature verification
 * should be done by the auth service or with a shared secret
 */
function decodeJWT(token: string): JWTValidationResult {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'Invalid token format' };
    }

    const [headerB64, payloadB64, signatureB64] = parts;

    // Decode payload
    const payloadJson = atob(headerB64);
    const header = JSON.parse(payloadJson);

    // Verify algorithm
    if (header.alg !== 'HS256' && header.alg !== 'RS256') {
      return { valid: false, error: `Unsupported algorithm: ${header.alg}` };
    }

    // Decode payload
    const payloadStr = payloadB64
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const padding = '='.repeat((4 - payloadStr.length % 4) % 4);
    const payloadDecoded = atob(payloadStr + padding);
    const payload: JWTPayload = JSON.parse(payloadDecoded);

    // Validate required fields
    if (!payload.sub) {
      return { valid: false, error: 'Missing subject (sub) claim' };
    }

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return { valid: false, error: 'Token expired' };
    }

    return { valid: true, payload };
  } catch (error) {
    return { valid: false, error: 'Failed to decode token' };
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

    // Decode and validate token
    const result = decodeJWT(token);

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
    (request as any).__jwt = result.payload;

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
