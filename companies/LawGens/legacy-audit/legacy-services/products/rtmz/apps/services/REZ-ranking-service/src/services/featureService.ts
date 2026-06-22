import Redis from 'ioredis';
import { Feature, IFeature } from '../models/Feature';
import logger from '../utils/logger';

const log = logger.child({ service: 'FeatureService' });

export interface EntityFeatures {
  entityId: string;
  entityType: string;
  features: IFeature['features'];
  computedAt: Date;
}

export class FeatureService {
  private redis: Redis | null = null;
  private cacheTtl: number;
  private maxCacheSize: number;

  constructor() {
    this.cacheTtl = parseInt(process.env.FEATURE_CACHE_TTL || '3600', 10);
    this.maxCacheSize = parseInt(process.env.FEATURE_MAX_SIZE || '10000', 10);
    this.initRedis();
  }

  private initRedis(): void {
    try {
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || undefined,
        retryStrategy: (times) => {
          if (times > 3) {
            log.warn('Redis connection failed, operating without cache');
            return null;
          }
          return Math.min(times * 100, 3000);
        }
      });

      this.redis.on('error', (err) => {
        log.error('Redis error', { error: err.message });
      });

      this.redis.on('connect', () => {
        log.info('Redis connected');
      });
    } catch (error) {
      log.warn('Redis initialization failed, operating without cache');
      this.redis = null;
    }
  }

  private getCacheKey(entityId: string, entityType: string): string {
    return `feature:${entityType}:${entityId}`;
  }

  async getFeatures(entityId: string, entityType: string): Promise<EntityFeatures | null> {
    const cacheKey = this.getCacheKey(entityId, entityType);

    // Try cache first
    if (this.redis) {
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          log.debug('Cache hit', { entityId, entityType });
          return parsed;
        }
      } catch (error) {
        log.warn('Cache read error', { error, entityId, entityType });
      }
    }

    // Fallback to MongoDB
    try {
      const feature = await Feature.findOne({ entityId, entityType }).lean();

      if (!feature) {
        log.debug('Feature not found', { entityId, entityType });
        return null;
      }

      const result: EntityFeatures = {
        entityId: feature.entityId,
        entityType: feature.entityType,
        features: feature.features as IFeature['features'],
        computedAt: feature.computedAt
      };

      // Cache the result
      if (this.redis) {
        try {
          await this.redis.setex(cacheKey, this.cacheTtl, JSON.stringify(result));
        } catch (error) {
          log.warn('Cache write error', { error, entityId, entityType });
        }
      }

      return result;
    } catch (error) {
      log.error('Database error', { error, entityId, entityType });
      throw error;
    }
  }

  async getFeaturesForItems(
    itemIds: string[],
    entityType: string
  ): Promise<Map<string, EntityFeatures>> {
    const results = new Map<string, EntityFeatures>();

    if (itemIds.length === 0) {
      return results;
    }

    // Try to get from cache first
    if (this.redis) {
      const cacheKeys = itemIds.map(id => this.getCacheKey(id, entityType));
      try {
        const cached = await this.redis.mget(...cacheKeys);
        const missingIds: string[] = [];

        cached.forEach((value, index) => {
          if (value) {
            const parsed = JSON.parse(value);
            results.set(itemIds[index], parsed);
          } else {
            missingIds.push(itemIds[index]);
          }
        });

        if (missingIds.length > 0) {
          const dbFeatures = await Feature.find({
            entityId: { $in: missingIds },
            entityType
          }).lean();

          for (const feature of dbFeatures) {
            const entityFeatures: EntityFeatures = {
              entityId: feature.entityId,
              entityType: feature.entityType,
              features: feature.features as IFeature['features'],
              computedAt: feature.computedAt
            };
            results.set(feature.entityId, entityFeatures);

            // Cache the result
            try {
              const cacheKey = this.getCacheKey(feature.entityId, entityType);
              await this.redis!.setex(cacheKey, this.cacheTtl, JSON.stringify(entityFeatures));
            } catch (error) {
              log.warn('Cache write error', { error, entityId: feature.entityId });
            }
          }
        }
      } catch (error) {
        log.warn('Cache batch read error, falling back to DB', { error });
        const dbFeatures = await Feature.find({
          entityId: { $in: itemIds },
          entityType
        }).lean();

        for (const feature of dbFeatures) {
          results.set(feature.entityId, {
            entityId: feature.entityId,
            entityType: feature.entityType,
            features: feature.features as IFeature['features'],
            computedAt: feature.computedAt
          });
        }
      }
    } else {
      const dbFeatures = await Feature.find({
        entityId: { $in: itemIds },
        entityType
      }).lean();

      for (const feature of dbFeatures) {
        results.set(feature.entityId, {
          entityId: feature.entityId,
          entityType: feature.entityType,
          features: feature.features as IFeature['features'],
          computedAt: feature.computedAt
        });
      }
    }

    return results;
  }

  async updateFeatures(
    entityId: string,
    entityType: string,
    features: Partial<IFeature['features']>
  ): Promise<EntityFeatures> {
    const updateData: any = {
      'features.relevance': features.relevance,
      'features.popularity': features.popularity,
      'features.recency': features.recency,
      'features.quality': features.quality,
      'features.location': features.location,
      'features.personalization': features.personalization,
      'features.trending': features.trending,
      'features.custom': features.custom,
      computedAt: new Date()
    };

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    const feature = await Feature.findOneAndUpdate(
      { entityId, entityType },
      {
        $set: updateData,
        $setOnInsert: { entityId, entityType }
      },
      { upsert: true, new: true, lean: true }
    );

    if (!feature) {
      throw new Error('Failed to update features');
    }

    const result: EntityFeatures = {
      entityId: feature.entityId,
      entityType: feature.entityType,
      features: feature.features as IFeature['features'],
      computedAt: feature.computedAt
    };

    // Invalidate cache
    if (this.redis) {
      try {
        const cacheKey = this.getCacheKey(entityId, entityType);
        await this.redis.del(cacheKey);
      } catch (error) {
        log.warn('Cache invalidation error', { error, entityId, entityType });
      }
    }

    return result;
  }

  async bulkUpdateFeatures(
    updates: Array<{ entityId: string; entityType: string; features: Partial<IFeature['features']> }>
  ): Promise<number> {
    const bulkOps = updates.map(update => {
      const updateData: any = {
        'features.relevance': update.features.relevance,
        'features.popularity': update.features.popularity,
        'features.recency': update.features.recency,
        'features.quality': update.features.quality,
        'features.location': update.features.location,
        'features.personalization': update.features.personalization,
        'features.trending': update.features.trending,
        'features.custom': update.features.custom,
        computedAt: new Date()
      };

      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      return {
        updateOne: {
          filter: { entityId: update.entityId, entityType: update.entityType },
          update: { $set: { ...updateData, entityId: update.entityId, entityType: update.entityType } },
          upsert: true
        }
      };
    });

    const result = await Feature.bulkWrite(bulkOps);

    // Invalidate cache for all updated entities
    if (this.redis && result.modifiedCount > 0) {
      const cacheKeys = updates.map(u => this.getCacheKey(u.entityId, u.entityType));
      try {
        await this.redis.del(...cacheKeys);
      } catch (error) {
        log.warn('Cache bulk invalidation error', { error });
      }
    }

    return result.modifiedCount + result.upsertedCount;
  }

  async computeTrendingScore(entityId: string, entityType: string): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const features = await this.getFeatures(entityId, entityType);
    if (!features) {
      return 0;
    }

    const { popularity, recency } = features.features;

    // Time decay factor (exponential decay with half-life of 7 days)
    const hoursSinceUpdate = recency?.hoursSinceUpdate || 0;
    const timeDecay = Math.exp(-0.1 * (hoursSinceUpdate / 24));

    // Velocity factor (recent views vs historical average)
    const recentViews = popularity?.views || 0;
    const velocity = Math.log1p(recentViews) * timeDecay;

    // Normalize to 0-100 score
    const trendScore = Math.min(100, Math.max(0, velocity * 10));

    return trendScore;
  }

  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
    }
  }
}

export const featureService = new FeatureService();
