/**
 * SiteOS Gateway - Service Clients
 * Client libraries for each upstream RTMN service
 */

const axios = require('axios');
const {
  HOJAI_API_KEY,
  MEMORY_OS_URL,
  CUSTOMER_TWIN_URL,
  ORDER_TWIN_URL,
  WALLET_TWIN_URL,
  AGENT_OS_URL,
  AGENT_EXECUTION_URL,
  CAPABILITY_STORE_URL,
  SALES_OS_URL,
  MARKETING_OS_URL,
  CUSTOMER_SUCCESS_OS_URL,
  CXO_OS_URL,
  FLOW_OS_URL,
  FLOW_CANONICAL_URL,
  GENIE_URL,
  GENIE_BRIEFING_URL,
  GENIE_SEARCH_URL,
  VOICE_GATEWAY_URL,
  ANALYTICS_URL,
  NEXHA_DISCOVERY_URL,
  NEXHA_REPUTATION_URL,
  WIDGET_BACKEND_URL,
  TIMEOUT
} = require('./config');

// Default headers for all requests
const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${HOJAI_API_KEY}`,
  'X-SiteOS-Gateway': 'true',
  'X-Gateway-Version': '1.0.0'
});

// Create axios instance with default config
const createClient = (baseURL, timeout = TIMEOUT.DEFAULT) => {
  return axios.create({
    baseURL,
    timeout,
    headers: getHeaders()
  });
};

// ============================================
// Health Check Utility
// ============================================

async function checkServiceHealth(serviceUrl) {
  try {
    const client = createClient(serviceUrl, 5000);
    const response = await client.get('/health');
    return { healthy: true, response: response.data };
  } catch (err) {
    return { healthy: false, error: err.message };
  }
}

// ============================================
// MemoryOS Client (4703)
// ============================================

async function queryMemory(visitorId, query) {
  const client = createClient(MEMORY_OS_URL, TIMEOUT.MEMORY);
  const res = await client.get(`/api/memory/${visitorId}/query`, {
    params: { q: query }
  });
  return res.data;
}

async function storeMemory(visitorId, memoryData) {
  const client = createClient(MEMORY_OS_URL, TIMEOUT.MEMORY);
  const res = await client.post(`/api/memory/${visitorId}`, memoryData);
  return res.data;
}

async function getMemoryContext(visitorId, options = {}) {
  const client = createClient(MEMORY_OS_URL, TIMEOUT.MEMORY);
  const res = await client.get(`/api/memory/${visitorId}/context`, {
    params: {
      limit: options.limit || 10,
      recencyWeight: options.recencyWeight || 0.5,
      relevanceWeight: options.relevanceWeight || 0.5
    }
  });
  return res.data;
}

async function forgetMemory(visitorId, memoryId) {
  const client = createClient(MEMORY_OS_URL, TIMEOUT.MEMORY);
  const res = await client.delete(`/api/memory/${visitorId}/${memoryId}`);
  return res.data;
}

// ============================================
// TwinOS Clients
// ============================================

async function getCustomerTwin(customerId) {
  const client = createClient(CUSTOMER_TWIN_URL, TIMEOUT.TWIN);
  const res = await client.get(`/api/twin/${customerId}`);
  return res.data;
}

async function getCustomerTwinLTV(customerId) {
  const client = createClient(CUSTOMER_TWIN_URL, TIMEOUT.TWIN);
  const res = await client.get(`/api/twin/${customerId}/ltv`);
  return res.data;
}

async function getCustomerTwinChurn(customerId) {
  const client = createClient(CUSTOMER_TWIN_URL, TIMEOUT.TWIN);
  const res = await client.get(`/api/twin/${customerId}/churn`);
  return res.data;
}

async function getOrderTwin(orderId) {
  const client = createClient(ORDER_TWIN_URL, TIMEOUT.TWIN);
  const res = await client.get(`/api/twin/${orderId}`);
  return res.data;
}

async function getOrderShipment(orderId) {
  const client = createClient(ORDER_TWIN_URL, TIMEOUT.TWIN);
  const res = await client.get(`/api/twin/${orderId}/shipment`);
  return res.data;
}

async function getWalletTwin(walletId) {
  const client = createClient(WALLET_TWIN_URL, TIMEOUT.TWIN);
  const res = await client.get(`/api/twin/${walletId}`);
  return res.data;
}

async function getWalletTransactions(walletId, options = {}) {
  const client = createClient(WALLET_TWIN_URL, TIMEOUT.TWIN);
  const res = await client.get(`/api/twin/${walletId}/transactions`, {
    params: {
      limit: options.limit || 50,
      offset: options.offset || 0,
      type: options.type
    }
  });
  return res.data;
}

// ============================================
// AgentOS Clients (4802)
// ============================================

async function queryAgent(question, context = {}) {
  const client = createClient(AGENT_OS_URL, TIMEOUT.AGENT);
  const res = await client.post('/api/agent/execute', {
    prompt: question,
    context,
    maxTokens: 500
  });
  return res.data;
}

async function getAgentCapabilities() {
  const client = createClient(CAPABILITY_STORE_URL, TIMEOUT.DEFAULT);
  const res = await client.get('/api/capabilities');
  return res.data;
}

async function getAgentCapability(capabilityId) {
  const client = createClient(CAPABILITY_STORE_URL, TIMEOUT.DEFAULT);
  const res = await client.get(`/api/capabilities/${capabilityId}`);
  return res.data;
}

async function searchAgentCapabilities(query) {
  const client = createClient(CAPABILITY_STORE_URL, TIMEOUT.DEFAULT);
  const res = await client.get('/api/capabilities/search', {
    params: { q: query }
  });
  return res.data;
}

async function executeAgentTask(task, inputs = {}) {
  const client = createClient(AGENT_EXECUTION_URL, TIMEOUT.AGENT);
  const res = await client.post('/api/execute', {
    task,
    inputs
  });
  return res.data;
}

// ============================================
// Sales OS Client (5055)
// ============================================

async function getLead(leadId) {
  const client = createClient(SALES_OS_URL, TIMEOUT.DEFAULT);
  const res = await client.get(`/api/sales/lead/${leadId}`);
  return res.data;
}

async function scoreLead(leadData) {
  const client = createClient(SALES_OS_URL, TIMEOUT.DEFAULT);
  const res = await client.post('/api/sales/lead/score', leadData);
  return res.data;
}

async function getLeadActivities(leadId) {
  const client = createClient(SALES_OS_URL, TIMEOUT.DEFAULT);
  const res = await client.get(`/api/sales/lead/${leadId}/activities`);
  return res.data;
}

async function createLead(leadData) {
  const client = createClient(SALES_OS_URL, TIMEOUT.DEFAULT);
  const res = await client.post('/api/sales/lead', leadData);
  return res.data;
}

async function updateLead(leadId, leadData) {
  const client = createClient(SALES_OS_URL, TIMEOUT.DEFAULT);
  const res = await client.put(`/api/sales/lead/${leadId}`, leadData);
  return res.data;
}

async function getDeals(filters = {}) {
  const client = createClient(SALES_OS_URL, TIMEOUT.DEFAULT);
  const res = await client.get('/api/sales/deals', { params: filters });
  return res.data;
}

// ============================================
// Marketing OS Client (5500)
// ============================================

async function createCampaign(campaignData) {
  const client = createClient(MARKETING_OS_URL, TIMEOUT.DEFAULT);
  const res = await client.post('/api/marketing/campaigns', campaignData);
  return res.data;
}

async function getCampaigns(filters = {}) {
  const client = createClient(MARKETING_OS_URL, TIMEOUT.DEFAULT);
  const res = await client.get('/api/marketing/campaigns', { params: filters });
  return res.data;
}

async function getCampaign(campaignId) {
  const client = createClient(MARKETING_OS_URL, TIMEOUT.DEFAULT);
  const res = await client.get(`/api/marketing/campaigns/${campaignId}`);
  return res.data;
}

async function getSegments() {
  const client = createClient(MARKETING_OS_URL, TIMEOUT.DEFAULT);
  const res = await client.get('/api/marketing/segments');
  return res.data;
}

async function getSegment(segmentId) {
  const client = createClient(MARKETING_OS_URL, TIMEOUT.DEFAULT);
  const res = await client.get(`/api/marketing/segments/${segmentId}`);
  return res.data;
}

async function getAudienceInsights(segmentId) {
  const client = createClient(MARKETING_OS_URL, TIMEOUT.DEFAULT);
  const res = await client.get(`/api/marketing/segments/${segmentId}/insights`);
  return res.data;
}

// ============================================
// Customer Success OS Client (4050)
// ============================================

async function getChurnScore(customerId) {
  const client = createClient(CUSTOMER_SUCCESS_OS_URL, TIMEOUT.DEFAULT);
  const res = await client.get(`/api/customer-success/churn/${customerId}`);
  return res.data;
}

async function getHealthScore(customerId) {
  const client = createClient(CUSTOMER_SUCCESS_OS_URL, TIMEOUT.DEFAULT);
  const res = await client.get(`/api/customer-success/health/${customerId}`);
  return res.data;
}

async function getNPS(customerId) {
  const client = createClient(CUSTOMER_SUCCESS_OS_URL, TIMEOUT.DEFAULT);
  const res = await client.get(`/api/customer-success/nps/${customerId}`);
  return res.data;
}

async function getCustomerJourney(customerId) {
  const client = createClient(CUSTOMER_SUCCESS_OS_URL, TIMEOUT.DEFAULT);
  const res = await client.get(`/api/customer-success/journey/${customerId}`);
  return res.data;
}

async function triggerCheckin(customerId, checkinData) {
  const client = createClient(CUSTOMER_SUCCESS_OS_URL, TIMEOUT.DEFAULT);
  const res = await client.post(`/api/customer-success/checkin`, {
    customerId,
    ...checkinData
  });
  return res.data;
}

// ============================================
// CXO OS Client (5100) - Customer 360
// ============================================

async function getCustomer360(customerId) {
  const client = createClient(CXO_OS_URL, TIMEOUT.TWIN);
  const res = await client.get(`/api/cxo/customer360/${customerId}`);
  return res.data;
}

async function getExecutiveKPIs() {
  const client = createClient(CXO_OS_URL, TIMEOUT.DEFAULT);
  const res = await client.get('/api/cxo/kpis');
  return res.data;
}

async function getDepartmentPerformance(department) {
  const client = createClient(CXO_OS_URL, TIMEOUT.DEFAULT);
  const res = await client.get(`/api/cxo/department/${department}`);
  return res.data;
}

// ============================================
// FlowOS Client (7007)
// ============================================

async function executeFlow(flowId, inputs = {}) {
  const client = createClient(FLOW_OS_URL, TIMEOUT.FLOW);
  const res = await client.post(`/api/flows/${flowId}/execute`, inputs);
  return res.data;
}

async function getFlowTemplates() {
  const client = createClient(FLOW_CANONICAL_URL, TIMEOUT.DEFAULT);
  const res = await client.get('/api/flows/templates');
  return res.data;
}

async function getFlow(flowId) {
  const client = createClient(FLOW_OS_URL, TIMEOUT.DEFAULT);
  const res = await client.get(`/api/flows/${flowId}`);
  return res.data;
}

async function getFlowExecution(executionId) {
  const client = createClient(FLOW_OS_URL, TIMEOUT.DEFAULT);
  const res = await client.get(`/api/flows/executions/${executionId}`);
  return res.data;
}

// ============================================
// Genie Clients (4701)
// ============================================

async function askGenie(question, context = {}) {
  const client = createClient(GENIE_URL, TIMEOUT.AGENT);
  const res = await client.post('/api/genie/ask', {
    question,
    context
  });
  return res.data;
}

async function getGenieBriefing(userId, options = {}) {
  const client = createClient(GENIE_BRIEFING_URL, TIMEOUT.DEFAULT);
  const res = await client.get(`/api/briefing/${userId}`, {
    params: {
      type: options.type || 'daily',
      date: options.date
    }
  });
  return res.data;
}

async function genieSearch(query, options = {}) {
  const client = createClient(GENIE_SEARCH_URL, TIMEOUT.DEFAULT);
  const res = await client.get('/api/search', {
    params: {
      q: query,
      sources: options.sources || ['memories', 'twins', 'calendar'],
      limit: options.limit || 10
    }
  });
  return res.data;
}

// ============================================
// Voice Gateway Client (4880)
// ============================================

async function synthesizeSpeech(text, options = {}) {
  const client = createClient(VOICE_GATEWAY_URL, TIMEOUT.DEFAULT);
  const res = await client.post('/api/tts/synthesize', {
    text,
    voice: options.voice || 'default',
    language: options.language || 'en',
    speed: options.speed || 1.0
  });
  return res.data;
}

async function transcribeAudio(audioData, options = {}) {
  const client = createClient(VOICE_GATEWAY_URL, TIMEOUT.AGENT);
  const res = await client.post('/api/stt/transcribe', {
    audio: audioData,
    language: options.language || 'en',
    model: options.model || 'whisper'
  });
  return res.data;
}

async function voiceStream(audioStream, options = {}) {
  const client = createClient(VOICE_GATEWAY_URL, TIMEOUT.AGENT);
  const res = await client.post('/api/voice/stream', audioStream, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Authorization': `Bearer ${HOJAI_API_KEY}`
    }
  });
  return res.data;
}

// ============================================
// Analytics Client
// ============================================

async function getHeatmaps(options = {}) {
  const client = createClient(ANALYTICS_URL, TIMEOUT.DEFAULT);
  const res = await client.get('/api/analytics/heatmaps', {
    params: {
      startDate: options.startDate,
      endDate: options.endDate,
      pageId: options.pageId
    }
  });
  return res.data;
}

async function getEvents(filters = {}) {
  const client = createClient(ANALYTICS_URL, TIMEOUT.DEFAULT);
  const res = await client.get('/api/analytics/events', {
    params: {
      ...filters,
      limit: filters.limit || 100
    }
  });
  return res.data;
}

async function trackEvent(eventData) {
  const client = createClient(ANALYTICS_URL, TIMEOUT.DEFAULT);
  const res = await client.post('/api/analytics/track', eventData);
  return res.data;
}

// ============================================
// Nexha Platform Clients
// ============================================

async function discoverNexhas(query, filters = {}) {
  const client = createClient(NEXHA_DISCOVERY_URL, TIMEOUT.DEFAULT);
  const res = await client.get('/api/discover', {
    params: {
      q: query,
      ...filters
    }
  });
  return res.data;
}

async function getNexhaReputation(nexhaId) {
  const client = createClient(NEXHA_REPUTATION_URL, TIMEOUT.DEFAULT);
  const res = await client.get(`/api/reputation/${nexhaId}`);
  return res.data;
}

async function searchNexhaCapabilities(query) {
  const client = createClient(NEXHA_DISCOVERY_URL, TIMEOUT.DEFAULT);
  const res = await client.get('/api/capabilities/search', {
    params: { q: query }
  });
  return res.data;
}

// ============================================
// Widget Backend Client (5380)
// ============================================

async function sendWidgetMessage(message) {
  const client = createClient(WIDGET_BACKEND_URL, TIMEOUT.DEFAULT);
  const res = await client.post('/api/message', message);
  return res.data;
}

async function getWidgetIntents() {
  const client = createClient(WIDGET_BACKEND_URL, TIMEOUT.DEFAULT);
  const res = await client.get('/api/intents');
  return res.data;
}

async function getWidgetSession(sessionId) {
  const client = createClient(WIDGET_BACKEND_URL, TIMEOUT.DEFAULT);
  const res = await client.get(`/api/session/${sessionId}`);
  return res.data;
}

// ============================================
// Export all clients
// ============================================

module.exports = {
  // Utility
  checkServiceHealth,

  // MemoryOS
  queryMemory,
  storeMemory,
  getMemoryContext,
  forgetMemory,

  // TwinOS
  getCustomerTwin,
  getCustomerTwinLTV,
  getCustomerTwinChurn,
  getOrderTwin,
  getOrderShipment,
  getWalletTwin,
  getWalletTransactions,

  // AgentOS
  queryAgent,
  getAgentCapabilities,
  getAgentCapability,
  searchAgentCapabilities,
  executeAgentTask,

  // Sales OS
  getLead,
  scoreLead,
  getLeadActivities,
  createLead,
  updateLead,
  getDeals,

  // Marketing OS
  createCampaign,
  getCampaigns,
  getCampaign,
  getSegments,
  getSegment,
  getAudienceInsights,

  // Customer Success OS
  getChurnScore,
  getHealthScore,
  getNPS,
  getCustomerJourney,
  triggerCheckin,

  // CXO OS
  getCustomer360,
  getExecutiveKPIs,
  getDepartmentPerformance,

  // FlowOS
  executeFlow,
  getFlowTemplates,
  getFlow,
  getFlowExecution,

  // Genie
  askGenie,
  getGenieBriefing,
  genieSearch,

  // Voice
  synthesizeSpeech,
  transcribeAudio,
  voiceStream,

  // Analytics
  getHeatmaps,
  getEvents,
  trackEvent,

  // Nexha
  discoverNexhas,
  getNexhaReputation,
  searchNexhaCapabilities,

  // Widget Backend
  sendWidgetMessage,
  getWidgetIntents,
  getWidgetSession
};
