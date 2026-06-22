export { authMiddleware, optionalAuthMiddleware, requireRole, generateToken } from './auth.middleware.js';
export type { JwtPayload, AuthenticatedRequest } from './auth.middleware.js';
export {
  metricsMiddleware,
  metricsHandler,
  healthHandler,
  httpRequestsTotal,
  httpRequestDuration,
  cacheHits,
  cacheMisses,
  syncOperations,
  syncDuration,
  customerRecordsTotal,
} from './metrics.middleware.js';
export { register } from './metrics.middleware.js';