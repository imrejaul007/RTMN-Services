// ============================================================================
// BOA OS Configuration
// ============================================================================

import dotenv from 'dotenv';
dotenv.config();

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

  // Auth
  jwtSecret: process.env.JWT_SECRET || 'boa-os-secret-change-in-prod',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
};

export default config;
