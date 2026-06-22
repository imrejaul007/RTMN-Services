/**
 * Memory Repository
 *
 * MongoDB repository for managing agent memories and conversation history.
 *
 * @example
 * ```typescript
 * import { MemoryRepository } from '@hojai/persistence';
 *
 * const repo = new MemoryRepository(db);
 *
 * // Add memory
 * const memory = await repo.addMemory({
 *   tenantId: 'tenant-123',
 *   entityId: 'user-456',
 *   type: 'fact',
 *   content: 'User prefers email communication',
 *   importance: 0.8
 * });
 *
 * // Search memories
 * const memories = await repo.search({
 *   tenantId: 'tenant-123',
 *   entityId: 'user-456',
 *   query: 'preferences'
 * });
 *
 * // Get conversation history
 * const history = await repo.getConversationHistory(sessionId);
 * ```
 */

import { Collection, Db, Filter, ObjectId } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Memory type enum
 */
export enum MemoryType {
  INTERACTION = 'interaction',
  FACT = 'fact',
  PREFERENCE = 'preference',
  DECISION = 'decision',
  KNOWLEDGE = 'knowledge',
  CONTEXT = 'context'
}

/**
 * Memory document
 */
export interface Memory {
  _id?: ObjectId;
  memoryId: string;
  tenantId: string;
  entityId: string;
  entityType: 'user' | 'agent' | 'session';
  type: MemoryType;
  content: string;
  importance: number; // 0-1
  tags?: string[];
  embedding?: number[];
  metadata?: Record<string, unknown>;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Conversation session
 */
export interface MemorySession {
  _id?: ObjectId;
  sessionId: string;
  tenantId: string;
  entityId: string;
  agentId?: string;
  type: 'conversation' | 'task' | 'analysis';
  title?: string;
  context?: {
    goal?: string;
    topic?: string;
    metadata?: Record<string, unknown>;
  };
  messageCount: number;
  totalTokens: number;
  status: 'active' | 'completed' | 'archived';
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt: Date;
}

/**
 * Conversation message
 */
export interface ConversationMessage {
  _id?: ObjectId;
  messageId: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tokens?: number;
  attachments?: Array<{
    type: string;
    url?: string;
    data?: Record<string, unknown>;
  }>;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

/**
 * Memory search options
 */
export interface MemorySearchOptions {
  tenantId: string;
  entityId?: string;
  entityType?: 'user' | 'agent' | 'session';
  type?: MemoryType;
  query?: string;
  importance?: {
    min?: number;
    max?: number;
  };
  tags?: string[];
  limit?: number;
  offset?: number;
  since?: Date;
}

/**
 * Create memory input
 */
export interface CreateMemoryInput {
  tenantId: string;
  entityId: string;
  entityType: 'user' | 'agent' | 'session';
  type: MemoryType;
  content: string;
  importance?: number;
  tags?: string[];
  embedding?: number[];
  metadata?: Record<string, unknown>;
  expiresAt?: Date;
}

/**
 * Memory summary for context
 */
export interface MemorySummary {
  memories: Memory[];
  totalCount: number;
  byType: Record<MemoryType, number>;
  byImportance: {
    high: number;
    medium: number;
    low: number;
  };
  topTags: Array<{ tag: string; count: number }>;
}

// ============================================================================
// MEMORY REPOSITORY
// ============================================================================

/**
 * Repository for managing memories
 */
export class MemoryRepository {
  private collection: Collection<Memory>;
  private sessionsCollection: Collection<MemorySession>;
  private messagesCollection: Collection<ConversationMessage>;

  constructor(db: Db) {
    this.collection = db.collection<Memory>('memories');
    this.sessionsCollection = db.collection<MemorySession>('memory_sessions');
    this.messagesCollection = db.collection<ConversationMessage>('conversation_messages');
    this.ensureIndexes();
  }

  /**
   * Ensure required indexes exist
   */
  private async ensureIndexes(): Promise<void> {
    // Memory indexes
    await this.collection.createIndexes([
      { key: { memoryId: 1 }, unique: true },
      { key: { tenantId: 1, entityId: 1 } },
      { key: { tenantId: 1, entityType: 1 } },
      { key: { tenantId: 1, type: 1 } },
      { key: { tenantId: 1, entityId: 1, type: 1 } },
      { key: { importance: -1 } },
      { key: { tags: 1 } },
      { key: { expiresAt: 1 }, expireAfterSeconds: 0 },
      { key: { createdAt: -1 } },
    ]);

    // Session indexes
    await this.sessionsCollection.createIndexes([
      { key: { sessionId: 1 }, unique: true },
      { key: { tenantId: 1, entityId: 1 } },
      { key: { tenantId: 1, agentId: 1 } },
      { key: { status: 1, lastMessageAt: -1 } },
      { key: { lastMessageAt: -1 } },
    ]);

    // Message indexes
    await this.messagesCollection.createIndexes([
      { key: { messageId: 1 }, unique: true },
      { key: { sessionId: 1, createdAt: 1 } },
      { key: { sessionId: 1, role: 1 } },
    ]);
  }

  // ==========================================================================
  // MEMORY CRUD
  // ==========================================================================

  /**
   * Add a new memory
   */
  async addMemory(input: CreateMemoryInput): Promise<Memory> {
    const now = new Date();
    const memory: Memory = {
      memoryId: uuidv4(),
      tenantId: input.tenantId,
      entityId: input.entityId,
      entityType: input.entityType,
      type: input.type,
      content: input.content,
      importance: input.importance ?? 0.5,
      tags: input.tags,
      embedding: input.embedding,
      metadata: input.metadata,
      expiresAt: input.expiresAt,
      createdAt: now,
      updatedAt: now,
    };

    const result = await this.collection.insertOne(memory as Memory);
    return { ...memory, _id: result.insertedId };
  }

  /**
   * Find memory by ID
   */
  async findById(memoryId: string): Promise<Memory | null> {
    return this.collection.findOne({ memoryId });
  }

  /**
   * Find memories by entity
   */
  async findByEntity(
    tenantId: string,
    entityId: string,
    options: { type?: MemoryType; limit?: number } = {}
  ): Promise<Memory[]> {
    const query: Filter<Memory> = { tenantId, entityId };

    if (options.type) {
      query.type = options.type;
    }

    return this.collection
      .find(query)
      .sort({ importance: -1, createdAt: -1 })
      .limit(options.limit ?? 100)
      .toArray();
  }

  /**
   * Search memories
   */
  async search(options: MemorySearchOptions): Promise<Memory[]> {
    const query: Filter<Memory> = {
      tenantId: options.tenantId,
    };

    if (options.entityId) {
      query.entityId = options.entityId;
    }

    if (options.entityType) {
      query.entityType = options.entityType;
    }

    if (options.type) {
      query.type = options.type;
    }

    if (options.importance) {
      if (options.importance.min !== undefined) {
        query.importance = { ...(query.importance as object), $gte: options.importance.min };
      }
      if (options.importance.max !== undefined) {
        query.importance = { ...(query.importance as object), $lte: options.importance.max };
      }
    }

    if (options.tags && options.tags.length > 0) {
      query.tags = { $in: options.tags };
    }

    if (options.since) {
      query.createdAt = { $gte: options.since };
    }

    // Text search if query provided
    if (options.query) {
      query.$text = { $search: options.query };
    }

    return this.collection
      .find(query)
      .sort(options.query ? { score: { $meta: 'textScore' } } : { importance: -1, createdAt: -1 })
      .skip(options.offset ?? 0)
      .limit(options.limit ?? 20)
      .toArray();
  }

  /**
   * Update a memory
   */
  async update(
    memoryId: string,
    updates: Partial<Omit<Memory, '_id' | 'memoryId' | 'tenantId'>>
  ): Promise<Memory | null> {
    const updateDoc: Record<string, unknown> = {
      $set: {
        ...updates,
        updatedAt: new Date(),
      },
    };

    const result = await this.collection.findOneAndUpdate(
      { memoryId },
      updateDoc,
      { returnDocument: 'after' }
    );

    return result;
  }

  /**
   * Delete a memory
   */
  async delete(memoryId: string): Promise<boolean> {
    const result = await this.collection.deleteOne({ memoryId });
    return result.deletedCount > 0;
  }

  /**
   * Delete memories by entity
   */
  async deleteByEntity(tenantId: string, entityId: string): Promise<number> {
    const result = await this.collection.deleteMany({ tenantId, entityId });
    return result.deletedCount;
  }

  /**
   * Consolidate similar memories
   */
  async consolidateMemories(tenantId: string, entityId: string): Promise<number> {
    // Find all facts and preferences
    const memories = await this.collection
      .find({
        tenantId,
        entityId,
        type: { $in: [MemoryType.FACT, MemoryType.PREFERENCE] },
      })
      .toArray();

    // Group by content similarity (simple hash-based for now)
    const groups = new Map<string, Memory[]>();

    for (const memory of memories) {
      const key = memory.content.toLowerCase().trim();
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(memory);
    }

    // Keep highest importance memory in each group, delete others
    let deletedCount = 0;

    for (const [_, group] of groups) {
      if (group.length > 1) {
        // Sort by importance
        group.sort((a, b) => b.importance - a.importance);
        const [keeper, ...toDelete] = group;

        // Update keeper with merged tags
        const allTags = new Set([...(keeper.tags || []), ...group.flatMap((m) => m.tags || [])]);
        await this.update(keeper.memoryId, { tags: Array.from(allTags) });

        // Delete others
        const result = await this.collection.deleteMany({
          memoryId: { $in: toDelete.map((m) => m.memoryId) },
        });
        deletedCount += result.deletedCount;
      }
    }

    return deletedCount;
  }

  // ==========================================================================
  // SESSION MANAGEMENT
  // ==========================================================================

  /**
   * Create a new session
   */
  async createSession(input: {
    tenantId: string;
    entityId: string;
    agentId?: string;
    type: 'conversation' | 'task' | 'analysis';
    title?: string;
    context?: MemorySession['context'];
  }): Promise<MemorySession> {
    const now = new Date();
    const session: MemorySession = {
      sessionId: uuidv4(),
      tenantId: input.tenantId,
      entityId: input.entityId,
      agentId: input.agentId,
      type: input.type,
      title: input.title,
      context: input.context,
      messageCount: 0,
      totalTokens: 0,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      lastMessageAt: now,
    };

    const result = await this.sessionsCollection.insertOne(session as MemorySession);
    return { ...session, _id: result.insertedId };
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<MemorySession | null> {
    return this.sessionsCollection.findOne({ sessionId });
  }

  /**
   * Get active session for entity
   */
  async getActiveSession(tenantId: string, entityId: string): Promise<MemorySession | null> {
    return this.sessionsCollection.findOne({
      tenantId,
      entityId,
      status: 'active',
    });
  }

  /**
   * Add message to session
   */
  async addMessage(input: Omit<ConversationMessage, '_id' | 'messageId' | 'createdAt'>): Promise<ConversationMessage> {
    const now = new Date();
    const message: ConversationMessage = {
      ...input,
      messageId: uuidv4(),
      createdAt: now,
    };

    await this.messagesCollection.insertOne(message as ConversationMessage);

    // Update session stats
    await this.sessionsCollection.updateOne(
      { sessionId: input.sessionId },
      {
        $inc: {
          messageCount: 1,
          totalTokens: input.tokens ?? 0,
        },
        $set: {
          updatedAt: now,
          lastMessageAt: now,
        },
      }
    );

    return message;
  }

  /**
   * Get conversation history
   */
  async getConversationHistory(
    sessionId: string,
    options: { limit?: number; before?: Date } = {}
  ): Promise<ConversationMessage[]> {
    const query: Filter<ConversationMessage> = { sessionId };

    if (options.before) {
      query.createdAt = { $lt: options.before };
    }

    return this.messagesCollection
      .find(query)
      .sort({ createdAt: -1 })
      .limit(options.limit ?? 100)
      .toArray()
      .then((msgs) => msgs.reverse());
  }

  /**
   * Complete a session
   */
  async completeSession(sessionId: string): Promise<boolean> {
    const result = await this.sessionsCollection.updateOne(
      { sessionId },
      {
        $set: {
          status: 'completed',
          updatedAt: new Date(),
        },
      }
    );
    return result.modifiedCount > 0;
  }

  // ==========================================================================
  // MEMORY CONTEXT
  // ==========================================================================

  /**
   * Get memory context for an entity (for prompt building)
   */
  async getMemoryContext(
    tenantId: string,
    entityId: string,
    options: {
      maxMemories?: number;
      includeTypes?: MemoryType[];
      minImportance?: number;
    } = {}
  ): Promise<string> {
    const {
      maxMemories = 10,
      includeTypes,
      minImportance = 0.3,
    } = options;

    const query: Filter<Memory> = {
      tenantId,
      entityId,
      importance: { $gte: minImportance },
    };

    if (includeTypes) {
      query.type = { $in: includeTypes };
    }

    const memories = await this.collection
      .find(query)
      .sort({ importance: -1, createdAt: -1 })
      .limit(maxMemories)
      .toArray();

    if (memories.length === 0) {
      return '';
    }

    // Format as context string
    const contextParts = memories.map((m) => {
      const prefix = `[${m.type}]`;
      return `${prefix} ${m.content}`;
    });

    return `Relevant context:\n${contextParts.join('\n')}`;
  }

  /**
   * Get memory summary for analytics
   */
  async getMemorySummary(tenantId: string, entityId: string): Promise<MemorySummary> {
    const memories = await this.findByEntity(tenantId, entityId);

    const byType: Record<MemoryType, number> = {
      [MemoryType.INTERACTION]: 0,
      [MemoryType.FACT]: 0,
      [MemoryType.PREFERENCE]: 0,
      [MemoryType.DECISION]: 0,
      [MemoryType.KNOWLEDGE]: 0,
      [MemoryType.CONTEXT]: 0,
    };

    const byImportance = { high: 0, medium: 0, low: 0 };
    const tagCounts = new Map<string, number>();

    for (const memory of memories) {
      byType[memory.type] = (byType[memory.type] || 0) + 1;

      if (memory.importance >= 0.7) {
        byImportance.high++;
      } else if (memory.importance >= 0.4) {
        byImportance.medium++;
      } else {
        byImportance.low++;
      }

      for (const tag of memory.tags || []) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }
    }

    const topTags = Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      memories,
      totalCount: memories.length,
      byType,
      byImportance,
      topTags,
    };
  }

  // ==========================================================================
  // MAINTENANCE
  // ==========================================================================

  /**
   * Delete expired memories
   */
  async deleteExpired(): Promise<number> {
    const result = await this.collection.deleteMany({
      expiresAt: { $lt: new Date() },
    });
    return result.deletedCount;
  }

  /**
   * Archive old sessions
   */
  async archiveOldSessions(daysInactive = 30): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysInactive);

    const result = await this.sessionsCollection.updateMany(
      {
        status: 'completed',
        updatedAt: { $lt: cutoff },
      },
      {
        $set: {
          status: 'archived',
          updatedAt: new Date(),
        },
      }
    );

    return result.modifiedCount;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  MemoryType,
  type Memory,
  type MemorySession,
  type ConversationMessage,
  type MemorySearchOptions,
  type CreateMemoryInput,
  type MemorySummary,
};

export default MemoryRepository;
