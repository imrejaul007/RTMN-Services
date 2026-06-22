import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server Configuration
  port: parseInt(process.env.PORT || '6005', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // MongoDB Configuration
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/rtnm-billing',
    options: {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    },
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '60000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  },

  // Settlement Configuration
  settlement: {
    defaultCurrency: 'INR',
    settlementSchedule: process.env.SETTLEMENT_SCHEDULE || '0 0 1 * *', // Monthly on 1st
    autoReconcile: process.env.AUTO_RECONCILE === 'true',
    reconciliationThreshold: parseFloat(process.env.RECONCILIATION_THRESHOLD || '0.01'),
  },

  // Company Registry (RTNM Economic Network)
  companies: {
    registry: [
      'HOJAI-AI',
      'RABTUL-Technologies',
      'REZ-Intelligence',
      'REZ-Consumer',
      'KHAIRMOVE',
      'AXOM',
      'AdBazaar',
      'REZ-Merchant',
      'REZ-Move',
      'RIDZA',
      'LawGens',
      'AssetMind',
      'RisaCare',
      'CorpPerks',
      'StayOwn-Hospitality',
      'RTNM-Group',
      'RisnaEstate',
      'REZ-Workspace',
      'Hotel OTA',
      'RABTUL-SaaS',
      'RTNM-Digital',
      'Nexha',
    ],
  },

  // API Security
  security: {
    apiKeyHeader: 'X-API-Key',
    internalToken: process.env.INTERNAL_SERVICE_TOKEN || 'rtnm-internal-token',
  },
};

export default config;
