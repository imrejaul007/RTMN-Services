/**
 * Configuration Utility
 */

export function getCorsOrigins(): string[] {
  const origins = process.env.CORS_ORIGINS || '';
  if (!origins) return [];
  return origins.split(',').map(o => o.trim()).filter(Boolean);
}

export function getConfig() {
  return {
    port: parseInt(process.env.PORT || '4530', 10),
    mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai-skillnet',
    jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    corsOrigins: getCorsOrigins(),
    nodeEnv: process.env.NODE_ENV || 'development'
  };
}

export default { getCorsOrigins, getConfig };
