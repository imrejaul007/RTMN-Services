/**
 * RTMN TwinOS Shared Library
 * Common utilities for all TwinOS services
 */

// Middleware
export { requireAuth, optionalAuth, requireRole, requireBusiness, generateTokens, verifyToken, hashPassword, verifyPassword } from './middleware/auth.js';
export { validate, validators, twinValidators, authValidators, sanitizeObject, preventPrototypePollution, sanitizeSearchInput } from './middleware/validation.js';
export { Errors, AppError, notFoundHandler, errorHandler, asyncHandler, requestId, requestLogger, logger } from './middleware/errors.js';
export { defaultLimiter, strictLimiter, authLimiter, createLimiter, createUserLimiter, createBusinessLimiter } from './middleware/rateLimit.js';

// Base Twin Service
export { createBaseTwinService } from './services/baseTwinService.js';

// Constants
export { TWIN_TYPES, TWIN_CATEGORIES, TWIN_STATUS, HEALTH_STATUS, PAGINATION, SORT_OPTIONS } from './constants/twins.js';

// Version
export const VERSION = '1.0.0';
export const SERVICE_NAME = '@rtmn/twinos-shared';

export default {
  VERSION,
  SERVICE_NAME
};
