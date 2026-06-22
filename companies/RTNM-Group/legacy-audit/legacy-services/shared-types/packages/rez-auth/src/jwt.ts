/**
 * @rez/auth - JWT Verification Utilities
 * Common JWT verification functions for all ReZ services
 */

import type {
  JWTPayload,
  TokenMetadata,
  TokenType,
  AuthenticatedUser,
  VerifyTokenOptions,
  UserRole,
} from './types.js';

// Re-export types
export type { JWTPayload, TokenMetadata, TokenType, AuthenticatedUser, VerifyTokenOptions } from './types.js';

// ── Constants ─────────────────────────────────────────────────────────────────

const ALGORITHMS = ['RS256', 'RS384', 'RS512', 'ES256', 'ES384', 'ES512'] as const;
const TOKEN_TYPE_CLAIM = 'token_type';
const ACCESS_TOKEN_TYPE = 'access';
const REFRESH_TOKEN_TYPE = 'refresh';

// ── Token Parsing ─────────────────────────────────────────────────────────────

/**
 * Parse a JWT token without verification (for inspection only)
 */
export function parseJWT(token: string): JWTPayload | null {
  if (!token || typeof token !== 'string') {
    return null;
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
    return payload;
  } catch {
    return null;
  }
}

/**
 * Extract the token type from a JWT payload
 */
export function extractTokenType(payload: JWTPayload): TokenType {
  const type = payload[TOKEN_TYPE_CLAIM] as string | undefined;
  if (type === REFRESH_TOKEN_TYPE) {
    return REFRESH_TOKEN_TYPE;
  }
  if (type === ACCESS_TOKEN_TYPE) {
    return ACCESS_TOKEN_TYPE;
  }
  // Default to access token for backward compatibility
  return ACCESS_TOKEN_TYPE;
}

/**
 * Get token metadata without verification
 */
export function getTokenMetadata(token: string): TokenMetadata | null {
  const payload = parseJWT(token);
  if (!payload) {
    return null;
  }

  const type = extractTokenType(payload);
  const userId = payload.sub || '';
  const now = Math.floor(Date.now() / 1000);
  const exp = payload.exp || now;
  const iat = payload.iat || now;

  return {
    type,
    userId,
    issuedAt: new Date(iat * 1000),
    expiresAt: new Date(exp * 1000),
    isExpired: exp < now,
    remainingSeconds: Math.max(0, exp - now),
  };
}

// ── JWT Verification (Structure Only) ─────────────────────────────────────────

/**
 * Verify JWT structure (algorithm and format)
 * Note: This does NOT verify the cryptographic signature
 *       Use a proper JWT library (jose, jsonwebtoken) for full verification
 */
export function verifyJWTStructure(token: string): {
  valid: boolean;
  error?: string;
  payload?: JWTPayload;
} {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Token must be a non-empty string' };
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return { valid: false, error: 'Invalid JWT format: expected 3 parts separated by dots' };
  }

  // Check if parts are valid base64url
  const base64urlRegex = /^[A-Za-z0-9_-]*$/;
  for (let i = 0; i < parts.length; i++) {
    if (!base64urlRegex.test(parts[i])) {
      return { valid: false, error: `Invalid JWT format: part ${i + 1} contains invalid characters` };
    }
  }

  // Parse and validate header
  let header: Record<string, unknown>;
  try {
    header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf-8'));
  } catch {
    return { valid: false, error: 'Invalid JWT format: unable to parse header' };
  }

  // Check algorithm
  const alg = header.alg as string;
  if (!alg || !ALGORITHMS.includes(alg as typeof ALGORITHMS[number])) {
    return { valid: false, error: `Unsupported algorithm: ${alg}` };
  }

  // Parse payload
  let payload: JWTPayload;
  try {
    payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
  } catch {
    return { valid: false, error: 'Invalid JWT format: unable to parse payload' };
  }

  // Check expiration
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    return { valid: false, error: 'Token has expired', payload };
  }

  // Check not before
  if (payload.nbf && payload.nbf > Math.floor(Date.now() / 1000)) {
    return { valid: false, error: 'Token is not yet valid', payload };
  }

  return { valid: true, payload };
}

// ── User ID Extraction ───────────────────────────────────────────────────────

/**
 * Extract user ID from a JWT token
 */
export function extractUserId(token: string): string | null {
  const payload = parseJWT(token);
  if (!payload) {
    return null;
  }
  return payload.sub || null;
}

/**
 * Extract user ID with validation
 */
export function extractUserIdValidated(token: string): {
  userId: string | null;
  isValid: boolean;
  error?: string;
} {
  const payload = parseJWT(token);
  if (!payload) {
    return { userId: null, isValid: false, error: 'Invalid token format' };
  }

  const userId = payload.sub;
  if (!userId) {
    return { userId: null, isValid: false, error: 'Token missing subject (user ID)' };
  }

  // Validate user ID format (should be a non-empty string)
  if (typeof userId !== 'string' || userId.trim().length === 0) {
    return { userId: null, isValid: false, error: 'Invalid user ID format' };
  }

  return { userId, isValid: true };
}

/**
 * Extract multiple user identifiers from a token
 */
export function extractUserIdentifiers(token: string): {
  userId?: string;
  merchantId?: string;
  sessionId?: string;
  appType?: string;
} {
  const payload = parseJWT(token);
  if (!payload) {
    return {};
  }

  return {
    userId: payload.sub,
    merchantId: payload.merchant_id as string | undefined,
    sessionId: payload.sid as string | undefined,
    appType: payload.app_type as string | undefined,
  };
}

// ── Authenticated User Creation ──────────────────────────────────────────────

/**
 * Create an AuthenticatedUser from JWT payload
 */
export function createAuthenticatedUser(payload: JWTPayload): AuthenticatedUser {
  const userId = payload.sub || '';
  const role = (payload.role as UserRole) || 'user';

  return {
    userId,
    email: payload.email as string | undefined,
    role,
    sessionId: payload.sid as string | undefined,
    merchantId: payload.merchant_id as string | undefined,
    appType: payload.app_type as string | undefined,
    claims: extractCustomClaims(payload),
  };
}

/**
 * Extract custom claims from JWT payload (excluding standard claims)
 */
export function extractCustomClaims(payload: JWTPayload): Record<string, unknown> {
  const standardClaims = [
    'sub', 'iss', 'aud', 'exp', 'nbf', 'iat', 'jti',
    'alg', 'typ', 'role', 'email', 'merchant_id', 'sid', 'app_type', 'token_type',
  ];

  const customClaims: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (!standardClaims.includes(key)) {
      customClaims[key] = value;
    }
  }

  return customClaims;
}

// ── Token Validation Helpers ──────────────────────────────────────────────────

/**
 * Check if a token is expired
 */
export function isTokenExpired(token: string): boolean {
  const payload = parseJWT(token);
  if (!payload || !payload.exp) {
    return true;
  }
  return payload.exp < Math.floor(Date.now() / 1000);
}

/**
 * Get remaining time until token expiration in seconds
 */
export function getTokenTTL(token: string): number {
  const payload = parseJWT(token);
  if (!payload || !payload.exp) {
    return 0;
  }
  return Math.max(0, payload.exp - Math.floor(Date.now() / 1000));
}

/**
 * Check if token is a refresh token
 */
export function isRefreshToken(token: string): boolean {
  const payload = parseJWT(token);
  if (!payload) {
    return false;
  }
  return extractTokenType(payload) === REFRESH_TOKEN_TYPE;
}

/**
 * Check if token is an access token
 */
export function isAccessToken(token: string): boolean {
  const payload = parseJWT(token);
  if (!payload) {
    return false;
  }
  return extractTokenType(payload) === ACCESS_TOKEN_TYPE;
}

// ── Token Generation Helpers ──────────────────────────────────────────────────

/**
 * Create a basic JWT payload for testing or development
 */
export function createTestPayload(userId: string, options: {
  expiresIn?: number; // seconds
  role?: UserRole;
  merchantId?: string;
  appType?: string;
} = {}): JWTPayload {
  const now = Math.floor(Date.now() / 1000);
  const expiresIn = options.expiresIn || 3600; // 1 hour default

  return {
    sub: userId,
    iat: now,
    exp: now + expiresIn,
    role: options.role || 'user',
    ...(options.merchantId && { merchant_id: options.merchantId }),
    ...(options.appType && { app_type: options.appType }),
    token_type: ACCESS_TOKEN_TYPE,
  };
}

// ── Authorization Helpers ────────────────────────────────────────────────────

/**
 * Check if a user has a required role
 */
export function hasRole(user: AuthenticatedUser, requiredRole: UserRole): boolean {
  const roleHierarchy: Record<UserRole, number> = {
    guest: 0,
    user: 1,
    merchant: 2,
    admin: 3,
    system: 4,
  };

  const userLevel = roleHierarchy[user.role || 'user'];
  const requiredLevel = roleHierarchy[requiredRole];

  return userLevel >= requiredLevel;
}

/**
 * Check if user has any of the required roles
 */
export function hasAnyRole(user: AuthenticatedUser, requiredRoles: UserRole[]): boolean {
  return requiredRoles.some(role => hasRole(user, role));
}

/**
 * Check if user is an admin
 */
export function isAdmin(user: AuthenticatedUser): boolean {
  return hasRole(user, 'admin');
}

/**
 * Check if user is a merchant
 */
export function isMerchant(user: AuthenticatedUser): boolean {
  return hasRole(user, 'merchant');
}

// ── Default Export ───────────────────────────────────────────────────────────

export const jwtUtils = {
  parseJWT,
  extractTokenType,
  getTokenMetadata,
  verifyJWTStructure,
  extractUserId,
  extractUserIdValidated,
  extractUserIdentifiers,
  createAuthenticatedUser,
  extractCustomClaims,
  isTokenExpired,
  getTokenTTL,
  isRefreshToken,
  isAccessToken,
  createTestPayload,
  hasRole,
  hasAnyRole,
  isAdmin,
  isMerchant,
};

export default jwtUtils;
