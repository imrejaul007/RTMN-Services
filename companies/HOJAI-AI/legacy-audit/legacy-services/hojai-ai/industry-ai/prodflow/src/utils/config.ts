/**
 * PRODFLOW - Configuration Management
 * Environment-based configuration with validation
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

// ============================================
// CONFIG INTERFACE
// ============================================

export interface Config {
  port: number;
  nodeEnv: string;
  mongodb: {
    uri: string;
    timeout: number;
    socketTimeout: number;
    poolSize: number;
  };
  jwt: {
    secret: string;
    expiresIn: string;
    refreshExpiresIn: string;
  };
  security: {
    internalToken: string;
    bcryptRounds: number;
  };
  rateLimit: {
    window: number;
    max: number;
    authMax: number;
  };
  cors: {
    origin: string | string[];
    methods: string[];
  };
  logs: {
    level: string;
    dir: string;
  };
}

// ============================================
// CONFIGURATION
// ============================================

export const config: Config = {
  port: parseInt(process.env.PORT || '4817', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/prodflow',
    timeout: parseInt(process.env.MONGODB_TIMEOUT || '5000', 10),
    socketTimeout: parseInt(process.env.MONGODB_SOCKET_TIMEOUT || '45000', 10),
    poolSize: parseInt(process.env.MONGODB_POOL_SIZE || '10', 10)
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'prodflow-dev-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  },

  security: {
    internalToken: process.env.INTERNAL_SERVICE_TOKEN || 'prodflow-internal-token',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10)
  },

  rateLimit: {
    window: parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    authMax: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '10', 10)
  },

  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
  },

  logs: {
    level: process.env.LOG_LEVEL || 'info',
    dir: process.env.LOGS_DIR || 'logs'
  }
};

// ============================================
// VALIDATION
// ============================================

export function validateConfig(): boolean {
  const errors: string[] = [];

  // Port validation
  if (config.port < 1 || config.port > 65535) {
    errors.push('PORT must be between 1 and 65535');
  }

  // MongoDB URI validation
  if (!config.mongodb.uri.startsWith('mongodb')) {
    errors.push('MONGODB_URI must be a valid MongoDB connection string');
  }

  // JWT secret validation
  if (config.nodeEnv === 'production' && config.jwt.secret.includes('dev')) {
    errors.push('JWT_SECRET must be changed from default in production');
  }

  // Log errors
  if (errors.length > 0) {
    console.error('Configuration validation failed:');
    errors.forEach(err => console.error(`  - ${err}`));
    return false;
  }

  return true;
}

export default config;
