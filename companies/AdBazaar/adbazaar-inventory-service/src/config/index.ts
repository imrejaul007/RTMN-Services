/**
 * Configuration for Inventory Service
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
    options: mongoose.ConnectOptions;
  };
  corsOrigins: string[];
  internalServiceTokens: Record<string, string>;
  hojaiGateway: {
    url: string;
  };
}

export interface mongoose {
  ConnectOptions: any;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

export const config: Config = {
  port: parseInt(process.env.PORT || '4900', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  mongodb: {
    uri: process.env.MONGODB_URI || process.env.MONGODB_URL || 'mongodb://localhost:27017/adbazaar-inventory',
    options: {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    },
  },

  corsOrigins: process.env.CORS_ORIGIN?.split(',').filter(Boolean) || ['*'],

  internalServiceTokens: parseServiceTokens(),

  hojaiGateway: {
    url: process.env.HOJAI_GATEWAY_URL || 'http://localhost:4560',
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function parseServiceTokens(): Record<string, string> {
  const jsonTokens = process.env.INTERNAL_SERVICE_TOKENS_JSON;
  if (jsonTokens) {
    try {
      return JSON.parse(jsonTokens);
    } catch {
      console.warn('Failed to parse INTERNAL_SERVICE_TOKENS_JSON');
    }
  }

  const legacyToken = process.env.INTERNAL_SERVICE_TOKEN;
  if (legacyToken) {
    return {
      'adbazaar-inventory-service': legacyToken,
      'adbazaar-dooh-service': legacyToken,
      'adbazaar-ssp': legacyToken,
      'adbazaar-dsp': legacyToken,
    };
  }

  return {};
}

export function validateConfig(): void {
  const required = ['MONGODB_URI'];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  console.log('[Config] Configuration validated successfully');
}
