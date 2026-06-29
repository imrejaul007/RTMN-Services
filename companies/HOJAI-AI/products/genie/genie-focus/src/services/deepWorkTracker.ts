/**
 * Deep Work Tracker — Track focus sessions
 * Spec Part 31: FocusOS
 */

import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { FocusSession } from '../types/focus.js';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const SESSION_KEY = (userId: string) => `user:${userId}:focus_sessions`;

export const DeepWorkTracker = {
  async start(userId: string, category: string, notes?: string): Promise<FocusSession> {
    const session: FocusSession = {
      id: `focus_${uuidv4()}`,
      userId,
      startTime: new Date(),
      category,
      quality: 'good',  // Will be updated on end
      interruptions: 0,
      notes,
    };

    await redis.set(`session:${session.id}`, JSON.stringify(session));
    await redis.sadd(SESSION_KEY(userId), session.id);

    return session;
  },

  async end(sessionId: string, quality: FocusSession['quality'], interruptions: number): Promise<FocusSession | null> {
    const data = await redis.get(`session:${sessionId}`);
    if (!data) return null;

    const session: FocusSession = JSON.parse(data);
    session.endTime = new Date();
    session.durationMinutes = Math.round((session.endTime.getTime() - new Date(session.startTime).getTime()) / 60000);
    session.quality = quality;
    session.interruptions = interruptions;

    await redis.set(`session:${sessionId}`, JSON.stringify(session));
    return session;
  },

  async getHistory(userId: string, days: number = 30): Promise<FocusSession[]> {
    const ids = await redis.smembers(SESSION_KEY(userId));
    if (ids.length === 0) return [];

    const pipeline = redis.pipeline();
    ids.forEach(id => pipeline.get(`session:${id}`));
    const results = await pipeline.exec();

    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

    return results
      ?.filter(([err, val]) => !err && val)
      ?.map(([_, val]) => JSON.parse(val as string))
      ?.filter((s: FocusSession) => new Date(s.startTime).getTime() > cutoff)
      ?.sort((a: FocusSession, b: FocusSession) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()) || [];
  },

  async getStats(userId: string, days: number = 30): Promise<{
    totalSessions: number;
    totalMinutes: number;
    avgQuality: number;
    totalInterruptions: number;
    topCategories: Array<{ category: string; minutes: number }>;
  }> {
    const sessions = await this.getHistory(userId, days);

    const totalSessions = sessions.length;
    const totalMinutes = sessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
    const qualityMap: Record<string, number> = { excellent: 4, good: 3, fair: 2, poor: 1 };
    const avgQuality = sessions.length > 0
      ? sessions.reduce((sum, s) => sum + (qualityMap[s.quality] || 2), 0) / sessions.length
      : 0;
    const totalInterruptions = sessions.reduce((sum, s) => sum + (s.interruptions || 0), 0);

    const categoryMap = new Map<string, number>();
    for (const s of sessions) {
      categoryMap.set(s.category, (categoryMap.get(s.category) || 0) + (s.durationMinutes || 0));
    }
    const topCategories = Array.from(categoryMap.entries())
      .map(([category, minutes]) => ({ category, minutes }))
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 5);

    return {
      totalSessions,
      totalMinutes,
      avgQuality: Math.round(avgQuality * 100) / 100,
      totalInterruptions,
      topCategories,
    };
  },
};