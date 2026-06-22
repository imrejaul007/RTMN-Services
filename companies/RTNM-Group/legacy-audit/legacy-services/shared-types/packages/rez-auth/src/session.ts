/**
 * @rez/auth - Session Validation Utilities
 * Session management and validation functions
 */

import type {
  SessionData,
  SessionMetadata,
  AuthenticatedUser,
  ValidateSessionOptions,
  SessionMetadata as SessionMetadataType,
} from './types.js';

// Re-export types
export type {
  SessionData,
  SessionMetadata,
  AuthenticatedUser,
  ValidateSessionOptions,
} from './types.js';

// ── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
const DEFAULT_SLIDING_EXPIRY = 30 * 60 * 1000; // 30 minutes of activity

// ── Session Creation ─────────────────────────────────────────────────────────

/**
 * Create a new session object
 */
export function createSession(
  userId: string,
  options: {
    sessionId?: string;
    expiresIn?: number;
    metadata?: SessionMetadata;
  } = {}
): SessionData {
  const now = new Date();
  const expiresIn = options.expiresIn || DEFAULT_MAX_AGE;
  const sessionId = options.sessionId || generateSessionId();

  const expiresAt = new Date(now.getTime() + expiresIn);

  return {
    sessionId,
    userId,
    createdAt: now,
    lastActiveAt: now,
    expiresAt,
    isValid: true,
    metadata: options.metadata,
  };
}

/**
 * Generate a unique session ID
 */
export function generateSessionId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  const randomPart2 = Math.random().toString(36).substring(2, 15);
  return `sess_${timestamp}_${randomPart}${randomPart2}`;
}

// ── Session Validation ────────────────────────────────────────────────────────

/**
 * Validate a session
 */
export function validateSession(
  session: SessionData | null,
  options: ValidateSessionOptions = {}
): {
  valid: boolean;
  session: SessionData | null;
  error?: string;
} {
  if (!session) {
    return { valid: false, session: null, error: 'Session not found' };
  }

  // Check if session is explicitly invalid
  if (!session.isValid) {
    return { valid: false, session, error: 'Session has been invalidated' };
  }

  // Check if session is expired
  const now = new Date();
  if (session.expiresAt < now) {
    return { valid: false, session: { ...session, isValid: false }, error: 'Session has expired' };
  }

  // Check maximum age
  if (options.maxAge) {
    const sessionAge = now.getTime() - session.createdAt.getTime();
    if (sessionAge > options.maxAge) {
      return { valid: false, session: { ...session, isValid: false }, error: 'Session exceeded maximum age' };
    }
  }

  // Update last active timestamp if requested
  if (options.updateLastActive) {
    session.lastActiveAt = now;
  }

  return { valid: true, session };
}

/**
 * Check if a session is active (exists and not expired)
 */
export function isSessionActive(session: SessionData | null): boolean {
  if (!session || !session.isValid) {
    return false;
  }
  return session.expiresAt > new Date();
}

/**
 * Check if a session should be refreshed (sliding expiry)
 */
export function shouldRefreshSession(session: SessionData): boolean {
  const now = new Date();
  const timeSinceLastActive = now.getTime() - session.lastActiveAt.getTime();
  return timeSinceLastActive > DEFAULT_SLIDING_EXPIRY;
}

/**
 * Extend session expiration
 */
export function extendSession(session: SessionData, extendBy: number = DEFAULT_MAX_AGE): SessionData {
  return {
    ...session,
    expiresAt: new Date(new Date().getTime() + extendBy),
    lastActiveAt: new Date(),
  };
}

// ── Session Updates ──────────────────────────────────────────────────────────

/**
 * Update session metadata
 */
export function updateSessionMetadata(
  session: SessionData,
  metadata: Partial<SessionMetadata>
): SessionData {
  return {
    ...session,
    metadata: {
      ...session.metadata,
      ...metadata,
    },
  };
}

/**
 * Mark session as invalidated
 */
export function invalidateSession(session: SessionData): SessionData {
  return {
    ...session,
    isValid: false,
  };
}

/**
 * Update last active timestamp
 */
export function touchSession(session: SessionData): SessionData {
  return {
    ...session,
    lastActiveAt: new Date(),
  };
}

// ── Session Queries ───────────────────────────────────────────────────────────

/**
 * Get remaining session time in milliseconds
 */
export function getSessionTTL(session: SessionData): number {
  const now = new Date();
  return Math.max(0, session.expiresAt.getTime() - now.getTime());
}

/**
 * Get session age in milliseconds
 */
export function getSessionAge(session: SessionData): number {
  return new Date().getTime() - session.createdAt.getTime();
}

/**
 * Check if session is about to expire (within 5 minutes)
 */
export function isSessionExpiringSoon(session: SessionData, thresholdMs: number = 5 * 60 * 1000): boolean {
  return getSessionTTL(session) < thresholdMs;
}

// ── Session Matching ─────────────────────────────────────────────────────────

/**
 * Check if a session belongs to a specific user
 */
export function isSessionForUser(session: SessionData, userId: string): boolean {
  return session.userId === userId;
}

/**
 * Check if a session matches the device/app criteria
 */
export function matchesSessionCriteria(
  session: SessionData,
  criteria: {
    appType?: string;
    deviceType?: string;
    ipAddress?: string;
  }
): boolean {
  if (!session.metadata) {
    return true; // No metadata to match against
  }

  if (criteria.appType && session.metadata.appType !== criteria.appType) {
    return false;
  }

  if (criteria.deviceType && session.metadata.deviceType !== criteria.deviceType) {
    return false;
  }

  if (criteria.ipAddress && session.metadata.ipAddress !== criteria.ipAddress) {
    return false;
  }

  return true;
}

// ── Session Cleanup ──────────────────────────────────────────────────────────

/**
 * Filter out expired sessions from a list
 */
export function filterExpiredSessions(sessions: SessionData[]): SessionData[] {
  const now = new Date();
  return sessions.filter(session => session.expiresAt > now && session.isValid);
}

/**
 * Sort sessions by last active (most recent first)
 */
export function sortByLastActive(sessions: SessionData[]): SessionData[] {
  return [...sessions].sort(
    (a, b) => b.lastActiveAt.getTime() - a.lastActiveAt.getTime()
  );
}

/**
 * Sort sessions by creation date (newest first)
 */
export function sortByCreatedAt(sessions: SessionData[]): SessionData[] {
  return [...sessions].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );
}

/**
 * Get active sessions count
 */
export function getActiveSessionCount(sessions: SessionData[]): number {
  return filterExpiredSessions(sessions).length;
}

/**
 * Get sessions created within a time range
 */
export function getSessionsInRange(
  sessions: SessionData[],
  startDate: Date,
  endDate: Date
): SessionData[] {
  return sessions.filter(
    session =>
      session.createdAt >= startDate && session.createdAt <= endDate
  );
}

// ── Default Export ───────────────────────────────────────────────────────────

export const sessionUtils = {
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
  DEFAULT_MAX_AGE,
  DEFAULT_SLIDING_EXPIRY,
};

export default sessionUtils;
