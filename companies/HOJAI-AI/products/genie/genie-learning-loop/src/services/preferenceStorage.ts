/**
 * Preference Storage — Redis-based storage for learned preferences
 */

import Redis from 'ioredis';
import { LearnedPreference } from '../types/preference.js';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const PREF_KEY = (id: string) => `pref:${id}`;
const USER_PREFS_KEY = (userId: string) => `user:${userId}:prefs`;
const PATTERN_INDEX = (pattern: string) => `pref:pattern:${pattern.toLowerCase()}`;

export const PreferenceStorage = {
  async save(pref: LearnedPreference): Promise<void> {
    const pipeline = redis.pipeline();
    pipeline.set(PREF_KEY(pref.id), JSON.stringify(pref));
    pipeline.sadd(USER_PREFS_KEY(pref.userId), pref.id);
    pipeline.sadd(PATTERN_INDEX(pref.pattern), pref.id);
    await pipeline.exec();
  },

  async get(id: string): Promise<LearnedPreference | null> {
    const data = await redis.get(PREF_KEY(id));
    return data ? JSON.parse(data) : null;
  },

  async getForUser(userId: string): Promise<LearnedPreference[]> {
    const ids = await redis.smembers(USER_PREFS_KEY(userId));
    if (ids.length === 0) return [];

    const pipeline = redis.pipeline();
    ids.forEach(id => pipeline.get(PREF_KEY(id)));
    const results = await pipeline.exec();

    return results
      ?.filter(([err, val]) => !err && val)
      ?.map(([_, val]) => JSON.parse(val as string)) || [];
  },

  async findByPattern(pattern: string): Promise<LearnedPreference | null> {
    const ids = await redis.smembers(PATTERN_INDEX(pattern));
    if (ids.length === 0) return null;
    return this.get(ids[0]);
  },

  async delete(id: string): Promise<void> {
    const pref = await this.get(id);
    if (!pref) return;

    const pipeline = redis.pipeline();
    pipeline.del(PREF_KEY(id));
    pipeline.srem(USER_PREFS_KEY(pref.userId), id);
    pipeline.srem(PATTERN_INDEX(pref.pattern), id);
    await pipeline.exec();
  },
};