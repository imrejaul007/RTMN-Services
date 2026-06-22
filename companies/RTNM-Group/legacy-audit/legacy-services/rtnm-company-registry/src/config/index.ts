import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server Configuration
  port: parseInt(process.env.PORT || '6000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // MongoDB Configuration
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/rtnm_company_registry',
    options: {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    },
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },

  // Trust Score Thresholds
  trustScore: {
    excellent: 90,
    good: 70,
    fair: 50,
    poor: 30,
  },

  // Credit Limits by Company Type
  creditLimits: {
    ai: 1000000,      // HOJAI AI
    payment: 500000,  // RABTUL
    consumer: 250000, // REZ-Consumer
    merchant: 200000, // REZ-Merchant
    other: 100000,    // Others
  },

  // Company Types
  companyTypes: [
    'ai',
    'payment',
    'consumer',
    'merchant',
    'social',
    'marketing',
    'healthcare',
    'hospitality',
    'mobility',
    'legal',
    'finance',
    'property',
    'hr',
    'education',
    'events',
  ] as const,

  // Industries
  industries: [
    'ai',
    'fintech',
    'ecommerce',
    'social',
    'marketing',
    'healthcare',
    'hospitality',
    'mobility',
    'legal',
    'realestate',
    'hr',
    'education',
    'events',
    'retail',
    'food',
    'transportation',
    'entertainment',
  ] as const,

  // Company Status
  companyStatuses: ['active', 'inactive', 'suspended', 'pending', 'archived'] as const,

  // Service Status
  serviceStatuses: ['active', 'inactive', 'maintenance', 'deprecated'] as const,

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
  },
};

export type CompanyType = typeof config.companyTypes[number];
export type Industry = typeof config.industries[number];
export type CompanyStatus = typeof config.companyStatuses[number];
export type ServiceStatus = typeof config.serviceStatuses[number];

export default config;