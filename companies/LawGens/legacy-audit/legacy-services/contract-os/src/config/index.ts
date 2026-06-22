import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4190', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/contract-os',
    options: {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    },
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: 'json',
  },

  security: {
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  },

  contract: {
    defaultExpiryDays: parseInt(process.env.CONTRACT_EXPIRY_DAYS || '365', 10),
    autoRenewEnabled: process.env.AUTO_RENEW_ENABLED === 'true',
    maxExecutionRetries: parseInt(process.env.MAX_EXECUTION_RETRIES || '3', 10),
  },
};

export default config;