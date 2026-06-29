/**
 * Family History — Track family members and stories
 * Spec Part 35: Digital Legacy
 */

import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { FamilyMember } from '../types/legacy.js';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const MEMBER_KEY = (userId: string) => `user:${userId}:family_members`;

export const FamilyHistory = {
  async addMember(
    userId: string,
    name: string,
    relationship: string,
    options?: {
      birthdate?: Date;
      photos?: string[];
      notes?: string;
    }
  ): Promise<FamilyMember> {
    const member: FamilyMember = {
      id: `fam_${uuidv4()}`,
      userId,
      name,
      relationship,
      birthdate: options?.birthdate,
      photos: options?.photos,
      notes: options?.notes,
    };

    await redis.set(`member:${member.id}`, JSON.stringify(member));
    await redis.sadd(MEMBER_KEY(userId), member.id);

    return member;
  },

  async getMembers(userId: string): Promise<FamilyMember[]> {
    const ids = await redis.smembers(MEMBER_KEY(userId));
    if (ids.length === 0) return [];

    const pipeline = redis.pipeline();
    ids.forEach(id => pipeline.get(`member:${id}`));
    const results = await pipeline.exec();

    return results
      ?.filter(([err, val]) => !err && val)
      ?.map(([_, val]) => JSON.parse(val as string)) || [];
  },

  async addStory(userId: string, memberId: string, storyEntryId: string): Promise<void> {
    const data = await redis.get(`member:${memberId}`);
    if (!data) return;

    const member: FamilyMember = JSON.parse(data);
    if (!member.stories) member.stories = [];
    member.stories.push(storyEntryId);

    await redis.set(`member:${memberId}`, JSON.stringify(member));
  },
};