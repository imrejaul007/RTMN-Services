/**
 * MongoDB Connection Manager
 * Provides reusable MongoDB connection for all services
 */
import mongoose, { Connection, Document, Model, Schema } from 'mongoose';

interface MongoDBConfig {
  uri: string;
  options?: {
    maxPoolSize?: number;
    minPoolSize?: number;
    serverSelectionTimeoutMS?: number;
    socketTimeoutMS?: number;
  };
}

class MongoDBConnection {
  private connection: Connection | null = null;
  private isConnected: boolean = false;
  private config: MongoDBConfig | null = null;

  /**
   * Connect to MongoDB
   */
  async connect(config: MongoDBConfig): Promise<Connection> {
    if (this.isConnected && this.connection) {
      return this.connection;
    }

    this.config = config;

    try {
      const options = {
        maxPoolSize: config.options?.maxPoolSize || 10,
        minPoolSize: config.options?.minPoolSize || 2,
        serverSelectionTimeoutMS: config.options?.serverSelectionTimeoutMS || 5000,
        socketTimeoutMS: config.options?.socketTimeoutMS || 45000,
      };

      await mongoose.connect(config.uri, options);

      this.connection = mongoose.connection;
      this.isConnected = true;

      console.log(`[MongoDB] Connected to ${config.uri}`);

      // Handle connection events
      mongoose.connection.on('error', (err) => {
        console.error('[MongoDB] Connection error:', err);
        this.isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        console.warn('[MongoDB] Disconnected');
        this.isConnected = false;
      });

      mongoose.connection.on('reconnected', () => {
        console.log('[MongoDB] Reconnected');
        this.isConnected = true;
      });

      return this.connection;
    } catch (error) {
      console.error('[MongoDB] Failed to connect:', error);
      throw error;
    }
  }

  /**
   * Disconnect from MongoDB
   */
  async disconnect(): Promise<void> {
    if (this.connection) {
      await mongoose.disconnect();
      this.connection = null;
      this.isConnected = false;
      console.log('[MongoDB] Disconnected');
    }
  }

  /**
   * Get the current connection
   */
  getConnection(): Connection | null {
    return this.connection;
  }

  /**
   * Check if connected
   */
  isReady(): boolean {
    return this.isConnected && mongoose.connection.readyState === 1;
  }

  /**
   * Get a model, creating it if it doesn't exist
   */
  getModel<T extends Document>(
    name: string,
    schema: Schema<T>
  ): Model<T> {
    if (!this.isReady()) {
      throw new Error('MongoDB not connected. Call connect() first.');
    }

    // Check if model already exists to avoid OverwriteModelError
    if (mongoose.models[name]) {
      return mongoose.models[name] as Model<T>;
    }

    return mongoose.model<T>(name, schema);
  }
}

// Singleton instance
export const mongodb = new MongoDBConnection();

// ============================================================================
// Base Repository Pattern
// ============================================================================
export abstract class BaseRepository<T extends Document> {
  protected model: Model<T>;
  protected collectionName: string;

  constructor(model: Model<T>) {
    this.model = model;
    this.collectionName = model.collection.name;
  }

  async findById(id: string): Promise<T | null> {
    return this.model.findById(id).exec();
  }

  async findOne(filter: Partial<T>): Promise<T | null> {
    return this.model.findOne(filter as any).exec();
  }

  async findAll(
    filter: Partial<T> = {},
    options: { skip?: number; limit?: number; sort?: any } = {}
  ): Promise<T[]> {
    return this.model
      .find(filter as any)
      .skip(options.skip || 0)
      .limit(options.limit || 100)
      .sort(options.sort || { createdAt: -1 })
      .exec();
  }

  async create(data: Partial<T>): Promise<T> {
    const doc = new this.model(data);
    return doc.save();
  }

  async update(id: string, data: Partial<T>): Promise<T | null> {
    return this.model.findByIdAndUpdate(id, data as any, { new: true }).exec();
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.model.findByIdAndDelete(id).exec();
    return !!result;
  }

  async count(filter: Partial<T> = {}): Promise<number> {
    return this.model.countDocuments(filter as any).exec();
  }
}

// ============================================================================
// MongoDB Config Factory
// ============================================================================
export function createMongoConfig(): MongoDBConfig {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.warn('[MongoDB] MONGODB_URI not set, using in-memory storage');
    return { uri: '' }; // Will fallback to in-memory
  }

  return {
    uri,
    options: {
      maxPoolSize: parseInt(process.env.MONGO_POOL_SIZE || '10', 10),
      minPoolSize: parseInt(process.env.MONGO_MIN_POOL_SIZE || '2', 10),
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    },
  };
}

export default mongodb;
