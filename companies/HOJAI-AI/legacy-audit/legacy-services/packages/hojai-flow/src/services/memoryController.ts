/**
 * Hojai Flow - Memory Controller Service
 *
 * Memory hierarchy management:
 * - L1 Hot (RAM, 1-10ms)
 * - L2 Warm (SQLite, 10-50ms)
 * - L3 Personal Cloud (100-300ms)
 * - L4 Organizational (API calls)
 * - L5 Global (API calls)
 */

import { v4 as uuid } from 'uuid';

export type MemoryLevel = 'L1' | 'L2' | 'L3' | 'L4' | 'L5';

export interface MemoryObject {
  id: string;
  level: MemoryLevel;
  type: string;
  data: unknown;
  version: number;
  timestamp: Date;
  owner: string;
  tags: string[];
  dependencies: string[];
  ttl?: number;
  size: number;
}

export interface MemoryQuery {
  owner: string;
  type?: string;
  tags?: string[];
  since?: Date;
  limit?: number;
}

export interface MemoryContext {
  userId: string;
  currentApp?: string;
  currentConversation?: string;
  recentContacts?: string[];
  recentActions?: string[];
  timeOfDay?: string;
  location?: string;
  merchantContext?: Record<string, unknown>;
}

const MEMORY_LEVELS: Record<MemoryLevel, { maxSize: number; ttl: number; latency: string }> = {
  L1: { maxSize: 200 * 1024 * 1024, ttl: 3600, latency: '1-10ms' }, // 200MB, 1hr
  L2: { maxSize: 500 * 1024 * 1024, ttl: 86400 * 7, latency: '10-50ms' }, // 500MB, 7 days
  L3: { maxSize: 1024 * 1024 * 1024, ttl: 86400 * 30, latency: '100-300ms' }, // 1GB, 30 days
  L4: { maxSize: Infinity, ttl: -1, latency: 'variable' }, // Unlimited
  L5: { maxSize: Infinity, ttl: -1, latency: 'variable' }, // Unlimited
};

export class MemoryController {
  private l1Cache: Map<string, MemoryObject>;
  private l2Store: Map<string, MemoryObject>;
  private l3Cache: Map<string, MemoryObject>;
  private accessLog: Map<string, number>;
  private prefetchQueue: string[];

  constructor() {
    this.l1Cache = new Map();
    this.l2Store = new Map();
    this.l3Cache = new Map();
    this.accessLog = new Map();
    this.prefetchQueue = [];
  }

  /**
   * Store memory at appropriate level
   */
  async store(
    owner: string,
    type: string,
    data: unknown,
    options: { level?: MemoryLevel; tags?: string[]; ttl?: number } = {}
  ): Promise<MemoryObject> {
    const { level = 'L2', tags = [], ttl } = options;

    const memory: MemoryObject = {
      id: uuid(),
      level,
      type,
      data,
      version: 1,
      timestamp: new Date(),
      owner,
      tags,
      dependencies: [],
      ttl,
      size: JSON.stringify(data).length,
    };

    // Store at appropriate level
    switch (level) {
      case 'L1':
        this.storeL1(memory);
        break;
      case 'L2':
        this.storeL2(memory);
        break;
      case 'L3':
        this.storeL3(memory);
        break;
      case 'L4':
      case 'L5':
        await this.storeCloud(memory);
        break;
    }

    return memory;
  }

  /**
   * Store in L1 (RAM)
   */
  private storeL1(memory: MemoryObject): void {
    // Check size limit
    let totalSize = 0;
    for (const [, m] of this.l1Cache) {
      totalSize += m.size;
    }

    // Evict if necessary
    while (totalSize + memory.size > MEMORY_LEVELS.L1.maxSize) {
      const oldest = this.findOldestL1();
      if (oldest) {
        this.l1Cache.delete(oldest);
        totalSize -= this.l1Cache.get(oldest)?.size || 0;
      } else {
        break;
      }
    }

    this.l1Cache.set(memory.id, memory);
    this.l1Cache.set(memory.id, memory);
    this.accessLog.set(memory.id, Date.now());
  }

  /**
   * Store in L2 (Local DB)
   */
  private storeL2(memory: MemoryObject): void {
    this.l2Store.set(memory.id, memory);
    this.accessLog.set(memory.id, Date.now());

    // Promote to L1 if frequently accessed
    if (this.getAccessCount(memory.id) > 5) {
      this.promoteToL1(memory.id);
    }
  }

  /**
   * Store in L3 (Personal Cloud)
   */
  private storeL3(memory: MemoryObject): void {
    this.l3Cache.set(memory.id, memory);
    this.accessLog.set(memory.id, Date.now());
  }

  /**
   * Store in cloud (L4/L5)
   */
  private async storeCloud(memory: MemoryObject): Promise<void> {
    // In production, this would call the appropriate cloud API
    console.log(`[MemoryController] Storing in ${memory.level}:`, memory.id);
    this.accessLog.set(memory.id, Date.now());
  }

  /**
   * Retrieve memory with auto-level detection
   */
  async retrieve(
    owner: string,
    query: MemoryQuery,
    options: { preferLevel?: MemoryLevel } = {}
  ): Promise<MemoryObject | null> {
    const { preferLevel } = options;

    // Check L1 first (fastest)
    if (!preferLevel || preferLevel === 'L1') {
      const l1Result = this.retrieveFromL1(owner, query);
      if (l1Result) return l1Result;
    }

    // Check L2
    if (!preferLevel || preferLevel === 'L2') {
      const l2Result = this.retrieveFromL2(owner, query);
      if (l2Result) {
        // Promote to L1 for future access
        this.promoteToL1(l2Result.id);
        return l2Result;
      }
    }

    // Check L3
    if (!preferLevel || preferLevel === 'L3') {
      const l3Result = this.retrieveFromL3(owner, query);
      if (l3Result) return l3Result;
    }

    // Fetch from cloud if needed
    if (!preferLevel || preferLevel === 'L4' || preferLevel === 'L5') {
      return this.retrieveFromCloud(owner, query);
    }

    return null;
  }

  /**
   * Retrieve from L1
   */
  private retrieveFromL1(owner: string, query: MemoryQuery): MemoryObject | null {
    for (const [, memory] of this.l1Cache) {
      if (memory.owner === owner && this.matchesQuery(memory, query)) {
        this.accessLog.set(memory.id, Date.now());
        return memory;
      }
    }
    return null;
  }

  /**
   * Retrieve from L2
   */
  private retrieveFromL2(owner: string, query: MemoryQuery): MemoryObject | null {
    for (const [, memory] of this.l2Store) {
      if (memory.owner === owner && this.matchesQuery(memory, query)) {
        this.accessLog.set(memory.id, Date.now());
        return memory;
      }
    }
    return null;
  }

  /**
   * Retrieve from L3
   */
  private retrieveFromL3(owner: string, query: MemoryQuery): MemoryObject | null {
    for (const [, memory] of this.l3Cache) {
      if (memory.owner === owner && this.matchesQuery(memory, query)) {
        this.accessLog.set(memory.id, Date.now());
        return memory;
      }
    }
    return null;
  }

  /**
   * Retrieve from cloud
   */
  private async retrieveFromCloud(owner: string, query: MemoryQuery): Promise<MemoryObject | null> {
    // In production, this would call L4/L5 APIs
    console.log(`[MemoryController] Retrieving from cloud for ${owner}`);
    return null;
  }

  /**
   * Check if memory matches query
   */
  private matchesQuery(memory: MemoryObject, query: MemoryQuery): boolean {
    if (query.type && memory.type !== query.type) return false;
    if (query.tags && !query.tags.some((tag) => memory.tags.includes(tag))) return false;
    if (query.since && memory.timestamp < query.since) return false;
    return true;
  }

  /**
   * Promote memory to higher tier
   */
  private promoteToL1(memoryId: string): void {
    const memory = this.l2Store.get(memoryId) || this.l3Cache.get(memoryId);
    if (memory) {
      this.storeL1(memory);
      this.l2Store.delete(memoryId);
      this.l3Cache.delete(memoryId);
    }
  }

  /**
   * Demote memory to lower tier
   */
  private demoteMemory(memoryId: string, toLevel: MemoryLevel): void {
    const memory =
      this.l1Cache.get(memoryId) ||
      this.l2Store.get(memoryId) ||
      this.l3Cache.get(memoryId);

    if (!memory) return;

    memory.level = toLevel;

    switch (toLevel) {
      case 'L1':
        this.storeL1(memory);
        break;
      case 'L2':
        this.l2Store.set(memoryId, memory);
        break;
      case 'L3':
        this.l3Cache.set(memoryId, memory);
        break;
    }
  }

  /**
   * Find oldest L1 entry
   */
  private findOldestL1(): string | null {
    let oldest: string | null = null;
    let oldestTime = Infinity;

    for (const [id, time] of this.accessLog) {
      if (this.l1Cache.has(id) && time < oldestTime) {
        oldestTime = time;
        oldest = id;
      }
    }

    return oldest;
  }

  /**
   * Get access count for memory
   */
  private getAccessCount(memoryId: string): number {
    // Simplified: just check if it was accessed multiple times
    return this.accessLog.has(memoryId) ? 1 : 0;
  }

  /**
   * Get context for a user
   */
  async getContext(userId: string): Promise<MemoryContext> {
    const context: MemoryContext = {
      userId,
      recentContacts: [],
      recentActions: [],
    };

    // Get from L1
    for (const [, memory] of this.l1Cache) {
      if (memory.owner === userId) {
        if (memory.type === 'contact') {
          context.recentContacts?.push(memory.id);
        }
        if (memory.type === 'action') {
          context.recentActions?.push(memory.id);
        }
      }
    }

    return context;
  }

  /**
   * Prefetch memory based on context
   */
  async prefetch(context: MemoryContext): Promise<void> {
    const { userId, currentApp, timeOfDay } = context;

    // Predict what user might need
    const predictions = this.predictNeeds(context);

    for (const predicted of predictions) {
      const memory = await this.retrieve(userId, { owner: userId, type: predicted.type, tags: predicted.tags });
      if (memory && memory.level !== 'L1') {
        this.promoteToL1(memory.id);
      }
    }
  }

  /**
   * Predict user needs based on context
   */
  private predictNeeds(context: MemoryContext): { type: string; tags: string[] }[] {
    const predictions: { type: string; tags: string[] }[] = [];

    // Time-based predictions
    if (context.timeOfDay === 'morning') {
      predictions.push({ type: 'schedule', tags: ['daily', 'meeting'] });
    }

    // App-based predictions
    if (context.currentApp === 'crm') {
      predictions.push({ type: 'customer', tags: ['recent'] });
      predictions.push({ type: 'lead', tags: ['active'] });
    }

    return predictions;
  }

  /**
   * Clear expired memories
   */
  async cleanup(): Promise<void> {
    const now = Date.now();

    // Clean L1
    for (const [id, memory] of this.l1Cache) {
      if (memory.ttl && now - memory.timestamp.getTime() > memory.ttl * 1000) {
        this.l1Cache.delete(id);
      }
    }

    // Clean L2
    for (const [id, memory] of this.l2Store) {
      if (memory.ttl && now - memory.timestamp.getTime() > memory.ttl * 1000) {
        this.l2Store.delete(id);
      }
    }
  }

  /**
   * Get memory statistics
   */
  getStats(): {
    l1Count: number;
    l2Count: number;
    l3Count: number;
    l1Size: number;
    accessCount: number;
  } {
    let l1Size = 0;
    for (const [, memory] of this.l1Cache) {
      l1Size += memory.size;
    }

    return {
      l1Count: this.l1Cache.size,
      l2Count: this.l2Store.size,
      l3Count: this.l3Cache.size,
      l1Size,
      accessCount: this.accessLog.size,
    };
  }

  /**
   * Invalidate memory
   */
  async invalidate(owner: string, memoryId: string): Promise<void> {
    this.l1Cache.delete(memoryId);
    this.l2Store.delete(memoryId);
    this.l3Cache.delete(memoryId);
    this.accessLog.delete(memoryId);
  }

  /**
   * Clear all memory for an owner
   */
  async clearOwner(owner: string): Promise<void> {
    for (const [id, memory] of this.l1Cache) {
      if (memory.owner === owner) this.l1Cache.delete(id);
    }
    for (const [id, memory] of this.l2Store) {
      if (memory.owner === owner) this.l2Store.delete(id);
    }
    for (const [id, memory] of this.l3Cache) {
      if (memory.owner === owner) this.l3Cache.delete(id);
    }
  }
}

// Singleton export
export const memoryController = new MemoryController();

export default memoryController;
