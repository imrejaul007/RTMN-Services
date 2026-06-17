/**
 * Configuration for Intent Prediction Engine
 */

import dotenv from 'dotenv';
dotenv.config();

export interface Config {
  port: number;
  nodeEnv: string;
  mongodb: {
    uri: string;
  };
  corsOrigins: string[];
  internalServiceTokens: Record<string, string>;
  hojaiGateway: {
    url: string;
  };
}

export const config: Config = {
  port: parseInt(process.env.PORT || '4801', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodb: {
    uri: process.env.MONGODB_URI || process.env.MONGODB_URL || 'mongodb://localhost:27017/intent-prediction',
  },
  corsOrigins: process.env.CORS_ORIGIN?.split(',').filter(Boolean) || ['*'],
  internalServiceTokens: parseServiceTokens(),
  hojaiGateway: {
    url: process.env.HOJAI_GATEWAY_URL || 'http://localhost:4560',
  },
};

function parseServiceTokens(): Record<string, string> {
  const json = process.env.INTERNAL_SERVICE_TOKENS_JSON;
  if (json) {
    try { return JSON.parse(json); } catch { /* ignore */ }
  }
  const legacy = process.env.INTERNAL_SERVICE_TOKEN;
  if (legacy) {
    return {
      'intent-prediction-engine': legacy,
      'intent-signal-aggregator': legacy,
      'hojai-ai-gateway': legacy,
    };
  }
  return {};
}

export function validateConfig(): void {
  console.log('[Config] Intent Prediction Engine configuration loaded');
}
