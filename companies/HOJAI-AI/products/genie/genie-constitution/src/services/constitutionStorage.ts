/**
 * Constitution Storage — Redis storage
 */

import Redis from 'ioredis';
import { Constitution } from '../types/constitution.js';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const CONSTITUTION_KEY = (userId: string) => `constitution:${userId}`;

export const ConstitutionStorage = {
  async save(constitution: Constitution): Promise<void> {
    await redis.set(
      CONSTITUTION_KEY(constitution.userId),
      JSON.stringify(constitution)
    );
  },

  async get(userId: string): Promise<Constitution | null> {
    const data = await redis.get(CONSTITUTION_KEY(userId));
    return data ? JSON.parse(data) : null;
  },

  async delete(userId: string): Promise<void> {
    await redis.del(CONSTITUTION_KEY(userId));
  },

  async getOrDefault(userId: string): Promise<Constitution> {
    const existing = await this.get(userId);
    if (existing) return existing;

    return {
      userId,
      always: ['disclose AI identity', 'respect user privacy'],
      never: [],
      requiresApproval: ['financial transfers'],
      values: [
        { name: 'honesty', weight: 1.0 },
        { name: 'family-first', weight: 0.9 },
      ],
      ethicsLevel: 'standard',
      updatedAt: new Date(),
      createdAt: new Date(),
    };
  },
};