/**
 * Media OS - Configuration
 * Central configuration management
 */

require('dotenv').config();

const config = {
  // Server
  PORT: process.env.PORT || 5600,
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Database
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/media-os',
  MONGODB_OPTIONS: {
    maxPoolSize: 10,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  },

  // Redis
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'media-os-secret-key-change-in-production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

  // RTMN Services
  RTMN_SERVICES: {
    // Layer 1: Intelligence
    HOJAI_AI: process.env.HOJAI_AI_URL || 'http://localhost:4560',

    // Layer 2: Customer Growth
    ADBAZAAR_DSP: process.env.ADBAZAAR_DSP_URL || 'http://localhost:4990',
    ADBAZAAR_SSP: process.env.ADBAZAAR_SSP_URL || 'http://localhost:4980',
    ADBAZAAR_INTENT: process.env.ADBAZAAR_INTENT_URL || 'http://localhost:4800',
    ADBAZAAR_ATTRIBUTION: process.env.ADBAZAAR_ATTRIBUTION_URL || 'http://localhost:4950',

    // Layer 3: Commerce
    NEXHA: process.env.NEXHA_URL || 'http://localhost:8000',
    REZ_MERCHANT: process.env.REZ_MERCHANT_URL || 'http://localhost:4800',

    // Layer 4: Financial
    RABTUL_WALLET: process.env.RABTUL_WALLET_URL || 'http://localhost:4004',
    RABTUL_AUTH: process.env.RABTUL_AUTH_URL || 'http://localhost:4002',

    // Layer 10: Identity
    CORPID: process.env.CORPID_URL || 'http://localhost:4702',

    // Layer 11: Memory
    MEMORY_OS: process.env.MEMORY_OS_URL || 'http://localhost:4703',

    // Layer 12: Twins
    TWIN_OS: process.env.TWIN_OS_URL || 'http://localhost:4705',

    // Layer 13: Automation
    FLOW_OS: process.env.FLOW_OS_URL || 'http://localhost:4510',

    // Event Bus
    EVENT_BUS: process.env.EVENT_BUS_URL || 'http://localhost:4510',

    // Layer 14: Autonomous
    SUTAR_OS: process.env.SUTAR_OS_URL || 'http://localhost:4140',
  },

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  LOG_DIR: process.env.LOG_DIR || './logs',

  // Rate Limiting
  RATE_LIMIT: {
    WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    AUTH_WINDOW_MS: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS) || 15 * 60 * 1000,
    AUTH_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_AUTH_MAX_REQUESTS) || 10,
  },

  // CORS
  CORS_ORIGINS: process.env.CORS_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://rtmn.vercel.app',
  ],

  // Streaming
  STREAMING: {
    CDN_URL: process.env.CDN_URL || 'https://cdn.rtmn.in',
    HLS_VERSION: '1.4',
    DASH_VERSION: '2.0',
    MAX_BITRATE: 8000000,
    MIN_BITRATE: 400000,
  },

  // Pagination
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100,
  },
};

module.exports = config;
