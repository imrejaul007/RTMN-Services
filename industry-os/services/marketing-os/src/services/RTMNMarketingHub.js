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
      ADBAZAAR_CDP: process.env.ADBAZAAR_CDP_URL || 'http://localhost:4961',

      // Marketing Ecosystem Services (NEW - Phase 0)
      INTENT_ATTRIBUTION: process.env.INTENT_ATTRIBUTION_URL || 'http://localhost:4803',
      AB_TESTING: process.env.AB_TESTING_URL || 'http://localhost:5001',
      MARKETING_AGENT: process.env.MARKETING_AGENT_URL || 'http://localhost:4965',
      LEAD_SCORING: process.env.LEAD_SCORING_URL || 'http://localhost:5458',
      GROWTH_ENGINE: process.env.GROWTH_ENGINE_URL || 'http://localhost:3002',
      ATTRIBUTION_ENGINE: process.env.ATTRIBUTION_ENGINE_URL || 'http://localhost:3004',
      SOCIAL_ANALYTICS: process.env.SOCIAL_ANALYTICS_URL || 'http://localhost:5003',
      MARKETING_AUTOMATION: process.env.MARKETING_AUTOMATION_URL || 'http://localhost:5459',

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
  // INTENT ATTRIBUTION (Phase 0 - NEW)
  // ============================================

  /**
   * Get attribution report with multi-touch models
   * Supports: first_touch, last_touch, linear, time_decay, position_based, data_driven
   */
  async getAttributionReport(params = {}) {
    try {
      const { campaignId, startDate, endDate, model } = params;
      const response = await this.clients.INTENT_ATTRIBUTION.get('/api/attribution/report', {
        params: { campaignId, startDate, endDate, model }
      });
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError('INTENT_ATTRIBUTION', 'getAttributionReport', error);
    }
  }

  /**
   * Get attribution ROI metrics
   */
  async getAttributionROI(campaignId) {
    try {
      const response = await this.clients.INTENT_ATTRIBUTION.get('/api/attribution/roi', {
        params: { campaignId }
      });
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError('INTENT_ATTRIBUTION', 'getAttributionROI', error);
    }
  }

  /**
   * Get user journey with all touchpoints
   */
  async getUserJourney(userId) {
    try {
      const response = await this.clients.INTENT_ATTRIBUTION.get(`/api/attribution/journey/${userId}`);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError('INTENT_ATTRIBUTION', 'getUserJourney', error);
    }
  }

  /**
   * Get attribution efficiency metrics
   */
  async getAttributionEfficiency(params = {}) {
    try {
      const response = await this.clients.INTENT_ATTRIBUTION.get('/api/attribution/efficiency', {
        params
      });
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError('INTENT_ATTRIBUTION', 'getAttributionEfficiency', error);
    }
  }

  /**
   * Report a conversion for attribution tracking
   */
  async reportConversion(conversionData) {
    try {
      const response = await this.clients.INTENT_ATTRIBUTION.post('/api/attribution/convert', conversionData);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError('INTENT_ATTRIBUTION', 'reportConversion', error);
    }
  }

  // ============================================
  // A/B TESTING (Phase 0 - NEW)
  // ============================================

  /**
   * Create A/B experiment
   */
  async createExperiment(experimentData) {
    try {
      const response = await this.clients.AB_TESTING.post('/api/experiments', experimentData);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError('AB_TESTING', 'createExperiment', error);
    }
  }

  /**
   * Get A/B test results
   */
  async getABTestResults(experimentId) {
    try {
      const response = await this.clients.AB_TESTING.get(`/api/experiments/${experimentId}/results`);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError('AB_TESTING', 'getABTestResults', error);
    }
  }

  /**
   * Get variant statistics
   */
  async getVariantStats(experimentId) {
    try {
      const response = await this.clients.AB_TESTING.get(`/api/experiments/${experimentId}/stats`);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError('AB_TESTING', 'getVariantStats', error);
    }
  }

  /**
   * Check statistical significance
   */
  async getSignificance(experimentId) {
    try {
      const response = await this.clients.AB_TESTING.get(`/api/experiments/${experimentId}/significance`);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError('AB_TESTING', 'getSignificance', error);
    }
  }

  /**
   * Allocate user to variant
   */
  async allocateToVariant(experimentId, userId) {
    try {
      const response = await this.clients.AB_TESTING.post(`/api/experiments/${experimentId}/allocate`, {
        userId
      });
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError('AB_TESTING', 'allocateToVariant', error);
    }
  }

  // ============================================
  // CDP - CUSTOMER DATA PLATFORM (Phase 0 - NEW)
  // ============================================

  /**
   * Get audience insights from CDP
   */
  async getCDPAudienceInsights(audienceId) {
    try {
      const response = await this.clients.ADBAZAAR_CDP.get(`/api/audiences/${audienceId}`);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError('ADBAZAAR_CDP', 'getCDPAudienceInsights', error);
    }
  }

  /**
   * Get unified customer profile
   */
  async getCustomerProfile(identifier) {
    try {
      const response = await this.clients.ADBAZAAR_CDP.get('/api/profiles', {
        params: identifier
      });
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError('ADBAZAAR_CDP', 'getCustomerProfile', error);
    }
  }

  /**
   * Create/update customer profile
   */
  async upsertCustomerProfile(profileData) {
    try {
      const response = await this.clients.ADBAZAAR_CDP.post('/api/profiles', profileData);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError('ADBAZAAR_CDP', 'upsertCustomerProfile', error);
    }
  }

  /**
   * Get customer segments
   */
  async getCDPSegments(customerId) {
    try {
      const response = await this.clients.ADBAZAAR_CDP.get(`/api/customers/${customerId}/segments`);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError('ADBAZAAR_CDP', 'getCDPSegments', error);
    }
  }

  // ============================================
  // LEAD SCORING (Phase 0 - NEW)
  // ============================================

  /**
   * Score a lead
   */
  async scoreLead(leadData) {
    try {
      const response = await this.clients.LEAD_SCORING.post('/api/leads/score', leadData);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError('LEAD_SCORING', 'scoreLead', error);
    }
  }

  /**
   * Get lead score by ID
   */
  async getLeadScore(leadId) {
    try {
      const response = await this.clients.LEAD_SCORING.get(`/api/leads/${leadId}/score`);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError('LEAD_SCORING', 'getLeadScore', error);
    }
  }

  /**
   * Get intent level for lead
   */
  async getLeadIntent(leadId) {
    try {
      const response = await this.clients.LEAD_SCORING.get(`/api/leads/${leadId}/intent`);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError('LEAD_SCORING', 'getLeadIntent', error);
    }
  }

  /**
   * Get recommended actions for lead
   */
  async getLeadRecommendations(leadId) {
    try {
      const response = await this.clients.LEAD_SCORING.get(`/api/leads/${leadId}/recommendations`);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError('LEAD_SCORING', 'getLeadRecommendations', error);
    }
  }

  // ============================================
  // MARKETING AGENT (Phase 0 - NEW)
  // ============================================

  /**
   * Send natural language command to marketing agent
   */
  async sendAgentCommand(command) {
    try {
      const response = await this.clients.MARKETING_AGENT.post('/api/command', { command });
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError('MARKETING_AGENT', 'sendAgentCommand', error);
    }
  }

  /**
   * Chat with marketing agent
   */
  async chatWithAgent(message, context = {}) {
    try {
      const response = await this.clients.MARKETING_AGENT.post('/api/chat', { message, context });
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError('MARKETING_AGENT', 'chatWithAgent', error);
    }
  }

  /**
   * Get AI insights from marketing agent
   */
  async getAgentInsights(merchantId) {
    try {
      const response = await this.clients.MARKETING_AGENT.get(`/api/intelligence/insights/${merchantId}`);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError('MARKETING_AGENT', 'getAgentInsights', error);
    }
  }

  /**
   * Get purchase predictions
   */
  async getAgentPredictions(merchantId) {
    try {
      const response = await this.clients.MARKETING_AGENT.get(`/api/intelligence/predictions/${merchantId}`);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError('MARKETING_AGENT', 'getAgentPredictions', error);
    }
  }

  /**
   * Start marketing autopilot
   */
  async startAutopilot(merchantId) {
    try {
      const response = await this.clients.MARKETING_AGENT.post('/api/autopilot/start', { merchantId });
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError('MARKETING_AGENT', 'startAutopilot', error);
    }
  }

  /**
   * Stop marketing autopilot
   */
  async stopAutopilot(merchantId) {
    try {
      const response = await this.clients.MARKETING_AGENT.post('/api/autopilot/stop', { merchantId });
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError('MARKETING_AGENT', 'stopAutopilot', error);
    }
  }

  /**
   * Get user intent profile
   */
  async getUserIntentProfile(userId) {
    try {
      const response = await this.clients.MARKETING_AGENT.get(`/api/intelligence/user/${userId}`);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError('MARKETING_AGENT', 'getUserIntentProfile', error);
    }
  }

  // ============================================
  // GROWTH ENGINE (Phase 1 - NEW)
  // ============================================

  /**
   * Get growth metrics
   */
  async getGrowthMetrics(campaignId) {
    try {
      const response = await this.clients.GROWTH_ENGINE.get('/api/growth-campaigns', {
        params: { campaignId }
      });
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError('GROWTH_ENGINE', 'getGrowthMetrics', error);
    }
  }

  /**
   * Create referral
   */
  async createReferral(referralData) {
    try {
      const response = await this.clients.GROWTH_ENGINE.post('/api/referrals', referralData);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError('GROWTH_ENGINE', 'createReferral', error);
    }
  }

  /**
   * Get referral status
   */
  async getReferral(referralId) {
    try {
      const response = await this.clients.GROWTH_ENGINE.get(`/api/referrals/${referralId}`);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError('GROWTH_ENGINE', 'getReferral', error);
    }
  }

  /**
   * Get viral coefficients
   */
  async getViralCoefficients() {
    try {
      const response = await this.clients.GROWTH_ENGINE.get('/api/viral-metrics');
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError('GROWTH_ENGINE', 'getViralCoefficients', error);
    }
  }

  /**
   * Create referral code
   */
  async createReferralCode(codeData) {
    try {
      const response = await this.clients.GROWTH_ENGINE.post('/api/referral-codes', codeData);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError('GROWTH_ENGINE', 'createReferralCode', error);
    }
  }

  // ============================================
  // ATTRIBUTION ENGINE (Phase 1 - NEW)
  // ============================================

  /**
   * Get channel attribution
   */
  async getChannelAttribution(params = {}) {
    try {
      const response = await this.clients.ATTRIBUTION_ENGINE.get('/api/attribution/channel', {
        params
      });
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError('ATTRIBUTION_ENGINE', 'getChannelAttribution', error);
    }
  }

  /**
   * Get campaign attribution breakdown
   */
  async getCampaignAttributionBreakdown(campaignId) {
    try {
      const response = await this.clients.ATTRIBUTION_ENGINE.get(`/api/campaigns/${campaignId}/attribution`);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError('ATTRIBUTION_ENGINE', 'getCampaignAttributionBreakdown', error);
    }
  }

  /**
   * Get ROI by attribution model
   */
  async getModelROI(model) {
    try {
      const response = await this.clients.ATTRIBUTION_ENGINE.get('/api/attribution/roi-by-model', {
        params: { model }
      });
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError('ATTRIBUTION_ENGINE', 'getModelROI', error);
    }
  }

  // ============================================
  // SOCIAL ANALYTICS (Phase 1 - NEW)
  // ============================================

  /**
   * Get social analytics
   */
  async getSocialAnalytics(params = {}) {
    try {
      const response = await this.clients.SOCIAL_ANALYTICS.get('/api/analytics', {
        params
      });
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError('SOCIAL_ANALYTICS', 'getSocialAnalytics', error);
    }
  }

  /**
   * Get channel-specific analytics
   */
  async getChannelAnalytics(channel) {
    try {
      const response = await this.clients.SOCIAL_ANALYTICS.get('/api/analytics/channel', {
        params: { channel }
      });
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError('SOCIAL_ANALYTICS', 'getChannelAnalytics', error);
    }
  }

  // ============================================
  // MARKETING AUTOMATION (Phase 1 - NEW)
  // ============================================

  /**
   * Get automation rules
   */
  async getAutomationRules(organizationId) {
    try {
      const response = await this.clients.MARKETING_AUTOMATION.get('/api/rules', {
        params: { organizationId }
      });
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError('MARKETING_AUTOMATION', 'getAutomationRules', error);
    }
  }

  /**
   * Trigger automation event
   */
  async triggerAutomation(eventData) {
    try {
      const response = await this.clients.MARKETING_AUTOMATION.post('/api/events/trigger', eventData);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError('MARKETING_AUTOMATION', 'triggerAutomation', error);
    }
  }

  /**
   * Get abandoned cart data
   */
  async getAbandonedCarts(organizationId) {
    try {
      const response = await this.clients.MARKETING_AUTOMATION.get('/api/abandoned-carts', {
        params: { organizationId }
      });
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError('MARKETING_AUTOMATION', 'getAbandonedCarts', error);
    }
  }

  /**
   * Get replenishment recommendations
   */
  async getReplenishmentRecommendations(customerId) {
    try {
      const response = await this.clients.MARKETING_AUTOMATION.get('/api/replenishment', {
        params: { customerId }
      });
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError('MARKETING_AUTOMATION', 'getReplenishmentRecommendations', error);
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
