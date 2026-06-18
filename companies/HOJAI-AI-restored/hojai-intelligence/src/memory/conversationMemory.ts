/**
 * HOJAI Intelligence - Conversation Memory
 * Redis-based conversation history and session management
 */

import { v4 as uuidv4 } from 'uuid';
import { ConversationSession, ConversationTurn } from '../types';

// In-memory fallback when Redis is not available
const inMemoryStore: Map<string, ConversationSession> = new Map();

export class ConversationMemory {
  private redis: any = null;
  private useRedis = false;
  private ttl = 86400; // 24 hours default TTL

  constructor(redisClient?: any) {
    if (redisClient) {
      this.redis = redisClient;
      this.useRedis = true;
    }
  }

  /**
   * Initialize a new conversation session
   */
  async createSession(
    customerId: string,
    metadata?: { channel?: string; agentId?: string }
  ): Promise<ConversationSession> {
    const session: ConversationSession = {
      sessionId: uuidv4(),
      customerId,
      turns: [],
      startedAt: Date.now(),
      lastActivity: Date.now(),
      metadata: metadata || {},
    };

    await this.saveSession(session);
    return session;
  }

  /**
   * Add a turn to the conversation
   */
  async addTurn(
    sessionId: string,
    role: 'user' | 'assistant',
    content: string,
    metadata?: Record<string, unknown>
  ): Promise<ConversationTurn> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const turn: ConversationTurn = {
      id: uuidv4(),
      role,
      content,
      timestamp: Date.now(),
      metadata,
    };

    session.turns.push(turn);
    session.lastActivity = Date.now();
    await this.saveSession(session);

    return turn;
  }

  /**
   * Get a conversation session
   */
  async getSession(sessionId: string): Promise<ConversationSession | null> {
    const key = `conversation:session:${sessionId}`;

    if (this.useRedis) {
      try {
        const data = await this.redis.get(key);
        return data ? JSON.parse(data) : null;
      } catch (error) {
        console.error('Redis get error:', error);
        return inMemoryStore.get(sessionId) || null;
      }
    }

    return inMemoryStore.get(sessionId) || null;
  }

  /**
   * Get recent conversation turns
   */
  async getRecentTurns(
    sessionId: string,
    count: number = 10
  ): Promise<ConversationTurn[]> {
    const session = await this.getSession(sessionId);
    if (!session) return [];

    return session.turns.slice(-count);
  }

  /**
   * Get conversation context (formatted for LLM)
   */
  async getContext(
    sessionId: string,
    maxTurns: number = 10
  ): Promise<string> {
    const turns = await this.getRecentTurns(sessionId, maxTurns);

    return turns
      .map(turn => `${turn.role === 'user' ? 'Customer' : 'Assistant'}: ${turn.content}`)
      .join('\n');
  }

  /**
   * Update session metadata
   */
  async updateMetadata(
    sessionId: string,
    metadata: Partial<ConversationSession['metadata']>
  ): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) return;

    session.metadata = { ...session.metadata, ...metadata };
    session.lastActivity = Date.now();
    await this.saveSession(session);
  }

  /**
   * End a conversation session
   */
  async endSession(sessionId: string): Promise<void> {
    const key = `conversation:session:${sessionId}`;

    if (this.useRedis) {
      try {
        // Archive before deleting
        const session = await this.getSession(sessionId);
        if (session) {
          const archiveKey = `conversation:archive:${sessionId}`;
          await this.redis.setex(archiveKey, 2592000, JSON.stringify(session)); // 30 day archive
        }
        await this.redis.del(key);
      } catch (error) {
        console.error('Redis end session error:', error);
        inMemoryStore.delete(sessionId);
      }
    } else {
      inMemoryStore.delete(sessionId);
    }
  }

  /**
   * Get session summary
   */
  async getSessionSummary(sessionId: string): Promise<{
    customerId: string;
    turnCount: number;
    duration: number;
    startedAt: number;
    lastActivity: number;
  } | null> {
    const session = await this.getSession(sessionId);
    if (!session) return null;

    return {
      customerId: session.customerId,
      turnCount: session.turns.length,
      duration: Date.now() - session.startedAt,
      startedAt: session.startedAt,
      lastActivity: session.lastActivity,
    };
  }

  /**
   * Search conversations by customer
   */
  async getCustomerSessions(customerId: string): Promise<ConversationSession[]> {
    if (this.useRedis) {
      try {
        const pattern = 'conversation:session:*';
        const keys = await this.redis.keys(pattern);
        const sessions: ConversationSession[] = [];

        for (const key of keys) {
          const data = await this.redis.get(key);
          if (data) {
            const session = JSON.parse(data);
            if (session.customerId === customerId) {
              sessions.push(session);
            }
          }
        }

        return sessions.sort((a, b) => b.lastActivity - a.lastActivity);
      } catch (error) {
        console.error('Redis search error:', error);
      }
    }

    // Fallback to in-memory search
    const sessions: ConversationSession[] = [];
    inMemoryStore.forEach(session => {
      if (session.customerId === customerId) {
        sessions.push(session);
      }
    });

    return sessions.sort((a, b) => b.lastActivity - a.lastActivity);
  }

  /**
   * Get interaction patterns for a customer
   */
  async getInteractionPatterns(customerId: string): Promise<{
    totalSessions: number;
    avgTurnsPerSession: number;
    commonIntents: string[];
    sentimentTrend: number[];
  }> {
    const sessions = await this.getCustomerSessions(customerId);

    if (sessions.length === 0) {
      return {
        totalSessions: 0,
        avgTurnsPerSession: 0,
        commonIntents: [],
        sentimentTrend: [],
      };
    }

    // Calculate stats
    const totalTurns = sessions.reduce((sum, s) => sum + s.turns.length, 0);
    const avgTurns = totalTurns / sessions.length;

    // Extract intents from metadata (would need actual intent data in production)
    const commonIntents: string[] = [];

    // Extract sentiment trend from session metadata
    const sentimentTrend = sessions
      .slice(0, 5)
      .reverse()
      .map(s => s.metadata?.sentiment?.score || 0);

    return {
      totalSessions: sessions.length,
      avgTurnsPerSession: Math.round(avgTurns * 10) / 10,
      commonIntents,
      sentimentTrend,
    };
  }

  /**
   * Save session to storage
   */
  private async saveSession(session: ConversationSession): Promise<void> {
    const key = `conversation:session:${session.sessionId}`;

    if (this.useRedis) {
      try {
        await this.redis.setex(key, this.ttl, JSON.stringify(session));
      } catch (error) {
        console.error('Redis save error:', error);
        inMemoryStore.set(session.sessionId, session);
      }
    } else {
      inMemoryStore.set(session.sessionId, session);
    }
  }

  /**
   * Set TTL for sessions
   */
  setTTL(ttlSeconds: number): void {
    this.ttl = ttlSeconds;
  }

  /**
   * Clear all sessions (use with caution)
   */
  async clearAll(): Promise<void> {
    if (this.useRedis) {
      try {
        const keys = await this.redis.keys('conversation:session:*');
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } catch (error) {
        console.error('Redis clear error:', error);
      }
    }
    inMemoryStore.clear();
  }
}

export const conversationMemory = new ConversationMemory();