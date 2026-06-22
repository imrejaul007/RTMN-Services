import dotenv from 'dotenv';

dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

// Validate required environment variables in production
if (isProduction) {
  if (!process.env.IDENTITY_SALT) {
    throw new Error('IDENTITY_SALT environment variable is required in production');
  }
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is required in production');
  }
  if (!process.env.CORS_ORIGIN) {
    throw new Error('CORS_ORIGIN environment variable is required in production');
  }
  // Block wildcard CORS in production
  if (process.env.CORS_ORIGIN === '*') {
    throw new Error('Wildcard CORS origin (*) is forbidden in production');
  }
}

export const config = {
  nodeEnv,
  isProduction,
  port: parseInt(process.env.PORT || '3003', 10),
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/rez_identity_service',
  logLevel: process.env.LOG_LEVEL || 'info',
  identitySalt: process.env.IDENTITY_SALT!,
  corsOrigin: process.env.CORS_ORIGIN || (isProduction ? '' : 'http://localhost:3000'),
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10)
  }
};
