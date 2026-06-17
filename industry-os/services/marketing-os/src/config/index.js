/**
 * Marketing OS - Configuration
 */

const config = {
  PORT: process.env.PORT || 5500,
  NODE_ENV: process.env.NODE_ENV || 'development',

  // MongoDB
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/marketing-os',
  MONGODB_OPTIONS: {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  },

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'marketing-os-secret-key',
  JWT_EXPIRES_IN: '7d',

  // Rate Limiting
  RATE_LIMIT: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 100,
    AUTH_WINDOW_MS: 15 * 60 * 1000,
    AUTH_MAX_REQUESTS: 10,
  },

  // RTMN Services
  SERVICES: {
    HOJAI_AI: process.env.HOJAI_AI_URL || 'http://localhost:4560',
    CORPID: process.env.CORPID_URL || 'http://localhost:4702',
    MEMORY_OS: process.env.MEMORY_OS_URL || 'http://localhost:4703',
    TWIN_OS: process.env.TWIN_OS_URL || 'http://localhost:4705',
    ADBAZAAR_DSP: process.env.ADBAZAAR_DSP_URL || 'http://localhost:4990',
    ADBAZAAR_AUDIENCE: process.env.ADBAZAAR_AUDIENCE_URL || 'http://localhost:4805',
    SALES_OS: process.env.SALES_OS_URL || 'http://localhost:5055',
    MEDIA_OS: process.env.MEDIA_OS_URL || 'http://localhost:5600',
    REZ_WALLET: process.env.REZ_WALLET_URL || 'http://localhost:4004',
  },

  // Campaign Types
  CAMPAIGN_TYPES: [
    'awareness',
    'consideration',
    'conversion',
    'retargeting',
    'brand',
    'product_launch',
    'seasonal',
    'event',
    'loyalty',
  ],

  // Channel Types
  CHANNELS: [
    'google_ads',
    'meta_ads',
    'linkedin_ads',
    'twitter_ads',
    'youtube_ads',
    'tiktok_ads',
    'dooh',
    'ott',
    'native',
    'display',
    'search',
    'email',
    'whatsapp',
    'sms',
    'social',
    'content',
    'influencer',
    'events',
  ],

  // Journey Step Types
  JOURNEY_STEPS: [
    'email',
    'sms',
    'whatsapp',
    'push',
    'delay',
    'condition',
    'action',
    'webhook',
    'segment',
    'ai',
  ],

  // Budget Allocation Strategies
  BUDGET_STRATEGIES: [
    'equal',
    'performance',
    'custom',
    'auto',
  ],
};

module.exports = config;
