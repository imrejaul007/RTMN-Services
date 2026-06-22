/**
 * @rez/auth - ReZ Authentication Utilities
 *
 * Shared authentication package for all ReZ services.
 * Provides JWT verification, token parsing, user ID extraction,
 * and session validation utilities.
 *
 * @example
 * ```typescript
 * import { parseJWT, extractUserId, createSession } from '@rez/auth';
 *
 * // Parse a JWT token
 * const payload = parseJWT(token);
 * const userId = extractUserId(token);
 *
 * // Create a session
 * const session = createSession(userId);
 * ```
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type {
  JWTPayload,
  TokenMetadata,
  TokenType,
  AuthenticatedUser,
  UserRole,
  SessionData,
  SessionMetadata,
  AuthContext,
  AuthError,
  AuthErrorCode,
  VerifyTokenOptions,
  ValidateSessionOptions,
  AuthProvider,
} from './types.js';

// ── JWT Utilities ──────────────────────────────────────────────────────────────

export {
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
  jwtUtils,
} from './jwt.js';

export type {
  JWTPayload as JWTPayloadType,
  TokenMetadata as TokenMetadataType,
  TokenType as TokenTypeType,
  AuthenticatedUser as AuthenticatedUserType,
  VerifyTokenOptions as VerifyTokenOptionsType,
} from './jwt.js';

// ── Session Utilities ─────────────────────────────────────────────────────────

export {
  createSession,
  generateSessionId,
  validateSession,
  isSessionActive,
  shouldRefreshSession,
  extendSession,
  updateSessionMetadata,
  invalidateSession,
  touchSession,
  getSessionTTL,
  getSessionAge,
  isSessionExpiringSoon,
  isSessionForUser,
  matchesSessionCriteria,
  filterExpiredSessions,
  sortByLastActive,
  sortByCreatedAt,
  getActiveSessionCount,
  getSessionsInRange,
  sessionUtils,
} from './session.js';

export type {
  SessionData as SessionDataType,
  SessionMetadata as SessionMetadataType,
  AuthenticatedUser as AuthenticatedUserSessionType,
  ValidateSessionOptions as ValidateSessionOptionsType,
} from './session.js';

// ── Constants ─────────────────────────────────────────────────────────────────

/**
 * Common auth error codes with their HTTP status mappings
 */
export const AUTH_ERROR_CODES = {
  TOKEN_MISSING: { status: 401, message: 'Authentication token is required' },
  TOKEN_INVALID: { status: 401, message: 'Invalid authentication token' },
  TOKEN_EXPIRED: { status: 401, message: 'Authentication token has expired' },
  TOKEN_INVALID_FORMAT: { status: 400, message: 'Invalid token format' },
  SESSION_EXPIRED: { status: 401, message: 'Session has expired' },
  SESSION_INVALID: { status: 401, message: 'Invalid or expired session' },
  PERMISSION_DENIED: { status: 403, message: 'You do not have permission to perform this action' },
  INSUFFICIENT_SCOPE: { status: 403, message: 'Insufficient permissions' },
  INTERNAL_ERROR: { status: 500, message: 'An internal authentication error occurred' },
} as const;

/**
 * Standard token expiration times (in seconds)
 */
export const TOKEN_EXPIRATION = {
  ACCESS_TOKEN: 3600,        // 1 hour
  REFRESH_TOKEN: 604800,     // 7 days
  API_TOKEN: 86400,          // 24 hours
  ANONYMOUS_TOKEN: 1800,     // 30 minutes
} as const;

/**
 * Role hierarchy (higher number = more privileges)
 */
export const ROLE_HIERARCHY = {
  guest: 0,
  user: 1,
  merchant: 2,
  admin: 3,
  system: 4,
} as const;

// ── Re-export for convenience ─────────────────────────────────────────────────

export { jwtUtils as jwt, sessionUtils as session } from './jwt.js';
export { jwtUtils as token, sessionUtils as sessionValidation } from './jwt.js';
