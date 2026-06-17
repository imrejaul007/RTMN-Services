/**
 * Marketing OS - Middleware Index
 */

const {
  generateToken,
  verifyToken,
  authenticate,
  authorize,
  optionalAuth,
} = require('./auth');

const {
  validate,
  brandSchema,
  campaignSchema,
  journeySchema,
  leadSchema,
} = require('./validation');

module.exports = {
  generateToken,
  verifyToken,
  authenticate,
  authorize,
  optionalAuth,
  validate,
  brandSchema,
  campaignSchema,
  journeySchema,
  leadSchema,
};
