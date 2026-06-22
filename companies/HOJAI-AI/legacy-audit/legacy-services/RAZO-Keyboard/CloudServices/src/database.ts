/**
 * RAZO Keyboard - Database Configuration
 *
 * Redis + MongoDB setup for RAZO Cloud Services
 */

import Redis from 'ioredis';
import mongoose from 'mongoose';

// Configuration
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;

const MONGODB_HOST = process.env.MONGODB_HOST || 'localhost';
const MONGODB_PORT = parseInt(process.env.MONGODB_PORT || '27017');
const MONGODB_USER = process.env.MONGODB_USER || '';
const MONGODB_PASSWORD = process.env.MONGODB_PASSWORD || '';
const MONGODB_DATABASE = process.env.MONGODB_DATABASE || 'razo_keyboard';

// Redis client
let redisClient: Redis | null = null;

// MongoDB connection
let mongoConnection: typeof mongoose | null = null;

// ==================== Redis ====================

/**
 * Get Redis client (singleton)
 */
export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis({
      host: REDIS_HOST,
      port: REDIS_PORT,
      password: REDIS_PASSWORD,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    redisClient.on('error', (err) => {
      console.error('Redis error:', err);
    });

    redisClient.on('connect', () => {
      console.log('Redis connected');
    });
  }

  return redisClient;
}

/**
 * Redis cache operations
 */
export const redisCache = {
  /**
   * Get cached value
   */
  async get(key: string): Promise<string | null> {
    const client = getRedisClient();
    return client.get(`razo:${key}`);
  },

  /**
   * Set cached value with TTL
   */
  async set(key: string, value: string, ttlSeconds = 3600): Promise<void> {
    const client = getRedisClient();
    await client.setex(`razo:${key}`, ttlSeconds, value);
  },

  /**
   * Delete cached value
   */
  async del(key: string): Promise<void> {
    const client = getRedisClient();
    await client.del(`razo:${key}`);
  },

  /**
   * Get user predictions cache
   */
  async getPredictions(userId: string, context: string): Promise<string[] | null> {
    const key = `predictions:${userId}:${context}`;
    const cached = await this.get(key);
    return cached ? JSON.parse(cached) : null;
  },

  /**
   * Set user predictions cache
   */
  async setPredictions(
    userId: string,
    context: string,
    predictions: string[],
    ttlSeconds = 300
  ): Promise<void> {
    const key = `predictions:${userId}:${context}`;
    await this.set(key, JSON.stringify(predictions), ttlSeconds);
  },

  /**
   * Get user session
   */
  async getSession(userId: string): Promise<Record<string, any> | null> {
    const key = `session:${userId}`;
    const cached = await this.get(key);
    return cached ? JSON.parse(cached) : null;
  },

  /**
   * Set user session
   */
  async setSession(userId: string, session: Record<string, any>, ttlSeconds = 86400): Promise<void> {
    const key = `session:${userId}`;
    await this.set(key, JSON.stringify(session), ttlSeconds);
  },

  /**
   * Get sync queue
   */
  async getSyncQueue(userId: string): Promise<string[]> {
    const client = getRedisClient();
    const items = await client.lrange(`sync_queue:${userId}`, 0, -1);
    return items;
  },

  /**
   * Add to sync queue
   */
  async addToSyncQueue(userId: string, item: string): Promise<void> {
    const client = getRedisClient();
    await client.rpush(`sync_queue:${userId}`, item);
  },

  /**
   * Get rate limit
   */
  async checkRateLimit(
    userId: string,
    action: string,
    limit: number,
    windowSeconds: number
  ): Promise<{ allowed: boolean; remaining: number }> {
    const client = getRedisClient();
    const key = `rate:${action}:${userId}`;

    const current = await client.incr(key);
    if (current === 1) {
      await client.expire(key, windowSeconds);
    }

    const ttl = await client.ttl(key);
    const remaining = Math.max(0, limit - current);

    return {
      allowed: current <= limit,
      remaining,
    };
  },
};

// ==================== MongoDB ====================

/**
 * MongoDB connection URI
 */
function getMongoUri(): string {
  if (MONGODB_USER && MONGODB_PASSWORD) {
    return `mongodb://${MONGODB_USER}:${MONGODB_PASSWORD}@${MONGODB_HOST}:${MONGODB_PORT}/${MONGODB_DATABASE}`;
  }
  return `mongodb://${MONGODB_HOST}:${MONGODB_PORT}/${MONGODB_DATABASE}`;
}

/**
 * Connect to MongoDB
 */
export async function connectMongoDB(): Promise<typeof mongoose> {
  if (!mongoConnection) {
    try {
      mongoConnection = await mongoose.connect(getMongoUri(), {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
      console.log('MongoDB connected');
    } catch (error) {
      console.error('MongoDB connection error:', error);
      throw error;
    }
  }
  return mongoConnection;
}

/**
 * Get MongoDB connection
 */
export function getMongoDB(): typeof mongoose {
  if (!mongoConnection) {
    throw new Error('MongoDB not connected. Call connectMongoDB() first.');
  }
  return mongoConnection;
}

// ==================== Mongoose Models ====================

// User model
export const UserSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true, index: true },
  deviceId: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  preferences: {
    language: { type: String, default: 'en' },
    theme: { type: String, default: 'light' },
    voiceEnabled: { type: Boolean, default: true },
    hapticEnabled: { type: Boolean, default: true },
    biometricEnabled: { type: Boolean, default: false },
  },
  stats: {
    keystrokes: { type: Number, default: 0 },
    voiceInputs: { type: Number, default: 0 },
    predictionsUsed: { type: Number, default: 0 },
  },
});

// Password model
export const PasswordSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  site: { type: String, required: true },
  username: { type: String, required: true },
  password: { type: String, required: true },
  encrypted: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Snippet model
export const SnippetSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  trigger: { type: String, required: true },
  expansion: { type: String, required: true },
  category: { type: String, default: 'custom' },
  usageCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

// Keyboard history model
export const HistorySchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  timestamp: { type: Date, default: Date.now },
  type: { type: String, enum: ['keystroke', 'voice', 'prediction', 'action'] },
  data: mongoose.Schema.Types.Mixed,
  context: {
    app: String,
    inputType: String,
  },
});

// Sync log model
export const SyncLogSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  timestamp: { type: Date, default: Date.now },
  changes: [
    {
      collection: String,
      operation: String,
      documentId: String,
      data: mongoose.Schema.Types.Mixed,
    },
  ],
  status: { type: String, enum: ['pending', 'synced', 'failed'] },
});

// Create models
export const User = mongoose.models.User || mongoose.model('User', UserSchema);
export const Password = mongoose.models.Password || mongoose.model('Password', PasswordSchema);
export const Snippet = mongoose.models.Snippet || mongoose.model('Snippet', SnippetSchema);
export const History = mongoose.models.History || mongoose.model('History', HistorySchema);
export const SyncLog = mongoose.models.SyncLog || mongoose.model('SyncLog', SyncLogSchema);

// ==================== Database Operations ====================

export const db = {
  // User operations
  user: {
    async get(userId: string) {
      return User.findOne({ userId });
    },
    async create(userId: string, data: Record<string, any> = {}) {
      return User.create({ userId, ...data });
    },
    async update(userId: string, data: Record<string, any>) {
      return User.findOneAndUpdate({ userId }, data, { new: true });
    },
    async delete(userId: string) {
      return User.deleteOne({ userId });
    },
  },

  // Password operations
  password: {
    async get(userId: string, site: string) {
      return Password.findOne({ userId, site });
    },
    async list(userId: string) {
      return Password.find({ userId }).select('-password');
    },
    async save(userId: string, site: string, username: string, password: string) {
      return Password.findOneAndUpdate(
        { userId, site },
        { userId, site, username, password },
        { upsert: true, new: true }
      );
    },
    async delete(userId: string, site: string) {
      return Password.deleteOne({ userId, site });
    },
  },

  // Snippet operations
  snippet: {
    async get(userId: string, trigger: string) {
      return Snippet.findOne({ userId, trigger });
    },
    async list(userId: string) {
      return Snippet.find({ userId });
    },
    async save(userId: string, trigger: string, expansion: string, category?: string) {
      return Snippet.findOneAndUpdate(
        { userId, trigger },
        { userId, trigger, expansion, category },
        { upsert: true, new: true }
      );
    },
    async delete(userId: string, trigger: string) {
      return Snippet.deleteOne({ userId, trigger });
    },
    async incrementUsage(userId: string, trigger: string) {
      return Snippet.findOneAndUpdate(
        { userId, trigger },
        { $inc: { usageCount: 1 } }
      );
    },
  },

  // History operations
  history: {
    async add(userId: string, type: string, data: Record<string, any>, context?: Record<string, any>) {
      return History.create({ userId, type, data, context });
    },
    async getRecent(userId: string, limit = 100) {
      return History.find({ userId })
        .sort({ timestamp: -1 })
        .limit(limit);
    },
    async getByType(userId: string, type: string, limit = 100) {
      return History.find({ userId, type })
        .sort({ timestamp: -1 })
        .limit(limit);
    },
  },

  // Sync operations
  sync: {
    async logChanges(userId: string, changes: any[]) {
      return SyncLog.create({ userId, changes, status: 'pending' });
    },
    async markSynced(syncId: string) {
      return SyncLog.findByIdAndUpdate(syncId, { status: 'synced' });
    },
    async getPending(userId: string) {
      return SyncLog.find({ userId, status: 'pending' });
    },
  },
};

// ==================== Cleanup ====================

/**
 * Close all database connections
 */
export async function closeConnections(): Promise<void> {
  if (redisClient) {
    redisClient.disconnect();
    redisClient = null;
  }
  if (mongoConnection) {
    await mongoose.disconnect();
    mongoConnection = null;
  }
}
