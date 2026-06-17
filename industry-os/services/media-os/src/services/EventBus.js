/**
 * Media OS - Event Bus Service
 * Handles real-time events within Media OS
 */

const EventEmitter = require('events');
const logger = require('../config/database');

/**
 * Event Bus - Internal event handling
 */
class EventBus extends EventEmitter {
  constructor() {
    super();
    this.handlers = new Map();
    this.eventHistory = [];
    this.maxHistorySize = 1000;

    // Set up event handlers
    this.setupHandlers();
  }

  setupHandlers() {
    // Viewer events
    this.on('viewer:created', this.logEvent.bind(this));
    this.on('viewer:updated', this.logEvent.bind(this));
    this.on('viewer:subscription:changed', this.logEvent.bind(this));
    this.on('viewer:churn:risk', this.logEvent.bind(this));

    // Content events
    this.on('content:created', this.logEvent.bind(this));
    this.on('content:published', this.logEvent.bind(this));
    this.on('content:viewed', this.logEvent.bind(this));
    this.on('content:trending', this.logEvent.bind(this));

    // Campaign events
    this.on('campaign:created', this.logEvent.bind(this));
    this.on('campaign:started', this.logEvent.bind(this));
    this.on('campaign:paused', this.logEvent.bind(this));
    this.on('campaign:completed', this.logEvent.bind(this));
    this.on('campaign:budget:exhausted', this.logEvent.bind(this));

    // Creator events
    this.on('creator:created', this.logEvent.bind(this));
    this.on('creator:branddeal:created', this.logEvent.bind(this));
    this.on('creator:payout:processed', this.logEvent.bind(this));

    // Revenue events
    this.on('revenue:subscription', this.logEvent.bind(this));
    this.on('revenue:ad', this.logEvent.bind(this));
    this.on('revenue:ppv', this.logEvent.bind(this));

    // System events
    this.on('system:health', this.logEvent.bind(this));
    this.on('system:error', this.logEvent.bind(this));
  }

  logEvent(event, data) {
    const logEntry = {
      event,
      data,
      timestamp: new Date().toISOString(),
    };

    this.eventHistory.push(logEntry);

    // Trim history if too large
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
    }

    logger.debug('Event fired', { event, data });
  }

  /**
   * Publish an event
   */
  publish(event, data) {
    this.emit(event, data);
    logger.info('Event published', { event, data: { ...data } });
  }

  /**
   * Subscribe to an event
   */
  subscribe(eventPattern, handler) {
    if (typeof eventPattern === 'string') {
      this.on(eventPattern, handler);
    } else if (eventPattern instanceof RegExp) {
      this.on('*', (eventName, ...args) => {
        if (eventPattern.test(eventName)) {
          handler(eventName, ...args);
        }
      });
    }

    const handlerId = `${eventPattern}:${Date.now()}`;
    this.handlers.set(handlerId, { eventPattern, handler });

    return handlerId;
  }

  /**
   * Unsubscribe from an event
   */
  unsubscribe(handlerId) {
    const handler = this.handlers.get(handlerId);
    if (handler) {
      if (typeof handler.eventPattern === 'string') {
        this.off(handler.eventPattern, handler.handler);
      }
      this.handlers.delete(handlerId);
      return true;
    }
    return false;
  }

  /**
   * Get event history
   */
  getHistory(eventType = null, limit = 100) {
    let history = this.eventHistory;

    if (eventType) {
      history = history.filter(e => e.event === eventType);
    }

    return history.slice(-limit);
  }

  /**
   * Get event statistics
   */
  getStats() {
    const stats = {};

    this.eventHistory.forEach(entry => {
      stats[entry.event] = (stats[entry.event] || 0) + 1;
    });

    return {
      total: this.eventHistory.length,
      byType: stats,
      handlers: this.handlers.size,
    };
  }

  /**
   * Clear event history
   */
  clearHistory() {
    this.eventHistory = [];
    logger.info('Event history cleared');
  }
}

// ============================================
// PREDEFINED EVENT TYPES
// ============================================

const EVENTS = {
  // Viewer events
  VIEWER_CREATED: 'viewer:created',
  VIEWER_UPDATED: 'viewer:updated',
  VIEWER_DELETED: 'viewer:deleted',
  VIEWER_LOGIN: 'viewer:login',
  VIEWER_LOGOUT: 'viewer:logout',
  VIEWER_SUBSCRIPTION_CHANGED: 'viewer:subscription:changed',
  VIEWER_CHURN_RISK: 'viewer:churn:risk',
  VIEWER_WATCH_STARTED: 'viewer:watch:started',
  VIEWER_WATCH_COMPLETED: 'viewer:watch:completed',

  // Content events
  CONTENT_CREATED: 'content:created',
  CONTENT_UPDATED: 'content:updated',
  CONTENT_PUBLISHED: 'content:published',
  CONTENT_REMOVED: 'content:removed',
  CONTENT_VIEWED: 'content:viewed',
  CONTENT_TRENDING: 'content:trending',
  CONTENT_LICENCE_EXPIRING: 'content:license:expiring',
  CONTENT_LICENCE_EXPIRED: 'content:license:expired',

  // Campaign events
  CAMPAIGN_CREATED: 'campaign:created',
  CAMPAIGN_APPROVED: 'campaign:approved',
  CAMPAIGN_STARTED: 'campaign:started',
  CAMPAIGN_PAUSED: 'campaign:paused',
  CAMPAIGN_RESUMED: 'campaign:resumed',
  CAMPAIGN_COMPLETED: 'campaign:completed',
  CAMPAIGN_BUDGET_EXHAUSTED: 'campaign:budget:exhausted',
  CAMPAIGN_PERFORMANCE_ALERT: 'campaign:performance:alert',

  // Creator events
  CREATOR_CREATED: 'creator:created',
  CREATOR_UPDATED: 'creator:updated',
  CREATOR_BRANDDEAL_CREATED: 'creator:branddeal:created',
  CREATOR_BRANDDEAL_COMPLETED: 'creator:branddeal:completed',
  CREATOR_PAYOUT_PROCESSED: 'creator:payout:processed',

  // Revenue events
  REVENUE_SUBSCRIPTION: 'revenue:subscription',
  REVENUE_AD: 'revenue:ad',
  REVENUE_PAY_PER_VIEW: 'revenue:ppv',
  REVENUE_REFUND: 'revenue:refund',

  // System events
  SYSTEM_HEALTH: 'system:health',
  SYSTEM_ERROR: 'system:error',
  SYSTEM_BACKUP_COMPLETE: 'system:backup:complete',
};

// Export singleton and constants
const eventBus = new EventBus();

module.exports = {
  eventBus,
  EventBus,
  EVENTS,
};
