/**
 * Session Management Utilities
 * In-memory session storage with TTL support
 */

import { v4 as uuidv4 } from 'uuid';
import * as winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

export interface Session {
  id: string;
  instanceUrl: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  createdAt: number;
  lastActivity: number;
  metadata?: Record<string, unknown>;
}

const SESSION_TTL_MS = parseInt(process.env.SESSION_TTL_MS || '86400000', 10); // 24 hours default

class SessionManager {
  private sessions: Map<string, Session> = new Map();

  /**
   * Create a new session
   */
  create(instanceUrl?: string): Session {
    const session: Session = {
      id: uuidv4(),
      instanceUrl: instanceUrl || '',
      createdAt: Date.now(),
      lastActivity: Date.now(),
    };

    this.sessions.set(session.id, session);
    logger.debug('Session created', { sessionId: session.id });

    return session;
  }

  /**
   * Get a session by ID
   */
  get(sessionId: string): Session | undefined {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return undefined;
    }

    // Check if session has expired
    if (Date.now() - session.lastActivity > SESSION_TTL_MS) {
      this.destroy(sessionId);
      return undefined;
    }

    // Update last activity
    session.lastActivity = Date.now();

    return session;
  }

  /**
   * Update a session
   */
  update(sessionId: string, data: Partial<Session>): Session | undefined {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return undefined;
    }

    Object.assign(session, data, { lastActivity: Date.now() });

    return session;
  }

  /**
   * Set instance URL for a session
   */
  setInstanceUrl(sessionId: string, instanceUrl: string): boolean {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return false;
    }

    session.instanceUrl = instanceUrl;
    session.lastActivity = Date.now();

    return true;
  }

  /**
   * Set user info for a session
   */
  setUser(sessionId: string, user: { id?: string; name?: string; email?: string }): boolean {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return false;
    }

    if (user.id) session.userId = user.id;
    if (user.name) session.userName = user.name;
    if (user.email) session.userEmail = user.email;
    session.lastActivity = Date.now();

    return true;
  }

  /**
   * Destroy a session
   */
  destroy(sessionId: string): boolean {
    const deleted = this.sessions.delete(sessionId);

    if (deleted) {
      logger.debug('Session destroyed', { sessionId });
    }

    return deleted;
  }

  /**
   * Destroy all sessions for an instance
   */
  destroyByInstance(instanceUrl: string): number {
    let count = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.instanceUrl === instanceUrl) {
        this.sessions.delete(sessionId);
        count++;
      }
    }

    logger.info('Sessions destroyed by instance', { instanceUrl, count });

    return count;
  }

  /**
   * Get all active sessions
   */
  list(): Session[] {
    return Array.from(this.sessions.values())
      .filter(session => Date.now() - session.lastActivity < SESSION_TTL_MS)
      .map(session => ({
        ...session,
        // Don't expose sensitive data
        metadata: undefined,
      }));
  }

  /**
   * Get sessions by instance
   */
  listByInstance(instanceUrl: string): Session[] {
    return Array.from(this.sessions.values())
      .filter(session =>
        session.instanceUrl === instanceUrl &&
        Date.now() - session.lastActivity < SESSION_TTL_MS
      );
  }

  /**
   * Clean up expired sessions
   */
  cleanup(): number {
    const now = Date.now();
    let count = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastActivity > SESSION_TTL_MS) {
        this.sessions.delete(sessionId);
        count++;
      }
    }

    if (count > 0) {
      logger.info('Expired sessions cleaned up', { count, remaining: this.sessions.size });
    }

    return count;
  }

  /**
   * Get session count
   */
  count(): number {
    return this.sessions.size;
  }

  /**
   * Get active session count
   */
  activeCount(): number {
    const now = Date.now();
    return Array.from(this.sessions.values())
      .filter(session => now - session.lastActivity < SESSION_TTL_MS)
      .length;
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();

// Run cleanup every 5 minutes
setInterval(() => {
  sessionManager.cleanup();
}, 5 * 60 * 1000);

export default sessionManager;
