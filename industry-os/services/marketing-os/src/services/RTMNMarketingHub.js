/**
 * RTMN Marketing Hub - Complete Integration Service
 * Connects Marketing OS to all RTMN ecosystem services
 */

const axios = require('axios');
const logger = require('../config/logger');

class RTMNMarketingHub {
  constructor() {
    this.baseUrls = {
      // Foundation Services
      CORPID: process.env.CORPID_URL || 'http://localhost:4702',
      MEMORY_OS: process.env.MEMORY_OS_URL || 'http://localhost:4703',
      TWIN_OS: process.env.TWIN_OS_URL || 'http://localhost:4705',

      // HOJAI AI Suite
      LEVERAGE_INTELLIGENCE: process.env.LEVERAGE_INTELLIGENCE_URL || 'http://localhost:4761',
      LEVERAGE_MEMORY: process.env.LEVERAGE_MEMORY_URL || 'http://localhost:4762',
      LEVERAGE_TWIN: process.env.LEVERAGE_TWIN_URL || 'http://localhost:4763',
      LEVERAGE_AGENTS: process.env.LEVERAGE_AGENTS_URL || 'http://localhost:4764',
      LEVERAGE_COPILOT: process.env.LEVERAGE_COPILOT_URL || 'http://localhost:4765',

      // REZ Services
      REZ_ECOSYSTEM: process.env.REZ_ECOSYSTEM_URL || 'http://localhost:4399',
      REZ_DSP: process.env.REZ_DSP_URL || 'http://localhost:4990',
      REZ_CRM: process.env.REZ_CRM_URL || 'http://localhost:4056',
      REZ_CARE: process.env.REZ_CARE_URL || 'http://localhost:4055',
      REZ_AUTH: process.env.REZ_AUTH_URL || 'http://localhost:4002',
      REZ_WALLET: process.env.REZ_WALLET_URL || 'http://localhost:4004',

      // Industry OS
      MEDIA_OS: process.env.MEDIA_OS_URL || 'http://localhost:5600',
      SALES_OS: process.env.SALES_OS_URL || 'http://localhost:5055',
      HOTEL_OS: process.env.HOTEL_OS_URL || 'http://localhost:5025',
      RESTAURANT_OS: process.env.RESTAURANT_OS_URL || 'http://localhost:5010',

      // AdBazaar Services
      ADBAZAAR_DSP: process.env.ADBAZAAR_DSP_URL || 'http://localhost:4990',
      ADBAZAAR_AUDIENCE: process.env.ADBAZAAR_AUDIENCE_URL || 'http://localhost:4805',
      ADBAZAAR_ATTRIBUTION: process.env.ADBAZAAR_ATTRIBUTION_URL || 'http://localhost:4803',
      ADBAZAAR_CDP: process.env.ADBAZAAR_CDP_URL || 'http://localhost:4901',

      // Z Events
      Z_EVENTS: process.env.Z_EVENTS_URL || 'http://localhost:5040',

      // BuzzLocal
      BUZZ_LOCAL: process.env.BUZZ_LOCAL_URL || 'http://localhost:4300',
    };

    this.clients = {};
    this.initClients();
  }

  initClients() {
    for (const [name, url] of Object.entries(this.baseUrls)) {
      this.clients[name] = axios.create({
        baseURL: url,
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    logger.info('RTMN Marketing Hub initialized', { services: Object.keys(this.clients).length });
  }

  // ============================================
  // IDENTITY & AUTH
  // ============================================

  async verifyUser(userId) {
    try {
      const response = await this.clients.CORPID.get(`/api/users/${userId}`);
      return { success: true, user: response.data };
    } catch (error) {
      return this.handleError('CORPID', 'verifyUser', error);
    }
  }

  async authenticateUser(email, password) {
    try {
      const response = await this.clients.REZ_AUTH.post('/auth/login', { email, password });
      return { success: true, token: response.data.token, user: response.data.user };
    } catch (error) {
      return this.handleError('REZ_AUTH', 'authenticateUser', error);
    }
  }

  async createUser(userData) {
    try {
      const response = await this.clients.CORPID.post('/api/users', userData);
      return { success: true, user: response.data };
    } catch (error) {
      return this.handleError('CORPID', 'createUser', error);
    }
  }

  // ============================================
  // MEMORY & PREFERENCES
  // ============================================

  async storePreference(entityId, type, data) {
    try {
      const response = await this.clients.MEMORY_OS.post('/api/memory', {
        entityId,
        type,
        data,
        timestamp: new Date().toISOString(),
      });
      return { success: true, memoryId: response.data.id };
    } catch (error) {
      return this.handleError('MEMORY_OS', 'storePreference', error);
    }
  }

  async getPreferences(entityId) {
    try {
      const response = await this.clients.MEMORY_OS.get(`/api/memory/${entityId}`);
      return { success: true, preferences: response.data };
    } catch (error) {
      return this.handleError('MEMORY_OS', 'getPreferences', error);
    }
  }

  // ============================================
  // DIGITAL TWINS
  // ============================================

  async getCustomerTwin(customerId) {
    try {
      const response = await this.clients.TWIN_OS.get(`/api/twins/customer/${customerId}`);
      return { success: true, twin: response.data };
    } catch (error) {
      return this.handleError('TWIN_OS', 'getCustomerTwin', error);
    }
  }

  async getLeadTwin(leadId) {
    try {
      const response = await this.clients.TWIN_OS.get(`/api/twins/lead/${leadId}`);
      return { success: true, twin: response.data };
    } catch (error) {
      return this.handleError('TWIN_OS', 'getLeadTwin', error);
    }
  }

  async updateTwin(twinId, data) {
    try {
      const response = await this.clients.TWIN_OS.patch(`/api/twins/${twinId}`, data);
      return { success: true, twin: response.data };
    } catch (error) {
      return this.handleError('TWIN_OS', 'updateTwin', error);
    }
  }

  async createTwin(type, data) {
    try {
      const response = await this.clients.TWIN_OS.post('/api/twins', { type, ...data });
      return { success: true, twin: response.data };
    } catch (error) {
      return this.handleError('TWIN_OS', 'createTwin', error);
    }
  }

  // ============================================
  // MEDIA OS INTEGRATION
  // ============================================

  async requestContent(campaignId, requirements) {
    try {
      const response = await this.clients.MEDIA_OS.post('/api/content/request', {
        campaignId,
        requirements,
      });
      return { success: true, requestId: response.data.requestId };
    } catch (error) {
      return this.handleError('MEDIA_OS', 'requestContent', error);
    }
  }

  async getMediaContent(contentId) {
    try {
      const response = await this.clients.MEDIA_OS.get(`/api/content/${contentId}`);
      return { success: true, content: response.data };
    } catch (error) {
      return this.handleError('MEDIA_OS', 'getMediaContent', error);
    }
  }

  async getMediaChannels() {
    try {
      const response = await this.clients.MEDIA_OS.get('/api/channels');
      return { success: true, channels: response.data.channels };
    } catch (error) {
      return this.handleError('MEDIA_OS', 'getMediaChannels', error);
    }
  }

  async createSocialPost(contentId, socialChannels) {
    try {
      const response = await this.clients.MEDIA_OS.post('/api/social/publish', {
        contentId,
        channels: socialChannels,
      });
      return { success: true, posts: response.data };
    } catch (error) {
      return this.handleError('MEDIA_OS', 'createSocialPost', error);
    }
  }

  // ============================================
  // SALES OS INTEGRATION
  // ============================================

  async syncLeadToSales(lead) {
    try {
      const response = await this.clients.SALES_OS.post('/api/leads', {
        name: lead.fullName || `${lead.firstName} ${lead.lastName}`,
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
      return this.handleError('SALES_OS', 'syncLeadToSales', error);
    }
  }

  async getSalesPipeline(organizationId) {
    try {
      const response = await this.clients.SALES_OS.get(`/api/pipeline/${organizationId}`);
      return { success: true, pipeline: response.data };
    } catch (error) {
      return this.handleError('SALES_OS', 'getSalesPipeline', error);
    }
  }

  async getSalesAnalytics(organizationId) {
    try {
      const response = await this.clients.SALES_OS.get(`/api/analytics/${organizationId}`);
      return { success: true, analytics: response.data };
    } catch (error) {
      return this.handleError('SALES_OS', 'getSalesAnalytics', error);
    }
  }

  // ============================================
  // REZ CRM INTEGRATION
  // ============================================

  async getCRMContacts(filters = {}) {
    try {
      const response = await this.clients.REZ_CRM.get('/api/contacts', { params: filters });
      return { success: true, contacts: response.data.contacts };
    } catch (error) {
      return this.handleError('REZ_CRM', 'getCRMContacts', error);
    }
  }

  async createCRMContact(contact) {
    try {
      const response = await this.clients.REZ_CRM.post('/api/contacts', contact);
      return { success: true, contact: response.data };
    } catch (error) {
      return this.handleError('REZ_CRM', 'createCRMContact', error);
    }
  }

  async updateCRMContact(contactId, data) {
    try {
      const response = await this.clients.REZ_CRM.patch(`/api/contacts/${contactId}`, data);
      return { success: true, contact: response.data };
    } catch (error) {
      return this.handleError('REZ_CRM', 'updateCRMContact', error);
    }
  }

  // ============================================
  // REZ CARE / SUPPORT INTEGRATION
  // ============================================

  async createSupportTicket(ticket) {
    try {
      const response = await this.clients.REZ_CARE.post('/api/tickets', ticket);
      return { success: true, ticketId: response.data.id };
    } catch (error) {
      return this.handleError('REZ_CARE', 'createSupportTicket', error);
    }
  }

  async getCustomerJourney(customerId) {
    try {
      const response = await this.clients.REZ_CARE.get(`/api/journey/${customerId}`);
      return { success: true, journey: response.data };
    } catch (error) {
      return this.handleError('REZ_CARE', 'getCustomerJourney', error);
    }
  }

  // ============================================
  // WALLET & REWARDS
  // ============================================

  async processCoinReward(userId, amount, reason) {
    try {
      const response = await this.clients.REZ_WALLET.post('/api/transactions', {
        userId,
        amount,
        type: 'reward',
        reason,
        source: 'marketing_os',
        timestamp: new Date().toISOString(),
      });
      return { success: true, transactionId: response.data.transactionId };
    } catch (error) {
      return this.handleError('REZ_WALLET', 'processCoinReward', error);
    }
  }

  async getWalletBalance(userId) {
    try {
      const response = await this.clients.REZ_WALLET.get(`/api/wallet/${userId}`);
      return { success: true, balance: response.data.balance };
    } catch (error) {
      return this.handleError('REZ_WALLET', 'getWalletBalance', error);
    }
  }

  async processReferralReward(referrerId, refereeId, campaignId) {
    try {
      const response = await this.clients.REZ_WALLET.post('/api/referral', {
        referrerId,
        refereeId,
        campaignId,
      });
      return { success: true, rewards: response.data };
    } catch (error) {
      return this.handleError('REZ_WALLET', 'processReferralReward', error);
    }
  }

  // ============================================
  // ADBAZAAR DSP INTEGRATION
  // ============================================

  async createAdCampaign(campaign) {
    try {
      const response = await this.clients.ADBAZAAR_DSP.post('/api/campaigns', {
        name: campaign.name,
        type: campaign.type,
        budget: campaign.budget?.total || campaign.budget,
        currency: campaign.budget?.currency || 'INR',
        startDate: campaign.startDate,
        endDate: campaign.endDate,
        targeting: campaign.targeting,
      });
      return { success: true, adCampaignId: response.data.campaignId };
    } catch (error) {
      return this.handleError('ADBAZAAR_DSP', 'createAdCampaign', error);
    }
  }

  async getAdCampaignPerformance(campaignId) {
    try {
      const response = await this.clients.ADBAZAAR_DSP.get(`/api/campaigns/${campaignId}/performance`);
      return { success: true, performance: response.data };
    } catch (error) {
      return this.handleError('ADBAZAAR_DSP', 'getAdCampaignPerformance', error);
    }
  }

  async getAudienceSegments(organizationId) {
    try {
      const response = await this.clients.ADBAZAAR_AUDIENCE.get('/api/segments', {
        params: { orgId: organizationId },
      });
      return { success: true, segments: response.data.segments };
    } catch (error) {
      return this.handleError('ADBAZAAR_AUDIENCE', 'getAudienceSegments', error);
    }
  }

  async createCustomAudience(audience) {
    try {
      const response = await this.clients.ADBAZAAR_AUDIENCE.post('/api/segments', audience);
      return { success: true, segmentId: response.data.segmentId };
    } catch (error) {
      return this.handleError('ADBAZAAR_AUDIENCE', 'createCustomAudience', error);
    }
  }

  async getAttributionData(campaignId, model = 'last_touch') {
    try {
      const response = await this.clients.ADBAZAAR_ATTRIBUTION.get(`/api/attribution/${campaignId}`, {
        params: { model },
      });
      return { success: true, attribution: response.data };
    } catch (error) {
      return this.handleError('ADBAZAAR_ATTRIBUTION', 'getAttributionData', error);
    }
  }

  async getIntentSignals(customerId) {
    try {
      const response = await this.clients.ADBAZAAR_AUDIENCE.get(`/api/intent/${customerId}`);
      return { success: true, signals: response.data.signals };
    } catch (error) {
      return this.handleError('ADBAZAAR_AUDIENCE', 'getIntentSignals', error);
    }
  }

  async optimizeCampaign(campaignId) {
    try {
      const response = await this.clients.ADBAZAAR_DSP.post(`/api/campaigns/${campaignId}/optimize`);
      return { success: true, recommendations: response.data };
    } catch (error) {
      return this.handleError('ADBAZAAR_DSP', 'optimizeCampaign', error);
    }
  }

  // ============================================
  // HOJAI AI INTEGRATION
  // ============================================

  async generateContent(prompt, options = {}) {
    try {
      const response = await this.clients.LEVERAGE_INTELLIGENCE.post('/api/ai/generate', {
        prompt,
        model: options.model || 'gpt-4',
        maxTokens: options.maxTokens || 1000,
        temperature: options.temperature || 0.7,
      });
      return { success: true, content: response.data.content };
    } catch (error) {
      return this.handleError('LEVERAGE_INTELLIGENCE', 'generateContent', error);
    }
  }

  async analyzeSentiment(text) {
    try {
      const response = await this.clients.LEVERAGE_INTELLIGENCE.post('/api/ai/sentiment', { text });
      return { success: true, sentiment: response.data };
    } catch (error) {
      return this.handleError('LEVERAGE_INTELLIGENCE', 'analyzeSentiment', error);
    }
  }

  async generateCampaignBrief(topic, goals) {
    try {
      const response = await this.clients.LEVERAGE_COPILOT.post('/api/campaign/brief', {
        topic,
        goals,
      });
      return { success: true, brief: response.data };
    } catch (error) {
      return this.handleError('LEVERAGE_COPILOT', 'generateCampaignBrief', error);
    }
  }

  async getMarketingInsights(data) {
    try {
      const response = await this.clients.LEVERAGE_INTELLIGENCE.post('/api/ai/insights', data);
      return { success: true, insights: response.data };
    } catch (error) {
      return this.handleError('LEVERAGE_INTELLIGENCE', 'getMarketingInsights', error);
    }
  }

  // ============================================
  // Z EVENTS INTEGRATION
  // ============================================

  async getEvents(filters = {}) {
    try {
      const response = await this.clients.Z_EVENTS.get('/api/events', { params: filters });
      return { success: true, events: response.data.events };
    } catch (error) {
      return this.handleError('Z_EVENTS', 'getEvents', error);
    }
  }

  async createEventCampaign(eventData) {
    try {
      const response = await this.clients.Z_EVENTS.post('/api/campaigns', eventData);
      return { success: true, eventCampaignId: response.data.id };
    } catch (error) {
      return this.handleError('Z_EVENTS', 'createEventCampaign', error);
    }
  }

  async getEventLeads(eventId) {
    try {
      const response = await this.clients.Z_EVENTS.get(`/api/events/${eventId}/leads`);
      return { success: true, leads: response.data.leads };
    } catch (error) {
      return this.handleError('Z_EVENTS', 'getEventLeads', error);
    }
  }

  // ============================================
  // BUZZLOCAL INTEGRATION
  // ============================================

  async getLocalCampaigns(location) {
    try {
      const response = await this.clients.BUZZ_LOCAL.get('/api/campaigns/local', {
        params: { location },
      });
      return { success: true, campaigns: response.data };
    } catch (error) {
      return this.handleError('BUZZ_LOCAL', 'getLocalCampaigns', error);
    }
  }

  async createLocalCampaign(campaign) {
    try {
      const response = await this.clients.BUZZ_LOCAL.post('/api/campaigns', campaign);
      return { success: true, localCampaignId: response.data.id };
    } catch (error) {
      return this.handleError('BUZZ_LOCAL', 'createLocalCampaign', error);
    }
  }

  // ============================================
  // INDUSTRY OS INTEGRATION
  // ============================================

  async getHotelOffers(organizationId) {
    try {
      const response = await this.clients.HOTEL_OS.get(`/api/offers`, {
        params: { organizationId },
      });
      return { success: true, offers: response.data };
    } catch (error) {
      return this.handleError('HOTEL_OS', 'getHotelOffers', error);
    }
  }

  async getRestaurantDeals(organizationId) {
    try {
      const response = await this.clients.RESTAURANT_OS.get(`/api/deals`, {
        params: { organizationId },
      });
      return { success: true, deals: response.data };
    } catch (error) {
      return this.handleError('RESTAURANT_OS', 'getRestaurantDeals', error);
    }
  }

  // ============================================
  // HEALTH CHECK
  // ============================================

  async healthCheck() {
    const results = {};
    const healthy = [];
    const unhealthy = [];

    for (const [name, client] of Object.entries(this.clients)) {
      try {
        const start = Date.now();
        await client.get('/health', { timeout: 3000 });
        results[name] = { status: 'healthy', latency: Date.now() - start };
        healthy.push(name);
      } catch (error) {
        results[name] = { status: 'unhealthy', error: error.code || 'timeout' };
        unhealthy.push(name);
      }
    }

    logger.info('RTMN Marketing Hub health check', { healthy: healthy.length, unhealthy: unhealthy.length });

    return {
      healthy: healthy.length,
      unhealthy: unhealthy.length,
      total: Object.keys(results).length,
      services: results,
    };
  }

  // ============================================
  // UTILITY
  // ============================================

  handleError(service, method, error) {
    logger.error(`RTMN Marketing Hub error`, { service, method, error: error.message });
    return {
      success: false,
      error: error.message,
      service,
      method,
    };
  }

  async ping(service) {
    if (!this.clients[service]) {
      return { success: false, error: 'Service not found' };
    }
    try {
      await this.clients[service].get('/health', { timeout: 3000 });
      return { success: true, service };
    } catch (error) {
      return { success: false, service, error: error.message };
    }
  }
}

// Export singleton
const hub = new RTMNMarketingHub();
module.exports = hub;
