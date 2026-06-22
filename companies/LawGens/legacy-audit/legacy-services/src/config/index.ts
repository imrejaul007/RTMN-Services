/**
 * LawGens Configuration
 * Environment-based configuration for legal AI platform
 */

import dotenv from 'dotenv';

dotenv.config();

interface MongoConfig {
  uri: string;
  options: {
    useNewUrlParser: boolean;
    useUnifiedTopology: boolean;
    maxPoolSize: number;
    serverSelectionTimeoutMS: number;
    socketTimeoutMS: number;
  };
}

interface HojaiAIConfig {
  gatewayUrl: string;
  apiKey: string;
  timeout: number;
  retryAttempts: number;
}

interface SecurityConfig {
  rateLimitWindowMs: number;
  rateLimitMax: number;
  corsOrigins: string[];
  jwtSecret: string;
  encryptionKey: string;
}

interface CourtAPIConfig {
  pacerUrl: string;
  apiKey: string;
  courtsUrl: string;
}

interface LegalResearchConfig {
  caseLawEndpoint: string;
  statuteEndpoint: string;
  maxResults: number;
  cacheDuration: number;
}

interface ComplianceConfig {
  gdprThreshold: number;
  soc2ControlCount: number;
  sebiRequirementLevel: string;
}

interface ElasticsearchConfig {
  node: string;
  index: string;
  requestTimeout: number;
}

const config = {
  // Server Configuration
  port: parseInt(process.env.PORT || '5100', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  serviceName: 'lawgens',
  apiVersion: 'v1',

  // MongoDB Configuration
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/lawgens',
    options: {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    },
  } as MongoConfig,

  // HOJAI AI Integration
  hojai: {
    gatewayUrl: process.env.HOJAI_GATEWAY_URL || 'http://localhost:4500',
    apiKey: process.env.HOJAI_API_KEY || '',
    timeout: parseInt(process.env.HOJAI_TIMEOUT || '30000', 10),
    retryAttempts: parseInt(process.env.HOJAI_RETRY || '3', 10),
  } as HojaiAIConfig,

  // Security Configuration
  security: {
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3001').split(','),
    jwtSecret: process.env.JWT_SECRET || '',
    encryptionKey: process.env.ENCRYPTION_KEY || '',
  } as SecurityConfig,

  // Legal Research API Configuration
  legalResearch: {
    caseLawEndpoint: process.env.CASE_LAW_ENDPOINT || 'https://api.case.law/v1/cases',
    statuteEndpoint: process.env.STATUTE_ENDPOINT || 'https://api.law.example.com/statutes',
    maxResults: parseInt(process.env.MAX_RESEARCH_RESULTS || '50', 10),
    cacheDuration: parseInt(process.env.CACHE_DURATION || '3600000', 10), // 1 hour
  } as LegalResearchConfig,

  // Court API Configuration
  court: {
    pacerUrl: process.env.PACER_URL || 'https://ecf.uscourts.gov',
    apiKey: process.env.COURT_API_KEY || '',
    courtsUrl: process.env.COURTS_URL || 'https://api.courts.example.com',
  } as CourtAPIConfig,

  // Compliance Configuration
  compliance: {
    gdprThreshold: 95,
    soc2ControlCount: 89,
    sebiRequirementLevel: 'mandatory',
  } as ComplianceConfig,

  // Elasticsearch Configuration
  elasticsearch: {
    node: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
    index: process.env.ELASTICSEARCH_INDEX || 'lawgens-documents',
    requestTimeout: parseInt(process.env.ES_TIMEOUT || '30000', 10),
  } as ElasticsearchConfig,

  // Redis Cache Configuration
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB || '0', 10),
    ttl: parseInt(process.env.REDIS_TTL || '3600', 10),
  },

  // Document Storage
  storage: {
    type: process.env.STORAGE_TYPE || 'local', // 'local' or 's3'
    localPath: process.env.STORAGE_PATH || './documents',
    s3Bucket: process.env.S3_BUCKET || '',
    s3Region: process.env.S3_REGION || 'us-east-1',
  },

  // Email Configuration
  email: {
    host: process.env.SMTP_HOST || 'smtp.example.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASSWORD || '',
    from: process.env.EMAIL_FROM || 'lawgens@rtnm.digital',
  },

  // Feature Flags
  features: {
    aiAnalysis: process.env.FEATURE_AI_ANALYSIS !== 'false',
    eDiscovery: process.env.FEATURE_E_DISCOVERY !== 'false',
    courtTracking: process.env.FEATURE_COURT_TRACKING !== 'false',
    complianceMonitoring: process.env.FEATURE_COMPLIANCE !== 'false',
    documentDrafting: process.env.FEATURE_DOCUMENT_DRAFTING !== 'false',
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
    filePath: process.env.LOG_FILE_PATH || './logs/lawgens.log',
  },

  // Rate Limiting for specific endpoints
  endpointLimits: {
    legalResearch: parseInt(process.env.LIMIT_LEGAL_RESEARCH || '30', 10), // per minute
    contractAnalysis: parseInt(process.env.LIMIT_CONTRACT_ANALYSIS || '20', 10),
    complianceCheck: parseInt(process.env.LIMIT_COMPLIANCE || '10', 10),
    courtTracking: parseInt(process.env.LIMIT_COURT || '30', 10),
    documentDraft: parseInt(process.env.LIMIT_DOCUMENT || '20', 10),
  },

  // Contract defaults
  contract: {
    defaultExpiryDays: parseInt(process.env.DEFAULT_EXPIRY_DAYS || '365', 10),
    maxClauses: parseInt(process.env.MAX_CLAUSES || '100', 10),
    maxParties: parseInt(process.env.MAX_PARTIES || '10', 10),
  },

  // Analysis settings
  analysis: {
    riskThresholdLow: 30,
    riskThresholdMedium: 60,
    riskThresholdHigh: 80,
    confidenceMinimum: 0.7,
  },

  // Pagination defaults
  pagination: {
    defaultLimit: parseInt(process.env.PAGINATION_LIMIT || '20', 10),
    maxLimit: parseInt(process.env.PAGINATION_MAX || '100', 10),
  },
};

export default config;

export type Config = typeof config;
