import Redis from 'ioredis';
import { Merchant } from './merchantService.js';

// ============================================================================
// SESSION SERVICE
// ============================================================================

export interface Session {
  userId?: string; // Linked REZ user ID
  tenantId: string;
  merchantId: string;
  customerId: string;
  conversationId?: string;

  // Context
  context: {
    lastIntent?: string;
    lastEntities?: Record<string, unknown>;
    collectedInfo?: Record<string, unknown>;
  };

  // State
  state: 'greeting' | 'collecting_info' | 'booking' | 'ordering' | 'resolved' | 'escalated';

  // History
  messageCount: number;
  lastMessageAt: Date;

  // Metadata
  language?: string;
  preferredService?: string;
  preferredDate?: string;
  preferredTime?: string;
}

export class SessionService {
  private redis: Redis;
  private readonly SESSION_TTL = 3600; // 1 hour

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) {
          console.warn('[Redis] Connection failed, using mock');
          return null;
        }
        return Math.min(times * 100, 3000);
      }
    });

    this.redis.on('error', (err) => {
      console.error('[Redis] Error:', err.message);
    });
  }

  /**
   * Get session for customer
   */
  async getSession(merchantId: string, customerId: string): Promise<Session | null> {
    const key = this.getSessionKey(merchantId, customerId);
    const data = await this.redis.get(key);

    if (!data) return null;

    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  /**
   * Save session
   */
  async saveSession(merchantId: string, customerId: string, session: Partial<Session>): Promise<void> {
    const key = this.getSessionKey(merchantId, customerId);

    // Get existing session
    const existing = await this.getSession(merchantId, customerId);

    const updated: Session = {
      tenantId: session.tenantId || existing?.tenantId || '',
      merchantId,
      customerId,
      conversationId: session.conversationId || existing?.conversationId,
      context: {
        ...existing?.context,
        ...session.context
      },
      state: session.state || existing?.state || 'greeting',
      messageCount: (existing?.messageCount || 0) + 1,
      lastMessageAt: new Date(),
      language: session.language || existing?.language,
      preferredService: session.preferredService || existing?.preferredService,
      preferredDate: session.preferredDate || existing?.preferredDate,
      preferredTime: session.preferredTime || existing?.preferredTime
    };

    await this.redis.setex(key, this.SESSION_TTL, JSON.stringify(updated));
  }

  /**
   * Update session context
   */
  async updateContext(
    merchantId: string,
    customerId: string,
    context: Partial<Session['context']>
  ): Promise<void> {
    const session = await this.getSession(merchantId, customerId);
    if (!session) return;

    session.context = { ...session.context, ...context };
    await this.saveSession(merchantId, customerId, session);
  }

  /**
   * Update session state
   */
  async updateState(
    merchantId: string,
    customerId: string,
    state: Session['state']
  ): Promise<void> {
    const session = await this.getSession(merchantId, customerId);
    if (!session) return;

    session.state = state;
    await this.saveSession(merchantId, customerId, session);
  }

  /**
   * Clear session
   */
  async clearSession(merchantId: string, customerId: string): Promise<void> {
    const key = this.getSessionKey(merchantId, customerId);
    await this.redis.del(key);
  }

  /**
   * Get all active sessions for merchant
   */
  async getActiveSessions(merchantId: string): Promise<Session[]> {
    const pattern = `session:${merchantId}:*`;
    const keys = await this.redis.keys(pattern);

    if (keys.length === 0) return [];

    const sessions = await Promise.all(
      keys.map(key => this.redis.get(key))
    );

    return sessions
      .filter(Boolean)
      .map(data => {
        try {
          return JSON.parse(data!);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  }

  /**
   * Get session key
   */
  private getSessionKey(merchantId: string, customerId: string): string {
    return `session:${merchantId}:${customerId}`;
  }

  /**
   * Cache knowledge base response
   */
  async cacheKnowledgeResponse(
    merchantId: string,
    query: string,
    response: string,
    ttl = 300 // 5 minutes
  ): Promise<void> {
    const key = `kb:${merchantId}:${query.toLowerCase()}`;
    await this.redis.setex(key, ttl, response);
  }

  /**
   * Get cached knowledge response
   */
  async getCachedKnowledgeResponse(
    merchantId: string,
    query: string
  ): Promise<string | null> {
    const key = `kb:${merchantId}:${query.toLowerCase()}`;
    return this.redis.get(key);
  }

  /**
   * Cache AI response
   */
  async cacheAIResponse(
    sessionKey: string,
    messageHash: string,
    response: string,
    ttl = 600 // 10 minutes
  ): Promise<void> {
    const key = `ai:${sessionKey}:${messageHash}`;
    await this.redis.setex(key, ttl, response);
  }

  /**
   * Get cached AI response
   */
  async getCachedAIResponse(
    sessionKey: string,
    messageHash: string
  ): Promise<string | null> {
    const key = `ai:${sessionKey}:${messageHash}`;
    return this.redis.get(key);
  }

  /**
   * Increment metric
   */
  async incrementMetric(merchantId: string, metric: string): Promise<number> {
    const key = `metrics:${merchantId}:${metric}`;
    return this.redis.incr(key);
  }

  /**
   * Get metric value
   */
  async getMetric(merchantId: string, metric: string): Promise<number> {
    const key = `metrics:${merchantId}:${metric}`;
    const value = await this.redis.get(key);
    return parseInt(value || '0', 10);
  }

  /**
   * Close connection
   */
  async close(): Promise<void> {
    await this.redis.quit();
  }
}

export const sessionService = new SessionService();
