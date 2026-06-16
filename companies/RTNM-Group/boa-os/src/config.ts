// ============================================================================
// BOA OS Configuration
// ============================================================================

import dotenv from 'dotenv';
dotenv.config();

// Validate required environment variables in production
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction && (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'change-me-in-production')) {
  console.error('❌ FATAL: JWT_SECRET must be set in production environment');
  process.exit(1);
}

export const config = {
  port: parseInt(process.env.PORT || '4100'),
  serviceName: 'boa-os',
  version: '1.0.0',
  environment: process.env.NODE_ENV || 'development',

  // External services
  sutarGoalOSUrl: process.env.SUTAR_GOAL_OS_URL || 'http://localhost:4242',
  sutarDecisionEngineUrl: process.env.SUTAR_DECISION_ENGINE_URL || 'http://localhost:4240',
  eventBusUrl: process.env.EVENT_BUS_URL || 'http://localhost:4510',
  corpidServiceUrl: process.env.CORPID_SERVICE_URL || 'http://localhost:4702',

  // Database
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/boa-os',

  // Auth - JWT secret is REQUIRED in production
  jwtSecret: process.env.JWT_SECRET || (
    isProduction
      ? (() => { throw new Error('JWT_SECRET required'); })()
      : 'dev-secret-do-not-use-in-prod'
  ),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',

  // Rate limiting
  rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '60000'),
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100'),

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
};

export default config;
