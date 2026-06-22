/**
 * @rez/auth - Authentication Types
 * Type definitions for auth tokens and session data
 */

// ── Token Types ────────────────────────────────────────────────────────────────

export interface JWTPayload {
  /** Subject (user ID) */
  sub?: string;
  /** Issuer */
  iss?: string;
  /** Audience */
  aud?: string | string[];
  /** Expiration time (Unix timestamp) */
  exp?: number;
  /** Not before (Unix timestamp) */
  nbf?: number;
  /** Issued at (Unix timestamp) */
  iat?: number;
  /** JWT ID */
  jti?: string;
  /** Custom claims */
  [key: string]: unknown;
}

export interface TokenMetadata {
  /** Token type (e.g., 'access', 'refresh') */
  type: TokenType;
  /** User ID extracted from token */
  userId: string;
  /** Token issued at timestamp */
  issuedAt: Date;
  /** Token expiration timestamp */
  expiresAt: Date;
  /** Whether token is expired */
  isExpired: boolean;
  /** Remaining time until expiration in seconds */
  remainingSeconds: number;
}

export type TokenType = 'access' | 'refresh' | 'api' | 'anonymous';

// ── User Types ────────────────────────────────────────────────────────────────

export interface AuthenticatedUser {
  /** User's unique identifier */
  userId: string;
  /** User's email (if available) */
  email?: string;
  /** User's role */
  role?: UserRole;
  /** Session ID */
  sessionId?: string;
  /** Associated merchant ID (if applicable) */
  merchantId?: string;
  /** Associated app type (if applicable) */
  appType?: string;
  /** Additional custom claims */
  claims?: Record<string, unknown>;
}

export type UserRole = 'user' | 'merchant' | 'admin' | 'guest' | 'system';

// ── Session Types ─────────────────────────────────────────────────────────────

export interface SessionData {
  /** Session unique identifier */
  sessionId: string;
  /** User ID associated with session */
  userId: string;
  /** Session creation timestamp */
  createdAt: Date;
  /** Last activity timestamp */
  lastActiveAt: Date;
  /** Session expiration timestamp */
  expiresAt: Date;
  /** Whether session is valid */
  isValid: boolean;
  /** Session metadata */
  metadata?: SessionMetadata;
}

export interface SessionMetadata {
  /** Device type */
  deviceType?: 'mobile' | 'desktop' | 'tablet' | 'unknown';
  /** User agent string */
  userAgent?: string;
  /** IP address */
  ipAddress?: string;
  /** Location (if available) */
  location?: string;
  /** App type that created the session */
  appType?: string;
}

// ── Auth Context Types ────────────────────────────────────────────────────────

export interface AuthContext {
  /** Current authenticated user */
  user: AuthenticatedUser | null;
  /** Token metadata */
  token: TokenMetadata | null;
  /** Session data */
  session: SessionData | null;
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
  /** Authentication error (if any) */
  error?: AuthError;
}

export interface AuthError {
  /** Error code */
  code: AuthErrorCode;
  /** Human-readable message */
  message: string;
  /** HTTP status code */
  status: number;
}

export type AuthErrorCode =
  | 'TOKEN_MISSING'
  | 'TOKEN_INVALID'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_INVALID_FORMAT'
  | 'SESSION_EXPIRED'
  | 'SESSION_INVALID'
  | 'PERMISSION_DENIED'
  | 'INSUFFICIENT_SCOPE'
  | 'INTERNAL_ERROR';

// ── Verification Options ──────────────────────────────────────────────────────

export interface VerifyTokenOptions {
  /** Expected audience */
  audience?: string | string[];
  /** Expected issuer */
  issuer?: string;
  /** Clock tolerance in seconds (for nbf check) */
  clockTolerance?: number;
  /** Whether to ignore expiration check */
  ignoreExpiration?: boolean;
}

export interface ValidateSessionOptions {
  /** Maximum session age in milliseconds */
  maxAge?: number;
  /** Whether to update last active timestamp */
  updateLastActive?: boolean;
}

// ── Auth Provider Interface ───────────────────────────────────────────────────

export interface AuthProvider {
  /** Verify an access token */
  verifyToken(token: string, options?: VerifyTokenOptions): Promise<AuthenticatedUser>;
  /** Refresh an access token using refresh token */
  refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken?: string }>;
  /** Validate a session */
  validateSession(sessionId: string, options?: ValidateSessionOptions): Promise<SessionData | null>;
  /** Create a new session */
  createSession(userId: string, metadata?: SessionMetadata): Promise<SessionData>;
  /** Invalidate a session */
  invalidateSession(sessionId: string): Promise<void>;
  /** Extract user from request context */
  getAuthContext(request: unknown): Promise<AuthContext>;
}
