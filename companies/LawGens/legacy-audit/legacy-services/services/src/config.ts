/**
 * LawGens Services Configuration
 */

import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5099', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/lawgens',
  },
  security: {
    jwtSecret: process.env.JWT_SECRET || '',
    encryptionKey: process.env.ENCRYPTION_KEY || '',
    corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3001').split(','),
  },
  hojai: {
    gatewayUrl: process.env.HOJAI_GATEWAY_URL || 'http://localhost:4500',
    apiKey: process.env.HOJAI_API_KEY || '',
    timeout: parseInt(process.env.HOJAI_TIMEOUT || '30000', 10),
  },
  services: {
    auth: process.env.AUTH_SERVICE_URL || 'https://rez-auth-service.onrender.com',
    wallet: process.env.WALLET_SERVICE_URL || 'https://rez-wallet-service.onrender.com',
    hojaiMemory: process.env.HOJAI_MEMORY || 'http://localhost:4520',
    hojaiIntelligence: process.env.HOJAI_INTELLIGENCE || 'http://localhost:4530',
    hojaiAgents: process.env.HOJAI_AGENTS || 'http://localhost:4550',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};

export default config;