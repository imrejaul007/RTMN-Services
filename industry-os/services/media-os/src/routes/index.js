/**
 * Media OS - Routes Index
 * Export all route modules
 */

const contentRoutes = require('./contentRoutes');
const aiRoutes = require('./aiRoutes');
const broadcastRoutes = require('./broadcastRoutes');
const recommendationRoutes = require('./recommendationRoutes');

module.exports = {
  contentRoutes,
  aiRoutes,
  broadcastRoutes,
  recommendationRoutes,
};
