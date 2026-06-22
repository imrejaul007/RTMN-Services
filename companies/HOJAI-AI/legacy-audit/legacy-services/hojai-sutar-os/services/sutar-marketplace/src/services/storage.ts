// ============================================================================
// SUTAR Marketplace - Storage Service
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface StorageConfig {
  dataDir: string;
  autoSave: boolean;
  saveInterval: number;
}

const DEFAULT_CONFIG: StorageConfig = {
  dataDir: path.join(__dirname, '../../data'),
  autoSave: true,
  saveInterval: 30000, // 30 seconds
};

export class StorageService {
  private collections: Map<string, Map<string, any>> = new Map();
  private config: StorageConfig;
  private saveTimer?: NodeJS.Timeout;
  private dirty: Set<string> = new Set();

  constructor(config: Partial<StorageConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.ensureDataDir();
  }

  private ensureDataDir(): void {
    if (!fs.existsSync(this.config.dataDir)) {
      fs.mkdirSync(this.config.dataDir, { recursive: true });
    }
  }

  private getCollection<T>(name: string): Map<string, T> {
    if (!this.collections.has(name)) {
      this.collections.set(name, new Map());
      this.loadCollection(name);
    }
    return this.collections.get(name) as Map<string, T>;
  }

  private getFilePath(collectionName: string): string {
    return path.join(this.config.dataDir, `${collectionName}.json`);
  }

  private loadCollection<T>(name: string): void {
    const filePath = this.getFilePath(name);
    if (fs.existsSync(filePath)) {
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        const collection = this.collections.get(name) as Map<string, T>;
        if (Array.isArray(data)) {
          data.forEach((item: T & { id: string }) => {
            if (item.id) {
              collection.set(item.id, item);
            }
          });
        }
        console.log(`[STORAGE] Loaded ${collection.size} items from ${name}`);
      } catch (error) {
        console.error(`[STORAGE] Error loading ${name}:`, error);
      }
    }
  }

  private saveCollection(name: string): void {
    const collection = this.collections.get(name);
    if (!collection) return;

    const filePath = this.getFilePath(name);
    const data = Array.from(collection.values());

    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      this.dirty.delete(name);
      console.log(`[STORAGE] Saved ${data.length} items to ${name}`);
    } catch (error) {
      console.error(`[STORAGE] Error saving ${name}:`, error);
    }
  }

  private markDirty(name: string): void {
    this.dirty.add(name);
    if (this.config.autoSave) {
      this.scheduleSave();
    }
  }

  private scheduledSave?: NodeJS.Timeout;

  private scheduleSave(): void {
    if (this.scheduledSave) return;
    this.scheduledSave = setTimeout(() => {
      this.saveAll();
      this.scheduledSave = undefined;
    }, this.config.saveInterval);
  }

  public startAutoSave(): void {
    if (this.config.autoSave && !this.saveTimer) {
      this.saveTimer = setInterval(() => {
        this.saveAll();
      }, this.config.saveInterval);
      console.log('[STORAGE] Auto-save started');
    }
  }

  public stopAutoSave(): void {
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
      this.saveTimer = undefined;
      console.log('[STORAGE] Auto-save stopped');
    }
  }

  public saveAll(): void {
    this.dirty.forEach(name => this.saveCollection(name));
  }

  // CRUD Operations
  public create<T>(collectionName: string, data: T & { id?: string }): T {
    const collection = this.getCollection<T>(collectionName);
    const item = { ...data, id: (data as any).id || `${collectionName}-${uuidv4()}` } as T;
    collection.set((item as any).id, item);
    this.markDirty(collectionName);
    return item;
  }

  public get<T>(collectionName: string, id: string): T | undefined {
    const collection = this.getCollection<T>(collectionName);
    return collection.get(id);
  }

  public getAll<T>(collectionName: string): T[] {
    const collection = this.getCollection<T>(collectionName);
    return Array.from(collection.values());
  }

  public update<T>(collectionName: string, id: string, data: Partial<T>): T | undefined {
    const collection = this.getCollection<T>(collectionName);
    const existing = collection.get(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...data } as T;
    collection.set(id, updated);
    this.markDirty(collectionName);
    return updated;
  }

  public delete(collectionName: string, id: string): boolean {
    const collection = this.collections.get(collectionName);
    if (!collection) return false;

    const deleted = collection.delete(id);
    if (deleted) {
      this.markDirty(collectionName);
    }
    return deleted;
  }

  public find<T>(collectionName: string, predicate: (item: T) => boolean): T[] {
    const collection = this.getCollection<T>(collectionName);
    return Array.from(collection.values()).filter(predicate);
  }

  public findOne<T>(collectionName: string, predicate: (item: T) => boolean): T | undefined {
    const collection = this.getCollection<T>(collectionName);
    return Array.from(collection.values()).find(predicate);
  }

  public count(collectionName: string): number {
    const collection = this.collections.get(collectionName);
    return collection ? collection.size : 0;
  }

  public clear(collectionName: string): void {
    const collection = this.collections.get(collectionName);
    if (collection) {
      collection.clear();
      this.markDirty(collectionName);
    }
  }

  public exists(collectionName: string, id: string): boolean {
    const collection = this.collections.get(collectionName);
    return collection ? collection.has(id) : false;
  }

  public bulkCreate<T>(collectionName: string, items: T[]): T[] {
    return items.map(item => this.create(collectionName, item as T & { id?: string }));
  }

  public bulkUpdate<T>(collectionName: string, updates: { id: string; data: Partial<T> }[]): (T | undefined)[] {
    return updates.map(({ id, data }) => this.update<T>(collectionName, id, data));
  }

  public query<T>(
    collectionName: string,
    options: {
      filter?: (item: T) => boolean;
      sort?: (a: T, b: T) => number;
      limit?: number;
      offset?: number;
    } = {}
  ): T[] {
    let results = this.getAll<T>(collectionName);

    if (options.filter) {
      results = results.filter(options.filter);
    }

    if (options.sort) {
      results.sort(options.sort);
    }

    if (options.offset) {
      results = results.slice(options.offset);
    }

    if (options.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  public aggregate<T>(
    collectionName: string,
    operations: ((items: T[]) => any)[]
  ): any[] {
    const items = this.getAll<T>(collectionName);
    return operations.map(op => op(items));
  }

  public getStats(collectionName: string): {
    count: number;
    isDirty: boolean;
    lastModified?: string;
  } {
    const collection = this.collections.get(collectionName);
    const filePath = this.getFilePath(collectionName);
    let lastModified: string | undefined;

    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      lastModified = stats.mtime.toISOString();
    }

    return {
      count: collection ? collection.size : 0,
      isDirty: this.dirty.has(collectionName),
      lastModified,
    };
  }

  public getAllStats(): Record<string, ReturnType<typeof this.getStats>> {
    const stats: Record<string, ReturnType<typeof this.getStats>> = {};
    this.collections.forEach((_, name) => {
      stats[name] = this.getStats(name);
    });
    return stats;
  }

  public shutdown(): void {
    this.stopAutoSave();
    this.saveAll();
    console.log('[STORAGE] Shutdown complete');
  }
}

// Singleton instance
export const storage = new StorageService();

// Collection names as constants
export const COLLECTIONS = {
  SERVICES: 'services',
  REVIEWS: 'reviews',
  CATEGORIES: 'categories',
  PLANS: 'plans',
  ORDERS: 'orders',
  PAYMENTS: 'payments',
  SUBSCRIPTIONS: 'subscriptions',
  FAVORITES: 'favorites',
  RECOMMENDATIONS: 'recommendations',
  CARTS: 'carts',
  NOTIFICATIONS: 'notifications',
  WEBHOOKS: 'webhooks',
  ANALYTICS: 'analytics',
} as const;

export type CollectionName = typeof COLLECTIONS[keyof typeof COLLECTIONS];
