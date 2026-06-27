/**
 * SiteOS Gateway Routes
 * Express routes that connect widget requests to RTMN services
 */

const express = require('express');
const router = express.Router();

const {
  // MemoryOS
  queryMemory,
  storeMemory,
  getMemoryContext,

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
  searchAgentCapabilities,
  executeAgentTask,

  // Sales OS
  getLead,
  scoreLead,
  createLead,
  getDeals,

  // Marketing OS
  createCampaign,
  getCampaigns,
  getSegments,
  getAudienceInsights,

  // Customer Success OS
  getChurnScore,
  getHealthScore,
  getNPS,
  getCustomerJourney,

  // CXO OS
  getCustomer360,
  getExecutiveKPIs,

  // FlowOS
  executeFlow,
  getFlowTemplates,

  // Genie
  askGenie,
  getGenieBriefing,
  genieSearch,

  // Voice
  synthesizeSpeech,
  transcribeAudio,

  // Analytics
  getHeatmaps,
  getEvents,
  trackEvent,

  // Nexha
  discoverNexhas,
  getNexhaReputation,

  // Widget Backend
  sendWidgetMessage,
  getWidgetIntents
} = require('../service-clients');

// ============================================
// Widget Backend Routes (5380)
// ============================================

// POST /api/siteos/message - Send message to widget backend
router.post('/message', async (req, res) => {
  try {
    const { sessionId, message, userId, metadata } = req.body;
    const result = await sendWidgetMessage({ sessionId, message, userId, metadata });
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('Widget message error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/siteos/intents - Get available intents
router.get('/intents', async (req, res) => {
  try {
    const intents = await getWidgetIntents();
    res.json({ success: true, data: intents });
  } catch (err) {
    console.error('Get intents error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================
// Memory Routes (4703)
// ============================================

// GET /api/siteos/memory/:visitorId - Query visitor memory
router.get('/memory/:visitorId', async (req, res) => {
  try {
    const { visitorId } = req.params;
    const { query, limit, recencyWeight, relevanceWeight } = req.query;

    if (query) {
      const result = await queryMemory(visitorId, query);
      res.json({ success: true, data: result });
    } else {
      const result = await getMemoryContext(visitorId, {
        limit: parseInt(limit) || 10,
        recencyWeight: parseFloat(recencyWeight) || 0.5,
        relevanceWeight: parseFloat(relevanceWeight) || 0.5
      });
      res.json({ success: true, data: result });
    }
  } catch (err) {
    console.error('Memory query error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/siteos/memory - Store new memory
router.post('/memory', async (req, res) => {
  try {
    const { visitorId, type, content, metadata } = req.body;

    if (!visitorId || !type || !content) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: visitorId, type, content'
      });
    }

    const result = await storeMemory(visitorId, { type, content, metadata });
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('Store memory error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/siteos/memory/:visitorId/:memoryId - Forget memory
router.delete('/memory/:visitorId/:memoryId', async (req, res) => {
  try {
    const { visitorId, memoryId } = req.params;
    const result = await require('../service-clients').forgetMemory(visitorId, memoryId);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('Forget memory error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================
// TwinOS Routes
// ============================================

// GET /api/siteos/twin/customer/:id - Get customer twin
router.get('/twin/customer/:id', async (req, res) => {
  try {
    const twin = await getCustomerTwin(req.params.id);
    res.json({ success: true, data: twin });
  } catch (err) {
    console.error('Get customer twin error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/siteos/twin/customer/:id/ltv - Get customer LTV
router.get('/twin/customer/:id/ltv', async (req, res) => {
  try {
    const ltv = await getCustomerTwinLTV(req.params.id);
    res.json({ success: true, data: ltv });
  } catch (err) {
    console.error('Get customer LTV error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/siteos/twin/customer/:id/churn - Get churn risk
router.get('/twin/customer/:id/churn', async (req, res) => {
  try {
    const churn = await getCustomerTwinChurn(req.params.id);
    res.json({ success: true, data: churn });
  } catch (err) {
    console.error('Get churn risk error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/siteos/twin/order/:id - Get order twin
router.get('/twin/order/:id', async (req, res) => {
  try {
    const twin = await getOrderTwin(req.params.id);
    res.json({ success: true, data: twin });
  } catch (err) {
    console.error('Get order twin error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/siteos/twin/order/:id/shipment - Get order shipment
router.get('/twin/order/:id/shipment', async (req, res) => {
  try {
    const shipment = await getOrderShipment(req.params.id);
    res.json({ success: true, data: shipment });
  } catch (err) {
    console.error('Get shipment error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/siteos/twin/wallet/:id - Get wallet twin
router.get('/twin/wallet/:id', async (req, res) => {
  try {
    const twin = await getWalletTwin(req.params.id);
    res.json({ success: true, data: twin });
  } catch (err) {
    console.error('Get wallet twin error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/siteos/twin/wallet/:id/transactions - Get wallet transactions
router.get('/twin/wallet/:id/transactions', async (req, res) => {
  try {
    const { limit, offset, type } = req.query;
    const transactions = await getWalletTransactions(req.params.id, {
      limit: parseInt(limit) || 50,
      offset: parseInt(offset) || 0,
      type
    });
    res.json({ success: true, data: transactions });
  } catch (err) {
    console.error('Get transactions error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================
// AgentOS Routes
// ============================================

// POST /api/siteos/agent/query - Query AI agent
router.post('/agent/query', async (req, res) => {
  try {
    const { question, context } = req.body;

    if (!question) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: question'
      });
    }

    const answer = await queryAgent(question, context || {});
    res.json({ success: true, data: answer });
  } catch (err) {
    console.error('Agent query error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/siteos/agent/capabilities - Get agent capabilities
router.get('/agent/capabilities', async (req, res) => {
  try {
    const { q } = req.query;

    if (q) {
      const capabilities = await searchAgentCapabilities(q);
      res.json({ success: true, data: capabilities });
    } else {
      const capabilities = await getAgentCapabilities();
      res.json({ success: true, data: capabilities });
    }
  } catch (err) {
    console.error('Get capabilities error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/siteos/agent/execute - Execute agent task
router.post('/agent/execute', async (req, res) => {
  try {
    const { task, inputs } = req.body;

    if (!task) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: task'
      });
    }

    const result = await executeAgentTask(task, inputs || {});
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('Agent execute error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================
// Sales OS Routes
// ============================================

// GET /api/siteos/sales/lead/:id - Get lead
router.get('/sales/lead/:id', async (req, res) => {
  try {
    const lead = await getLead(req.params.id);
    res.json({ success: true, data: lead });
  } catch (err) {
    console.error('Get lead error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/siteos/sales/score - Score a lead
router.post('/sales/score', async (req, res) => {
  try {
    const { email, company, source, behavior, demographics } = req.body;

    const leadData = { email, company, source, behavior, demographics };
    const result = await scoreLead(leadData);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('Score lead error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/siteos/sales/lead - Create new lead
router.post('/sales/lead', async (req, res) => {
  try {
    const leadData = req.body;
    const lead = await createLead(leadData);
    res.json({ success: true, data: lead });
  } catch (err) {
    console.error('Create lead error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/siteos/sales/deals - Get deals
router.get('/sales/deals', async (req, res) => {
  try {
    const { status, stage, minValue, maxValue } = req.query;
    const deals = await getDeals({ status, stage, minValue, maxValue });
    res.json({ success: true, data: deals });
  } catch (err) {
    console.error('Get deals error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================
// Marketing OS Routes
// ============================================

// POST /api/siteos/marketing/campaign - Create campaign
router.post('/marketing/campaign', async (req, res) => {
  try {
    const campaignData = req.body;
    const campaign = await createCampaign(campaignData);
    res.json({ success: true, data: campaign });
  } catch (err) {
    console.error('Create campaign error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/siteos/marketing/campaigns - List campaigns
router.get('/marketing/campaigns', async (req, res) => {
  try {
    const { status, type, limit } = req.query;
    const campaigns = await getCampaigns({ status, type, limit: parseInt(limit) || 20 });
    res.json({ success: true, data: campaigns });
  } catch (err) {
    console.error('Get campaigns error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/siteos/marketing/segments - List audience segments
router.get('/marketing/segments', async (req, res) => {
  try {
    const segments = await getSegments();
    res.json({ success: true, data: segments });
  } catch (err) {
    console.error('Get segments error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/siteos/marketing/segments/:id/insights - Get segment insights
router.get('/marketing/segments/:id/insights', async (req, res) => {
  try {
    const insights = await getAudienceInsights(req.params.id);
    res.json({ success: true, data: insights });
  } catch (err) {
    console.error('Get segment insights error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================
// Customer Success Routes
// ============================================

// GET /api/siteos/churn/:customerId - Get churn score
router.get('/churn/:customerId', async (req, res) => {
  try {
    const churnScore = await getChurnScore(req.params.customerId);
    res.json({ success: true, data: churnScore });
  } catch (err) {
    console.error('Get churn score error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/siteos/health/:customerId - Get health score
router.get('/health/:customerId', async (req, res) => {
  try {
    const healthScore = await getHealthScore(req.params.customerId);
    res.json({ success: true, data: healthScore });
  } catch (err) {
    console.error('Get health score error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/siteos/nps/:customerId - Get NPS score
router.get('/nps/:customerId', async (req, res) => {
  try {
    const nps = await getNPS(req.params.customerId);
    res.json({ success: true, data: nps });
  } catch (err) {
    console.error('Get NPS error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/siteos/journey/:customerId - Get customer journey
router.get('/journey/:customerId', async (req, res) => {
  try {
    const journey = await getCustomerJourney(req.params.customerId);
    res.json({ success: true, data: journey });
  } catch (err) {
    console.error('Get customer journey error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================
// CXO OS Routes - Customer 360
// ============================================

// GET /api/siteos/customer360/:id - Get complete customer view
router.get('/customer360/:id', async (req, res) => {
  try {
    const data = await getCustomer360(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    console.error('Get customer 360 error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/siteos/kpis - Get executive KPIs
router.get('/kpis', async (req, res) => {
  try {
    const kpis = await getExecutiveKPIs();
    res.json({ success: true, data: kpis });
  } catch (err) {
    console.error('Get KPIs error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================
// FlowOS Routes
// ============================================

// POST /api/siteos/flow/execute - Execute a flow
router.post('/flow/execute', async (req, res) => {
  try {
    const { flowId, inputs } = req.body;

    if (!flowId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: flowId'
      });
    }

    const result = await executeFlow(flowId, inputs || {});
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('Execute flow error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/siteos/flow/templates - Get flow templates
router.get('/flow/templates', async (req, res) => {
  try {
    const templates = await getFlowTemplates();
    res.json({ success: true, data: templates });
  } catch (err) {
    console.error('Get flow templates error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================
// Nexha Platform Routes
// ============================================

// GET /api/siteos/nexus/discover - Discover Nexhas
router.get('/nexus/discover', async (req, res) => {
  try {
    const { q, industry, capability, limit } = req.query;
    const results = await discoverNexhas(q, {
      industry,
      capability,
      limit: parseInt(limit) || 20
    });
    res.json({ success: true, data: results });
  } catch (err) {
    console.error('Nexha discovery error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/siteos/nexus/reputation/:id - Get Nexha reputation
router.get('/nexus/reputation/:id', async (req, res) => {
  try {
    const reputation = await getNexhaReputation(req.params.id);
    res.json({ success: true, data: reputation });
  } catch (err) {
    console.error('Get reputation error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================
// Voice Routes
// ============================================

// GET /api/siteos/voice/synthesize - Synthesize speech
router.get('/voice/synthesize', async (req, res) => {
  try {
    const { text, voice, language, speed } = req.query;

    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Missing required query param: text'
      });
    }

    const result = await synthesizeSpeech(text, {
      voice,
      language,
      speed: parseFloat(speed) || 1.0
    });
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('Synthesize speech error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/siteos/voice/transcribe - Transcribe audio
router.post('/voice/transcribe', async (req, res) => {
  try {
    const { audio, language, model } = req.body;

    if (!audio) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: audio'
      });
    }

    const result = await transcribeAudio(audio, { language, model });
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('Transcribe audio error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================
// Analytics Routes
// ============================================

// GET /api/siteos/analytics/heatmaps - Get heatmaps
router.get('/analytics/heatmaps', async (req, res) => {
  try {
    const { startDate, endDate, pageId } = req.query;
    const heatmaps = await getHeatmaps({ startDate, endDate, pageId });
    res.json({ success: true, data: heatmaps });
  } catch (err) {
    console.error('Get heatmaps error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/siteos/analytics/events - Get analytics events
router.get('/analytics/events', async (req, res) => {
  try {
    const { type, startDate, endDate, limit } = req.query;
    const events = await getEvents({ type, startDate, endDate, limit: parseInt(limit) || 100 });
    res.json({ success: true, data: events });
  } catch (err) {
    console.error('Get events error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/siteos/analytics/track - Track an event
router.post('/analytics/track', async (req, res) => {
  try {
    const eventData = req.body;
    const result = await trackEvent(eventData);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('Track event error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================
// Genie Routes
// ============================================

// POST /api/siteos/genie/ask - Ask Genie
router.post('/genie/ask', async (req, res) => {
  try {
    const { question, context } = req.body;

    if (!question) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: question'
      });
    }

    const answer = await askGenie(question, context || {});
    res.json({ success: true, data: answer });
  } catch (err) {
    console.error('Genie ask error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/siteos/genie/briefing/:userId - Get Genie briefing
router.get('/genie/briefing/:userId', async (req, res) => {
  try {
    const { type, date } = req.query;
    const briefing = await getGenieBriefing(req.params.userId, { type, date });
    res.json({ success: true, data: briefing });
  } catch (err) {
    console.error('Get briefing error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/siteos/genie/search - Universal search
router.get('/genie/search', async (req, res) => {
  try {
    const { q, sources, limit } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Missing required query param: q'
      });
    }

    const results = await genieSearch(q, {
      sources: sources ? sources.split(',') : ['memories', 'twins', 'calendar'],
      limit: parseInt(limit) || 10
    });
    res.json({ success: true, data: results });
  } catch (err) {
    console.error('Genie search error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
