/**
 * Feature Store Configuration
 */

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

interface Config {
  port: number;
  redis: {
    host: string;
    port: number;
    password: string;
    keyPrefix: string;
  };
  featureStore: {
    ttl: number;
    maxFeaturesPerEntity: number;
    maxBatchSize: number;
  };
  internalServiceToken: string;
}

const config: Config = {
  port: parseInt(process.env.PORT || '4710', 10),
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
    keyPrefix: 'hojai:features:',
  },
  featureStore: {
    ttl: parseInt(process.env.FEATURE_TTL || '86400', 10), // 24 hours default
    maxFeaturesPerEntity: parseInt(process.env.MAX_FEATURES_PER_ENTITY || '1000', 10),
    maxBatchSize: parseInt(process.env.MAX_BATCH_SIZE || '100', 10),
  },
  internalServiceToken: process.env.INTERNAL_SERVICE_TOKEN || 'dev-token',
};

export default config;
