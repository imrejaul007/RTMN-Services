/**
 * CorpID Cloud - User Model
 * Core identity model for all users
 */

import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

// ============ IN-MEMORY STORES ============

export const users = new Map();
export const sessions = new Map();
export const refreshTokens = new Map();
export const passwordHistory = new Map();

// ============ MODEL FACTORIES ============

const BCRYPT_ROUNDS = 12;

/**
 * Create a new user
 */
export function createUser(data) {
  const now = new Date().toISOString();

  const user = {
    id: `user-${uuidv4().slice(0, 8)}`,
    email: data.email.toLowerCase(),
    emailVerified: data.emailVerified || false,
    emailVerificationToken: null,
    emailVerificationExpires: null,

    // Password
    passwordHash: data.passwordHash || null,
    passwordChangedAt: data.passwordHash ? now : null,
    passwordHistory: [],

    // Phone
    phone: data.phone || null,
    phoneVerified: data.phoneVerified || false,
    phoneVerificationToken: null,

    // Profile
    name: data.name || null,
    firstName: data.firstName || null,
    lastName: data.lastName || null,
    avatar: data.avatar || null,
    bio: data.bio || null,
    dateOfBirth: data.dateOfBirth || null,
    gender: data.gender || null,

    // Location
    country: data.country || null,
    city: data.city || null,
    timezone: data.timezone || 'UTC',
    language: data.language || 'en',

    // Status
    status: 'active',
    suspendedAt: null,
    suspendedReason: null,

    // MFA
    mfaEnabled: false,
    mfaType: null,
    mfaSecret: null,
    mfaBackupCodes: [],

    // Connected Accounts
    connectedAccounts: [],

    // Preferences
    preferences: {
      emailNotifications: true,
      pushNotifications: true,
      marketingEmails: false,
      ...data.preferences
    },

    // Metadata
    metadata: data.metadata || {},
    tags: data.tags || [],

    // Timestamps
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null,
    lastActiveAt: null,

    // Deletion
    deletionRequestedAt: null,
    deletionScheduledAt: null
  };

  users.set(user.email, user);
  return user;
}

/**
 * Create user with password
 */
export async function createUserWithPassword(data) {
  const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

  const user = createUser({
    ...data,
    passwordHash
  });

  // Add to password history
  passwordHistory.set(user.id, [{
    hash: passwordHash,
    createdAt: new Date().toISOString()
  }]);

  return user;
}

/**
 * Create a session
 */
export function createSession(data) {
  const now = new Date().toISOString();

  const session = {
    id: `sess-${uuidv4().slice(0, 12)}`,

    // User
    userId: data.userId,
    userEmail: data.userEmail,

    // Tokens
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    accessTokenExpiresAt: data.accessTokenExpiresAt,
    refreshTokenExpiresAt: data.refreshTokenExpiresAt,

    // Device info
    deviceId: data.deviceId || null,
    deviceType: data.deviceType || 'unknown',
    deviceName: data.deviceName || 'Unknown Device',
    userAgent: data.userAgent || null,
    clientIp: data.clientIp || null,
    clientType: data.clientType || 'web',

    // Location
    country: data.country || null,
    city: data.city || null,

    // Security
    mfaVerified: data.mfaVerified || false,
    riskScore: 0,
    riskFlags: [],

    // Status
    active: true,
    lastActiveAt: now,

    // Timestamps
    createdAt: now,
    expiresAt: data.refreshTokenExpiresAt,
    revokedAt: null,
    revokedReason: null
  };

  sessions.set(session.id, session);

  // Also store by refresh token for quick lookup
  if (data.refreshToken) {
    refreshTokens.set(data.refreshToken, session.id);
  }

  return session;
}

// ============ QUERY HELPERS ============

/**
 * Get user by ID
 */
export function getUserById(id) {
  for (const user of users.values()) {
    if (user.id === id) return user;
  }
  return null;
}

/**
 * Get user by email
 */
export function getUserByEmail(email) {
  return users.get(email.toLowerCase()) || null;
}

/**
 * Get user by phone
 */
export function getUserByPhone(phone) {
  for (const user of users.values()) {
    if (user.phone === phone) return user;
  }
  return null;
}

/**
 * Get session by ID
 */
export function getSessionById(id) {
  return sessions.get(id) || null;
}

/**
 * Get session by refresh token
 */
export function getSessionByRefreshToken(token) {
  const sessionId = refreshTokens.get(token);
  if (!sessionId) return null;
  return sessions.get(sessionId) || null;
}

/**
 * Get all sessions for a user
 */
export function getUserSessions(userId) {
  return Array.from(sessions.values()).filter(s =>
    s.userId === userId && s.active
  );
}

/**
 * Get active session count for user
 */
export function getActiveSessionCount(userId) {
  return getUserSessions(userId).length;
}

/**
 * Update user
 */
export function updateUser(email, updates) {
  const user = users.get(email);
  if (!user) return null;

  const allowedFields = [
    'name', 'firstName', 'lastName', 'avatar', 'bio',
    'dateOfBirth', 'gender', 'country', 'city', 'timezone',
    'language', 'preferences', 'metadata', 'tags'
  ];

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      user[field] = updates[field];
    }
  }

  user.updatedAt = new Date().toISOString();
  users.set(email, user);

  return user;
}

/**
 * Update user password
 */
export async function updatePassword(userId, newPassword) {
  const user = getUserById(userId);
  if (!user) return null;

  const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  // Add to history
  const history = passwordHistory.get(userId) || [];
  history.push({
    hash: newHash,
    createdAt: new Date().toISOString()
  });
  // Keep last 5 passwords
  if (history.length > 5) history.shift();
  passwordHistory.set(userId, history);

  // Update user
  user.passwordHash = newHash;
  user.passwordChangedAt = new Date().toISOString();
  user.updatedAt = new Date().toISOString();
  users.set(user.email, user);

  return user;
}

/**
 * Check if password was used recently
 */
export async function isPasswordReused(userId, password) {
  const history = passwordHistory.get(userId) || [];
  if (history.length === 0) return false;

  for (const entry of history) {
    const isMatch = await bcrypt.compare(password, entry.hash);
    if (isMatch) return true;
  }
  return false;
}

/**
 * Revoke session
 */
export function revokeSession(sessionId, reason = null) {
  const session = sessions.get(sessionId);
  if (!session) return false;

  session.active = false;
  session.revokedAt = new Date().toISOString();
  session.revokedReason = reason;
  sessions.set(sessionId, session);

  // Remove from refresh token map
  for (const [token, id] of refreshTokens.entries()) {
    if (id === sessionId) {
      refreshTokens.delete(token);
      break;
    }
  }

  return true;
}

/**
 * Revoke all sessions for user
 */
export function revokeAllUserSessions(userId, reason = null) {
  const userSessions = getUserSessions(userId);
  for (const session of userSessions) {
    revokeSession(session.id, reason);
  }
  return userSessions.length;
}

/**
 * Revoke session by refresh token
 */
export function revokeSessionByRefreshToken(token, reason = null) {
  const sessionId = refreshTokens.get(token);
  if (!sessionId) return false;
  return revokeSession(sessionId, reason);
}

// ============ DEFAULT DATA ============

export function initializeDefaultUser() {
  if (getUserByEmail('admin@rtmn.com')) return;

  // Create default admin user
  createUserWithPassword({
    email: 'admin@rtmn.com',
    password: 'TempPass123!',
    name: 'Admin User',
    emailVerified: true,
    preferences: {
      emailNotifications: true,
      pushNotifications: true,
      marketingEmails: false
    }
  }).then(user => {
    console.log('Default admin user created:', user.id);
  });
}

// Initialize on module load
initializeDefaultUser();
