/**
 * Media OS - Services Index
 */

const rtmnService = require('./RTMNIntegration');
const { eventBus, EventBus, EVENTS } = require('./EventBus');
const { aiContentService, ...AIAgents } = require('./ContentAIService');

module.exports = {
  rtmnService,
  eventBus,
  EventBus,
  EVENTS,
  aiContentService,
  ...AIAgents,
};
