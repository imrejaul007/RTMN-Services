/**
 * Sales Hub Integration
 *
 * Connects Sales OS (Port 5055) to Sales Hub (Port 5180) for orchestration:
 * - Lead enrichment and scoring
 * - Deal synchronization
 * - Routing decisions
 * - Next best action recommendations
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

const SALES_HUB = {
  name: 'Sales Hub',
  port: 5180,
  baseUrl: process.env.SALES_HUB_URL || 'http://localhost:5180',
  description: 'Sales orchestration and intelligence hub',
};

// Connection state
let isRegistered = false;
let lastSyncTime = null;
let hubHealthStatus = false;

// HTTP client with default config
const httpClient = axios.create({
  baseURL: SALES_HUB.baseUrl,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'X-Source-Service': 'sales-os',
    'X-Integration-Version': '1.0.0',
  },
});

// Request interceptor for logging
httpClient.interceptors.request.use(
  (config) => {
    console.log(`[Sales Hub] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('[Sales Hub] Request error:', error.message);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error(`[Sales Hub] API error: ${error.response.status} - ${error.response.data?.message || error.message}`);
    } else if (error.request) {
      console.error('[Sales Hub] Network error - Hub may be offline');
    } else {
      console.error('[Sales Hub] Error:', error.message);
    }
    return Promise.reject(error);
  }
);

/**
 * Register Sales OS with Sales Hub
 * Establishes the connection and shares service metadata
 */
async function registerWithHub() {
  try {
    const registrationData = {
      service: {
        name: SALES_OS.name,
        port: SALES_OS.port,
        baseUrl: SALES_OS.baseUrl,
        description: SALES_OS.description,
      },
      capabilities: [
        'lead_management',
        'deal_tracking',
        'pipeline_management',
        'customer_engagement',
        'sales_analytics',
      ],
      events: [
        'lead.created',
        'lead.updated',
        'lead.qualified',
        'lead.converted',
        'deal.created',
        'deal.stage_changed',
        'deal.closed_won',
        'deal.closed_lost',
      ],
      metadata: {
        version: '1.0.0',
        registeredAt: new Date().toISOString(),
        timezone: process.env.TZ || 'UTC',
      },
    };

    const response = await httpClient.post('/api/registry/register', registrationData);

    if (response.data.success) {
      isRegistered = true;
      console.log('[Sales Hub] Successfully registered with Hub');
      return {
        success: true,
        registered: true,
        hubInfo: response.data.hub,
        registrationId: response.data.registrationId,
      };
    }

    return {
      success: false,
      error: response.data.error || 'Registration failed',
    };
  } catch (error) {
    console.error('[Sales Hub] Registration failed:', error.message);
    return {
      success: false,
      registered: false,
      error: error.message,
      hubAvailable: false,
    };
  }
}

/**
 * Push lead to Hub for enrichment
 * Sends lead data to get enhanced with firmographics, contact data, etc.
 */
async function pushLeadForEnrichment(lead) {
  try {
    const enrichmentPayload = {
      leadId: lead.id || `lead-${Date.now()}`,
      firstName: lead.firstName || lead.name?.split(' ')[0] || '',
      lastName: lead.lastName || lead.name?.split(' ').slice(1).join(' ') || '',
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
      title: lead.title,
      industry: lead.industry,
      source: lead.source,
      score: lead.score || 50,
      value: lead.value,
      metadata: {
        originalLead: lead,
        pushedAt: new Date().toISOString(),
        pusherService: 'sales-os',
      },
    };

    const response = await httpClient.post('/api/enrichment/leads', enrichmentPayload);

    return {
      success: true,
      leadId: enrichmentPayload.leadId,
      enrichmentId: response.data.enrichmentId,
      status: response.data.status || 'processing',
      enrichedData: response.data.data || null,
    };
  } catch (error) {
    console.error('[Sales Hub] Lead enrichment failed:', error.message);
    return {
      success: false,
      leadId: lead.id,
      error: error.message,
    };
  }
}

/**
 * Get enriched lead score from Hub
 * Retrieves the AI-computed score after enrichment
 */
async function getEnrichedLeadScore(leadId) {
  try {
    const response = await httpClient.get(`/api/scores/lead/${leadId}`);

    const scoreData = response.data;

    return {
      success: true,
      leadId,
      score: scoreData.score,
      scoreBreakdown: scoreData.breakdown || {},
      factors: scoreData.factors || [],
      confidence: scoreData.confidence,
      recommendations: scoreData.recommendations || [],
      lastUpdated: scoreData.lastUpdated || new Date().toISOString(),
    };
  } catch (error) {
    // Fallback to local score if Hub unavailable
    if (error.response?.status === 404) {
      console.log(`[Sales Hub] No enriched score found for ${leadId}, using default`);
      return {
        success: true,
        leadId,
        score: 50,
        source: 'default',
        note: 'Hub had no score, returning default',
      };
    }

    console.error('[Sales Hub] Score retrieval failed:', error.message);
    return {
      success: false,
      leadId,
      error: error.message,
    };
  }
}

/**
 * Push deal data to Hub for sync
 * Keeps Hub updated with deal information for routing and analytics
 */
async function pushDealData(deal) {
  try {
    const dealPayload = {
      dealId: deal.id || `deal-${Date.now()}`,
      title: deal.title,
      value: deal.value,
      stage: deal.stage,
      probability: deal.probability,
      closeDate: deal.closeDate,
      accountId: deal.accountId,
      accountName: deal.accountName,
      contactId: deal.contactId,
      contactName: deal.contactName,
      ownerId: deal.ownerId,
      ownerName: deal.ownerName,
      products: deal.products || [],
      notes: deal.notes,
      source: deal.leadId ? 'lead_conversion' : 'direct',
      metadata: {
        originalDeal: deal,
        syncedAt: new Date().toISOString(),
        syncerService: 'sales-os',
      },
    };

    const response = await httpClient.post('/api/deals/sync', dealPayload);

    lastSyncTime = new Date().toISOString();

    return {
      success: true,
      dealId: dealPayload.dealId,
      syncId: response.data.syncId,
      syncedAt: lastSyncTime,
      hubDealId: response.data.hubDealId,
    };
  } catch (error) {
    console.error('[Sales Hub] Deal sync failed:', error.message);
    return {
      success: false,
      dealId: deal.id,
      error: error.message,
    };
  }
}

/**
 * Get routing decision from Hub
 * Determines which sales rep or team should handle the lead/deal
 */
async function getRoutingDecision(leadId) {
  try {
    const response = await httpClient.get(`/api/routing/decide/${leadId}`);

    const routingData = response.data;

    return {
      success: true,
      leadId,
      decision: {
        assignee: routingData.assignee,
        assigneeType: routingData.assigneeType, // 'rep', 'team', 'queue'
        priority: routingData.priority || 'normal',
        territory: routingData.territory,
        routingReason: routingData.reason,
        estimatedResponseTime: routingData.estimatedResponseTime,
      },
      alternatives: routingData.alternatives || [],
      rulesApplied: routingData.rulesApplied || [],
    };
  } catch (error) {
    console.error('[Sales Hub] Routing decision failed:', error.message);
    return {
      success: false,
      leadId,
      error: error.message,
      // Return default routing if Hub unavailable
      defaultRouting: {
        assigneeType: 'queue',
        priority: 'normal',
      },
    };
  }
}

/**
 * Get next best action for a customer
 * AI-powered recommendation for sales engagement
 */
async function getNextBestAction(customerId) {
  try {
    const response = await httpClient.get(`/api/actions/next-best/${customerId}`);

    const actionData = response.data;

    return {
      success: true,
      customerId,
      nextBestAction: {
        action: actionData.action,
        type: actionData.type, // 'call', 'email', 'meeting', 'follow_up'
        priority: actionData.priority || 'medium',
        suggestedTiming: actionData.suggestedTiming,
        script: actionData.script,
        reason: actionData.reason,
        expectedOutcome: actionData.expectedOutcome,
        confidence: actionData.confidence,
      },
      alternativeActions: actionData.alternatives || [],
      context: actionData.context || {},
      generatedAt: actionData.generatedAt || new Date().toISOString(),
    };
  } catch (error) {
    console.error('[Sales Hub] Next best action failed:', error.message);
    return {
      success: false,
      customerId,
      error: error.message,
    };
  }
}

/**
 * Check Hub connection health
 */
async function checkHubHealth() {
  try {
    const response = await httpClient.get('/health');
    hubHealthStatus = true;
    return {
      success: true,
      healthy: true,
      hubVersion: response.data.version,
      hubStatus: response.data.status,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    hubHealthStatus = false;
    return {
      success: false,
      healthy: false,
      error: error.message,
      hubAvailable: false,
    };
  }
}

/**
 * Get integration status
 */
function getIntegrationStatus() {
  return {
    isRegistered,
    hubHealth: hubHealthStatus,
    salesOs: {
      name: SALES_OS.name,
      port: SALES_OS.port,
      baseUrl: SALES_OS.baseUrl,
    },
    salesHub: {
      name: SALES_HUB.name,
      port: SALES_HUB.port,
      baseUrl: SALES_HUB.baseUrl,
    },
    lastSyncTime,
    capabilities: [
      'lead_enrichment',
      'lead_scoring',
      'deal_sync',
      'routing_decisions',
      'next_best_action',
    ],
  };
}

/**
 * Batch sync multiple leads
 */
async function batchSyncLeads(leads) {
  try {
    const response = await httpClient.post('/api/leads/batch', {
      leads: leads.map(lead => ({
        leadId: lead.id,
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        phone: lead.phone,
        company: lead.company,
        score: lead.score,
        value: lead.value,
      })),
      batchId: `batch-${Date.now()}`,
      syncedAt: new Date().toISOString(),
    });

    return {
      success: true,
      batchId: response.data.batchId,
      processed: response.data.processed,
      failed: response.data.failed || 0,
      results: response.data.results || [],
    };
  } catch (error) {
    console.error('[Sales Hub] Batch sync failed:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

module.exports = {
  // Core functions
  registerWithHub,
  pushLeadForEnrichment,
  getEnrichedLeadScore,
  pushDealData,
  getRoutingDecision,
  getNextBestAction,

  // Utility functions
  checkHubHealth,
  getIntegrationStatus,
  batchSyncLeads,

  // Direct access to service configs
  SALES_OS,
  SALES_HUB,
};
