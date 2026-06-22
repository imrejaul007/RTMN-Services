/**
 * Hojai Model Router Configuration
 */

import dotenv from 'dotenv';

dotenv.config();

// Environment variable access with explicit typing
const env = {
  PORT: process.env['PORT'] || '4712',
  NODE_ENV: process.env['NODE_ENV'] || 'development',
  LOG_LEVEL: process.env['LOG_LEVEL'] || 'info',
  OPENAI_ENABLED: process.env['OPENAI_ENABLED'],
  OPENAI_API_KEY: process.env['OPENAI_API_KEY'] || '',
  OPENAI_BASE_URL: process.env['OPENAI_BASE_URL'] || 'https://api.openai.com/v1',
  ANTHROPIC_ENABLED: process.env['ANTHROPIC_ENABLED'],
  ANTHROPIC_API_KEY: process.env['ANTHROPIC_API_KEY'] || '',
  ANTHROPIC_BASE_URL: process.env['ANTHROPIC_BASE_URL'] || 'https://api.anthropic.com',
  GOOGLE_ENABLED: process.env['GOOGLE_ENABLED'],
  GOOGLE_API_KEY: process.env['GOOGLE_API_KEY'] || '',
  META_ENABLED: process.env['META_ENABLED'],
  META_API_KEY: process.env['META_API_KEY'] || '',
  DEFAULT_MAX_TOKENS: process.env['DEFAULT_MAX_TOKENS'] || '4096',
  DEFAULT_TEMPERATURE: process.env['DEFAULT_TEMPERATURE'] || '0.7',
  FALLBACK_ATTEMPTS: process.env['FALLBACK_ATTEMPTS'] || '3',
};

interface Config {
  port: number;
  nodeEnv: string;
  logLevel: string;
  serviceName: string;
  version: string;
  providers: {
    openai: {
      enabled: boolean;
      apiKey: string;
      baseUrl: string;
    };
    anthropic: {
      enabled: boolean;
      apiKey: string;
      baseUrl: string;
    };
    google: {
      enabled: boolean;
      apiKey: string;
    };
    meta: {
      enabled: boolean;
      apiKey: string;
    };
  };
  routing: {
    defaultMaxTokens: number;
    defaultTemperature: number;
    fallbackAttempts: number;
  };
}

const config: Config = {
  port: parseInt(env.PORT, 10),
  nodeEnv: env.NODE_ENV,
  logLevel: env.LOG_LEVEL,
  serviceName: 'hojai-model-router',
  version: '1.0.0',

  providers: {
    openai: {
      enabled: env.OPENAI_ENABLED !== 'false',
      apiKey: env.OPENAI_API_KEY,
      baseUrl: env.OPENAI_BASE_URL,
    },
    anthropic: {
      enabled: env.ANTHROPIC_ENABLED !== 'false',
      apiKey: env.ANTHROPIC_API_KEY,
      baseUrl: env.ANTHROPIC_BASE_URL,
    },
    google: {
      enabled: env.GOOGLE_ENABLED !== 'false',
      apiKey: env.GOOGLE_API_KEY,
    },
    meta: {
      enabled: env.META_ENABLED !== 'false',
      apiKey: env.META_API_KEY,
    },
  },

  routing: {
    defaultMaxTokens: parseInt(env.DEFAULT_MAX_TOKENS, 10),
    defaultTemperature: parseFloat(env.DEFAULT_TEMPERATURE),
    fallbackAttempts: parseInt(env.FALLBACK_ATTEMPTS, 10),
  },
};

export default config;
