/**
 * MongoDB Storage
 * Historical metrics storage using MongoDB
 */

import { MongoClient, Db, Collection, Filter, Sort } from 'mongodb';

export interface HourlyMetric {
  merchantId: string;
  metricType: string;
  hour: Date;
  value: number;
  dimensions?: Record<string, string | number>;
  metadata?: Record<string, any>;
}

export interface DailyMetric {
  merchantId: string;
  metricType: string;
  date: Date;
  value: number;
  dimensions?: Record<string, string | number>;
  metadata?: Record<string, any>;
}

export interface AggregatedMetric {
  _id?: any;
  merchantId: string;
  metricType: string;
  period: 'hour' | 'day' | 'week' | 'month';
  periodStart: Date;
  periodEnd: Date;
  value: number;
  min?: number;
  max?: number;
  avg?: number;
  count?: number;
  dimensions?: Record<string, string | number>;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface MetricQuery {
  merchantId?: string;
  metricType?: string;
  period?: 'hour' | 'day' | 'week' | 'month';
  from?: Date;
  to?: Date;
  dimensions?: Record<string, string | number>;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class MongoStorage {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private connected: boolean = false;
  private config: {
    uri: string;
    database: string;
  };

  constructor(config?: { uri?: string; database?: string }) {
    this.config = {
      uri: config?.uri ?? process.env.MONGODB_URI ?? 'mongodb://localhost:27017',
      database: config?.database ?? process.env.MONGODB_DATABASE ?? 'rez_analytics'
    };
  }

  /**
   * Connect to MongoDB
   */
  async connect(): Promise<void> {
    if (this.connected) return;

    this.client = new MongoClient(this.config.uri, {
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000
    });

    await this.client.connect();
    this.db = this.client.db(this.config.database);

    // Create indexes
    await this.createIndexes();

    console.log(`Connected to MongoDB: ${this.config.database}`);
    this.connected = true;
  }

  /**
   * Disconnect from MongoDB
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      this.connected = false;
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Create required indexes
   */
  private async createIndexes(): Promise<void> {
    if (!this.db) throw new Error('MongoDB not connected');

    // Hourly metrics indexes
    const hourlyCollection = this.db.collection('hourly_metrics');
    await hourlyCollection.createIndex({ merchantId: 1, metricType: 1, hour: -1 });
    await hourlyCollection.createIndex({ merchantId: 1, hour: -1 });
    await hourlyCollection.createIndex({ 'dimensions.city': 1, hour: -1 });

    // Daily metrics indexes
    const dailyCollection = this.db.collection('daily_metrics');
    await dailyCollection.createIndex({ merchantId: 1, metricType: 1, date: -1 });
    await dailyCollection.createIndex({ merchantId: 1, date: -1 });
    await dailyCollection.createIndex({ 'dimensions.source': 1, date: -1 });

    // Aggregated metrics indexes
    const aggregatedCollection = this.db.collection('aggregated_metrics');
    await aggregatedCollection.createIndex({
      merchantId: 1,
      metricType: 1,
      period: 1,
      periodStart: -1
    });
    await aggregatedCollection.createIndex({ merchantId: 1, periodStart: -1 });
    await aggregatedCollection.createIndex({ updatedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 }); // 30 days TTL
  }

  /**
   * Get collection reference
   */
  private getCollection(name: string): Collection {
    if (!this.db) throw new Error('MongoDB not connected');
    return this.db.collection(name);
  }

  /**
   * Save hourly metric
   */
  async saveHourlyMetric(metric: HourlyMetric): Promise<void> {
    const collection = this.getCollection('hourly_metrics');

    // Ensure hour is truncated to the start of the hour
    const hourTruncated = new Date(metric.hour);
    hourTruncated.setMinutes(0, 0, 0);

    await collection.updateOne(
      {
        merchantId: metric.merchantId,
        metricType: metric.metricType,
        hour: hourTruncated,
        dimensions: metric.dimensions || {}
      },
      {
        $set: {
          value: metric.value,
          metadata: metric.metadata || {},
          updatedAt: new Date()
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      { upsert: true }
    );
  }

  /**
   * Save daily metric
   */
  async saveDailyMetric(metric: DailyMetric): Promise<void> {
    const collection = this.getCollection('daily_metrics');

    // Ensure date is truncated to the start of the day
    const dateTruncated = new Date(metric.date);
    dateTruncated.setHours(0, 0, 0, 0);

    await collection.updateOne(
      {
        merchantId: metric.merchantId,
        metricType: metric.metricType,
        date: dateTruncated,
        dimensions: metric.dimensions || {}
      },
      {
        $set: {
          value: metric.value,
          metadata: metric.metadata || {},
          updatedAt: new Date()
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      { upsert: true }
    );
  }

  /**
   * Save aggregated metric
   */
  async saveAggregatedMetric(metric: AggregatedMetric): Promise<void> {
    const collection = this.getCollection('aggregated_metrics');

    await collection.updateOne(
      {
        merchantId: metric.merchantId,
        metricType: metric.metricType,
        period: metric.period,
        periodStart: metric.periodStart
      },
      {
        $set: {
          periodEnd: metric.periodEnd,
          value: metric.value,
          min: metric.min,
          max: metric.max,
          avg: metric.avg,
          count: metric.count,
          dimensions: metric.dimensions || {},
          metadata: metric.metadata || {},
          updatedAt: new Date()
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      { upsert: true }
    );
  }

  /**
   * Query metrics
   */
  async queryMetrics(query: MetricQuery): Promise<Array<HourlyMetric | DailyMetric | AggregatedMetric>> {
    if (!this.db) throw new Error('MongoDB not connected');

    let collection: Collection;
    let dateField: string;

    if (query.period === 'hour') {
      collection = this.getCollection('hourly_metrics');
      dateField = 'hour';
    } else if (query.period === 'day') {
      collection = this.getCollection('daily_metrics');
      dateField = 'date';
    } else {
      collection = this.getCollection('aggregated_metrics');
      dateField = 'periodStart';
    }

    const filter: Filter<any> = {};

    if (query.merchantId) {
      filter.merchantId = query.merchantId;
    }
    if (query.metricType) {
      filter.metricType = query.metricType;
    }
    if (query.period) {
      filter.period = query.period;
    }
    if (query.from || query.to) {
      filter[dateField] = {};
      if (query.from) {
        filter[dateField].$gte = query.from;
      }
      if (query.to) {
        filter[dateField].$lte = query.to;
      }
    }
    if (query.dimensions) {
      filter.dimensions = query.dimensions;
    }

    const sort: Sort = {};
    if (query.sortBy) {
      sort[query.sortBy] = query.sortOrder === 'asc' ? 1 : -1;
    } else {
      sort[dateField] = -1;
    }

    const cursor = collection.find(filter).sort(sort);

    if (query.limit) {
      cursor.limit(query.limit);
    }

    return cursor.toArray();
  }

  /**
   * Batch save metrics
   */
  async batchSaveHourlyMetrics(metrics: HourlyMetric[]): Promise<void> {
    if (metrics.length === 0) return;

    const collection = this.getCollection('hourly_metrics');
    const operations = metrics.map((metric) => {
      const hourTruncated = new Date(metric.hour);
      hourTruncated.setMinutes(0, 0, 0);

      return {
        updateOne: {
          filter: {
            merchantId: metric.merchantId,
            metricType: metric.metricType,
            hour: hourTruncated,
            dimensions: metric.dimensions || {}
          },
          update: {
            $set: {
              value: metric.value,
              metadata: metric.metadata || {},
              updatedAt: new Date()
            },
            $setOnInsert: {
              createdAt: new Date()
            }
          },
          upsert: true
        }
      };
    });

    await collection.bulkWrite(operations, { ordered: false });
  }

  /**
   * Batch save daily metrics
   */
  async batchSaveDailyMetrics(metrics: DailyMetric[]): Promise<void> {
    if (metrics.length === 0) return;

    const collection = this.getCollection('daily_metrics');
    const operations = metrics.map((metric) => {
      const dateTruncated = new Date(metric.date);
      dateTruncated.setHours(0, 0, 0, 0);

      return {
        updateOne: {
          filter: {
            merchantId: metric.merchantId,
            metricType: metric.metricType,
            date: dateTruncated,
            dimensions: metric.dimensions || {}
          },
          update: {
            $set: {
              value: metric.value,
              metadata: metric.metadata || {},
              updatedAt: new Date()
            },
            $setOnInsert: {
              createdAt: new Date()
            }
          },
          upsert: true
        }
      };
    });

    await collection.bulkWrite(operations, { ordered: false });
  }

  /**
   * Delete old metrics (cleanup)
   */
  async deleteOldMetrics(olderThanDays: number): Promise<number> {
    if (!this.db) throw new Error('MongoDB not connected');

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);

    let totalDeleted = 0;

    // Delete from hourly_metrics
    const hourlyCollection = this.getCollection('hourly_metrics');
    const hourlyResult = await hourlyCollection.deleteMany({ hour: { $lt: cutoff } });
    totalDeleted += hourlyResult.deletedCount;

    // Delete from daily_metrics
    const dailyCollection = this.getCollection('daily_metrics');
    const dailyResult = await dailyCollection.deleteMany({ date: { $lt: cutoff } });
    totalDeleted += dailyResult.deletedCount;

    return totalDeleted;
  }

  /**
   * Get aggregation pipeline for complex queries
   */
  async aggregate(collName: string, pipeline: any[]): Promise<any[]> {
    const collection = this.getCollection(collName);
    return collection.aggregate(pipeline).toArray();
  }

  /**
   * Get MongoDB database instance
   */
  getDatabase(): Db | null {
    return this.db;
  }
}

export const mongoStorage = new MongoStorage();
