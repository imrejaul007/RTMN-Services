/**
 * Media OS - RTMN Integration Service
 * Connects Media OS to all RTMN ecosystem services
 */

const axios = require('axios');
const config = require('../config');
const logger = require('../config/database');

/**
 * RTMN Integration Service
 * Provides unified access to all RTMN ecosystem services
 */
class RTMNService {
  constructor() {
    this.clients = {};
    this.initializeClients();
  }

  initializeClients() {
    // Initialize axios clients for each service
    Object.entries(config.RTMN_SERVICES).forEach(([name, baseURL]) => {
      this.clients[name] = axios.create({
        baseURL,
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'X-Service': 'media-os',
        },
      });

      // Add response interceptor for logging
      this.clients[name].interceptors.response.use(
        response => {
          logger.debug(`RTMN call success`, { service: name, path: response.config.url });
          return response;
        },
        error => {
          logger.error(`RTMN call failed`, {
            service: name,
            path: error.config?.url,
            error: error.message,
          });
          return Promise.reject(error);
        }
      );
    });
  }

  /**
   * Get authenticated client with JWT token
   */
  getClient(serviceName, token = null) {
    const client = this.clients[serviceName];
    if (!client) {
      throw new Error(`Unknown RTMN service: ${serviceName}`);
    }

    if (token) {
      client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    return client;
  }

  // ============================================
  // CORPID (Identity)
  // ============================================

  async verifyCorpID(corpid, token) {
    try {
      const response = await this.getClient('CORPID', token).get(`/api/verify/${corpid}`);
      return response.data;
    } catch (error) {
      logger.warn('CorpID verification failed', { corpid, error: error.message });
      return { verified: false };
    }
  }

  async getUserProfile(corpid, token) {
    try {
      const response = await this.getClient('CORPID', token).get(`/api/users/${corpid}`);
      return response.data;
    } catch (error) {
      logger.error('Failed to get CorpID profile', { corpid, error: error.message });
      throw error;
    }
  }

  // ============================================
  // HOJAI AI (Intelligence)
  // ============================================

  async predictIntent(userId, context) {
    try {
      const response = await this.getClient('HOJAI_AI').post('/api/intent/predict', {
        userId,
        context,
        source: 'media-os',
      });
      return response.data;
    } catch (error) {
      logger.error('Intent prediction failed', { userId, error: error.message });
      return { intent: 'unknown', confidence: 0 };
    }
  }

  async getRecommendations(viewerId, options = {}) {
    try {
      const response = await this.getClient('HOJAI_AI').post('/api/recommendations/personalized', {
        viewerId,
        limit: options.limit || 10,
        exclude: options.exclude || [],
        contentTypes: options.contentTypes || ['movie', 'series'],
        genres: options.genres,
      });
      return response.data;
    } catch (error) {
      logger.error('Recommendations failed', { viewerId, error: error.message });
      return { recommendations: [] };
    }
  }

  async analyzeContent(contentData) {
    try {
      const response = await this.getClient('HOJAI_AI').post('/api/content/analyze', {
        title: contentData.title,
        synopsis: contentData.synopsis,
        genres: contentData.genres,
        language: contentData.language,
      });
      return response.data;
    } catch (error) {
      logger.error('Content analysis failed', { title: contentData.title, error: error.message });
      return { sentiment: 0.5, keywords: [], similarContent: [] };
    }
  }

  async generateScript(prompt, options = {}) {
    try {
      const response = await this.getClient('HOJAI_AI').post('/api/ai/script', {
        prompt,
        type: options.type || 'script',
        length: options.length || 'medium',
        tone: options.tone || 'neutral',
      });
      return response.data;
    } catch (error) {
      logger.error('Script generation failed', { error: error.message });
      throw error;
    }
  }

  async translateContent(contentId, targetLanguage, token) {
    try {
      const response = await this.getClient('HOJAI_AI', token).post('/api/content/translate', {
        contentId,
        targetLanguage,
      });
      return response.data;
    } catch (error) {
      logger.error('Content translation failed', { contentId, targetLanguage, error: error.message });
      throw error;
    }
  }

  async generateThumbnail(contentId, options = {}) {
    try {
      const response = await this.getClient('HOJAI_AI').post('/api/content/thumbnail', {
        contentId,
        style: options.style || 'default',
        size: options.size || '1280x720',
      });
      return response.data;
    } catch (error) {
      logger.error('Thumbnail generation failed', { contentId, error: error.message });
      throw error;
    }
  }

  async moderateContent(contentId, content) {
    try {
      const response = await this.getClient('HOJAI_AI').post('/api/moderation/check', {
        contentId,
        text: content,
        type: 'content',
      });
      return response.data;
    } catch (error) {
      logger.error('Content moderation failed', { contentId, error: error.message });
      return { approved: true, confidence: 0.9 };
    }
  }

  // ============================================
  // MEMORY OS (Personalization)
  // ============================================

  async saveToMemory(userId, key, value) {
    try {
      const response = await this.getClient('MEMORY_OS').post('/api/memory/save', {
        userId,
        key,
        value,
        source: 'media-os',
      });
      return response.data;
    } catch (error) {
      logger.error('Memory save failed', { userId, key, error: error.message });
      throw error;
    }
  }

  async getMemory(userId, key) {
    try {
      const response = await this.getClient('MEMORY_OS').get(`/api/memory/${userId}/${key}`);
      return response.data;
    } catch (error) {
      logger.error('Memory fetch failed', { userId, key, error: error.message });
      return null;
    }
  }

  async getViewerPreferences(viewerId) {
    try {
      const response = await this.getClient('MEMORY_OS').get(`/api/memory/${viewerId}/preferences`);
      return response.data?.value || {};
    } catch (error) {
      logger.error('Preferences fetch failed', { viewerId, error: error.message });
      return {};
    }
  }

  async updateViewerPreferences(viewerId, preferences) {
    try {
      const response = await this.getClient('MEMORY_OS').post('/api/memory/save', {
        userId: viewerId,
        key: 'preferences',
        value: preferences,
        source: 'media-os',
      });
      return response.data;
    } catch (error) {
      logger.error('Preferences update failed', { viewerId, error: error.message });
      throw error;
    }
  }

  // ============================================
  // TWIN OS (Digital Twins)
  // ============================================

  async syncTwin(twinData) {
    try {
      const response = await this.getClient('TWIN_OS').post('/api/twins', twinData);
      return response.data;
    } catch (error) {
      logger.error('Twin sync failed', { twinId: twinData.twinId, error: error.message });
      throw error;
    }
  }

  async queryTwin(twinId) {
    try {
      const response = await this.getClient('TWIN_OS').get(`/api/twins/${twinId}`);
      return response.data;
    } catch (error) {
      logger.error('Twin query failed', { twinId, error: error.message });
      throw error;
    }
  }

  async searchTwins(query, filters = {}) {
    try {
      const response = await this.getClient('TWIN_OS').post('/api/twins/search', {
        query,
        filters,
      });
      return response.data;
    } catch (error) {
      logger.error('Twin search failed', { query, error: error.message });
      return [];
    }
  }

  // ============================================
  // EVENT BUS (Real-time Events)
  // ============================================

  async publishEvent(eventType, payload) {
    try {
      const response = await this.getClient('EVENT_BUS').post('/api/events/publish', {
        eventType: `media.${eventType}`,
        payload: {
          ...payload,
          source: 'media-os',
          timestamp: new Date().toISOString(),
        },
      });
      return response.data;
    } catch (error) {
      logger.error('Event publish failed', { eventType, error: error.message });
      throw error;
    }
  }

  async subscribeToEvents(eventPattern, handler) {
    try {
      const response = await this.getClient('EVENT_BUS').post('/api/events/subscribe', {
        pattern: `media.${eventPattern}`,
        callbackUrl: `${config.PORT}/api/events/callback`,
        source: 'media-os',
      });
      return response.data;
    } catch (error) {
      logger.error('Event subscription failed', { pattern: eventPattern, error: error.message });
      throw error;
    }
  }

  // ============================================
  // ADBAZAAR (Advertising)
  // ============================================

  async getAudienceSegments(viewerTwinId) {
    try {
      const response = await this.getClient('ADBAZAAR_INTENT').get(`/api/segments/viewer/${viewerTwinId}`);
      return response.data;
    } catch (error) {
      logger.error('Audience segments fetch failed', { viewerTwinId, error: error.message });
      return [];
    }
  }

  async getTargetedAds(targeting) {
    try {
      const response = await this.getClient('ADBAZAAR_DSP').post('/api/ads/targeted', targeting);
      return response.data;
    } catch (error) {
      logger.error('Targeted ads fetch failed', { error: error.message });
      return [];
    }
  }

  async getAdInventory(channelId, slotDetails) {
    try {
      const response = await this.getClient('ADBAZAAR_SSP').post('/api/inventory/query', {
        channelId,
        ...slotDetails,
      });
      return response.data;
    } catch (error) {
      logger.error('Ad inventory query failed', { channelId, error: error.message });
      return null;
    }
  }

  async trackConversion(conversionData) {
    try {
      const response = await this.getClient('ADBAZAAR_ATTRIBUTION').post('/api/track', conversionData);
      return response.data;
    } catch (error) {
      logger.error('Conversion tracking failed', { error: error.message });
      throw error;
    }
  }

  async optimizeYield(channelId, currentYield) {
    try {
      const response = await this.getClient('ADBAZAAR_DSP').post('/api/yield/optimize', {
        channelId,
        currentYield,
      });
      return response.data;
    } catch (error) {
      logger.error('Yield optimization failed', { channelId, error: error.message });
      return { recommendedYield: currentYield };
    }
  }

  // ============================================
  // RABTUL (Payments/Wallet)
  // ============================================

  async createPaymentIntent(amount, currency = 'INR', metadata = {}) {
    try {
      const response = await this.getClient('RABTUL_WALLET').post('/api/payments/intent', {
        amount,
        currency,
        source: 'media-os',
        metadata,
      });
      return response.data;
    } catch (error) {
      logger.error('Payment intent creation failed', { amount, error: error.message });
      throw error;
    }
  }

  async processSubscriptionPayment(viewerId, planId, paymentDetails) {
    try {
      const response = await this.getClient('RABTUL_WALLET').post('/api/payments/subscribe', {
        viewerId,
        planId,
        ...paymentDetails,
        source: 'media-os',
      });
      return response.data;
    } catch (error) {
      logger.error('Subscription payment failed', { viewerId, planId, error: error.message });
      throw error;
    }
  }

  async payoutToCreator(creatorId, amount, reason) {
    try {
      const response = await this.getClient('RABTUL_WALLET').post('/api/payouts', {
        to: creatorId,
        amount,
        reason,
        source: 'media-os',
      });
      return response.data;
    } catch (error) {
      logger.error('Creator payout failed', { creatorId, amount, error: error.message });
      throw error;
    }
  }

  async getWalletBalance(userId) {
    try {
      const response = await this.getClient('RABTUL_WALLET').get(`/api/wallet/${userId}/balance`);
      return response.data;
    } catch (error) {
      logger.error('Wallet balance fetch failed', { userId, error: error.message });
      return { balance: 0 };
    }
  }

  // ============================================
  // SUTAR OS (Autonomy)
  // ============================================

  async setGoal(goalData) {
    try {
      const response = await this.getClient('SUTAR_OS').post('/api/goals', {
        ...goalData,
        source: 'media-os',
      });
      return response.data;
    } catch (error) {
      logger.error('Goal creation failed', { error: error.message });
      throw error;
    }
  }

  async checkGoalProgress(goalId) {
    try {
      const response = await this.getClient('SUTAR_OS').get(`/api/goals/${goalId}/progress`);
      return response.data;
    } catch (error) {
      logger.error('Goal progress check failed', { goalId, error: error.message });
      return { progress: 0, status: 'unknown' };
    }
  }

  async makeAutonomousDecision(context, options = {}) {
    try {
      const response = await this.getClient('SUTAR_OS').post('/api/decide', {
        context,
        options,
        source: 'media-os',
      });
      return response.data;
    } catch (error) {
      logger.error('Autonomous decision failed', { error: error.message });
      throw error;
    }
  }

  // ============================================
  // HEALTH CHECK
  // ============================================

  async checkServiceHealth(serviceName) {
    try {
      const response = await this.getClient(serviceName).get('/health', { timeout: 3000 });
      return {
        service: serviceName,
        status: 'healthy',
        latency: response.headers['x-response-time'] || 0,
      };
    } catch (error) {
      return {
        service: serviceName,
        status: 'unhealthy',
        error: error.message,
      };
    }
  }

  async checkAllServicesHealth() {
    const results = await Promise.allSettled(
      Object.keys(this.clients).map(name => this.checkServiceHealth(name))
    );

    return results.map((result, index) => {
      const name = Object.keys(this.clients)[index];
      if (result.status === 'fulfilled') {
        return result.value;
      }
      return { service: name, status: 'error', error: result.reason?.message };
    });
  }
}

// Export singleton instance
const rtmnService = new RTMNService();

module.exports = rtmnService;
