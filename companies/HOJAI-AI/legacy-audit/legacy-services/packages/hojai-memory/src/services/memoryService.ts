import mongoose from 'mongoose';
import Redis from 'ioredis';
import { v4 as uuid } from 'uuid';
import {
  Memory,
  MemoryType,
  MemoryTier,
  MemoryTierConfig,
  MEMORY_TIER_CONFIG,
  TimelineEvent,
  Context,
  Profile,
  ConversationMessage
} from '../types/index.js';
import {
  MemoryModel,
  TimelineEventModel,
  ContextModel,
  ProfileModel,
  ConversationModel,
  ConversationDocument
} from '../models/memoryModel.js';

// ============================================================================
// MEMORY SERVICE
// ============================================================================

export class MemoryService {
  private redis: Redis;
  private readonly CACHE_TTL = 3600; // 1 hour

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.redis = new Redis(redisUrl);
  }

  /**
   * Store a new memory
   */
  async storeMemory(
    tenantId: string,
    params: {
      userId: string;
      entityType: 'user' | 'merchant' | 'product' | 'session';
      entityId: string;
      type: MemoryType;
      content: string;
      data?: Record<string, unknown>;
      importance?: number;
      confidence?: number;
      source?: string;
      context?: {
        channel?: string;
        location?: string;
        time?: string;
        tags?: string[];
      };
      validUntil?: Date | string;
    }
  ): Promise<Memory> {
    const validUntil = params.validUntil
      ? (typeof params.validUntil === 'string' ? new Date(params.validUntil) : params.validUntil)
      : undefined;

    const memory = new MemoryModel({
      userId: params.userId,
      entityType: params.entityType,
      entityId: params.entityId,
      type: params.type,
      tier: 'l4_semantic',
      content: params.content,
      data: params.data,
      importance: params.importance ?? 5,
      confidence: params.confidence ?? 0.7,
      source: params.source,
      context: params.context,
      validUntil,
      isPrivate: false,
      id: uuid(),
      tenantId
    });

    await memory.save();

    // Update Redis cache
    await this.cacheMemory(tenantId, memory.id, memory.toObject() as Memory);

    return memory.toObject() as Memory;
  }

  /**
   * Get memories for a user
   */
  async getMemories(params: {
    tenantId: string;
    userId: string;
    type?: MemoryType;
    limit?: number;
    offset?: number;
    since?: Date;
  }): Promise<{ memories: Memory[]; total: number }> {
    const filter: Record<string, unknown> = {
      tenantId: params.tenantId,
      userId: params.userId,
      $or: [
        { validUntil: { $exists: false } },
        { validUntil: null },
        { validUntil: { $gt: new Date() } }
      ]
    };

    if (params.type) {
      filter.type = params.type;
    }
    if (params.since) {
      filter.createdAt = { $gte: params.since };
    }

    const [memories, total] = await Promise.all([
      MemoryModel.find(filter)
        .sort({ importance: -1, createdAt: -1 })
        .skip(params.offset || 0)
        .limit(params.limit || 50),
      MemoryModel.countDocuments(filter)
    ]);

    return {
      memories: memories.map(m => m.toObject() as Memory),
      total
    };
  }

  /**
   * Search memories by content
   */
  async searchMemories(params: {
    tenantId: string;
    userId: string;
    query: string;
    limit?: number;
  }): Promise<Memory[]> {
    // Simple text search - in production, use vector search
    const memories = await MemoryModel.find({
      tenantId: params.tenantId,
      userId: params.userId,
      content: { $regex: params.query, $options: 'i' }
    })
      .sort({ importance: -1, createdAt: -1 })
      .limit(params.limit || 10);

    return memories.map(m => m.toObject() as Memory);
  }

  /**
   * Update memory access
   */
  async accessMemory(tenantId: string, memoryId: string): Promise<void> {
    await MemoryModel.findOneAndUpdate(
      { _id: memoryId, tenantId },
      {
        $set: { lastAccessedAt: new Date() },
        $inc: { accessCount: 1 }
      }
    );
  }

  /**
   * Delete memory
   */
  async deleteMemory(tenantId: string, memoryId: string): Promise<void> {
    await MemoryModel.deleteOne({ _id: memoryId, tenantId });
    await this.redis.del(`memory:${tenantId}:${memoryId}`);
  }

  // ============================================================================
  // TIMELINE METHODS
  // ============================================================================

  /**
   * Add event to timeline
   */
  async addToTimeline(
    tenantId: string,
    event: Omit<TimelineEvent, 'id' | 'createdAt' | 'tenantId'>
  ): Promise<TimelineEvent> {
    const timelineEvent = new TimelineEventModel({
      ...event,
      id: uuid(),
      tenantId
    });

    await timelineEvent.save();
    return timelineEvent.toObject() as TimelineEvent;
  }

  /**
   * Get user timeline
   */
  async getTimeline(params: {
    tenantId: string;
    userId: string;
    types?: string[];
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ events: TimelineEvent[]; total: number }> {
    const filter: Record<string, unknown> = {
      tenantId: params.tenantId,
      userId: params.userId
    };

    if (params.types && params.types.length > 0) {
      filter.type = { $in: params.types };
    }
    if (params.startDate || params.endDate) {
      filter.timestamp = {};
      if (params.startDate) {
        (filter.timestamp as Record<string, Date>).$gte = params.startDate;
      }
      if (params.endDate) {
        (filter.timestamp as Record<string, Date>).$lte = params.endDate;
      }
    }

    const [events, total] = await Promise.all([
      TimelineEventModel.find(filter)
        .sort({ timestamp: -1 })
        .skip(params.offset || 0)
        .limit(params.limit || 50),
      TimelineEventModel.countDocuments(filter)
    ]);

    return {
      events: events.map(e => e.toObject() as TimelineEvent),
      total
    };
  }

  // ============================================================================
  // CONTEXT METHODS
  // ============================================================================

  /**
   * Get or create session context
   */
  async getContext(params: {
    tenantId: string;
    userId: string;
    sessionId?: string;
  }): Promise<Context | null> {
    const filter: Record<string, unknown> = {
      tenantId: params.tenantId,
      userId: params.userId
    };

    if (params.sessionId) {
      filter.sessionId = params.sessionId;
    }

    const context = await ContextModel.findOne(filter)
      .sort({ createdAt: -1 });

    return context ? (context.toObject() as Context) : null;
  }

  /**
   * Update session context
   */
  async updateContext(params: {
    tenantId: string;
    userId: string;
    sessionId: string;
    updates: Partial<Context>;
  }): Promise<Context> {
    const context = await ContextModel.findOneAndUpdate(
      {
        tenantId: params.tenantId,
        userId: params.userId,
        sessionId: params.sessionId
      },
      {
        $set: {
          ...params.updates,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 min TTL
        }
      },
      { new: true, upsert: true }
    );

    return context.toObject() as Context;
  }

  // ============================================================================
  // PROFILE METHODS
  // ============================================================================

  /**
   * Get or create profile
   */
  async getProfile(tenantId: string, identifier: {
    userId?: string;
    email?: string;
    phone?: string;
  }): Promise<Profile | null> {
    const filter: Record<string, unknown> = { tenantId };

    if (identifier.userId) filter.userId = identifier.userId;
    else if (identifier.email) filter.email = identifier.email;
    else if (identifier.phone) filter.phone = identifier.phone;
    else return null;

    const profile = await ProfileModel.findOne(filter);
    return profile ? (profile.toObject() as Profile) : null;
  }

  /**
   * Create profile
   */
  async createProfile(params: {
    tenantId: string;
    userId?: string;
    email?: string;
    phone?: string;
    name?: string;
  }): Promise<Profile> {
    const profile = new ProfileModel({
      ...params,
      id: uuid(),
      computed: {
        lastActiveAt: new Date(),
        firstSeenAt: new Date()
      }
    });

    await profile.save();
    return profile.toObject() as Profile;
  }

  /**
   * Update profile
   */
  async updateProfile(
    tenantId: string,
    identifier: { userId?: string; email?: string; phone?: string },
    updates: Partial<Profile>
  ): Promise<Profile | null> {
    const filter: Record<string, unknown> = { tenantId };

    if (identifier.userId) filter.userId = identifier.userId;
    else if (identifier.email) filter.email = identifier.email;
    else if (identifier.phone) filter.phone = identifier.phone;
    else return null;

    const profile = await ProfileModel.findOneAndUpdate(
      filter,
      { $set: updates },
      { new: true }
    );

    return profile ? (profile.toObject() as Profile) : null;
  }

  // ============================================================================
  // CONVERSATION METHODS
  // ============================================================================

  /**
   * Create or continue conversation
   */
  async getConversation(params: {
    tenantId: string;
    userId: string;
    conversationId?: string;
  }): Promise<ConversationDocument | null> {
    if (params.conversationId) {
      return ConversationModel.findOne({
        _id: params.conversationId,
        tenantId: params.tenantId
      });
    }

    // Find most recent active conversation
    return ConversationModel.findOne({
      tenantId: params.tenantId,
      userId: params.userId,
      status: 'active'
    }).sort({ lastMessageAt: -1 });
  }

  /**
   * Add message to conversation
   */
  async addMessage(params: {
    tenantId: string;
    conversationId: string;
    message: {
      role: 'user' | 'assistant' | 'system';
      content: string;
      userId?: string;
      attachments?: Array<{
        type: 'image' | 'document' | 'link';
        url: string;
        metadata?: Record<string, unknown>;
      }>;
      aiMetadata?: {
        model?: string;
        tokens?: number;
        confidence?: number;
        intent?: string;
      };
    };
  }): Promise<ConversationMessage> {
    const message: ConversationMessage = {
      ...params.message,
      id: uuid(),
      createdAt: new Date()
    };

    await ConversationModel.findByIdAndUpdate(
      params.conversationId,
      {
        $push: { messages: message },
        $set: { lastMessageAt: new Date() }
      }
    );

    return message;
  }

  // ============================================================================
  // CACHE METHODS
  // ============================================================================

  private async cacheMemory(tenantId: string, memoryId: string, memory: Memory): Promise<void> {
    const key = `memory:${tenantId}:${memoryId}`;
    await this.redis.setex(key, this.CACHE_TTL, JSON.stringify(memory));
  }

  async getCachedMemory(tenantId: string, memoryId: string): Promise<Memory | null> {
    const key = `memory:${tenantId}:${memoryId}`;
    const cached = await this.redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  // ============================================================================
  // BATCH OPERATIONS
  // ============================================================================

  /**
   * Store memories from events
   */
  async processEventMemories(tenantId: string, event: Record<string, unknown>): Promise<void> {
    // Extract memory-worthy information from events
    // This would be extended based on event types

    if (event.userId && event.type) {
      // Create timeline event
      await this.addToTimeline(tenantId, {
        userId: event.userId as string,
        type: event.type as string,
        category: (event.type as string).split('.')[0],
        timestamp: new Date(),
        title: `Event: ${event.type}`,
        description: JSON.stringify(event.properties || {}),
        data: event.properties as Record<string, unknown>,
        entityType: event.entityType as string,
        entityId: event.entityId as string,
        impact: 'neutral'
      });
    }
  }

  // ============================================================================
  // MEMORY TIER METHODS (Hojai Flow Architecture)
  // ============================================================================

  /**
   * Get memories by tier - implements local-first priority
   * L1 → L2 → L3 → L4 → L5 (L1 is fastest/most local)
   */
  async getMemoriesByTier(params: {
    tenantId: string;
    userId: string;
    entityId?: string;
    tier: MemoryTier;
    limit?: number;
  }): Promise<Memory[]> {
    const config = MEMORY_TIER_CONFIG[params.tier];
    const limit = params.limit || config.maxItems;

    const filter: Record<string, unknown> = {
      tenantId: params.tenantId,
      userId: params.userId,
      tier: params.tier
    };

    if (params.entityId) {
      filter.entityId = params.entityId;
    }

    // Check cache first for L1/L2 tiers
    if (config.storage === 'redis' || config.storage === 'memory') {
      const cached = await this.getCachedMemories(params.tenantId, params.userId, params.tier);
      if (cached && cached.length > 0) {
        return cached.slice(0, limit);
      }
    }

    // Fetch from MongoDB
    const memories = await MemoryModel.find(filter)
      .sort({ importance: -1, createdAt: -1 })
      .limit(limit);

    const result = memories.map(m => m.toObject() as Memory);

    // Cache if applicable
    if (config.storage !== 'mongodb') {
      await this.cacheMemories(params.tenantId, params.userId, params.tier, result);
    }

    return result;
  }

  /**
   * Store memory with automatic tier assignment
   */
  async storeMemoryWithTier(params: {
    tenantId: string;
    userId: string;
    entityId: string;
    entityType: 'user' | 'merchant' | 'product' | 'session';
    type: MemoryType;
    content: string;
    data?: Record<string, unknown>;
    tier: MemoryTier;
    importance?: number;
    confidence?: number;
  }): Promise<Memory> {
    const memory = new MemoryModel({
      ...params,
      id: uuid()
    });

    await memory.save();

    // Update cache for fast retrieval
    const config = MEMORY_TIER_CONFIG[params.tier];
    if (config.storage !== 'mongodb') {
      await this.cacheMemories(params.tenantId, params.userId, params.tier, [memory.toObject() as Memory]);
    }

    return memory.toObject() as Memory;
  }

  /**
   * Get full context from all tiers (L1 → L5 priority)
   * This is the main method for Hojai Flow's "Memory Before Models" principle
   */
  async getFullContext(params: {
    tenantId: string;
    userId: string;
    entityId?: string;
    includeTiers?: MemoryTier[];
    maxItemsPerTier?: number;
  }): Promise<{
    memories: Memory[];
    byTier: Record<MemoryTier, Memory[]>;
    context: string;
  }> {
    const tiers = params.includeTiers || Object.values(MemoryTier);
    const byTier: Partial<Record<MemoryTier, Memory[]>> = {};
    const allMemories: Memory[] = [];

    // Fetch from each tier in priority order (L1 first)
    for (const tier of tiers.sort((a, b) =>
      MEMORY_TIER_CONFIG[a].priority - MEMORY_TIER_CONFIG[b].priority
    )) {
      const memories = await this.getMemoriesByTier({
        tenantId: params.tenantId,
        userId: params.userId,
        entityId: params.entityId,
        tier,
        limit: params.maxItemsPerTier || MEMORY_TIER_CONFIG[tier].maxItems
      });

      byTier[tier] = memories;
      allMemories.push(...memories);
    }

    // Build context string for LLM consumption
    const context = this.buildContextString(byTier);

    return {
      memories: allMemories,
      byTier: byTier as Record<MemoryTier, Memory[]>,
      context
    };
  }

  /**
   * Build context string from memories (for LLM prompts)
   */
  private buildContextString(byTier: Partial<Record<MemoryTier, Memory[]>>): string {
    const parts: string[] = [];

    // Add each tier with header
    for (const tier of Object.values(MemoryTier)) {
      const memories = byTier[tier];
      if (!memories || memories.length === 0) continue;

      const config = MEMORY_TIER_CONFIG[tier];
      parts.push(`\n=== ${config.name} (${tier}) ===`);
      parts.push(`Relevance: ${config.description}`);

      for (const memory of memories.slice(0, 10)) {
        parts.push(`- ${memory.content}`);
      }
    }

    return parts.join('\n');
  }

  /**
   * Cache memories by tier
   */
  private async cacheMemories(
    tenantId: string,
    userId: string,
    tier: MemoryTier,
    memories: Memory[]
  ): Promise<void> {
    const key = `memory:tier:${tenantId}:${userId}:${tier}`;
    const config = MEMORY_TIER_CONFIG[tier];
    const ttl = Math.floor(config.ttl / 1000); // Convert to seconds

    await this.redis.setex(key, ttl, JSON.stringify(memories));
  }

  /**
   * Get cached memories by tier
   */
  private async getCachedMemories(
    tenantId: string,
    userId: string,
    tier: MemoryTier
  ): Promise<Memory[] | null> {
    const key = `memory:tier:${tenantId}:${userId}:${tier}`;
    const cached = await this.redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  /**
   * Auto-classify memory to appropriate tier based on content
   */
  classifyToTier(params: {
    type: MemoryType;
    content: string;
    data?: Record<string, unknown>;
    source?: string;
  }): MemoryTier {
    const { type, content, data } = params;

    // L1: Working memory - current conversation, session context
    if (type === MemoryType.CONVERSATION || data?.sessionId) {
      return MemoryTier.L1_WORKING;
    }

    // L2: Episodic memory - recent events, interactions
    if (type === MemoryType.INTERACTION || type === MemoryType.CONTEXT) {
      return MemoryTier.L2_EPISODIC;
    }

    // L3: Procedural memory - instructions, how-tos, behaviors
    if (type === MemoryType.BEHAVIOR || content.toLowerCase().includes('how to') || content.toLowerCase().includes('instruction')) {
      return MemoryTier.L3_PROCEDURAL;
    }

    // L5: World knowledge - facts, external information
    if (content.startsWith('Fact:') || data?.source === 'external') {
      return MemoryTier.L5_WORLD;
    }

    // L4: Semantic memory - preferences, facts (default)
    return MemoryTier.L4_SEMANTIC;
  }

  /**
   * Evict old memories based on tier TTL
   */
  async evictExpiredMemories(tenantId: string, userId: string): Promise<number> {
    let evicted = 0;

    for (const tier of Object.values(MemoryTier)) {
      const config = MEMORY_TIER_CONFIG[tier];
      if (config.ttl <= 0) continue; // Never expire

      const cutoff = new Date(Date.now() - config.ttl);

      const result = await MemoryModel.deleteMany({
        tenantId,
        userId,
        tier,
        createdAt: { $lt: cutoff }
      });

      evicted += result.deletedCount;
    }

    return evicted;
  }
}

export const memoryService = new MemoryService();
