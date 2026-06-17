/**
 * Cosmic OS - Configuration
 */

export const config = {
  port: parseInt(process.env.PORT || '4160'),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Service URLs
  services: {
    emotional: process.env.EMOTIONAL_SERVICE_URL || 'http://localhost:4160',
    lifePattern: process.env.LIFE_PATTERN_SERVICE_URL || 'http://localhost:4161',
    humanContext: process.env.HUMAN_CONTEXT_URL || 'http://localhost:4162',
    signalAggregator: process.env.SIGNAL_AGGREGATOR_URL || 'http://localhost:4142',
  },

  // Internal token for service-to-service communication
  internalToken: process.env.INTERNAL_SERVICE_TOKEN || 'cosmic-internal-token',

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  },

  // Rate limiting
  rateLimit: {
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};

export default config;
