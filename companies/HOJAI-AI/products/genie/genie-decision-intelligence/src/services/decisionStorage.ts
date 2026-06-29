/**
 * Decision Storage — Redis-based storage for decisions
 * Spec Part 21: Decision Intelligence
 */

import Redis from 'ioredis';
import { Decision, DecisionMemory } from '../types/decision.js';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const DECISION_KEY = (id: string) => `decision:${id}`;
const USER_DECISIONS_KEY = (userId: string) => `user:${userId}:decisions`;
const DECISION_INDEX_KEY = 'decision:index';

export const DecisionStorage = {
  /**
   * Save a new decision
   */
  async save(decision: Decision): Promise<void> {
    const pipeline = redis.pipeline();
    pipeline.set(DECISION_KEY(decision.id), JSON.stringify(decision));
    pipeline.sadd(USER_DECISIONS_KEY(decision.userId), decision.id);
    pipeline.sadd(DECISION_INDEX_KEY, decision.id);

    // Add to searchable indexes
    for (const tag of decision.tags) {
      pipeline.sadd(`decision:tag:${tag.toLowerCase()}`, decision.id);
    }

    // Set TTL based on impact
    const ttl = decision.impact === 'high' ? 0 :
                decision.impact === 'medium' ? 60 * 60 * 24 * 365 : // 1 year
                60 * 60 * 24 * 90; // 90 days

    if (ttl > 0) {
      pipeline.expire(DECISION_KEY(decision.id), ttl);
    }

    await pipeline.exec();
  },

  /**
   * Get a single decision by ID
   */
  async get(id: string): Promise<Decision | null> {
    const data = await redis.get(DECISION_KEY(id));
    return data ? JSON.parse(data) : null;
  },

  /**
   * Get all decisions for a user
   */
  async getForUser(userId: string, options?: {
    limit?: number;
    offset?: number;
    impact?: 'low' | 'medium' | 'high';
    since?: Date;
  }): Promise<Decision[]> {
    const ids = await redis.smembers(USER_DECISIONS_KEY(userId));

    if (ids.length === 0) return [];

    const pipeline = redis.pipeline();
    ids.forEach(id => pipeline.get(DECISION_KEY(id)));
    const results = await pipeline.exec();

    let decisions: Decision[] = results
      ?.filter(([err, val]) => !err && val)
      ?.map(([_, val]) => JSON.parse(val as string)) || [];

    // Apply filters
    if (options?.impact) {
      decisions = decisions.filter(d => d.impact === options.impact);
    }
    if (options?.since) {
      decisions = decisions.filter(d => new Date(d.when) >= options.since!);
    }

    // Sort by date descending
    decisions.sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime());

    // Apply pagination
    const offset = options?.offset || 0;
    const limit = options?.limit || 100;
    return decisions.slice(offset, offset + limit);
  },

  /**
   * Search decisions by tag
   */
  async searchByTag(tag: string): Promise<Decision[]> {
    const ids = await redis.smembers(`decision:tag:${tag.toLowerCase()}`);
    if (ids.length === 0) return [];

    const pipeline = redis.pipeline();
    ids.forEach(id => pipeline.get(DECISION_KEY(id)));
    const results = await pipeline.exec();

    return results
      ?.filter(([err, val]) => !err && val)
      ?.map(([_, val]) => JSON.parse(val as string)) || [];
  },

  /**
   * Get decision memory summary for a user
   */
  async getMemorySummary(userId: string): Promise<DecisionMemory> {
    const decisions = await this.getForUser(userId);

    return {
      userId,
      decisions: decisions.slice(0, 10), // Top 10 recent
      totalCount: decisions.length,
      byImpact: {
        high: decisions.filter(d => d.impact === 'high').length,
        medium: decisions.filter(d => d.impact === 'medium').length,
        low: decisions.filter(d => d.impact === 'low').length,
      },
      bySource: decisions.reduce((acc, d) => {
        acc[d.source] = (acc[d.source] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  },

  /**
   * Update a decision (e.g., add revisit notes)
   */
  async update(id: string, updates: Partial<Decision>): Promise<Decision | null> {
    const existing = await this.get(id);
    if (!existing) return null;

    const updated: Decision = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };

    await this.save(updated);
    return updated;
  },

  /**
   * Delete a decision
   */
  async delete(id: string): Promise<boolean> {
    const existing = await this.get(id);
    if (!existing) return false;

    const pipeline = redis.pipeline();
    pipeline.del(DECISION_KEY(id));
    pipeline.srem(USER_DECISIONS_KEY(existing.userId), id);
    pipeline.srem(DECISION_INDEX_KEY, id);

    for (const tag of existing.tags) {
      pipeline.srem(`decision:tag:${tag.toLowerCase()}`, id);
    }

    await pipeline.exec();
    return true;
  },
};