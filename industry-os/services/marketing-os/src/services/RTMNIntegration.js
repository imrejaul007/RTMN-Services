/**
 * Marketing OS - RTMN Integration Service
 * Connects to HOJAI AI, CorpID, TwinOS, MemoryOS, etc.
 */

const axios = require('axios');
const config = require('../config');
const logger = require('../config/logger');

/**
 * RTMN Integration Service
 */
class RTMNService {
  constructor() {
    this.clients = {};
    this.initClients();
  }

  initClients() {
    this.clients = {
      HOJAI_AI: this.createClient(config.SERVICES.HOJAI_AI),
      CORPID: this.createClient(config.SERVICES.CORPID),
      MEMORY_OS: this.createClient(config.SERVICES.MEMORY_OS),
      TWIN_OS: this.createClient(config.SERVICES.TWIN_OS),
      MEDIA_OS: this.createClient(config.SERVICES.MEDIA_OS),
      SALES_OS: this.createClient(config.SERVICES.SALES_OS),
      ADBAZAAR_DSP: this.createClient(config.SERVICES.ADBAZAAR_DSP),
      REZ_WALLET: this.createClient(config.SERVICES.REZ_WALLET),
    };
  }

  createClient(baseURL) {
    return axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Verify user identity via CorpID
   */
  async verifyIdentity(userId) {
    try {
      const response = await this.clients.CORPID.get(`/api/users/${userId}`);
      return { success: true, user: response.data };
    } catch (error) {
      logger.error('CorpID verification failed', { userId, error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Get customer profile from TwinOS
   */
  async getCustomerTwin(customerId) {
    try {
      const response = await this.clients.TWIN_OS.get(`/api/twins/customer/${customerId}`);
      return { success: true, twin: response.data };
    } catch (error) {
      logger.error('TwinOS fetch failed', { customerId, error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Store customer preferences in MemoryOS
   */
  async storePreferences(customerId, preferences) {
    try {
      await this.clients.MEMORY_OS.post('/api/memory', {
        entityId: customerId,
        type: 'marketing_preferences',
        data: preferences,
      });
      return { success: true };
    } catch (error) {
      logger.error('MemoryOS store failed', { customerId, error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate AI content via HOJAI AI
   */
  async generateContent(prompt, options = {}) {
    try {
      const response = await this.clients.HOJAI_AI.post('/api/ai/generate', {
        prompt,
        model: options.model || 'gpt-4',
        maxTokens: options.maxTokens || 1000,
        temperature: options.temperature || 0.7,
      });
      return { success: true, content: response.data };
    } catch (error) {
      logger.error('HOJAI content generation failed', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Request content creation from Media OS
   */
  async requestContent(campaignId, contentRequirements) {
    try {
      const response = await this.clients.MEDIA_OS.post('/api/content/request', {
        campaignId,
        requirements: contentRequirements,
      });
      return { success: true, requestId: response.data.requestId };
    } catch (error) {
      logger.error('Media OS content request failed', { campaignId, error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Sync lead to Sales OS
   */
  async syncLeadToSales(lead) {
    try {
      const response = await this.clients.SALES_OS.post('/api/leads', {
        name: lead.fullName,
        email: lead.email,
        phone: lead.phone,
        company: lead.company,
        source: lead.source?.campaign || 'marketing',
        organizationId: lead.organizationId,
        marketingData: {
          score: lead.score,
          tags: lead.tags,
          campaignId: lead.source?.campaignId,
        },
      });
      return { success: true, salesLeadId: response.data.id };
    } catch (error) {
      logger.error('Sales OS sync failed', { leadId: lead.leadId, error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Process REZ Coin transaction for loyalty
   */
  async processCoinTransaction(userId, amount, type) {
    try {
      const response = await this.clients.REZ_WALLET.post('/api/transactions', {
        userId,
        amount,
        type,
        source: 'marketing_os',
        timestamp: new Date().toISOString(),
      });
      return { success: true, transactionId: response.data.transactionId };
    } catch (error) {
      logger.error('REZ Wallet transaction failed', { userId, error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Health check all connected services
   */
  async healthCheck() {
    const results = {};

    for (const [name, client] of Object.entries(this.clients)) {
      try {
        const start = Date.now();
        await client.get('/health');
        results[name] = { status: 'healthy', latency: Date.now() - start };
      } catch (error) {
        results[name] = { status: 'unhealthy', error: error.message };
      }
    }

    return results;
  }
}

// Export singleton
const rtmnService = new RTMNService();

module.exports = rtmnService;
