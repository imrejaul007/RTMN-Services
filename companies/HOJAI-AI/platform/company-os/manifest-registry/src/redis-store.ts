/**
 * Redis Manifest Store
 *
 * Persists company manifests to Redis for production use.
 */

import { CompanyManifest } from '../composition-engine/src/types';
import fs from 'fs';
import path from 'path';

// In-memory fallback if Redis unavailable
const memoryStore = new Map<string, string>();

export class RedisManifestStore {
  private redisUrl: string;
  private useMemory: boolean = true;

  constructor(redisUrl: string = process.env.REDIS_URL || 'redis://localhost:6379') {
    this.redisUrl = redisUrl;
    this.tryConnect();
  }

  private async tryConnect() {
    try {
      // Dynamic import to avoid breaking if redis not installed
      const { default: redis } = await import('ioredis');
      const client = new redis(this.redisUrl);
      await client.ping();
      this.useMemory = false;
      console.log('[RedisManifestStore] Connected to Redis');
    } catch {
      console.log('[RedisManifestStore] Using in-memory fallback');
    }
  }

  /**
   * Save manifest
   */
  async save(companyId: string, manifest: CompanyManifest): Promise<void> {
    const key = `company:manifest:${companyId}`;
    const data = JSON.stringify(manifest);

    if (this.useMemory) {
      memoryStore.set(key, data);
    } else {
      const { default: redis } = await import('ioredis');
      const client = new redis(this.redisUrl);
      await client.set(key, data);
      await client.expire(key, 86400 * 30); // 30 days TTL
    }
  }

  /**
   * Get manifest
   */
  async get(companyId: string): Promise<CompanyManifest | null> {
    const key = `company:manifest:${companyId}`;

    if (this.useMemory) {
      const data = memoryStore.get(key);
      return data ? JSON.parse(data) : null;
    } else {
      const { default: redis } = await import('ioredis');
      const client = new redis(this.redisUrl);
      const data = await client.get(key);
      return data ? JSON.parse(data) : null;
    }
  }

  /**
   * Delete manifest
   */
  async delete(companyId: string): Promise<void> {
    const key = `company:manifest:${companyId}`;

    if (this.useMemory) {
      memoryStore.delete(key);
    } else {
      const { default: redis } = await import('ioredis');
      const client = new redis(this.redisUrl);
      await client.del(key);
    }
  }

  /**
   * List all company IDs
   */
  async list(): Promise<string[]> {
    if (this.useMemory) {
      return Array.from(memoryStore.keys())
        .filter(k => k.startsWith('company:manifest:'))
        .map(k => k.replace('company:manifest:', ''));
    } else {
      const { default: redis } = await import('ioredis');
      const client = new redis(this.redisUrl);
      const keys = await client.keys('company:manifest:*');
      return keys.map(k => k.replace('company:manifest:', ''));
    }
  }
}

// Singleton instance
export const manifestStore = new RedisManifestStore();
