/**
 * HOJAI Memory Service - Database Integration
 * MongoDB-backed storage for production use
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

// ============================================
// MONGOOSE SCHEMAS
// ============================================

export interface IMemoryDoc extends Document {
  _id: mongoose.Types.ObjectId;
  tenant_id: string;
  user_id?: string;
  type: 'fact' | 'preference' | 'context' | 'interaction' | 'learning';
  content: string;
  embedding?: number[];
  importance: number;
  tags?: string[];
  expiresAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const MemorySchema = new Schema<IMemoryDoc>(
  {
    tenant_id: { type: String, required: true, index: true },
    user_id: { type: String, index: true },
    type: {
      type: String,
      enum: ['fact', 'preference', 'context', 'interaction', 'learning'],
      default: 'fact',
      index: true
    },
    content: { type: String, required: true },
    embedding: { type: [Number], index: '2dsphere' },
    importance: { type: Number, default: 0.5, min: 0, max: 1, index: true },
    tags: [{ type: String }],
    expiresAt: { type: Date, index: true },
    metadata: { type: Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

// Compound indexes for common queries
MemorySchema.index({ tenant_id: 1, user_id: 1 });
MemorySchema.index({ tenant_id: 1, type: 1 });
MemorySchema.index({ tenant_id: 1, importance: -1 });
MemorySchema.index({ tenant_id: 1, createdAt: -1 });

export interface ITimelineDoc extends Document {
  _id: mongoose.Types.ObjectId;
  tenant_id: string;
  user_id: string;
  type: string;
  title: string;
  description?: string;
  timestamp: Date;
  duration?: number;
  metadata?: Record<string, any>;
}

const TimelineSchema = new Schema<ITimelineDoc>(
  {
    tenant_id: { type: String, required: true, index: true },
    user_id: { type: String, required: true, index: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    description: String,
    timestamp: { type: Date, default: Date.now, index: true },
    duration: Number,
    metadata: { type: Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

TimelineSchema.index({ tenant_id: 1, user_id: 1, timestamp: -1 });

// ============================================
// MODELS
// ============================================

export const MemoryModel: Model<IMemoryDoc> =
  mongoose.models.Memory || mongoose.model<IMemoryDoc>('Memory', MemorySchema);

export const TimelineModel: Model<ITimelineDoc> =
  mongoose.models.Timeline || mongoose.model<ITimelineDoc>('Timeline', TimelineSchema);

// ============================================
// DATABASE LAYER
// ============================================

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai_memory';

let isConnected = false;

export async function connectDatabase(): Promise<void> {
  if (isConnected) return;

  try {
    await mongoose.connect(MONGODB_URI);
    isConnected = true;
    console.log('[Memory DB] Connected to MongoDB');
  } catch (error) {
    console.error('[Memory DB] Failed to connect:', error);
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
  console.log('[Memory DB] Disconnected from MongoDB');
}

export function isDatabaseConnected(): boolean {
  return isConnected && mongoose.connection.readyState === 1;
}

// ============================================
// REPOSITORY CLASS
// ============================================

export class MemoryRepository {
  /**
   * Create memory
   */
  async create(data: {
    tenant_id: string;
    user_id?: string;
    type: IMemoryDoc['type'];
    content: string;
    embedding?: number[];
    importance?: number;
    tags?: string[];
    metadata?: Record<string, any>;
  }): Promise<IMemoryDoc> {
    return MemoryModel.create(data);
  }

  /**
   * Find by ID
   */
  async findById(id: string): Promise<IMemoryDoc | null> {
    return MemoryModel.findById(id);
  }

  /**
   * Find by tenant
   */
  async findByTenant(
    tenantId: string,
    options?: {
      userId?: string;
      type?: string;
      limit?: number;
      skip?: number;
    }
  ): Promise<IMemoryDoc[]> {
    const filter: any = { tenant_id: tenantId };
    if (options?.userId) filter.user_id = options.userId;
    if (options?.type) filter.type = options.type;

    return MemoryModel.find(filter)
      .sort({ importance: -1, createdAt: -1 })
      .limit(options?.limit || 100)
      .skip(options?.skip || 0);
  }

  /**
   * Search by content
   */
  async search(tenantId: string, query: string, limit: number = 10): Promise<IMemoryDoc[]> {
    return MemoryModel.find({
      tenant_id: tenantId,
      content: { $regex: query, $options: 'i' }
    })
      .sort({ importance: -1 })
      .limit(limit);
  }

  /**
   * Find similar by embedding
   */
  async findSimilar(
    tenantId: string,
    embedding: number[],
    limit: number = 5
  ): Promise<IMemoryDoc[]> {
    return MemoryModel.find({
      tenant_id: tenantId,
      embedding: { $exists: true, $ne: [] }
    })
      .sort({ $vectorSimilarity: { $meta: 'textScore' } })
      .limit(limit);
  }

  /**
   * Update memory
   */
  async update(id: string, data: Partial<IMemoryDoc>): Promise<IMemoryDoc | null> {
    return MemoryModel.findByIdAndUpdate(id, data, { new: true });
  }

  /**
   * Delete memory
   */
  async delete(id: string): Promise<boolean> {
    const result = await MemoryModel.findByIdAndDelete(id);
    return !!result;
  }

  /**
   * Delete expired memories
   */
  async deleteExpired(): Promise<number> {
    const result = await MemoryModel.deleteMany({
      expiresAt: { $lt: new Date() }
    });
    return result.deletedCount || 0;
  }

  /**
   * Count by tenant
   */
  async count(tenantId: string): Promise<number> {
    return MemoryModel.countDocuments({ tenant_id: tenantId });
  }

  /**
   * Bulk insert
   */
  async bulkInsert(memories: Partial<IMemoryDoc>[]): Promise<IMemoryDoc[]> {
    return MemoryModel.insertMany(memories);
  }
}

export class TimelineRepository {
  /**
   * Create timeline entry
   */
  async create(data: {
    tenant_id: string;
    user_id: string;
    type: string;
    title: string;
    description?: string;
    timestamp?: Date;
    duration?: number;
    metadata?: Record<string, any>;
  }): Promise<ITimelineDoc> {
    return TimelineModel.create(data);
  }

  /**
   * Find by user
   */
  async findByUser(
    tenantId: string,
    userId: string,
    options?: {
      type?: string;
      limit?: number;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<ITimelineDoc[]> {
    const filter: any = { tenant_id: tenantId, user_id: userId };
    if (options?.type) filter.type = options.type;
    if (options?.startDate || options?.endDate) {
      filter.timestamp = {};
      if (options.startDate) filter.timestamp.$gte = options.startDate;
      if (options.endDate) filter.timestamp.$lte = options.endDate;
    }

    return TimelineModel.find(filter)
      .sort({ timestamp: -1 })
      .limit(options?.limit || 50);
  }

  /**
   * Get timeline stats
   */
  async getStats(tenantId: string, userId: string): Promise<{
    total: number;
    byType: Record<string, number>;
  }> {
    const entries = await TimelineModel.aggregate([
      { $match: { tenant_id: tenantId, user_id: userId } },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);

    const byType: Record<string, number> = {};
    let total = 0;
    for (const entry of entries) {
      byType[entry._id] = entry.count;
      total += entry.count;
    }

    return { total, byType };
  }

  /**
   * Delete old entries
   */
  async deleteOlderThan(days: number): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const result = await TimelineModel.deleteMany({
      timestamp: { $lt: cutoff }
    });

    return result.deletedCount || 0;
  }
}
