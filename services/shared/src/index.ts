/**
 * SUTAR OS Shared Module
 * Reusable middleware and utilities for all services
 */

// Auth Middleware
export { verifyToken, optionalAuth, internalServiceAuth, requireScope, rateLimit } from './middleware/jwtAuth';
export type { JwtPayload } from './middleware/jwtAuth';

// Input Validation
export { validateBody, validateQuery, validateParams, ValidationError, schemas } from './middleware/inputValidation';

// Security Middleware
export {
  strictCors,
  strictSecurityHeaders,
  requestIdTracing,
  auditMiddleware,
  idempotencyMiddleware,
  securityMiddleware,
  getAuditLog,
} from './middleware/security';
export { auditLog, getAuditLog as getAuditEntries, getAuditStats, clearAuditLog } from './middleware/audit';

// MongoDB Connection
export { mongodb, BaseRepository, createMongoConfig } from './utils/mongodb';
export type { MongoDBConfig } from './utils/mongodb';

// ID Generation
export { generateUUID, generateShortId, generateNanoId, generatePrefixedId, generateIds } from './utils/idGenerator';

export default {
  auth: {
    verifyToken: require('./middleware/jwtAuth').verifyToken,
    optionalAuth: require('./middleware/jwtAuth').optionalAuth,
    internalServiceAuth: require('./middleware/jwtAuth').internalServiceAuth,
    requireScope: require('./middleware/jwtAuth').requireScope,
    rateLimit: require('./middleware/jwtAuth').rateLimit,
  },
  validation: {
    validateBody: require('./middleware/inputValidation').validateBody,
    validateQuery: require('./middleware/inputValidation').validateQuery,
    validateParams: require('./middleware/inputValidation').validateParams,
  },
  security: {
    strictCors: require('./middleware/security').strictCors,
    strictSecurityHeaders: require('./middleware/security').strictSecurityHeaders,
    requestIdTracing: require('./middleware/security').requestIdTracing,
    auditMiddleware: require('./middleware/security').auditMiddleware,
    securityMiddleware: require('./middleware/security').securityMiddleware,
  },
  database: {
    mongodb: require('./utils/mongodb').mongodb,
    BaseRepository: require('./utils/mongodb').BaseRepository,
  },
  utils: {
    generateUUID: require('./utils/idGenerator').generateUUID,
    generateShortId: require('./utils/idGenerator').generateShortId,
    generateNanoId: require('./utils/idGenerator').generateNanoId,
    generatePrefixedId: require('./utils/idGenerator').generatePrefixedId,
  },
};