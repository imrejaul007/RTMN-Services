import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '6007', 10),
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/rtnm_company_trust',
    options: {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    },
  },
  app: {
    name: 'rtnm-company-trust',
    version: '1.0.0',
    env: process.env.NODE_ENV || 'development',
  },
  trust: {
    minScore: 0,
    maxScore: 100,
    defaultScore: 75,
    historyRetentionDays: 365,
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    max: 100,
  },
};