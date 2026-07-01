/**
 * MemoryOS Integration - Phase 4
 *
 * Connect RAZO to HOJAI MemoryOS for:
 * - Persistent conversation history
 * - User preference learning
 * - Context across sessions
 * - Memory-aware recommendations
 */

const axios = require('axios');

class MemoryOSIntegration {
  constructor(logger, config = {}) {
    this.logger = logger;
    this.config = {
      memoryOSUrl: config.memoryOSUrl || process.env.MEMORY_OS_URL || 'http://localhost:4703',
      twinOSUrl: config.twinOSUrl || process.env.TWIN_OS_URL || 'http://localhost:4705',

      // Cache settings
      cacheTTL: config.cacheTTL || 5 * 60 * 1000, // 5 minutes
      maxCacheSize: config.maxCacheSize || 100,

      ...config
    };

    // In-memory cache
    this.cache = new Map();

    this.stats = {
      memoryReads: 0,
      memoryWrites: 0,
      twinReads: 0,
      cacheHits: 0,
      cacheMisses: 0,
      errors: 0
    };
  }

  /**
   * Get user context from MemoryOS
   */
  async getUserContext(userId, options = {}) {
    const cacheKey = `context_${userId}`;
    const cached = this._getFromCache(cacheKey);
    if (cached) {
      this.stats.cacheHits++;
      return cached;
    }
    this.stats.cacheMisses++;

    try {
      const response = await axios.get(`${this.config.memoryOSUrl}/api/memory/${userId}`, {
        timeout: 2000,
        params: options
      });

      this.stats.memoryReads++;
      const data = response.data;

      this._setCache(cacheKey, data);
      return data;
    } catch (error) {
      this.stats.errors++;
      this.logger.warn('Could not fetch user context from MemoryOS', { userId, error: error.message });
      return this._getDefaultContext();
    }
  }

  /**
   * Save user context to MemoryOS
   */
  async saveUserContext(userId, context, type = 'conversation') {
    try {
      const payload = {
        userId,
        type,
        data: context,
        timestamp: new Date().toISOString()
      };

      await axios.post(`${this.config.memoryOSUrl}/api/memory`, payload, {
        timeout: 2000
      });

      this.stats.memoryWrites++;

      // Invalidate cache
      this._invalidateCache(`context_${userId}`);

      return { success: true };
    } catch (error) {
      this.stats.errors++;
      this.logger.error('Failed to save user context', { userId, error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Get conversation history
   */
  async getConversationHistory(userId, options = {}) {
    const { limit = 50, offset = 0, type = 'conversation' } = options;

    try {
      const response = await axios.get(`${this.config.memoryOSUrl}/api/memory/${userId}/history`, {
        timeout: 2000,
        params: { limit, offset, type }
      });

      this.stats.memoryReads++;
      return response.data;
    } catch (error) {
      this.stats.errors++;
      this.logger.warn('Could not fetch conversation history', { userId, error: error.message });
      return [];
    }
  }

  /**
   * Get user preferences
   */
  async getUserPreferences(userId) {
    const cacheKey = `prefs_${userId}`;
    const cached = this._getFromCache(cacheKey);
    if (cached) {
      this.stats.cacheHits++;
      return cached;
    }
    this.stats.cacheMisses++;

    try {
      const response = await axios.get(`${this.config.memoryOSUrl}/api/memory/${userId}/preferences`, {
        timeout: 2000
      });

      this.stats.memoryReads++;
      const data = response.data;

      this._setCache(cacheKey, data);
      return data;
    } catch (error) {
      this.stats.errors++;
      this.logger.warn('Could not fetch user preferences', { userId, error: error.message });
      return this._getDefaultPreferences();
    }
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(userId, preferences) {
    try {
      await axios.put(`${this.config.memoryOSUrl}/api/memory/${userId}/preferences`, preferences, {
        timeout: 2000
      });

      this.stats.memoryWrites++;
      this._invalidateCache(`prefs_${userId}`);

      return { success: true };
    } catch (error) {
      this.stats.errors++;
      this.logger.error('Failed to update user preferences', { userId, error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Get customer twin data
   */
  async getCustomerTwin(userId) {
    const cacheKey = `twin_${userId}`;
    const cached = this._getFromCache(cacheKey);
    if (cached) {
      this.stats.cacheHits++;
      return cached;
    }
    this.stats.cacheMisses++;

    try {
      const response = await axios.get(`${this.config.twinOSUrl}/api/twins/customer/${userId}`, {
        timeout: 2000
      });

      this.stats.twinReads++;
      const data = response.data;

      this._setCache(cacheKey, data, 10 * 60 * 1000); // 10 min TTL for twins
      return data;
    } catch (error) {
      this.stats.errors++;
      this.logger.warn('Could not fetch customer twin', { userId, error: error.message });
      return null;
    }
  }

  /**
   * Get merchant twin data
   */
  async getMerchantTwin(merchantId) {
    const cacheKey = `merchant_${merchantId}`;
    const cached = this._getFromCache(cacheKey);
    if (cached) {
      this.stats.cacheHits++;
      return cached;
    }
    this.stats.cacheMisses++;

    try {
      const response = await axios.get(`${this.config.twinOSUrl}/api/twins/merchant/${merchantId}`, {
        timeout: 2000
      });

      this.stats.twinReads++;
      const data = response.data;

      this._setCache(cacheKey, data, 10 * 60 * 1000);
      return data;
    } catch (error) {
      this.stats.errors++;
      this.logger.warn('Could not fetch merchant twin', { merchantId, error: error.message });
      return null;
    }
  }

  /**
   * Learn from user behavior
   */
  async learnFromBehavior(userId, behavior) {
    try {
      await axios.post(`${this.config.memoryOSUrl}/api/memory/${userId}/learn`, {
        behavior,
        timestamp: new Date().toISOString()
      }, {
        timeout: 2000
      });

      this.stats.memoryWrites++;
      this._invalidateCache(`prefs_${userId}`);
      this._invalidateCache(`context_${userId}`);

      return { success: true };
    } catch (error) {
      this.stats.errors++;
      this.logger.warn('Could not learn from behavior', { userId, error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Get personalized recommendations
   */
  async getRecommendations(userId, context = {}) {
    try {
      const [preferences, history, twin] = await Promise.all([
        this.getUserPreferences(userId),
        this.getConversationHistory(userId, { limit: 20 }),
        this.getCustomerTwin(userId)
      ]);

      // Generate recommendations based on user data
      const recommendations = this._generateRecommendations(preferences, history, twin, context);

      return {
        success: true,
        recommendations,
        source: {
          preferences: !!preferences,
          history: history.length,
          twin: !!twin
        }
      };
    } catch (error) {
      this.stats.errors++;
      this.logger.error('Failed to get recommendations', { userId, error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Search memory
   */
  async searchMemory(userId, query) {
    try {
      const response = await axios.get(`${this.config.memoryOSUrl}/api/memory/${userId}/search`, {
        timeout: 3000,
        params: { q: query }
      });

      this.stats.memoryReads++;
      return response.data;
    } catch (error) {
      this.stats.errors++;
      this.logger.warn('Memory search failed', { userId, query, error: error.message });
      return { results: [] };
    }
  }

  /**
   * Get stats
   */
  getStats() {
    return {
      ...this.stats,
      cacheSize: this.cache.size,
      cacheHitRate: this.stats.cacheHits + this.stats.cacheMisses > 0
        ? Math.round((this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses)) * 100)
        : 0
    };
  }

  // ── Private Methods ──────────────────────────────────────────────────

  _getFromCache(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  _setCache(key, data, ttl = this.config.cacheTTL) {
    // Evict if cache is full
    if (this.cache.size >= this.config.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data,
      expires: Date.now() + ttl
    });
  }

  _invalidateCache(key) {
    this.cache.delete(key);
  }

  _getDefaultContext() {
    return {
      firstVisit: true,
      preferences: this._getDefaultPreferences(),
      history: []
    };
  }

  _getDefaultPreferences() {
    return {
      language: 'en',
      tone: 'friendly',
      formality: 'casual',
      notifications: true,
      darkMode: null, // Follow system
      favoriteCuisines: [],
      frequentActions: [],
      trustedContacts: []
    };
  }

  _generateRecommendations(preferences, history, twin, context) {
    const recommendations = [];

    // Based on preferences
    if (preferences?.favoriteCuisines?.length > 0) {
      recommendations.push({
        type: 'food',
        reason: 'Based on your favorites',
        items: preferences.favoriteCuisines.slice(0, 3)
      });
    }

    // Based on history
    if (history.length > 0) {
      const frequentActions = this._getFrequentActions(history);
      if (frequentActions.length > 0) {
        recommendations.push({
          type: 'action',
          reason: 'Based on your habits',
          items: frequentActions.slice(0, 3)
        });
      }
    }

    // Based on twin
    if (twin?.ltv) {
      recommendations.push({
        type: 'loyalty',
        reason: 'As a valued customer',
        items: ['Exclusive offers', 'Early access']
      });
    }

    // Context-based
    if (context?.time === 'morning') {
      recommendations.push({
        type: 'time_based',
        reason: 'Good morning!',
        items: ['Breakfast order', 'Daily briefing']
      });
    }

    return recommendations;
  }

  _getFrequentActions(history) {
    const actionCounts = {};
    history.forEach(item => {
      if (item.action) {
        actionCounts[item.action] = (actionCounts[item.action] || 0) + 1;
      }
    });

    return Object.entries(actionCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([action]) => action);
  }
}

module.exports = MemoryOSIntegration;
