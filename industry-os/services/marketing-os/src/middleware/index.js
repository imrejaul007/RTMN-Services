/**
 * Marketing OS - Middleware Index
 */

const {
  generateToken,
  verifyToken,
  authenticate,
  authorize,
  requirePermission,
  optionalAuth,
  rateLimitByUser,
} = require('./auth');

const {
  validate,
  paginationSchema,
  brandSchema,
  campaignSchema,
  journeySchema,
  leadSchema,
} = require('./validation');

module.exports = {
  // Auth
  generateToken,
  verifyToken,
  authenticate,
  authorize,
  requirePermission,
  optionalAuth,
  rateLimitByUser,

  // Validation
  validate,
  paginationSchema,
  brandSchema,
  campaignSchema,
  journeySchema,
  leadSchema,
};
