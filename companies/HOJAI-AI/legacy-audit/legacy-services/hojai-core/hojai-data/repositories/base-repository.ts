/**
 * Hojai Data Platform - Base Repository
 * Version: 1.0 | Date: May 29, 2026
 * Purpose: Standard repository pattern with tenant isolation
 */

import { Collection, Db } from 'mongodb';

/**
 * Base repository with tenant isolation
 */
export abstract class BaseRepository<T extends { tenant_id: string; id: string }> {
  protected collection: Collection<T>;
  protected tenant_id: string;

  constructor(db: Db, collectionName: string, tenant_id: string) {
    this.collection = db.collection<T>(collectionName);
    this.tenant_id = tenant_id;
  }

  /**
   * Always scope queries to tenant
   */
  protected scopeQuery(filter: Partial<T> = {}): Partial<T> {
    return { ...filter, tenant_id: this.tenant_id } as Partial<T>;
  }

  /**
   * Create new document
   */
  async create(data: Omit<T, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>): Promise<T> {
    const now = new Date().toISOString();
    const doc = {
      ...data,
      id: this.generateId(),
      tenant_id: this.tenant_id,
      created_at: now,
      updated_at: now
    } as T;

    await this.collection.insertOne(doc);
    return doc;
  }

  /**
   * Find by ID
   */
  async findById(id: string): Promise<T | null> {
    return this.collection.findOne(this.scopeQuery({ id } as Partial<T>));
  }

  /**
   * Find one
   */
  async findOne(filter: Partial<T>): Promise<T | null> {
    return this.collection.findOne(this.scopeQuery(filter));
  }

  /**
   * Find many
   */
  async findMany(
    filter: Partial<T> = {},
    options?: { skip?: number; limit?: number; sort?: Record<string, 1 | -1> }
  ): Promise<T[]> {
    const cursor = this.collection
      .find(this.scopeQuery(filter))
      .sort(options?.sort || { created_at: -1 });

    if (options?.skip) cursor.skip(options.skip);
    if (options?.limit) cursor.limit(options.limit);

    return cursor.toArray();
  }

  /**
   * Count
   */
  async count(filter: Partial<T> = {}): Promise<number> {
    return this.collection.countDocuments(this.scopeQuery(filter));
  }

  /**
   * Update one
   */
  async updateOne(
    filter: Partial<T>,
    update: Partial<T>
  ): Promise<T | null> {
    const result = await this.collection.findOneAndUpdate(
      this.scopeQuery(filter),
      {
        $set: { ...update, updated_at: new Date().toISOString() }
      },
      { returnDocument: 'after' }
    );

    return result;
  }

  /**
   * Update many
   */
  async updateMany(
    filter: Partial<T>,
    update: Partial<T>
  ): Promise<number> {
    const result = await this.collection.updateMany(
      this.scopeQuery(filter),
      {
        $set: { ...update, updated_at: new Date().toISOString() }
      }
    );

    return result.modifiedCount;
  }

  /**
   * Delete one
   */
  async deleteOne(filter: Partial<T>): Promise<boolean> {
    const result = await this.collection.deleteOne(this.scopeQuery(filter));
    return result.deletedCount > 0;
  }

  /**
   * Delete many
   */
  async deleteMany(filter: Partial<T> = {}): Promise<number> {
    const result = await this.collection.deleteMany(this.scopeQuery(filter));
    return result.deletedCount;
  }

  /**
   * Aggregate with tenant scope
   */
  async aggregate<T = Record<string, unknown>>(pipeline: Document[]): Promise<T[]> {
    const scopedPipeline: Document[] = [
      { $match: { tenant_id: this.tenant_id } },
      ...pipeline
    ];
    const result = await this.collection.aggregate<T>(scopedPipeline).toArray();
    return result;
  }

  /**
   * Generate unique ID
   */
  protected generateId(): string {
    return `${this.tenant_id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Create indexes for a collection
 */
export async function createIndexes(
  collection: Collection<any>,
  indexes: { key: Record<string, 1 | -1>; name: string; unique?: boolean }[]
): Promise<void> {
  for (const index of indexes) {
    await collection.createIndex(index.key, {
      name: index.name,
      unique: index.unique || false
    });
  }
}

/**
 * Standard indexes for tenant-scoped collections
 */
export const standardIndexes = {
  by_tenant: { key: { tenant_id: 1 }, name: 'idx_tenant' },
  by_tenant_created: { key: { tenant_id: 1, created_at: -1 }, name: 'idx_tenant_created' },
  by_tenant_id: { key: { tenant_id: 1, id: 1 }, name: 'idx_tenant_id', unique: true }
};
