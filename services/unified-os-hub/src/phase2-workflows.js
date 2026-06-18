/**
 * RTMN Unified Hub - Phase 2 Workflows
 * Revenue Intelligence + Event & Banquet OS
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');

// Service URLs
const SERVICES = {
  revenueIntelligence: 'http://localhost:5400',
  eventBanquet: 'http://localhost:4751',
  hotel: 'http://localhost:5025',
  restaurant: 'http://localhost:5010',
  cxo: 'http://localhost:5100',
  finance: 'http://localhost:4801',
  memory: 'http://localhost:4703',
  twin: 'http://localhost:4705',
};

// Helper
async function callService(baseUrl, path, method = 'GET', data = null) {
  try {
    const config = { method, url: `${baseUrl}${path}`, timeout: 5000, headers: { 'Content-Type': 'application/json' } };
    if (data) config.data = data;
    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================
// REVENUE INTELLIGENCE ENDPOINTS
// ============================================

// Health Check
router.get('/revenue/health', async (req, res) => {
  const result = await callService(SERVICES.revenueIntelligence, '/health');
  res.json({ service: 'Revenue Intelligence OS', ...result });
});

// Get Pricing Recommendations
router.post('/revenue/pricing', async (req, res) => {
  const { industry, date, competitorPrices = {} } = req.body;
  const result = await callService(SERVICES.revenueIntelligence, '/api/pricing/recommend', 'POST', {
    industry, date, competitorPrices
  });
  res.json({ workflow: 'pricing-recommendation', ...result });
});

// Forecast Demand
router.post('/revenue/forecast', async (req, res) => {
  const { industry, days = 30 } = req.body;
  const result = await callService(SERVICES.revenueIntelligence, '/api/forecast/demand', 'POST', {
    industry, days
  });
  res.json({ workflow: 'demand-forecast', ...result });
});

// Revenue Report
router.get('/revenue/report/:industry', async (req, res) => {
  const { industry } = req.params;
  const { period = 'monthly' } = req.query;
  const result = await callService(SERVICES.revenueIntelligence, `/api/reports/${industry}`, 'GET', { params: { period } });
  res.json({ workflow: 'revenue-report', industry, ...result });
});

// ADR Optimization
router.post('/revenue/adr-optimize', async (req, res) => {
  const { industry, currentADR, occupancy } = req.body;
  const result = await callService(SERVICES.revenueIntelligence, '/api/optimize/adr', 'POST', {
    industry, currentADR, occupancy
  });
  res.json({ workflow: 'adr-optimization', ...result });
});

// Occupancy Forecast
router.post('/revenue/occupancy', async (req, res) => {
  const { industry, date } = req.body;
  const result = await callService(SERVICES.revenueIntelligence, '/api/forecast/occupancy', 'POST', {
    industry, date
  });
  res.json({ workflow: 'occupancy-forecast', ...result });
});

// Market Events Impact
router.post('/revenue/market-events', async (req, res) => {
  const { industry, events = [] } = req.body;
  const result = await callService(SERVICES.revenueIntelligence, '/api/analysis/market-events', 'POST', {
    industry, events
  });
  res.json({ workflow: 'market-events-analysis', ...result });
});

// Competitive Analysis
router.post('/revenue/competitive', async (req, res) => {
  const { industry, competitors = [] } = req.body;
  const result = await callService(SERVICES.revenueIntelligence, '/api/analysis/competitive', 'POST', {
    industry, competitors
  });
  res.json({ workflow: 'competitive-analysis', ...result });
});

// RevPAR Dashboard
router.get('/revenue/revpar/:industry', async (req, res) => {
  const { industry } = req.params;
  const result = await callService(SERVICES.revenueIntelligence, `/api/dashboard/revpar/${industry}`);
  res.json({ workflow: 'revpar-dashboard', industry, ...result });
});

// Dynamic Pricing Update
router.post('/revenue/dynamic-pricing', async (req, res) => {
  const { industry, products = [], demand, competitorPrices } = req.body;
  const result = await callService(SERVICES.revenueIntelligence, '/api/pricing/dynamic', 'POST', {
    industry, products, demand, competitorPrices
  });
  res.json({ workflow: 'dynamic-pricing', ...result });
});

// ============================================
// EVENT & BANQUET ENDPOINTS
// ============================================

// Health Check
router.get('/event/health', async (req, res) => {
  const result = await callService(SERVICES.eventBanquet, '/health');
  res.json({ service: 'Event & Banquet OS', ...result });
});

// Create Event
router.post('/event/create', async (req, res) => {
  const { type, name, date, venue, guestCount, industry } = req.body;
  const result = await callService(SERVICES.eventBanquet, '/api/events', 'POST', {
    type, name, date, venue, guestCount, industry
  });

  // Also create in Industry OS if specified
  if (industry) {
    const industryResult = await callService(`http://localhost:${getIndustryPort(industry)}`, '/api/integration/event/create', 'POST', {
      type, name, date, venue, guestCount
    });
    result.industryIntegration = industryResult;
  }

  res.json({ workflow: 'event-creation', ...result });
});

// Book Venue
router.post('/event/venue', async (req, res) => {
  const { venueId, date, duration, eventType } = req.body;
  const result = await callService(SERVICES.eventBanquet, '/api/venues/book', 'POST', {
    venueId, date, duration, eventType
  });
  res.json({ workflow: 'venue-booking', ...result });
});

// Get Available Venues
router.get('/event/venues', async (req, res) => {
  const { date, capacity, type } = req.query;
  const result = await callService(SERVICES.eventBanquet, '/api/venues', 'GET', { params: { date, capacity, type } });
  res.json({ workflow: 'venue-availability', ...result });
});

// Event Types
router.get('/event/types', async (req, res) => {
  const result = await callService(SERVICES.eventBanquet, '/api/events/types');
  res.json({ workflow: 'event-types', ...result });
});

// Food Menu Planning
router.post('/event/menu', async (req, res) => {
  const { eventId, guestCount, preferences = [], dietary = [] } = req.body;
  const result = await callService(SERVICES.eventBanquet, '/api/events/menu', 'POST', {
    eventId, guestCount, preferences, dietary
  });
  res.json({ workflow: 'menu-planning', ...result });
});

// Vendor Coordination
router.post('/event/vendor', async (req, res) => {
  const { eventId, vendorType, requirements } = req.body;
  const result = await callService(SERVICES.eventBanquet, '/api/events/vendor', 'POST', {
    eventId, vendorType, requirements
  });
  res.json({ workflow: 'vendor-coordination', ...result });
});

// Event Timeline
router.get('/event/:eventId/timeline', async (req, res) => {
  const { eventId } = req.params;
  const result = await callService(SERVICES.eventBanquet, `/api/events/${eventId}/timeline`);
  res.json({ workflow: 'event-timeline', ...result });
});

// Event Analytics
router.get('/event/:eventId/analytics', async (req, res) => {
  const { eventId } = req.params;
  const result = await callService(SERVICES.eventBanquet, `/api/events/${eventId}/analytics`);
  res.json({ workflow: 'event-analytics', ...result });
});

// Event Invoice
router.post('/event/invoice', async (req, res) => {
  const { eventId, items, customerId } = req.body;
  const result = await callService(SERVICES.eventBanquet, '/api/events/invoice', 'POST', {
    eventId, items, customerId
  });

  // Also create in Finance OS
  const financeResult = await callService(SERVICES.finance, '/api/invoices', 'POST', {
    customerId, items, type: 'event', source: 'event-banquet'
  });

  res.json({ workflow: 'event-invoice', event: result, finance: financeResult });
});

// Event Check-in
router.post('/event/:eventId/checkin', async (req, res) => {
  const { eventId } = req.params;
  const { guestId, qrCode } = req.body;
  const result = await callService(SERVICES.eventBanquet, `/api/events/${eventId}/checkin`, 'POST', {
    guestId, qrCode
  });
  res.json({ workflow: 'event-checkin', ...result });
});

// Event Twin
router.post('/event/:eventId/twin', async (req, res) => {
  const { eventId } = req.params;
  const result = await callService(SERVICES.twin, '/api/twins', 'POST', {
    type: 'event',
    data: { eventId },
    source: 'event-banquet'
  });
  res.json({ workflow: 'event-twin', ...result });
});

// ============================================
// HOTEL + EVENT INTEGRATION
// ============================================

// Hotel Event Package
router.post('/hotel/event-package', async (req, res) => {
  const { hotelId, eventType, guestCount, duration } = req.body;

  // Create event
  const eventResult = await callService(SERVICES.eventBanquet, '/api/events', 'POST', {
    type: eventType, guestCount, industry: 'hotel', source: 'hotel-os'
  });

  // Get pricing
  const pricingResult = await callService(SERVICES.revenueIntelligence, '/api/pricing/recommend', 'POST', {
    industry: 'hotel', date: new Date(), type: 'event'
  });

  res.json({
    workflow: 'hotel-event-package',
    event: eventResult,
    pricing: pricingResult
  });
});

// ============================================
// INDUSTRY EVENT BRIDGE
// ============================================

router.post('/industry/:industry/event', async (req, res) => {
  const { industry } = req.params;
  const { type, name, date, guestCount } = req.body;

  // Create event in Event Banquet OS
  const eventResult = await callService(SERVICES.eventBanquet, '/api/events', 'POST', {
    type, name, date, guestCount, industry
  });

  // Create in Industry OS
  const industryPort = getIndustryPort(industry);
  const industryResult = industryPort ? await callService(
    `http://localhost:${industryPort}`,
    '/api/integration/event/create',
    'POST',
    { type, name, date, guestCount }
  ) : null;

  // Update CXO
  const cxoResult = await callService(SERVICES.cxo, '/api/kpis', 'POST', {
    metric: 'events_created',
    value: 1,
    period: 'daily',
    source: 'event-banquet',
    industry
  });

  res.json({
    workflow: 'industry-event',
    industry,
    event: eventResult,
    industryOS: industryResult,
    cxo: cxoResult
  });
});

// ============================================
// UTILITY
// ============================================

function getIndustryPort(industry) {
  const ports = {
    restaurant: 5010, hotel: 5025, healthcare: 5020, retail: 5030,
    legal: 5035, education: 5060, agriculture: 5070, automotive: 5080,
    beauty: 5090, fashion: 5095, fitness: 5110, gaming: 5120,
    government: 5130, homeServices: 5140, manufacturing: 5150,
    nonProfit: 5160, professional: 5170, sports: 5180, travel: 5190,
    entertainment: 5200, construction: 5210, financial: 5220,
    realEstate: 5230, transport: 5240
  };
  return ports[industry] || null;
}

module.exports = router;
