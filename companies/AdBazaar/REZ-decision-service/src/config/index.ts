/**
 * Configuration
 */
export const config = {
  port: parseInt(process.env.PORT || '4027', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  mongodb: {
    uri: process.env.MONGODB_URI,
  },
  internalToken: process.env.INTERNAL_SERVICE_TOKEN || 'dev-token',
  adminToken: process.env.ADMIN_TOKEN,
};

export function validateConfig(): void {
  logger.info('[Config] Configuration loaded');
}
