/**
 * RTMN Unified Hub - Route Definitions
 *
 * Central routing for all 50+ OS services
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');

// Service URLs
const SERVICES = {
  // Core OS
  salesOs: process.env.SALES_OS_URL || 'http://localhost:5055',
  mediaOs: process.env.MEDIA_OS_URL || 'http://localhost:5600',
  marketingOs: process.env.MARKETING_OS_URL || 'http://localhost:5500',

  // Foundation
  corpId: process.env.CORPID_URL || 'http://localhost:4702',
  memoryOs: process.env.MEMORY_OS_URL || 'http://localhost:4703',
  twinOs: process.env.TWIN_OS_URL || 'http://localhost:4705',

  // HOJAI AI
  leverageIntelligence: process.env.LEVERAGE_INTELLIGENCE_URL || 'http://localhost:4761',
  leverageCopilot: process.env.LEVERAGE_COPILOT_URL || 'http://localhost:4765',

  // REZ Services
  rezCrmHub: process.env.REZ_CRM_URL || 'http://localhost:4056',
  rezCareService: process.env.REZ_CARE_URL || 'http://localhost:4055',
  rezWallet: process.env.REZ_WALLET_URL || 'http://localhost:4004',
  rezAuth: process.env.REZ_AUTH_URL || 'http://localhost:4002',

  // AdBazaar
  adbazaarDsp: process.env.ADBAZAAR_DSP_URL || 'http://localhost:4990',
  adbazaarAudience: process.env.ADBAZAAR_AUDIENCE_URL || 'http://localhost:4805',
  adbazaarAttribution: process.env.ADBAZAAR_ATTRIBUTION_URL || 'http://localhost:4803',

  // Industry OS (24 Industries)
  restaurantOs: process.env.RESTAURANT_OS_URL || 'http://localhost:5010',
  hotelOs: process.env.HOTEL_OS_URL || 'http://localhost:5025',
  healthcareOs: process.env.HEALTHCARE_OS_URL || 'http://localhost:5020',
  retailOs: process.env.RETAIL_OS_URL || 'http://localhost:5030',
  legalOs: process.env.LEGAL_OS_URL || 'http://localhost:5035',
  educationOs: process.env.EDUCATION_OS_URL || 'http://localhost:5060',
  agricultureOs: process.env.AGRICULTURE_OS_URL || 'http://localhost:5070',
  automotiveOs: process.env.AUTOMOTIVE_OS_URL || 'http://localhost:5080',
  beautyOs: process.env.BEAUTY_OS_URL || 'http://localhost:5090',
  fitnessOs: process.env.FITNESS_OS_URL || 'http://localhost:5110',
  entertainmentOs: process.env.ENTERTAINMENT_OS_URL || 'http://localhost:5200',
  exhibitionOs: process.env.EXHIBITION_OS_URL || 'http://localhost:5040',
};

// Create axios client
const createClient = (baseURL) => axios.create({ baseURL, timeout: 10000, headers: { 'Content-Type': 'application/json' } });

const clients = {};
for (const [name, url] of Object.entries(SERVICES)) {
  clients[name] = createClient(url);
}

// Helper: proxy request
async function proxy(req, res, service, path) {
  try {
    const client = clients[service];
    if (!client) {
      return res.status(404).json({ success: false, error: 'Service not found' });
    }

    const response = req.method === 'POST'
      ? await client.post(path, req.body)
      : await client.get(path, { params: req.query });

    res.json({ success: true, ...response.data });
  } catch (error) {
    res.json({ success: false, error: error.message, service });
  }
}

// ============================================
// SALES OS ROUTES
// ============================================

router.get('/sales/:path(*)', (req, res) => proxy(req, res, 'salesOs', req.params.path));
router.post('/sales/:path(*)', (req, res) => proxy(req, res, 'salesOs', req.params.path));
router.patch('/sales/:path(*)', (req, res) => proxy(req, res, 'salesOs', req.params.path));
router.delete('/sales/:path(*)', (req, res) => proxy(req, res, 'salesOs', req.params.path));

// ============================================
// MEDIA OS ROUTES
// ============================================

router.get('/media/:path(*)', (req, res) => proxy(req, res, 'mediaOs', req.params.path));
router.post('/media/:path(*)', (req, res) => proxy(req, res, 'mediaOs', req.params.path));
router.patch('/media/:path(*)', (req, res) => proxy(req, res, 'mediaOs', req.params.path));

// ============================================
// MARKETING OS ROUTES
// ============================================

router.get('/marketing/:path(*)', (req, res) => proxy(req, res, 'marketingOs', req.params.path));
router.post('/marketing/:path(*)', (req, res) => proxy(req, res, 'marketingOs', req.params.path));
router.patch('/marketing/:path(*)', (req, res) => proxy(req, res, 'marketingOs', req.params.path));

// ============================================
// ADBAZAAR ROUTES
// ============================================

router.get('/ads/:path(*)', (req, res) => proxy(req, res, 'adbazaarDsp', req.params.path));
router.post('/ads/:path(*)', (req, res) => proxy(req, res, 'adbazaarDsp', req.params.path));

router.get('/audiences/:path(*)', (req, res) => proxy(req, res, 'adbazaarAudience', req.params.path));
router.post('/audiences/:path(*)', (req, res) => proxy(req, res, 'adbazaarAudience', req.params.path));

router.get('/attribution/:path(*)', (req, res) => proxy(req, res, 'adbazaarAttribution', req.params.path));
router.post('/attribution/:path(*)', (req, res) => proxy(req, res, 'adbazaarAttribution', req.params.path));

// ============================================
// REZ SERVICES
// ============================================

router.get('/crm/:path(*)', (req, res) => proxy(req, res, 'rezCrmHub', req.params.path));
router.post('/crm/:path(*)', (req, res) => proxy(req, res, 'rezCrmHub', req.params.path));

router.get('/care/:path(*)', (req, res) => proxy(req, res, 'rezCareService', req.params.path));
router.post('/care/:path(*)', (req, res) => proxy(req, res, 'rezCareService', req.params.path));

router.get('/wallet/:path(*)', (req, res) => proxy(req, res, 'rezWallet', req.params.path));
router.post('/wallet/:path(*)', (req, res) => proxy(req, res, 'rezWallet', req.params.path));

// ============================================
// INDUSTRY OS ROUTES
// ============================================

// Restaurant
router.get('/restaurant/:path(*)', (req, res) => proxy(req, res, 'restaurantOs', req.params.path));
router.post('/restaurant/:path(*)', (req, res) => proxy(req, res, 'restaurantOs', req.params.path));

// Hotel
router.get('/hotel/:path(*)', (req, res) => proxy(req, res, 'hotelOs', req.params.path));
router.post('/hotel/:path(*)', (req, res) => proxy(req, res, 'hotelOs', req.params.path));

// Healthcare
router.get('/healthcare/:path(*)', (req, res) => proxy(req, res, 'healthcareOs', req.params.path));
router.post('/healthcare/:path(*)', (req, res) => proxy(req, res, 'healthcareOs', req.params.path));

// Retail
router.get('/retail/:path(*)', (req, res) => proxy(req, res, 'retailOs', req.params.path));
router.post('/retail/:path(*)', (req, res) => proxy(req, res, 'retailOs', req.params.path));

// Legal
router.get('/legal/:path(*)', (req, res) => proxy(req, res, 'legalOs', req.params.path));
router.post('/legal/:path(*)', (req, res) => proxy(req, res, 'legalOs', req.params.path));

// Education
router.get('/education/:path(*)', (req, res) => proxy(req, res, 'educationOs', req.params.path));
router.post('/education/:path(*)', (req, res) => proxy(req, res, 'educationOs', req.params.path));

// Generic industry OS routes
const industries = ['agriculture', 'automotive', 'beauty', 'fitness', 'entertainment', 'exhibition'];
for (const industry of industries) {
  const clientName = `${industry}Os`;
  router.get(`/${industry}/:path(*)`, (req, res) => proxy(req, res, clientName, req.params.path));
  router.post(`/${industry}/:path(*)`, (req, res) => proxy(req, res, clientName, req.params.path));
}

// ============================================
// FOUNDATION SERVICES
// ============================================

router.get('/identity/:path(*)', (req, res) => proxy(req, res, 'corpId', req.params.path));
router.post('/identity/:path(*)', (req, res) => proxy(req, res, 'corpId', req.params.path));

router.get('/memory/:path(*)', (req, res) => proxy(req, res, 'memoryOs', req.params.path));
router.post('/memory/:path(*)', (req, res) => proxy(req, res, 'memoryOs', req.params.path));

router.get('/twins/:path(*)', (req, res) => proxy(req, res, 'twinOs', req.params.path));
router.post('/twins/:path(*)', (req, res) => proxy(req, res, 'twinOs', req.params.path));

// ============================================
// AI SERVICES
// ============================================

router.get('/ai/:path(*)', (req, res) => proxy(req, res, 'leverageIntelligence', req.params.path));
router.post('/ai/:path(*)', (req, res) => proxy(req, res, 'leverageIntelligence', req.params.path));

module.exports = router;
