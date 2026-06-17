/**
 * Configuration
 *
 * Environment-based configuration for Intent Signal Aggregator.
 */

import dotenv from 'dotenv';

dotenv.config();

// ============================================================================
// TYPES
// ============================================================================

export interface Config {
  port: number;
  nodeEnv: string;
  mongodb: {
    uri: string;
    options: Record<string, unknown>;
  };
  redis: {
    url: string;
  };
  corsOrigins: string[];
  internalServiceTokens: Record<string, string>;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

export const config: Config = {
  port: parseInt(process.env.PORT || '4800', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  mongodb: {
    uri: process.env.MONGODB_URI || process.env.MONGODB_URL || 'mongodb://localhost:27017/intent-signals',
    options: {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    },
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  corsOrigins: process.env.CORS_ORIGIN?.split(',').filter(Boolean) || ['*'],

  internalServiceTokens: parseServiceTokens(),
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function parseServiceTokens(): Record<string, string> {
  // Support both JSON format and legacy single token
  const jsonTokens = process.env.INTERNAL_SERVICE_TOKENS_JSON;
  if (jsonTokens) {
    try {
      return JSON.parse(jsonTokens);
    } catch {
      console.warn('Failed to parse INTERNAL_SERVICE_TOKENS_JSON');
    }
  }

  // Legacy single token format
  const legacyToken = process.env.INTERNAL_SERVICE_TOKEN;
  if (legacyToken) {
    return {
      'intent-signal-aggregator': legacyToken,
      'hojai-ai-gateway': legacyToken,
      'intent-prediction-engine': legacyToken,
      'intent-marketplace': legacyToken,
    };
  }

  return {};
}

export function validateConfig(): void {
  const required = ['MONGODB_URI', 'REDIS_URL'];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  console.log('[Config] Configuration validated successfully');
}
