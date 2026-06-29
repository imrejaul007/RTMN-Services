/**
 * Archive Builder — Build digital legacy archive
 * Spec Part 35: Digital Legacy
 */

import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { LegacyEntry, LegacyStats } from '../types/legacy.js';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const ENTRY_KEY = (userId: string) => `user:${userId}:legacy_entries`;

export const ArchiveBuilder = {
  async addEntry(
    userId: string,
    type: LegacyEntry['type'],
    title: string,
    content: string,
    options?: {
      tags?: string[];
      visibility?: LegacyEntry['visibility'];
      recipients?: string[];
      preserveUntil?: Date;
    }
  ): Promise<LegacyEntry> {
    const entry: LegacyEntry = {
      id: `leg_${uuidv4()}`,
      userId,
      type,
      title,
      content,
      date: new Date(),
      tags: options?.tags,
      visibility: options?.visibility || 'private',
      recipients: options?.recipients,
      preserveUntil: options?.preserveUntil,
    };

    await redis.set(`entry:${entry.id}`, JSON.stringify(entry));
    await redis.sadd(ENTRY_KEY(userId), entry.id);

    return entry;
  },

  async getEntries(userId: string, type?: LegacyEntry['type']): Promise<LegacyEntry[]> {
    const ids = await redis.smembers(ENTRY_KEY(userId));
    if (ids.length === 0) return [];

    const pipeline = redis.pipeline();
    ids.forEach(id => pipeline.get(`entry:${id}`));
    const results = await pipeline.exec();

    let entries = results
      ?.filter(([err, val]) => !err && val)
      ?.map(([_, val]) => JSON.parse(val as string)) || [];

    if (type) {
      entries = entries.filter(e => e.type === type);
    }

    return entries.sort((a: LegacyEntry, b: LegacyEntry) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  },

  async getStats(userId: string): Promise<LegacyStats> {
    const entries = await this.getEntries(userId);

    const byType: Record<string, number> = {};
    let totalWords = 0;

    for (const entry of entries) {
      byType[entry.type] = (byType[entry.type] || 0) + 1;
      totalWords += entry.content.split(/\s+/).length;
    }

    const dates = entries.map(e => new Date(e.date).getTime());

    return {
      totalEntries: entries.length,
      byType,
      chaptersCount: byType['story'] || 0,
      familyMembersCount: 0, // Would query separately
      oldestEntry: dates.length > 0 ? new Date(Math.min(...dates)) : undefined,
      newestEntry: dates.length > 0 ? new Date(Math.max(...dates)) : undefined,
      totalWords,
    };
  },
};