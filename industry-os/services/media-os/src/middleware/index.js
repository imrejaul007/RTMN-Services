/**
 * Media OS - Middleware Index
 * Export all middleware
 */

const { authenticate, optionalAuth, authorize, hasPermission, verifyWithCorpID, generateToken, generateRefreshToken, verifyRefreshToken } = require('./auth');
const { validate, validateQuery, validateParams, ...schemas } = require('./validation');

module.exports = {
  // Auth
  authenticate,
  optionalAuth,
  authorize,
  hasPermission,
  verifyWithCorpID,
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,

  // Validation
  validate,
  validateQuery,
  validateParams,

  // Schemas
  ...schemas,
};
