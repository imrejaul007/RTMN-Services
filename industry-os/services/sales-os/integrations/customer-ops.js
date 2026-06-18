/**
 * Customer Operations Integration
 *
 * Connects Sales OS (Port 5055) to Customer Operations Twins:
 * - Customer Twin (4885) - Customer 360 profiles
 * - Lead Twin (4908) - Lead synchronization
 * - Trust Intelligence (4953) - Trust scores
 * - Journey Intelligence (4954) - Customer journey tracking
 * - AI Intelligence (4881) - AI predictions
 *
 * Version: 1.0.0
 */

const axios = require('axios');

// Service configuration
const SALES_OS = {
  name: 'Sales OS',
  port: 5055,
  baseUrl: process.env.SALES_OS_URL || 'http://localhost:5055',
  description: 'Sales management and pipeline',
};

const CUSTOMER_TWIN = {
  name: 'Customer Twin',
  port: 4885,
  baseUrl: process.env.CUSTOMER_TWIN_URL || 'http://localhost:4885',
  description: 'Customer 360 profiles and identity',
};

const LEAD_TWIN = {
  name: 'Lead Twin',
  port: 4908,
  baseUrl: process.env.LEAD_TWIN_URL || 'http://localhost:4908',
  description: 'Lead management and synchronization',
};

const TRUST_INTELLIGENCE = {
  name: 'Trust Intelligence',
  port: 4953,
  baseUrl: process.env.TRUST_INTELLIGENCE_URL || 'http://localhost:4953',
  description: 'Trust and reliability scoring',
};

const JOURNEY_INTELLIGENCE = {
  name: 'Journey Intelligence',
  port: 4954,
  baseUrl: process.env.JOURNEY_INTELLIGENCE_URL || 'http://localhost:4954',
  description: 'Customer journey tracking',
};

const AI_INTELLIGENCE = {
  name: 'AI Intelligence',
  port: 4881,
  baseUrl: process.env.AI_INTELLIGENCE_URL || 'http://localhost:4881',
  description: 'AI predictions and recommendations',
};

// Connection state
let isConnected = false;
let lastSyncTime = null;
const serviceHealth = {
  customerTwin: false,
  leadTwin: false,
  trustIntelligence: false,
  journeyIntelligence: false,
  aiIntelligence: false,
};

// HTTP clients for each service
const createClient = (service, timeout = 10000) => {
  const client = axios.create({
    baseURL: service.baseUrl,
    timeout,
    headers: {
      'Content-Type': 'application/json',
      'X-Source-Service': 'sales-os',
      'X-Integration-Type': 'customer-ops',
      'X-Integration-Version': '1.0.0',
    },
  });

  client.interceptors.request.use(
    (config) => {
      console.log(`[Customer Ops] ${config.method?.toUpperCase()} ${service.name}:${config.url}`);
      return config;
    },
    (error) => {
      console.error(`[Customer Ops] ${service.name} request error:`, error.message);
      return Promise.reject(error);
    }
  );

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response) {
        console.error(`[Customer Ops] ${service.name} API error: ${error.response.status} - ${error.response.data?.message || error.message}`);
      } else if (error.request) {
        console.error(`[Customer Ops] ${service.name} network error - service may be offline`);
      } else {
        console.error(`[Customer Ops] ${service.name} error:`, error.message);
      }
      return Promise.reject(error);
    }
  );

  return client;
};

const customerTwinClient = createClient(CUSTOMER_TWIN);
const leadTwinClient = createClient(LEAD_TWIN);
const trustIntelligenceClient = createClient(TRUST_INTELLIGENCE);
const journeyIntelligenceClient = createClient(JOURNEY_INTELLIGENCE);
const aiIntelligenceClient = createClient(AI_INTELLIGENCE);

/**
 * Connect to all Customer Operations services
 * Establishes connections and verifies service availability
 */
async function connectToCustomerOps() {
  const results = {
    success: false,
    connectedServices: [],
    failedServices: [],
    timestamp: new Date().toISOString(),
  };

  const services = [
    { name: 'customerTwin', client: customerTwinClient, config: CUSTOMER_TWIN },
    { name: 'leadTwin', client: leadTwinClient, config: LEAD_TWIN },
    { name: 'trustIntelligence', client: trustIntelligenceClient, config: TRUST_INTELLIGENCE },
    { name: 'journeyIntelligence', client: journeyIntelligenceClient, config: JOURNEY_INTELLIGENCE },
    { name: 'aiIntelligence', client: aiIntelligenceClient, config: AI_INTELLIGENCE },
  ];

  const healthChecks = await Promise.allSettled(
    services.map(async (service) => {
      try {
        const response = await service.client.get('/health', { timeout: 5000 });
        serviceHealth[service.name] = response.data?.status === 'ok' || response.status === 200;
        return { name: service.name, status: 'online', version: response.data?.version };
      } catch {
        serviceHealth[service.name] = false;
        return { name: service.name, status: 'offline' };
      }
    })
  );

  for (const result of healthChecks) {
    if (result.status === 'fulfilled' && result.value.status === 'online') {
      results.connectedServices.push(result.value);
    } else {
      results.failedServices.push(result.reason?.message || 'Health check failed');
    }
  }

  const allConnected = results.connectedServices.length === services.length;
  const partialConnected = results.connectedServices.length > 0;

  isConnected = allConnected || partialConnected;
  results.success = isConnected;
  results.connectionType = allConnected ? 'full' : partialConnected ? 'partial' : 'none';

  console.log(`[Customer Ops] Connection result: ${results.connectedServices.length}/${services.length} services online`);

  return results;
}

/**
 * Get Customer 360 view
 * Retrieves comprehensive customer profile from Customer Twin
 */
async function getCustomer360(customerId) {
  try {
    const response = await customerTwinClient.get(`/api/twins/customer/${customerId}`);

    const customerData = response.data;

    return {
      success: true,
      customerId,
      customer: {
        id: customerData.id || customerId,
        name: customerData.name,
        email: customerData.email,
        phone: customerData.phone,
        company: customerData.company,
        industry: customerData.industry,
        segment: customerData.segment,
        tier: customerData.tier,
        lifetimeValue: customerData.lifetimeValue,
        totalOrders: customerData.totalOrders,
        lastPurchase: customerData.lastPurchase,
        firstContact: customerData.firstContact,
        preferences: customerData.preferences || {},
        attributes: customerData.attributes || {},
        tags: customerData.tags || [],
      },
      relationships: customerData.relationships || [],
      interactions: customerData.interactions || [],
      transactions: customerData.transactions || [],
      syncedAt: customerData.syncedAt || new Date().toISOString(),
    };
  } catch (error) {
    console.error(`[Customer Ops] Failed to get customer 360 for ${customerId}:`, error.message);

    if (error.response?.status === 404) {
      return {
        success: false,
        customerId,
        error: 'Customer not found',
        notFound: true,
      };
    }

    return {
      success: false,
      customerId,
      error: error.message,
      serviceAvailable: serviceHealth.customerTwin,
    };
  }
}

/**
 * Sync lead to Lead Twin
 * Creates or updates lead record in the Lead Twin service
 */
async function syncLeadToTwin(lead) {
  try {
    const leadPayload = {
      leadId: lead.id || `lead-${Date.now()}`,
      firstName: lead.firstName || lead.name?.split(' ')[0] || '',
      lastName: lead.lastName || lead.name?.split(' ').slice(1).join(' ') || '',
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
      title: lead.title,
      industry: lead.industry,
      source: lead.source,
      status: lead.status || 'new',
      score: lead.score || 50,
      value: lead.value,
      ownerId: lead.ownerId,
      ownerName: lead.ownerName,
      stage: lead.stage || 'lead',
      temperature: lead.temperature || 'warm',
      converted: lead.converted || false,
      metadata: {
        originalLead: lead,
        syncedFrom: 'sales-os',
        syncedAt: new Date().toISOString(),
      },
    };

    const response = await leadTwinClient.post('/api/twins/lead', leadPayload);

    lastSyncTime = new Date().toISOString();

    return {
      success: true,
      leadId: leadPayload.leadId,
      twinLeadId: response.data.twinId,
      syncId: response.data.syncId,
      syncedAt: lastSyncTime,
      twinStatus: response.data.status,
    };
  } catch (error) {
    console.error(`[Customer Ops] Failed to sync lead:`, error.message);
    return {
      success: false,
      leadId: lead.id,
      error: error.message,
      serviceAvailable: serviceHealth.leadTwin,
    };
  }
}

/**
 * Get trust score for a customer
 * Retrieves trust/reliability score from Trust Intelligence
 */
async function getTrustScore(customerId) {
  try {
    const response = await trustIntelligenceClient.get(`/api/trust/score/${customerId}`);

    const scoreData = response.data;

    return {
      success: true,
      customerId,
      trustScore: {
        overall: scoreData.overall || scoreData.score || 0,
        breakdown: scoreData.breakdown || {
          paymentReliability: scoreData.paymentReliability,
          communicationReliability: scoreData.communicationReliability,
          contractCompliance: scoreData.contractCompliance,
          recommendationTrust: scoreData.recommendationTrust,
        },
        tier: scoreData.tier || getTrustTier(scoreData.overall || scoreData.score),
        factors: scoreData.factors || [],
        riskLevel: scoreData.riskLevel || getRiskLevel(scoreData.overall || scoreData.score),
        lastUpdated: scoreData.lastUpdated || new Date().toISOString(),
        verified: scoreData.verified || false,
        verificationDate: scoreData.verificationDate,
      },
      recommendations: scoreData.recommendations || [],
    };
  } catch (error) {
    console.error(`[Customer Ops] Failed to get trust score for ${customerId}:`, error.message);

    if (error.response?.status === 404) {
      return {
        success: false,
        customerId,
        error: 'Trust score not found',
        notFound: true,
        defaultScore: {
          overall: 50,
          tier: 'standard',
          riskLevel: 'medium',
          note: 'No trust data available, using default',
        },
      };
    }

    return {
      success: false,
      customerId,
      error: error.message,
      serviceAvailable: serviceHealth.trustIntelligence,
    };
  }
}

/**
 * Add journey touchpoint
 * Records a customer interaction in Journey Intelligence
 */
async function addJourneyTouchpoint(data) {
  try {
    const touchpointPayload = {
      touchpointId: data.touchpointId || `tp-${Date.now()}`,
      customerId: data.customerId,
      leadId: data.leadId,
      dealId: data.dealId,
      type: data.type, // 'email', 'call', 'meeting', 'demo', 'purchase', 'support'
      channel: data.channel, // 'email', 'phone', 'in_person', 'chat', 'social'
      action: data.action,
      subject: data.subject,
      description: data.description,
      outcome: data.outcome,
      duration: data.duration, // minutes
      sentiment: data.sentiment, // 'positive', 'neutral', 'negative'
      emotion: data.emotion, // 'happy', 'frustrated', 'neutral', 'excited'
      value: data.value,
      timestamp: data.timestamp || new Date().toISOString(),
      metadata: {
        syncedFrom: 'sales-os',
        syncedAt: new Date().toISOString(),
        ...data.metadata,
      },
    };

    const response = await journeyIntelligenceClient.post('/api/journey/touchpoint', touchpointPayload);

    lastSyncTime = new Date().toISOString();

    return {
      success: true,
      touchpointId: touchpointPayload.touchpointId,
      twinTouchpointId: response.data.touchpointId,
      journeyStage: response.data.journeyStage,
      nextRecommendedAction: response.data.nextAction,
      syncedAt: lastSyncTime,
    };
  } catch (error) {
    console.error(`[Customer Ops] Failed to add journey touchpoint:`, error.message);
    return {
      success: false,
      customerId: data.customerId,
      error: error.message,
      serviceAvailable: serviceHealth.journeyIntelligence,
    };
  }
}

/**
 * Get AI prediction for customer
 * Retrieves AI-computed predictions from AI Intelligence
 */
async function getAIPrediction(customerId) {
  try {
    const response = await aiIntelligenceClient.get(`/api/ai/prediction/${customerId}`);

    const predictionData = response.data;

    return {
      success: true,
      customerId,
      predictions: {
        conversionProbability: predictionData.conversionProbability || predictionData.conversionScore,
        churnRisk: predictionData.churnRisk,
        upsellPotential: predictionData.upsellPotential,
        lifetimeValue: predictionData.lifetimeValue,
        nextBestAction: predictionData.nextBestAction,
        recommendedProducts: predictionData.recommendedProducts || [],
        optimalContactTime: predictionData.optimalContactTime,
        engagementScore: predictionData.engagementScore,
        satisfactionScore: predictionData.satisfactionScore,
        npsPrediction: predictionData.npsPrediction,
        priceElasticity: predictionData.priceElasticity,
      },
      modelInfo: {
        modelVersion: predictionData.modelVersion,
        confidence: predictionData.confidence,
        lastTrained: predictionData.lastTrained,
        accuracy: predictionData.accuracy,
      },
      generatedAt: predictionData.generatedAt || new Date().toISOString(),
    };
  } catch (error) {
    console.error(`[Customer Ops] Failed to get AI prediction for ${customerId}:`, error.message);

    if (error.response?.status === 404) {
      return {
        success: false,
        customerId,
        error: 'Prediction not found',
        notFound: true,
        defaultPrediction: {
          conversionProbability: 0.5,
          churnRisk: 'unknown',
          note: 'No AI prediction available',
        },
      };
    }

    return {
      success: false,
      customerId,
      error: error.message,
      serviceAvailable: serviceHealth.aiIntelligence,
    };
  }
}

/**
 * Sync deal won to twins
 * Updates all relevant twins when a deal is closed
 */
async function syncDealWon(deal) {
  try {
    const dealPayload = {
      dealId: deal.id || `deal-${Date.now()}`,
      title: deal.title,
      value: deal.value,
      closeDate: deal.closeDate || new Date().toISOString(),
      customerId: deal.customerId,
      customerName: deal.customerName,
      contactId: deal.contactId,
      contactName: deal.contactName,
      accountId: deal.accountId,
      accountName: deal.accountName,
      ownerId: deal.ownerId,
      ownerName: deal.ownerName,
      products: deal.products || [],
      stage: 'closed_won',
      wonReason: deal.wonReason || 'success',
      notes: deal.notes,
      metadata: {
        syncedFrom: 'sales-os',
        syncedAt: new Date().toISOString(),
        winTimestamp: new Date().toISOString(),
      },
    };

    // Sync to Lead Twin
    const leadTwinResponse = await leadTwinClient.post('/api/twins/deal-won', dealPayload).catch(() => null);

    // Sync to Customer Twin
    const customerTwinResponse = await customerTwinClient.post('/api/twins/deal-won', dealPayload).catch(() => null);

    lastSyncTime = new Date().toISOString();

    return {
      success: true,
      dealId: dealPayload.dealId,
      syncedTo: {
        leadTwin: !!leadTwinResponse,
        customerTwin: !!customerTwinResponse,
      },
      syncIds: {
        leadTwin: leadTwinResponse?.data?.syncId,
        customerTwin: customerTwinResponse?.data?.syncId,
      },
      syncedAt: lastSyncTime,
      impactAnalysis: {
        newRevenue: deal.value,
        customerLifetimeValueIncrease: Math.round(deal.value * 0.3),
        relationshipStage: 'customer',
      },
    };
  } catch (error) {
    console.error(`[Customer Ops] Failed to sync deal won:`, error.message);
    return {
      success: false,
      dealId: deal.id,
      error: error.message,
    };
  }
}

/**
 * Get support history for customer
 * Retrieves historical support interactions
 */
async function getSupportHistory(customerId) {
  try {
    const response = await customerTwinClient.get(`/api/support/history/${customerId}`);

    const historyData = response.data;

    return {
      success: true,
      customerId,
      supportHistory: {
        totalTickets: historyData.totalTickets || historyData.tickets?.length || 0,
        openTickets: historyData.openTickets || 0,
        closedTickets: historyData.closedTickets || 0,
        averageResolutionTime: historyData.averageResolutionTime,
        satisfactionScore: historyData.satisfactionScore,
        tickets: historyData.tickets || [],
        commonIssues: historyData.commonIssues || [],
        lastTicketDate: historyData.lastTicketDate,
        firstTicketDate: historyData.firstTicketDate,
        escalations: historyData.escalations || 0,
      },
      riskIndicators: {
        highVolumeCustomer: (historyData.totalTickets || 0) > 10,
        recentEscalation: historyData.recentEscalation || false,
        lowSatisfaction: (historyData.satisfactionScore || 5) < 3,
        slowResolution: (historyData.averageResolutionTime || 0) > 48,
      },
      recommendations: historyData.recommendations || [],
      syncedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`[Customer Ops] Failed to get support history for ${customerId}:`, error.message);

    return {
      success: false,
      customerId,
      error: error.message,
      serviceAvailable: serviceHealth.customerTwin,
      emptyHistory: {
        totalTickets: 0,
        openTickets: 0,
        closedTickets: 0,
      },
    };
  }
}

/**
 * Get full customer intelligence
 * Combines data from all twins for complete customer view
 */
async function getFullCustomerIntelligence(customerId) {
  const [customer360, trustScore, prediction] = await Promise.allSettled([
    getCustomer360(customerId),
    getTrustScore(customerId),
    getAIPrediction(customerId),
  ]);

  return {
    success: true,
    customerId,
    retrievedAt: new Date().toISOString(),
    customer: customer360.status === 'fulfilled' ? customer360.value : null,
    trustScore: trustScore.status === 'fulfilled' ? trustScore.value : null,
    prediction: prediction.status === 'fulfilled' ? prediction.value : null,
    dataQuality: {
      customer360Available: customer360.status === 'fulfilled',
      trustScoreAvailable: trustScore.status === 'fulfilled',
      predictionAvailable: prediction.status === 'fulfilled',
    },
  };
}

// Helper functions
function getTrustTier(score) {
  if (score >= 90) return 'platinum';
  if (score >= 75) return 'gold';
  if (score >= 50) return 'silver';
  return 'bronze';
}

function getRiskLevel(score) {
  if (score >= 80) return 'low';
  if (score >= 50) return 'medium';
  return 'high';
}

/**
 * Check all service health
 */
async function checkHealth() {
  const results = {};

  for (const [name, client] of [
    ['customerTwin', customerTwinClient],
    ['leadTwin', leadTwinClient],
    ['trustIntelligence', trustIntelligenceClient],
    ['journeyIntelligence', journeyIntelligenceClient],
    ['aiIntelligence', aiIntelligenceClient],
  ]) {
    try {
      const response = await client.get('/health', { timeout: 5000 });
      results[name] = {
        healthy: response.data?.status === 'ok' || response.status === 200,
        version: response.data?.version,
      };
      serviceHealth[name] = true;
    } catch {
      results[name] = { healthy: false };
      serviceHealth[name] = false;
    }
  }

  return results;
}

/**
 * Get integration status
 */
function getIntegrationStatus() {
  return {
    connected: isConnected,
    salesOs: {
      name: SALES_OS.name,
      port: SALES_OS.port,
      baseUrl: SALES_OS.baseUrl,
    },
    services: {
      customerTwin: {
        ...CUSTOMER_TWIN,
        healthy: serviceHealth.customerTwin,
      },
      leadTwin: {
        ...LEAD_TWIN,
        healthy: serviceHealth.leadTwin,
      },
      trustIntelligence: {
        ...TRUST_INTELLIGENCE,
        healthy: serviceHealth.trustIntelligence,
      },
      journeyIntelligence: {
        ...JOURNEY_INTELLIGENCE,
        healthy: serviceHealth.journeyIntelligence,
      },
      aiIntelligence: {
        ...AI_INTELLIGENCE,
        healthy: serviceHealth.aiIntelligence,
      },
    },
    lastSyncTime,
    capabilities: [
      'customer_360',
      'lead_sync',
      'trust_scoring',
      'journey_tracking',
      'ai_predictions',
      'deal_won_sync',
      'support_history',
      'full_intelligence',
    ],
  };
}

module.exports = {
  // Core connection function
  connectToCustomerOps,

  // Customer operations functions
  getCustomer360,
  syncLeadToTwin,
  getTrustScore,
  addJourneyTouchpoint,
  getAIPrediction,
  syncDealWon,
  getSupportHistory,

  // Combined intelligence
  getFullCustomerIntelligence,

  // Utility functions
  checkHealth,
  getIntegrationStatus,

  // Direct access to service configs
  SALES_OS,
  CUSTOMER_TWIN,
  LEAD_TWIN,
  TRUST_INTELLIGENCE,
  JOURNEY_INTELLIGENCE,
  AI_INTELLIGENCE,
};
