// ============================================================================
// Priority Queue Service - Prioritize intents
// ============================================================================

import { Intent } from '../index';

export interface PriorityLevel {
  level: 'critical' | 'high' | 'normal' | 'low';
  score: number;
  processingTimeMs: number;
  maxRetries: number;
}

export interface QueuedIntent {
  intent: Intent;
  priority: PriorityLevel;
  enqueuedAt: string;
  position: number;
  estimatedWaitTime: number;
  metadata: QueueMetadata;
}

export interface QueueMetadata {
  source: 'api' | 'webhook' | 'batch' | 'scheduled';
  userSegment?: 'new' | 'active' | 'power' | 'vip' | 'enterprise';
  intentAge: number;
  contextScore: number;
  tags: string[];
}

export interface QueueStats {
  totalQueued: number;
  byPriority: Record<string, number>;
  averageWaitTime: number;
  averageProcessingTime: number;
  throughput: number;
  queueHealth: 'healthy' | 'degraded' | 'overloaded';
  oldestItemAge: number;
}

export interface QueueConfiguration {
  maxQueueSize: number;
  maxProcessingTime: number;
  scalingThreshold: number;
  priorityWeights: Record<string, number>;
}

const DEFAULT_PRIORITY_LEVELS: Record<string, PriorityLevel> = {
  critical: { level: 'critical', score: 100, processingTimeMs: 100, maxRetries: 5 },
  high: { level: 'high', score: 75, processingTimeMs: 500, maxRetries: 3 },
  normal: { level: 'normal', score: 50, processingTimeMs: 2000, maxRetries: 2 },
  low: { level: 'low', score: 25, processingTimeMs: 10000, maxRetries: 1 }
};

export class PriorityQueue {
  private queues: Map<string, QueuedIntent[]>;
  private priorityLevels: Map<string, PriorityLevel>;
  private config: QueueConfiguration;
  private stats: QueueStats;
  private processingTimes: number[];
  private lastCleanup: number;

  constructor() {
    this.queues = new Map();
    this.priorityLevels = new Map();
    this.processingTimes = [];
    this.lastCleanup = Date.now();

    // Initialize priority queues
    Object.keys(DEFAULT_PRIORITY_LEVELS).forEach(level => {
      this.queues.set(level, []);
      this.priorityLevels.set(level, DEFAULT_PRIORITY_LEVELS[level]);
    });

    this.config = {
      maxQueueSize: 10000,
      maxProcessingTime: 30000,
      scalingThreshold: 0.8,
      priorityWeights: {
        critical: 1.0,
        high: 0.75,
        normal: 0.5,
        low: 0.25
      }
    };

    this.stats = this.initStats();
  }

  private initStats(): QueueStats {
    return {
      totalQueued: 0,
      byPriority: { critical: 0, high: 0, normal: 0, low: 0 },
      averageWaitTime: 0,
      averageProcessingTime: 0,
      throughput: 0,
      queueHealth: 'healthy',
      oldestItemAge: 0
    };
  }

  /**
   * Enqueue an intent with priority
   */
  enqueue(intent: Intent, options?: { priority?: string; metadata?: Partial<QueueMetadata> }): QueuedIntent {
    const priorityLevel = this.determinePriority(intent, options?.priority);
    const priority = this.priorityLevels.get(priorityLevel) || DEFAULT_PRIORITY_LEVELS.normal;

    const metadata: QueueMetadata = {
      source: options?.metadata?.source || 'api',
      userSegment: options?.metadata?.userSegment,
      intentAge: Date.now() - new Date(intent.createdAt).getTime(),
      contextScore: intent.confidence,
      tags: options?.metadata?.tags || []
    };

    const queue = this.queues.get(priorityLevel) || [];
    const position = queue.length + 1;

    const queuedIntent: QueuedIntent = {
      intent,
      priority,
      enqueuedAt: new Date().toISOString(),
      position,
      estimatedWaitTime: this.calculateWaitTime(priorityLevel),
      metadata
    };

    queue.push(queuedIntent);
    this.queues.set(priorityLevel, queue);
    this.updateStats();

    return queuedIntent;
  }

  /**
   * Dequeue the highest priority intent
   */
  dequeue(): QueuedIntent | null {
    // Process in priority order
    const priorityOrder = ['critical', 'high', 'normal', 'low'];

    for (const level of priorityOrder) {
      const queue = this.queues.get(level);
      if (queue && queue.length > 0) {
        const item = queue.shift()!;
        item.position = 0;
        this.reorderQueue(level);
        this.updateStats();
        return item;
      }
    }

    return null;
  }

  /**
   * Peek at the next item without removing
   */
  peek(): QueuedIntent | null {
    const priorityOrder = ['critical', 'high', 'normal', 'low'];

    for (const level of priorityOrder) {
      const queue = this.queues.get(level);
      if (queue && queue.length > 0) {
        return queue[0];
      }
    }

    return null;
  }

  /**
   * Get queue size for a priority level
   */
  size(priorityLevel?: string): number {
    if (priorityLevel) {
      const queue = this.queues.get(priorityLevel);
      return queue?.length || 0;
    }

    let total = 0;
    this.queues.forEach(queue => total += queue.length);
    return total;
  }

  /**
   * Get all items in queue
   */
  getAll(priorityLevel?: string): QueuedIntent[] {
    if (priorityLevel) {
      return this.queues.get(priorityLevel) || [];
    }

    const all: QueuedIntent[] = [];
    this.queues.forEach(queue => all.push(...queue));
    return all.sort((a, b) => b.priority.score - a.priority.score);
  }

  /**
   * Remove a specific intent from queue
   */
  remove(intentId: string): boolean {
    for (const [level, queue] of this.queues.entries()) {
      const index = queue.findIndex(q => q.intent.id === intentId);
      if (index !== -1) {
        queue.splice(index, 1);
        this.reorderQueue(level);
        this.updateStats();
        return true;
      }
    }
    return false;
  }

  /**
   * Update priority of an intent
   */
  updatePriority(intentId: string, newPriority: string): boolean {
    const item = this.findInQueue(intentId);
    if (!item) return false;

    // Remove from current queue
    const currentQueue = this.queues.get(item.priority.level);
    if (currentQueue) {
      const index = currentQueue.findIndex(q => q.intent.id === intentId);
      if (index !== -1) {
        currentQueue.splice(index, 1);
      }
    }

    // Update priority
    const priority = this.priorityLevels.get(newPriority) || DEFAULT_PRIORITY_LEVELS.normal;
    item.priority = priority;
    item.estimatedWaitTime = this.calculateWaitTime(newPriority);

    // Add to new queue
    const newQueue = this.queues.get(newPriority) || [];
    newQueue.push(item);
    this.queues.set(newPriority, newQueue);

    this.reorderAllQueues();
    this.updateStats();

    return true;
  }

  /**
   * Get queue statistics
   */
  getStats(): QueueStats {
    this.updateStats();
    return { ...this.stats };
  }

  /**
   * Clear a specific queue
   */
  clear(priorityLevel?: string): number {
    let clearedCount = 0;

    if (priorityLevel) {
      const queue = this.queues.get(priorityLevel);
      if (queue) {
        clearedCount = queue.length;
        this.queues.set(priorityLevel, []);
      }
    } else {
      this.queues.forEach((queue, level) => {
        clearedCount += queue.length;
        this.queues.set(level, []);
      });
    }

    this.updateStats();
    return clearedCount;
  }

  /**
   * Configure priority levels
   */
  configurePriority(level: string, config: Partial<PriorityLevel>): void {
    const current = this.priorityLevels.get(level) || DEFAULT_PRIORITY_LEVELS[level as keyof typeof DEFAULT_PRIORITY_LEVELS];
    this.priorityLevels.set(level, { ...current, ...config });
  }

  /**
   * Get queue health status
   */
  getHealth(): 'healthy' | 'degraded' | 'overloaded' {
    const totalSize = this.size();
    const maxSize = this.config.maxQueueSize;
    const utilization = totalSize / maxSize;

    if (utilization > 0.9) return 'overloaded';
    if (utilization > 0.7) return 'degraded';
    return 'healthy';
  }

  /**
   * Wait for queue to have items
   */
  async waitForItem(timeoutMs: number = 5000): Promise<QueuedIntent | null> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const item = this.dequeue();
      if (item) return item;

      // Wait a bit before checking again
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return null;
  }

  // Private helper methods

  determinePriority(intent: Intent, forcedPriority?: string): string {
    if (forcedPriority) return forcedPriority;

    // Check for VIP/Enterprise users
    if (intent.context?.userType === 'vip' || intent.context?.userType === 'enterprise') {
      return 'high';
    }

    // Check for critical categories
    if (intent.category === 'contract' || intent.category === 'negotiation') {
      return 'critical';
    }

    // Check for high confidence purchase intents
    if (intent.category === 'purchase' && intent.confidence > 0.8) {
      return 'high';
    }

    // Check for new users (potentially higher value)
    if (intent.context?.isNewUser) {
      return 'high';
    }

    // Default based on confidence
    if (intent.confidence > 0.9) return 'normal';
    if (intent.confidence > 0.7) return 'normal';
    return 'low';
  }

  private calculateWaitTime(priorityLevel: string): number {
    const queue = this.queues.get(priorityLevel);
    if (!queue) return 0;

    const priority = this.priorityLevels.get(priorityLevel);
    if (!priority) return 0;

    // Calculate based on items ahead and their processing times
    let totalTime = 0;
    for (const item of queue) {
      totalTime += item.priority.processingTimeMs;
    }

    return totalTime;
  }

  private reorderQueue(priorityLevel: string): void {
    const queue = this.queues.get(priorityLevel);
    if (!queue) return;

    queue.forEach((item, index) => {
      item.position = index + 1;
      item.estimatedWaitTime = this.calculateWaitTime(priorityLevel);
    });
  }

  private reorderAllQueues(): void {
    this.queues.forEach((_, level) => {
      this.reorderQueue(level);
    });
  }

  private findInQueue(intentId: string): QueuedIntent | null {
    for (const queue of this.queues.values()) {
      const item = queue.find(q => q.intent.id === intentId);
      if (item) return item;
    }
    return null;
  }

  private updateStats(): void {
    let totalQueued = 0;
    const byPriority: Record<string, number> = { critical: 0, high: 0, normal: 0, low: 0 };
    let oldestAge = 0;

    this.queues.forEach((queue, level) => {
      totalQueued += queue.length;
      byPriority[level] = queue.length;

      if (queue.length > 0) {
        const oldest = queue[0];
        const age = Date.now() - new Date(oldest.enqueuedAt).getTime();
        if (age > oldestAge) oldestAge = age;
      }
    });

    const avgWaitTime = totalQueued > 0
      ? Array.from(this.queues.values()).flat().reduce((sum, item) =>
          sum + (Date.now() - new Date(item.enqueuedAt).getTime()), 0) / totalQueued
      : 0;

    const avgProcessingTime = this.processingTimes.length > 0
      ? this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length
      : 0;

    const throughput = avgProcessingTime > 0 ? 1000 / avgProcessingTime : 0;

    this.stats = {
      totalQueued,
      byPriority,
      averageWaitTime: avgWaitTime,
      averageProcessingTime: avgProcessingTime,
      throughput,
      queueHealth: this.getHealth(),
      oldestItemAge: oldestAge
    };
  }

  /**
   * Record processing time for analytics
   */
  recordProcessingTime(timeMs: number): void {
    this.processingTimes.push(timeMs);
    if (this.processingTimes.length > 100) {
      this.processingTimes.shift();
    }
  }
}

// Export singleton instance
export const priorityQueue = new PriorityQueue();
