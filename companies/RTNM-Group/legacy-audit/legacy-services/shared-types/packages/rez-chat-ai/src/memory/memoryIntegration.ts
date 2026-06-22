// ── Shared Memory Integration ─────────────────────────────────────────────────────
// Connects AgentMemory to AI Chat for cross-app context
// Uses local types and dependency injection to avoid circular dependencies

import { CustomerContext } from '../types';
import { logger } from '../logger';
import { getIntentGraphProvider } from '../intent-graph';

// ── Local Types (matching @rez/agent-memory) ────────────────────────────────────

export interface UserPreference {
  id: string;
  userId: string;
  category: 'dining' | 'travel' | 'social' | 'shopping' | 'general';
  key: string;
  value: string | string[] | boolean | number;
  confidence: number;
  source: 'explicit' | 'inferred' | 'behavior';
  createdAt: string;
  updatedAt: string;
}

export interface UserSignals {
  userId: string;
  engagementScore: number;
  satisfactionScore: number;
  churnRisk: 'low' | 'medium' | 'high';
  lifetimeValue: number;
  preferredChannels: ('push' | 'sms' | 'email' | 'in_app')[];
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  lastActive: string;
  activeApps: string[];
}

export interface ConversationContext {
  userId: string;
  appType: string;
  conversationId: string;
  messages: {
    role: 'user' | 'agent';
    content: string;
    timestamp: string;
    toolsUsed?: string[];
  }[];
  pendingIntents: string[];
  lastActive: string;
}

export interface CrossAppContext {
  userId: string;
  preferences: UserPreference[];
  signals: UserSignals;
  recentContext: ConversationContext[];
  sharedKnowledge: {
    key: string;
    value: unknown;
    expiresAt?: string;
  }[];
}

// ── Memory Integration Config ────────────────────────────────────────────────────

export interface MemoryIntegrationConfig {
  supabaseUrl?: string;
  supabaseKey?: string;
  redisUrl?: string;
  enableCache?: boolean;
  cacheTTL?: number;
}

// ── Simple In-Memory Store (for when external memory isn't available) ─────────────

class SimpleMemoryStore {
  private preferences: Map<string, UserPreference[]> = new Map();
  private signals: Map<string, UserSignals> = new Map();
  private contexts: Map<string, ConversationContext[]> = new Map();
  private _cachedAt: Map<string, number> = new Map();
  private _signals: Map<string, Record<string, unknown>> = new Map();

  async setPreference(userId: string, pref: Omit<UserPreference, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<void> {
    const userPrefs = this.preferences.get(userId) || [];
    const existingIndex = userPrefs.findIndex(p => p.category === pref.category && p.key === pref.key);

    const newPref: UserPreference = {
      ...pref,
      id: `pref_${Date.now()}`,
      userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      userPrefs[existingIndex] = newPref;
    } else {
      userPrefs.push(newPref);
    }

    this.preferences.set(userId, userPrefs);
  }

  async getPreferences(userId: string, _categories?: string[]): Promise<UserPreference[]> {
    return this.preferences.get(userId) || [];
  }

  async getSignals(userId: string): Promise<UserSignals> {
    const cached = this.signals.get(userId);
    if (cached) return cached;

    return {
      userId,
      engagementScore: 50,
      satisfactionScore: 50,
      churnRisk: 'low',
      lifetimeValue: 0,
      preferredChannels: ['in_app'],
      tier: 'bronze',
      lastActive: new Date().toISOString(),
      activeApps: [],
    };
  }

  async updateSignals(userId: string, signals: Partial<UserSignals>): Promise<void> {
    const current = await this.getSignals(userId);
    const updated = { ...current, ...signals, userId };
    this.signals.set(userId, updated);
  }

  async getUserContext(userId: string): Promise<CrossAppContext> {
    const preferences = await this.getPreferences(userId);
    const signals = await this.getSignals(userId);

    return {
      userId,
      preferences,
      signals,
      recentContext: this.contexts.get(userId) || [],
      sharedKnowledge: [],
    };
  }

  async addToContext(userId: string, appType: string, message: { role: 'user' | 'agent'; content: string; toolsUsed?: string[] }): Promise<void> {
    const convId = `${appType}:${Date.now()}`;
    const contexts = this.contexts.get(userId) || [];

    let conversation = contexts.find(c => c.appType === appType);
    if (!conversation) {
      conversation = {
        userId,
        appType,
        conversationId: convId,
        messages: [],
        pendingIntents: [],
        lastActive: new Date().toISOString(),
      };
      contexts.push(conversation);
    }

    conversation.messages.push({
      ...message,
      timestamp: new Date().toISOString(),
    });
    conversation.lastActive = new Date().toISOString();

    // Keep only last 20 messages
    if (conversation.messages.length > 20) {
      conversation.messages = conversation.messages.slice(-20);
    }

    this.contexts.set(userId, contexts);
  }

  async logIntent(
    userId: string,
    appType: string,
    intent: { category: string; specific: string; confidence: number },
    _outcome?: { converted: boolean; appUsed?: string; value?: number }
  ): Promise<void> {
    logger.debug('[Memory] Intent logged', { userId, appType, intent: intent.category });

    // Learn high-confidence preferences
    if (intent.confidence > 0.8) {
      await this.setPreference(userId, {
        category: intent.category as UserPreference['category'],
        key: intent.specific,
        value: intent.specific,
        confidence: intent.confidence * 0.5,
        source: 'inferred',
      });
    }
  }

  async setSignal(userId: string, signalKey: string, value: unknown): Promise<void> {
    const signals = this._signals.get(userId) || {};
    signals[signalKey] = value;
    this._signals.set(userId, signals);
  }

  getSignal(userId: string, signalKey: string): unknown {
    const signals = this._signals.get(userId) || {};
    return signals[signalKey];
  }

  async clearUserCache(userId: string): Promise<void> {
    this.preferences.delete(userId);
    this.signals.delete(userId);
    this.contexts.delete(userId);
    this._cachedAt.delete(userId);
  }
}

// ── Memory Service ────────────────────────────────────────────────────────────────

export class MemoryService {
  private store: SimpleMemoryStore;
  private userContexts: Map<string, CrossAppContext> = new Map();
  private contextTTL = 5 * 60 * 1000; // 5 minutes

  constructor(_config: MemoryIntegrationConfig) {
    this.store = new SimpleMemoryStore();
    logger.info('[MemoryService] Initialized with in-memory store');
  }

  /**
   * Get enriched customer context from shared memory
   */
  async getCustomerContext(userId: string, appType: string): Promise<CustomerContext> {
    const cacheKey = `${userId}:${appType}`;
    const cached = this.userContexts.get(cacheKey);

    if (cached && Date.now() - (cached as any)._cachedAt < this.contextTTL) {
      logger.debug('[MemoryService] Using cached context', { userId, appType });
      return this.toCustomerContext(cached);
    }

    try {
      const context = await this.store.getUserContext(userId);
      (context as any)._cachedAt = Date.now();

      // Enrich from intent graph
      await this.enrichFromIntentGraph(userId);

      this.userContexts.set(cacheKey, context);

      logger.info('[MemoryService] Loaded context', {
        userId,
        appType,
        preferences: context.preferences.length,
        tier: context.signals.tier,
      });

      return this.toCustomerContext(context);
    } catch (error) {
      logger.error('[MemoryService] Failed to load context', { userId, error });
      return { customerId: userId };
    }
  }

  /**
   * Enrich in-memory store with data from the intent graph
   */
  async enrichFromIntentGraph(userId: string): Promise<void> {
    try {
      // Use dependency injection to get intent graph provider
      const intentGraphProvider = getIntentGraphProvider();
      const enriched = await intentGraphProvider.getEnrichedContext(userId);
      if (!enriched) return;

      // Compute dominant category from affinities (not stored on profile)
      if (enriched.profile) {
        const { travelAffinity, diningAffinity, retailAffinity } = enriched.profile;
        const dominantCategory =
          travelAffinity >= diningAffinity && travelAffinity >= retailAffinity
            ? 'TRAVEL'
            : diningAffinity >= retailAffinity
              ? 'DINING'
              : 'RETAIL';
        await this.store.setPreference(userId, {
          category: 'general',
          key: 'dominantCategory',
          value: dominantCategory,
          confidence: 0.8,
          source: 'behavior',
        });
      }

      // Store affinities as individual preferences
      if (enriched.profile) {
        await this.store.setPreference(userId, {
          category: 'general',
          key: 'travelAffinity',
          value: enriched.profile.travelAffinity,
          confidence: 0.7,
          source: 'behavior',
        });
        await this.store.setPreference(userId, {
          category: 'general',
          key: 'diningAffinity',
          value: enriched.profile.diningAffinity,
          confidence: 0.7,
          source: 'behavior',
        });
        await this.store.setPreference(userId, {
          category: 'general',
          key: 'retailAffinity',
          value: enriched.profile.retailAffinity,
          confidence: 0.7,
          source: 'behavior',
        });
      }

      // Store top dormant intent as a signal
      if (enriched.dormantIntents?.length > 0) {
        const topDormant = enriched.dormantIntents[0];
        await this.store.setSignal(userId, 'topDormantIntent', {
          key: topDormant.key,
          category: topDormant.category,
          revivalScore: topDormant.revivalScore,
          daysDormant: topDormant.daysDormant,
        });
      }
    } catch (err) {
      logger.debug('[MemoryService] Intent graph enrichment failed:', err as Record<string, unknown>);
    }
  }

  /**
   * Update user preferences based on interaction
   */
  async learnPreference(
    userId: string,
    category: UserPreference['category'],
    key: string,
    value: unknown,
    confidence: number = 0.7,
    source: 'explicit' | 'inferred' | 'behavior' = 'inferred'
  ): Promise<void> {
    try {
      await this.store.setPreference(userId, {
        category,
        key,
        value: value as string | string[] | boolean | number,
        confidence,
        source,
      });

      // Invalidate cache
      this.userContexts.forEach((_, key) => {
        if (key.startsWith(userId)) {
          this.userContexts.delete(key);
        }
      });

      logger.debug('[MemoryService] Learned preference', { userId, category, key, confidence });
    } catch (error) {
      logger.error('[MemoryService] Failed to learn preference', { userId, error });
    }
  }

  /**
   * Log an intent for the intent graph
   */
  async logIntent(
    userId: string,
    appType: string,
    intent: { category: string; specific: string; confidence: number },
    outcome?: { converted: boolean; appUsed?: string; value?: number }
  ): Promise<void> {
    try {
      await this.store.logIntent(userId, appType, intent, outcome);
      logger.debug('[MemoryService] Logged intent', { userId, appType, intent: intent.category });
    } catch (error) {
      logger.error('[MemoryService] Failed to log intent', { userId, error });
    }
  }

  /**
   * Update user signals based on interaction
   */
  async updateSignals(
    userId: string,
    signals: Partial<UserSignals>
  ): Promise<void> {
    try {
      await this.store.updateSignals(userId, signals);
      logger.debug('[MemoryService] Updated signals', { userId, signals });
    } catch (error) {
      logger.error('[MemoryService] Failed to update signals', { userId, error });
    }
  }

  /**
   * Add message to conversation context
   */
  async addToContext(
    userId: string,
    appType: string,
    message: { role: 'user' | 'agent'; content: string; toolsUsed?: string[] }
  ): Promise<void> {
    try {
      await this.store.addToContext(userId, appType, message);
      logger.debug('[MemoryService] Added to context', { userId, appType, role: message.role });
    } catch (error) {
      logger.error('[MemoryService] Failed to add to context', { userId, error });
    }
  }

  /**
   * Get relevant preferences for a specific app
   */
  async getRelevantPreferences(
    userId: string,
    _categories?: UserPreference['category'][]
  ): Promise<UserPreference[]> {
    try {
      return await this.store.getPreferences(userId);
    } catch (error) {
      logger.error('[MemoryService] Failed to get preferences', { userId, error });
      return [];
    }
  }

  /**
   * Get user signals (tier, engagement, etc.)
   */
  async getUserSignals(userId: string): Promise<UserSignals | null> {
    try {
      return await this.store.getSignals(userId);
    } catch (error) {
      logger.error('[MemoryService] Failed to get signals', { userId, error });
      return null;
    }
  }

  /**
   * Clear user cache
   */
  async clearUserCache(userId: string): Promise<void> {
    this.userContexts.forEach((_, key) => {
      if (key.startsWith(userId)) {
        this.userContexts.delete(key);
      }
    });
    await this.store.clearUserCache(userId);
    logger.info('[MemoryService] Cleared cache', { userId });
  }

  /**
   * Convert CrossAppContext to CustomerContext for AI handler
   */
  private toCustomerContext(context: CrossAppContext): CustomerContext {
    return {
      customerId: context.userId,
      name: this.extractPreference(context.preferences, 'name') as string | undefined,
      email: this.extractPreference(context.preferences, 'email') as string | undefined,
      phone: this.extractPreference(context.preferences, 'phone') as string | undefined,
      tier: context.signals.tier,
      preferences: {
        karmaPoints: context.signals.lifetimeValue,
        defaultAddress: this.extractPreference(context.preferences, 'defaultAddress'),
        dietaryRestrictions: this.extractPreference(context.preferences, 'dietaryRestrictions'),
        roomPreferences: this.extractPreference(context.preferences, 'roomPreferences'),
        favoriteCuisine: this.extractPreference(context.preferences, 'favoriteCuisine'),
        ...Object.fromEntries(
          context.preferences.map((p: UserPreference) => [p.key, p.value])
        ),
      },
      recentOrders: context.recentContext
        .filter((c: ConversationContext) => c.appType !== 'general')
        .slice(0, 5)
        .map((c: ConversationContext) => ({
          orderId: c.conversationId,
          type: 'restaurant_order' as const,
          status: 'completed',
          total: 0,
          date: new Date(c.lastActive),
        })),
      activeApps: context.signals.activeApps,
    };
  }

  private extractPreference(preferences: UserPreference[], key: string): unknown {
    const pref = preferences.find(p => p.key === key);
    return pref?.value;
  }
}

// ── Default Instance ─────────────────────────────────────────────────────────────

let memoryServiceInstance: MemoryService | null = null;

export function getMemoryService(): MemoryService {
  if (!memoryServiceInstance) {
    memoryServiceInstance = new MemoryService({});
  }
  return memoryServiceInstance;
}

export function initializeMemoryService(config: MemoryIntegrationConfig): MemoryService {
  memoryServiceInstance = new MemoryService(config);
  return memoryServiceInstance;
}

export default MemoryService;
