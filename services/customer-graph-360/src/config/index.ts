import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration interface
interface Config {
  port: number;
  nodeEnv: string;
  mongodbUri: string;
  redisUrl: string;
  jwtSecret: string;
  logLevel: string;

  // Service URLs
  services: {
    rabtul: string;
    buzzlocal: string;
    airzy: string;
    rezMenuQr: string;
    rezNow: string;
    risaCare: string;
  };

  // Feature flags
  features: {
    enableCache: boolean;
    enableMetrics: boolean;
    enableSync: boolean;
  };

  // Cache settings
  cache: {
    ttl: number; // seconds
    keyPrefix: string;
  };

  // Sync settings
  sync: {
    interval: number; // minutes
    batchSize: number;
  };
}

// Validate required environment variables
function validateConfig(): void {
  const required = ['PORT', 'MONGODB_URI', 'REDIS_URL', 'JWT_SECRET'];

  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
}

// Get configuration
function getConfig(): Config {
  validateConfig();

  return {
    port: parseInt(process.env.PORT || '4808', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/customer-graph-360',
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    jwtSecret: process.env.JWT_SECRET || 'default-secret-change-me',
    logLevel: process.env.LOG_LEVEL || 'info',

    services: {
      rabtul: process.env.RABTUL_SERVICE_URL || 'http://localhost:4002',
      buzzlocal: process.env.BUZZLOCAL_SERVICE_URL || 'http://localhost:4500',
      airzy: process.env.AIRZY_SERVICE_URL || 'http://localhost:4505',
      rezMenuQr: process.env.REZ_MENU_QR_SERVICE_URL || 'http://localhost:3014',
      rezNow: process.env.REZ_NOW_SERVICE_URL || 'http://localhost:3000',
      risaCare: process.env.RISACARE_SERVICE_URL || 'http://localhost:4600',
    },

    features: {
      enableCache: process.env.ENABLE_CACHE !== 'false',
      enableMetrics: process.env.ENABLE_METRICS !== 'false',
      enableSync: process.env.ENABLE_SYNC !== 'false',
    },

    cache: {
      ttl: parseInt(process.env.CACHE_TTL || '3600', 10), // 1 hour default
      keyPrefix: process.env.CACHE_PREFIX || 'cg360:',
    },

    sync: {
      interval: parseInt(process.env.SYNC_INTERVAL || '60', 10), // 1 hour default
      batchSize: parseInt(process.env.SYNC_BATCH_SIZE || '100', 10),
    },
  };
}

export const config = getConfig();
export type { Config };
