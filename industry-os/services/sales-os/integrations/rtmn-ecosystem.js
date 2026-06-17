/**
 * RTMN Ecosystem Integration Layer
 *
 * Connects Sales OS to the broader RTMN ecosystem:
 * - HOJAI AI (Genie, SUTAR OS)
 * - Memory OS (Personal AI Memory)
 * - Customer Operations OS
 * - CorpID (Universal Identity)
 * - TwinOS Hub (Digital Twins)
 * - Event Bus (Pub/Sub)
 * - REZ-Merchant (Commerce)
 * - Partner Twin
 *
 * Version: 2.0.0
 */

const axios = require('axios');

// RTMN Core Services
const RTMN_SERVICES = {
  // Foundation Layer (Ports 4500-4700)
  corpid: {
    name: 'CorpID Service',
    port: 4300,
    baseUrl: process.env.CORPID_URL || 'http://localhost:4300',
    description: 'Universal Identity & Verification',
  },
  memoryOs: {
    name: 'Memory OS',
    port: 4703,
    baseUrl: process.env.MEMORY_OS_URL || 'http://localhost:4703',
    description: 'Personal AI Memory',
  },
  goalOs: {
    name: 'Goal OS',
    port: 4242,
    baseUrl: process.env.GOAL_OS_URL || 'http://localhost:4242',
    description: 'Autonomous Goals',
  },
  decisionEngine: {
    name: 'Decision Engine',
    port: 4240,
    baseUrl: process.env.DECISION_URL || 'http://localhost:4240',
    description: 'Policy & Authorization',
  },

  // TwinOS (Ports 3011-3019)
  twinOsHub: {
    name: 'TwinOS Hub',
    port: 4705,
    baseUrl: process.env.TWIN_OS_URL || 'http://localhost:4705',
    description: 'Digital Twin Registry (35+ twins)',
  },
  agentTwin: {
    name: 'Agent Twin',
    port: 3011,
    baseUrl: process.env.AGENT_TWIN_URL || 'http://localhost:3011',
    description: 'Agent profiles & karma',
  },
  propertyTwin: {
    name: 'Property Twin',
    port: 3015,
    baseUrl: process.env.PROPERTY_TWIN_URL || 'http://localhost:3015',
    description: 'Properties & listings',
  },
  buyerTwin: {
    name: 'Buyer Twin',
    port: 3017,
    baseUrl: process.env.BUYER_TWIN_URL || 'http://localhost:3017',
    description: 'Buyer profiles',
  },
  dealTwin: {
    name: 'Deal Twin',
    port: 3018,
    baseUrl: process.env.DEAL_TWIN_URL || 'http://localhost:3018',
    description: 'Deal management',
  },
  referralTwin: {
    name: 'Referral Twin',
    port: 3016,
    baseUrl: process.env.REFERRAL_TWIN_URL || 'http://localhost:3016',
    description: 'Referrals & rewards',
  },

  // Customer Operations OS (Ports 4870-4895)
  unifiedInbox: {
    name: 'Unified Inbox',
    port: 4870,
    baseUrl: process.env.UNIFIED_INBOX_URL || 'http://localhost:4870',
    description: 'All channels unified',
  },
  customerIntelligence: {
    name: 'Customer Intelligence CDP',
    port: 4885,
    baseUrl: process.env.CUSTOMER_INTEL_URL || 'http://localhost:4885',
    description: 'Customer Twin 2.0',
  },
  ticketEngine: {
    name: 'Ticket Engine',
    port: 4872,
    baseUrl: process.env.TICKET_ENGINE_URL || 'http://localhost:4872',
    description: 'Ticket lifecycle management',
  },
  aiIntelligence: {
    name: 'AI Intelligence',
    port: 4881,
    baseUrl: process.env.AI_INTEL_URL || 'http://localhost:4881',
    description: 'Intent, Sentiment, Fraud agents',
  },
  knowledgeBase: {
    name: 'Knowledge Base',
    port: 4871,
    baseUrl: process.env.KNOWLEDGE_BASE_URL || 'http://localhost:4871',
    description: 'Articles & FAQs',
  },
  notificationService: {
    name: 'Notification Service',
    port: 4880,
    baseUrl: process.env.NOTIFICATION_URL || 'http://localhost:4880',
    description: 'Email, SMS, Push',
  },
  crmEngine: {
    name: 'CRM Engine',
    port: 4888,
    baseUrl: process.env.CRM_ENGINE_URL || 'http://localhost:4888',
    description: 'Deals, Contacts, Pipeline',
  },
  workflowEngine: {
    name: 'Workflow Engine',
    port: 4886,
    baseUrl: process.env.WORKFLOW_ENGINE_URL || 'http://localhost:4886',
    description: 'BPMN automation',
  },

  // Integration Hub (Ports 4399, 4510)
  ecosystemConnector: {
    name: 'REZ Ecosystem Connector',
    port: 4399,
    baseUrl: process.env.ECOSYSTEM_CONNECTOR_URL || 'http://localhost:4399',
    description: 'Service Registry & Discovery',
  },
  eventBus: {
    name: 'REZ Event Bus',
    port: 4510,
    baseUrl: process.env.EVENT_BUS_URL || 'http://localhost:4510',
    description: 'Pub/Sub Event Messaging',
  },
  graphqlFederation: {
    name: 'REZ GraphQL Federation',
    port: 4000,
    baseUrl: process.env.GRAPHQL_URL || 'http://localhost:4000',
    description: 'Unified GraphQL API',
  },

  // REZ Merchant (Ports 4800-4899)
  rezPos: {
    name: 'REZ POS',
    port: 4800,
    baseUrl: process.env.REZ_POS_URL || 'http://localhost:4800',
    description: 'Point of Sale',
  },
  rezOrders: {
    name: 'REZ Orders',
    port: 4801,
    baseUrl: process.env.REZ_ORDERS_URL || 'http://localhost:4801',
    description: 'Order management',
  },
  rezMenu: {
    name: 'REZ Menu',
    port: 4802,
    baseUrl: process.env.REZ_MENU_URL || 'http://localhost:4802',
    description: 'Menu management',
  },
  rezPayments: {
    name: 'REZ Payments',
    port: 4803,
    baseUrl: process.env.REZ_PAYMENTS_URL || 'http://localhost:4803',
    description: 'Payment processing',
  },
  rezLoyalty: {
    name: 'REZ Loyalty',
    port: 4804,
    baseUrl: process.env.REZ_LOYALTY_URL || 'http://localhost:4804',
    description: 'Loyalty & rewards',
  },
  rezGenie: {
    name: 'REZ Genie',
    port: 4809,
    baseUrl: process.env.REZ_GENIE_URL || 'http://localhost:4809',
    description: 'AI Assistant',
  },

  // Hotel Ecosystem (Ports 4950, 3000-3003)
  hotelEcosystemGateway: {
    name: 'Hotel Ecosystem Gateway',
    port: 4950,
    baseUrl: process.env.HOTEL_GATEWAY_URL || 'http://localhost:4950',
    description: 'Unified Hotel API Gateway',
  },
  stayOwnApi: {
    name: 'StayOwn API',
    port: 3000,
    baseUrl: process.env.STAYOWN_API_URL || 'http://localhost:3000',
    description: 'OTA Backend',
  },

  // Leverge Suite (Ports 4761-4765)
  levergeIntelligence: {
    name: 'Leverge Intelligence',
    port: 4761,
    baseUrl: process.env.LEVERGE_INTEL_URL || 'http://localhost:4761',
    description: 'Business analytics & insights',
  },
  levergeMemory: {
    name: 'Leverge Memory',
    port: 4762,
    baseUrl: process.env.LEVERGE_MEMORY_URL || 'http://localhost:4762',
    description: 'Personal AI memory',
  },
  levergeTwin: {
    name: 'Leverge Twin',
    port: 4763,
    baseUrl: process.env.LEVERGE_TWIN_URL || 'http://localhost:4763',
    description: 'Digital twin management',
  },
  levergeAgents: {
    name: 'Leverge Agents',
    port: 4764,
    baseUrl: process.env.LEVERGE_AGENTS_URL || 'http://localhost:4764',
    description: 'AI agent orchestration',
  },
  levergeCopilot: {
    name: 'Leverge Copilot',
    port: 4765,
    baseUrl: process.env.LEVERGE_COPILOT_URL || 'http://localhost:4765',
    description: 'Business AI copilot',
  },
};

// Integration patterns
const INTEGRATION_PATTERNS = {
  REST_API: 'rest',
  EVENT_BUS: 'event',
  GRAPHQL: 'graphql',
  WEBHOOK: 'webhook',
};

// RTMN Event schemas
const RTMN_EVENTS = {
  // Lead events
  'lead.created': { description: 'New lead created', source: 'sales-os' },
  'lead.qualified': { description: 'Lead qualified', source: 'sales-os' },
  'lead.converted': { description: 'Lead converted to opportunity', source: 'sales-os' },

  // Deal events
  'deal.created': { description: 'New opportunity created', source: 'sales-os' },
  'deal.stage_changed': { description: 'Deal moved to new stage', source: 'sales-os' },
  'deal.closed_won': { description: 'Deal won', source: 'sales-os' },
  'deal.closed_lost': { description: 'Deal lost', source: 'sales-os' },

  // Customer events
  'customer.onboarded': { description: 'Customer onboarding complete', source: 'sales-os' },
  'customer.health_alert': { description: 'Customer health score alert', source: 'sales-os' },
  'customer.renewal_due': { description: 'Customer renewal approaching', source: 'sales-os' },

  // Account events
  'account.created': { description: 'New account created', source: 'sales-os' },
  'account.updated': { description: 'Account updated', source: 'sales-os' },

  // Subscription events
  'subscription.created': { description: 'New subscription', source: 'sales-os' },
  'subscription.renewed': { description: 'Subscription renewed', source: 'sales-os' },
  'subscription.churned': { description: 'Subscription churned', source: 'sales-os' },

  // Partner events
  'partner.referred': { description: 'Partner referral', source: 'sales-os' },
  'partner.deal_won': { description: 'Partner deal won', source: 'sales-os' },

  // Commission events
  'commission.calculated': { description: 'Commission calculated', source: 'sales-os' },
  'commission.approved': { description: 'Commission approved', source: 'sales-os' },
  'commission.paid': { description: 'Commission paid', source: 'sales-os' },
};

// Cross-ecosystem capabilities
const CROSS_ECOSYSTEM_FEATURES = {
  customer360: {
    description: 'Unified customer view across RTMN',
    services: ['customerIntelligence', 'memoryOs', 'twinOsHub'],
    data: ['demographics', 'behavior', 'transactions', 'support', 'preferences'],
  },
  predictiveIntelligence: {
    description: 'AI-powered predictions',
    services: ['aiIntelligence', 'levergeIntelligence'],
    capabilities: ['lead_scoring', 'churn_prediction', 'next_best_action', 'forecast_assist'],
  },
  memorySync: {
    description: 'Personalized AI memory across services',
    services: ['memoryOs', 'levergeMemory'],
    layers: ['conversation', 'customer', 'agent', 'organization', 'industry'],
  },
  digitalTwins: {
    description: 'Digital twin synchronization',
    twins: ['buyerTwin', 'dealTwin', 'propertyTwin', 'agentTwin', 'referralTwin'],
    capabilities: ['real_time_sync', 'cross_reference', 'prediction'],
  },
  omnichannelEngagement: {
    description: 'Unified customer engagement',
    services: ['unifiedInbox', 'notificationService', 'knowledgeBase'],
    channels: ['email', 'sms', 'chat', 'social', 'voice'],
  },
  revenueAttribution: {
    description: 'Multi-touch revenue tracking',
    services: ['eventBus', 'crmEngine', 'levergeIntelligence'],
    attribution: ['first_touch', 'last_touch', 'linear', 'time_decay', 'position_based'],
  },
  workflowAutomation: {
    description: 'Cross-service workflow automation',
    services: ['workflowEngine', 'eventBus'],
    triggers: ['deal_stage', 'customer_health', 'renewal_date', 'commission_threshold'],
  },
  ecosystemTrust: {
    description: 'Cross-ecosystem trust & verification',
    services: ['corpId', 'decisionEngine'],
    trustFactors: ['identity', 'payment_history', 'support_history', 'contract_terms'],
  },
};

// Integration Manager class
class RTMNEcosystemIntegration {
  constructor() {
    this.services = RTMN_SERVICES;
    this.events = RTMN_EVENTS;
    this.crossEcosystem = CROSS_ECOSYSTEM_FEATURES;
    this.connections = new Map();
  }

  // Health check for all RTMN services
  async checkAllServices() {
    const results = {};

    for (const [key, service] of Object.entries(this.services)) {
      try {
        const response = await axios.get(`${service.baseUrl}/health`, { timeout: 2000 });
        results[key] = {
          status: 'connected',
          healthy: true,
          service: service.name,
          port: service.port,
          ...response.data,
        };
      } catch (error) {
        results[key] = {
          status: 'disconnected',
          healthy: false,
          service: service.name,
          port: service.port,
          error: error.message,
        };
      }
    }

    return results;
  }

  // Check single service
  async checkService(serviceKey) {
    const service = this.services[serviceKey];
    if (!service) {
      return { error: `Service ${serviceKey} not found` };
    }

    try {
      const response = await axios.get(`${service.baseUrl}/health`, { timeout: 2000 });
      return { status: 'connected', healthy: true, ...response.data };
    } catch (error) {
      return { status: 'disconnected', healthy: false, error: error.message };
    }
  }

  // Publish event to Event Bus
  async publishEvent(eventType, payload) {
    const eventSchema = this.events[eventType];
    if (!eventSchema) {
      return { error: `Unknown event type: ${eventType}` };
    }

    try {
      const response = await axios.post(
        `${this.services.eventBus.baseUrl}/api/events`,
        {
          type: eventType,
          source: 'sales-os',
          timestamp: new Date().toISOString(),
          payload,
        },
        { timeout: 5000 }
      );
      return { success: true, eventId: response.data.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Subscribe to Event Bus
  async subscribeToEvents(eventPatterns, callback) {
    try {
      const response = await axios.post(
        `${this.services.eventBus.baseUrl}/api/subscriptions`,
        {
          patterns: eventPatterns,
          callback: `sales-os:${process.env.INSTANCE_ID || 'default'}`,
        },
        { timeout: 5000 }
      );
      return { success: true, subscriptionId: response.data.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get customer 360 view
  async getCustomer360(accountId) {
    try {
      const [customerData, twinData, memoryData] = await Promise.allSettled([
        axios.get(`${this.services.customerIntelligence.baseUrl}/api/customers/${accountId}`),
        axios.get(`${this.services.twinOsHub.baseUrl}/api/twins/customer/${accountId}`),
        axios.get(`${this.services.memoryOs.baseUrl}/api/memory/customer/${accountId}`),
      ]);

      return {
        customer: customerData.status === 'fulfilled' ? customerData.value.data : null,
        twins: twinData.status === 'fulfilled' ? twinData.value.data : null,
        memory: memoryData.status === 'fulfilled' ? memoryData.value.data : null,
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  // Get AI intelligence for a deal
  async getDealIntelligence(opportunityId) {
    try {
      const [scoring, prediction, recommendation] = await Promise.allSettled([
        axios.post(
          `${this.services.aiIntelligence.baseUrl}/api/intelligence/deal/score`,
          { opportunityId },
          { timeout: 5000 }
        ),
        axios.post(
          `${this.services.aiIntelligence.baseUrl}/api/intelligence/deal/predict`,
          { opportunityId },
          { timeout: 5000 }
        ),
        axios.get(`${this.services.levergeIntelligence.baseUrl}/api/recommendations/deal/${opportunityId}`),
      ]);

      return {
        score: scoring.status === 'fulfilled' ? scoring.value.data : null,
        prediction: prediction.status === 'fulfilled' ? prediction.value.data : null,
        recommendation: recommendation.status === 'fulfilled' ? recommendation.value.data : null,
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  // Sync with Digital Twins
  async syncTwin(twinType, entityId, data) {
    try {
      const response = await axios.post(
        `${this.services.twinOsHub.baseUrl}/api/twins/${twinType}/${entityId}`,
        { data, source: 'sales-os', timestamp: new Date().toISOString() },
        { timeout: 5000 }
      );
      return { success: true, twinId: response.data.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Store in Memory OS
  async storeInMemory(memoryType, entityId, data) {
    try {
      const response = await axios.post(
        `${this.services.memoryOs.baseUrl}/api/memory/${memoryType}/${entityId}`,
        { data, source: 'sales-os', timestamp: new Date().toISOString() },
        { timeout: 5000 }
      );
      return { success: true, memoryId: response.data.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get cross-ecosystem analytics
  async getCrossEcosystemAnalytics(accountId) {
    try {
      const response = await axios.get(
        `${this.services.levergeIntelligence.baseUrl}/api/analytics/cross-ecosystem/${accountId}`,
        { timeout: 10000 }
      );
      return response.data;
    } catch (error) {
      return { error: error.message };
    }
  }

  // Get all services registry
  getServicesRegistry() {
    return Object.entries(this.services).map(([key, service]) => ({
      key,
      name: service.name,
      port: service.port,
      description: service.description,
      baseUrl: service.baseUrl,
    }));
  }

  // Get all events schema
  getEventsSchema() {
    return Object.entries(this.events).map(([type, schema]) => ({
      type,
      ...schema,
    }));
  }

  // Get cross-ecosystem features
  getCrossEcosystemFeatures() {
    return this.crossEcosystem;
  }
}

const rtmntEcosystemIntegration = new RTMNEcosystemIntegration();

module.exports = {
  RTMNEcosystemIntegration,
  rtmntEcosystemIntegration,
  RTMN_SERVICES,
  RTMN_EVENTS,
  INTEGRATION_PATTERNS,
  CROSS_ECOSYSTEM_FEATURES,
};
