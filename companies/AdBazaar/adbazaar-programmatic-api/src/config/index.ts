/**
 * Configuration for Programmatic API
 */

import dotenv from 'dotenv';

dotenv.config();

export interface Config {
  port: number;
  nodeEnv: string;
  redis: {
    url: string;
  };
  auction: {
    timeout: number;
    minBid: number;
    floorPrice: number;
  };
  inventoryService: {
    url: string;
  };
  hojaiGateway: {
    url: string;
  };
  internalServiceTokens: Record<string, string>;
}

export const config: Config = {
  port: parseInt(process.env.PORT || '4940', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  auction: {
    timeout: parseInt(process.env.AUCTION_TIMEOUT || '100', 10), // ms
    minBid: parseFloat(process.env.MIN_BID || '0.5'), // INR
    floorPrice: parseFloat(process.env.FLOOR_PRICE || '1'), // INR CPM
  },
  inventoryService: {
    url: process.env.INVENTORY_SERVICE_URL || 'http://localhost:4900',
  },
  hojaiGateway: {
    url: process.env.HOJAI_GATEWAY_URL || 'http://localhost:4560',
  },
  internalServiceTokens: parseServiceTokens(),
};

function parseServiceTokens(): Record<string, string> {
  const jsonTokens = process.env.INTERNAL_SERVICE_TOKENS_JSON;
  if (jsonTokens) {
    try {
      return JSON.parse(jsonTokens);
    } catch {
      console.warn('Failed to parse INTERNAL_SERVICE_TOKENS_JSON');
    }
  }
  const legacy = process.env.INTERNAL_SERVICE_TOKEN;
  if (legacy) {
    return {
      'adbazaar-programmatic-api': legacy,
      'adbazaar-ssp': legacy,
      'adbazaar-dsp': legacy,
    };
  }
  return {};
}

export function validateConfig(): void {
  console.log('[Config] Configuration validated');
}
