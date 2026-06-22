/**
 * RAZO Context Engine
 * Maintains conversation context and user history
 */

const { v4: uuidv4 } = require('uuid');

class ContextEngine {
  constructor(logger) {
    this.logger = logger;
    this.sessions = new Map(); // sessionId -> session data
    this.contextCache = new Map(); // userId -> context
  }

  /**
   * Create a new session
   */
  createSession(userId, options = {}) {
    const sessionId = uuidv4();
    const session = {
      id: sessionId,
      userId,
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      context: {
        conversationHistory: [],
        currentIntent: null,
        pendingEntities: {},
        merchantContext: null,
        locationContext: null,
        timeContext: null,
        userPreferences: {}
      },
      metadata: options.metadata || {}
    };

    this.sessions.set(sessionId, session);
    this.logger.info('Session created', { sessionId, userId });

    return session;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      // Update last activity
      session.lastActivity = new Date().toISOString();
    }
    return session;
  }

  /**
   * Get or create session
   */
  getOrCreateSession(sessionId, userId, options = {}) {
    if (sessionId && this.sessions.has(sessionId)) {
      const session = this.getSession(sessionId);
      session.lastActivity = new Date().toISOString();
      return { session, created: false };
    }
    const session = this.createSession(userId, options);
    return { session, created: true };
  }

  /**
   * Update session context
   */
  updateContext(sessionId, updates) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Merge updates into context
    session.context = {
      ...session.context,
      ...updates
    };
    session.lastActivity = new Date().toISOString();

    return session;
  }

  /**
   * Add message to conversation history
   */
  addToHistory(sessionId, message, sender = 'user') {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.context.conversationHistory.push({
      id: uuidv4(),
      sender,
      text: message,
      timestamp: new Date().toISOString()
    });

    // Keep only last 50 messages
    if (session.context.conversationHistory.length > 50) {
      session.context.conversationHistory = session.context.conversationHistory.slice(-50);
    }

    session.lastActivity = new Date().toISOString();
    return session;
  }

  /**
   * Set current intent
   */
  setCurrentIntent(sessionId, intent, entities, confidence) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.context.currentIntent = {
      name: intent,
      entities,
      confidence,
      setAt: new Date().toISOString()
    };

    // Also update pending entities
    session.context.pendingEntities = {
      ...session.context.pendingEntities,
      ...entities
    };

    session.lastActivity = new Date().toISOString();
    return session;
  }

  /**
   * Update pending entities (for multi-turn forms)
   */
  updatePendingEntities(sessionId, entities) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.context.pendingEntities = {
      ...session.context.pendingEntities,
      ...entities
    };

    session.lastActivity = new Date().toISOString();
    return session;
  }

  /**
   * Get context summary for AI processing
   */
  getContextSummary(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    return {
      sessionId: session.id,
      userId: session.userId,
      currentIntent: session.context.currentIntent,
      pendingEntities: session.context.pendingEntities,
      conversationHistory: session.context.conversationHistory.slice(-10),
      merchantContext: session.context.merchantContext,
      locationContext: session.context.locationContext,
      timeContext: session.context.timeContext,
      timeSinceLastActivity: Date.now() - new Date(session.lastActivity).getTime()
    };
  }

  /**
   * Set merchant context
   */
  setMerchantContext(sessionId, merchant) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.context.merchantContext = {
      id: merchant.id,
      name: merchant.name,
      category: merchant.category,
      services: merchant.services,
      location: merchant.location,
      setAt: new Date().toISOString()
    };

    session.lastActivity = new Date().toISOString();
    return session;
  }

  /**
   * Set location context
   */
  setLocationContext(sessionId, location) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.context.locationContext = {
      type: location.type, // 'current', 'delivery', 'search'
      coordinates: location.coordinates,
      address: location.address,
      city: location.city,
      setAt: new Date().toISOString()
    };

    session.lastActivity = new Date().toISOString();
    return session;
  }

  /**
   * Clear session
   */
  endSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.endedAt = new Date().toISOString();
      this.logger.info('Session ended', { sessionId, duration: session.endedAt - session.createdAt });
      this.sessions.delete(sessionId);
    }
    return { success: true };
  }

  /**
   * Get active sessions for a user
   */
  getUserSessions(userId) {
    const sessions = [];
    for (const [id, session] of this.sessions) {
      if (session.userId === userId && !session.endedAt) {
        sessions.push({
          id: session.id,
          createdAt: session.createdAt,
          lastActivity: session.lastActivity,
          currentIntent: session.context.currentIntent?.name
        });
      }
    }
    return sessions;
  }

  /**
   * Cache user preferences
   */
  cacheUserPreferences(userId, preferences) {
    this.contextCache.set(`prefs_${userId}`, {
      ...preferences,
      cachedAt: new Date().toISOString()
    });
  }

  /**
   * Get user preferences
   */
  getUserPreferences(userId) {
    return this.contextCache.get(`prefs_${userId}`) || null;
  }

  /**
   * Merge user context from external sources (Genie, CorpID)
   */
  async mergeExternalContext(sessionId, externalContext) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Merge user preferences
    if (externalContext.preferences) {
      session.context.userPreferences = {
        ...session.context.userPreferences,
        ...externalContext.preferences
      };
    }

    // Merge location if provided
    if (externalContext.location) {
      session.context.locationContext = externalContext.location;
    }

    // Merge merchant history
    if (externalContext.recentMerchants) {
      session.context.recentMerchants = externalContext.recentMerchants;
    }

    session.lastActivity = new Date().toISOString();
    return session;
  }

  /**
   * Clean up old sessions (call periodically)
   */
  cleanupOldSessions(maxAgeMs = 24 * 60 * 60 * 1000) {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, session] of this.sessions) {
      const age = now - new Date(session.lastActivity).getTime();
      if (age > maxAgeMs) {
        this.sessions.delete(id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.info('Cleaned up old sessions', { count: cleaned });
    }

    return { cleaned };
  }

  /**
   * Get stats
   */
  getStats() {
    return {
      activeSessions: this.sessions.size,
      cachedContexts: this.contextCache.size
    };
  }
}

module.exports = ContextEngine;
