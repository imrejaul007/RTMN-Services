import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4180', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  },

  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
  },

  trust: {
    defaultScore: 50,
    maxScore: 100,
    minScore: 0,
    scoreWeights: {
      payment: 0.30,
      fulfillment: 0.20,
      dispute: 0.15,
      verification: 0.25,
      transaction: 0.10,
    },
    levelThresholds: {
      UNTRUSTED: 0,
      LOW: 20,
      MEDIUM: 40,
      HIGH: 70,
      PREMIUM: 90,
    },
  },

  credit: {
    defaultScore: 650,
    minScore: 300,
    maxScore: 900,
    grades: {
      'EXCELLENT': { min: 800, max: 900, riskLevel: 'minimal' },
      'VERY_GOOD': { min: 750, max: 799, riskLevel: 'low' },
      'GOOD': { min: 700, max: 749, riskLevel: 'low' },
      'FAIR': { min: 650, max: 699, riskLevel: 'medium' },
      'POOR': { min: 550, max: 649, riskLevel: 'high' },
      'VERY_POOR': { min: 300, max: 549, riskLevel: 'critical' },
    },
  },

  reputation: {
    defaultRating: 3.0,
    minRating: 1.0,
    maxRating: 5.0,
    recentActivityDays: 90,
  },

  externalServices: {
    decisionEngine: {
      host: process.env.DECISION_ENGINE_HOST || 'localhost',
      port: parseInt(process.env.DECISION_ENGINE_PORT || '4240', 10),
      timeout: parseInt(process.env.DECISION_ENGINE_TIMEOUT || '5000', 10),
    },
    contractOS: {
      host: process.env.CONTRACT_OS_HOST || 'localhost',
      port: parseInt(process.env.CONTRACT_OS_PORT || '4190', 10),
      timeout: parseInt(process.env.CONTRACT_OS_TIMEOUT || '5000', 10),
    },
  },
};

export type Config = typeof config;
