/**
 * RTMN Unified Hub - Phase 4 Workflows
 * Hotel Marketplace + Multi-Property Intelligence + Predictive Maintenance
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');

// Service URLs
const SERVICES = {
  marketplace: 'http://localhost:5290',
  multiProperty: 'http://localhost:5300',
  predictiveMaint: 'http://localhost:5310',
  hotel: 'http://localhost:5025',
  cxo: 'http://localhost:5100',
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

// ==================== MARKETPLACE (5290) ====================

// Marketplace categories
router.get('/marketplace/categories', async (req, res) => {
  const result = await callService(SERVICES.marketplace, '/api/categories');
  res.json(result.success ? result.data : { success: false, error: result.error });
});

router.get('/marketplace/categories/:id', async (req, res) => {
  const result = await callService(SERVICES.marketplace, `/api/categories/${req.params.id}`);
  res.json(result.success ? result.data : { success: false, error: result.error });
});

// Marketplace apps
router.get('/marketplace/apps', async (req, res) => {
  const { category, tier, search, sort, limit, offset } = req.query;
  let path = '/api/apps?';
  if (category) path += `category=${category}&`;
  if (tier) path += `tier=${tier}&`;
  if (search) path += `search=${encodeURIComponent(search)}&`;
  if (sort) path += `sort=${sort}&`;
  if (limit) path += `limit=${limit}&`;
  if (offset) path += `offset=${offset}&`;
  const result = await callService(SERVICES.marketplace, path);
  res.json(result.success ? result.data : { success: false, error: result.error });
});

router.get('/marketplace/apps/:id', async (req, res) => {
  const result = await callService(SERVICES.marketplace, `/api/apps/${req.params.id}`);
  res.json(result.success ? result.data : { success: false, error: result.error });
});

router.get('/marketplace/search', async (req, res) => {
  const { q, category, tier, minRating } = req.query;
  let path = `/api/search?q=${encodeURIComponent(q || '')}`;
  if (category) path += `&category=${category}`;
  if (tier) path += `&tier=${tier}`;
  if (minRating) path += `&minRating=${minRating}`;
  const result = await callService(SERVICES.marketplace, path);
  res.json(result.success ? result.data : { success: false, error: result.error });
});

router.get('/marketplace/featured', async (req, res) => {
  const result = await callService(SERVICES.marketplace, '/api/featured');
  res.json(result.success ? result.data : { success: false, error: result.error });
});

router.get('/marketplace/trending', async (req, res) => {
  const result = await callService(SERVICES.marketplace, '/api/trending');
  res.json(result.success ? result.data : { success: false, error: result.error });
});

// Installations
router.post('/marketplace/installations', async (req, res) => {
  const result = await callService(SERVICES.marketplace, '/api/installations', 'POST', req.body);
  res.status(result.success ? 201 : 500).json(result.success ? result.data : { success: false, error: result.error });
});

router.get('/marketplace/installations/hotel/:hotelId', async (req, res) => {
  const result = await callService(SERVICES.marketplace, `/api/installations/hotel/${req.params.hotelId}`);
  res.json(result.success ? result.data : { success: false, error: result.error });
});

// Reviews
router.post('/marketplace/reviews', async (req, res) => {
  const result = await callService(SERVICES.marketplace, '/api/reviews', 'POST', req.body);
  res.status(result.success ? 201 : 500).json(result.success ? result.data : { success: false, error: result.error });
});

// Subscriptions
router.post('/marketplace/subscriptions', async (req, res) => {
  const result = await callService(SERVICES.marketplace, '/api/subscriptions', 'POST', req.body);
  res.status(result.success ? 201 : 500).json(result.success ? result.data : { success: false, error: result.error });
});

// Analytics
router.get('/marketplace/analytics', async (req, res) => {
  const result = await callService(SERVICES.marketplace, '/api/analytics');
  res.json(result.success ? result.data : { success: false, error: result.error });
});

// ==================== MULTI-PROPERTY (5300) ====================

// Portfolio
router.get('/multi-property/portfolio/overview', async (req, res) => {
  const result = await callService(SERVICES.multiProperty, '/api/portfolio/overview');
  res.json(result.success ? result.data : { success: false, error: result.error });
});

// Regions
router.get('/multi-property/regions', async (req, res) => {
  const result = await callService(SERVICES.multiProperty, '/api/regions');
  res.json(result.success ? result.data : { success: false, error: result.error });
});

router.get('/multi-property/regions/:id', async (req, res) => {
  const result = await callService(SERVICES.multiProperty, `/api/regions/${req.params.id}`);
  res.json(result.success ? result.data : { success: false, error: result.error });
});

// Properties
router.get('/multi-property/properties', async (req, res) => {
  const { region, type, minOccupancy, sort } = req.query;
  let path = '/api/properties?';
  if (region) path += `region=${region}&`;
  if (type) path += `type=${type}&`;
  if (minOccupancy) path += `minOccupancy=${minOccupancy}&`;
  if (sort) path += `sort=${sort}&`;
  const result = await callService(SERVICES.multiProperty, path);
  res.json(result.success ? result.data : { success: false, error: result.error });
});

router.get('/multi-property/properties/:id', async (req, res) => {
  const result = await callService(SERVICES.multiProperty, `/api/properties/${req.params.id}`);
  res.json(result.success ? result.data : { success: false, error: result.error });
});

router.get('/multi-property/properties/:id/benchmark', async (req, res) => {
  const result = await callService(SERVICES.multiProperty, `/api/properties/${req.params.id}/benchmark`);
  res.json(result.success ? result.data : { success: false, error: result.error });
});

// Managers
router.get('/multi-property/managers', async (req, res) => {
  const result = await callService(SERVICES.multiProperty, '/api/managers');
  res.json(result.success ? result.data : { success: false, error: result.error });
});

router.get('/multi-property/managers/:id', async (req, res) => {
  const result = await callService(SERVICES.multiProperty, `/api/managers/${req.params.id}`);
  res.json(result.success ? result.data : { success: false, error: result.error });
});

// Benchmarks
router.get('/multi-property/benchmarks', async (req, res) => {
  const result = await callService(SERVICES.multiProperty, '/api/benchmarks');
  res.json(result.success ? result.data : { success: false, error: result.error });
});

// Dashboard
router.get('/multi-property/dashboard', async (req, res) => {
  const result = await callService(SERVICES.multiProperty, '/api/dashboard');
  res.json(result.success ? result.data : { success: false, error: result.error });
});

// Analytics
router.get('/multi-property/analytics/compare', async (req, res) => {
  const { propertyIds } = req.query;
  const path = propertyIds ? `/api/analytics/compare?propertyIds=${propertyIds}` : '/api/analytics/compare';
  const result = await callService(SERVICES.multiProperty, path);
  res.json(result.success ? result.data : { success: false, error: result.error });
});

router.get('/multi-property/analytics/revenue', async (req, res) => {
  const result = await callService(SERVICES.multiProperty, '/api/analytics/revenue');
  res.json(result.success ? result.data : { success: false, error: result.error });
});

router.get('/multi-property/analytics/trends', async (req, res) => {
  const result = await callService(SERVICES.multiProperty, '/api/analytics/trends');
  res.json(result.success ? result.data : { success: false, error: result.error });
});

// Alerts
router.get('/multi-property/alerts', async (req, res) => {
  const { severity, status } = req.query;
  let path = '/api/alerts?';
  if (severity) path += `severity=${severity}&`;
  if (status) path += `status=${status}&`;
  const result = await callService(SERVICES.multiProperty, path);
  res.json(result.success ? result.data : { success: false, error: result.error });
});

router.post('/multi-property/alerts', async (req, res) => {
  const result = await callService(SERVICES.multiProperty, '/api/alerts', 'POST', req.body);
  res.status(result.success ? 201 : 500).json(result.success ? result.data : { success: false, error: result.error });
});

// ==================== PREDICTIVE MAINTENANCE (5310) ====================

// Devices
router.get('/predictive/devices', async (req, res) => {
  const { category, status, minHealth } = req.query;
  let path = '/api/devices?';
  if (category) path += `category=${category}&`;
  if (status) path += `status=${status}&`;
  if (minHealth) path += `minHealth=${minHealth}&`;
  const result = await callService(SERVICES.predictiveMaint, path);
  res.json(result.success ? result.data : { success: false, error: result.error });
});

router.get('/predictive/devices/:id', async (req, res) => {
  const result = await callService(SERVICES.predictiveMaint, `/api/devices/${req.params.id}`);
  res.json(result.success ? result.data : { success: false, error: result.error });
});

// Sensors
router.get('/predictive/sensors', async (req, res) => {
  const { deviceId, type } = req.query;
  let path = '/api/sensors?';
  if (deviceId) path += `deviceId=${deviceId}&`;
  if (type) path += `type=${type}&`;
  const result = await callService(SERVICES.predictiveMaint, path);
  res.json(result.success ? result.data : { success: false, error: result.error });
});

router.get('/predictive/sensors/:id/readings', async (req, res) => {
  const { limit } = req.query;
  const path = limit ? `/api/sensors/${req.params.id}/readings?limit=${limit}` : `/api/sensors/${req.params.id}/readings`;
  const result = await callService(SERVICES.predictiveMaint, path);
  res.json(result.success ? result.data : { success: false, error: result.error });
});

router.post('/predictive/sensors/:id/readings', async (req, res) => {
  const result = await callService(SERVICES.predictiveMaint, `/api/sensors/${req.params.id}/readings`, 'POST', req.body);
  res.status(result.success ? 201 : 500).json(result.success ? result.data : { success: false, error: result.error });
});

// Predictions
router.get('/predictive/predictions', async (req, res) => {
  const { deviceId, type, minProbability } = req.query;
  let path = '/api/predictions?';
  if (deviceId) path += `deviceId=${deviceId}&`;
  if (type) path += `type=${type}&`;
  if (minProbability) path += `minProbability=${minProbability}&`;
  const result = await callService(SERVICES.predictiveMaint, path);
  res.json(result.success ? result.data : { success: false, error: result.error });
});

router.post('/predictive/predictions', async (req, res) => {
  const result = await callService(SERVICES.predictiveMaint, '/api/predictions', 'POST', req.body);
  res.status(result.success ? 201 : 500).json(result.success ? result.data : { success: false, error: result.error });
});

// Work Orders
router.get('/predictive/work-orders', async (req, res) => {
  const { deviceId, status, priority, type } = req.query;
  let path = '/api/work-orders?';
  if (deviceId) path += `deviceId=${deviceId}&`;
  if (status) path += `status=${status}&`;
  if (priority) path += `priority=${priority}&`;
  if (type) path += `type=${type}&`;
  const result = await callService(SERVICES.predictiveMaint, path);
  res.json(result.success ? result.data : { success: false, error: result.error });
});

router.post('/predictive/work-orders', async (req, res) => {
  const result = await callService(SERVICES.predictiveMaint, '/api/work-orders', 'POST', req.body);
  res.status(result.success ? 201 : 500).json(result.success ? result.data : { success: false, error: result.error });
});

router.put('/predictive/work-orders/:id', async (req, res) => {
  const result = await callService(SERVICES.predictiveMaint, `/api/work-orders/${req.params.id}`, 'PUT', req.body);
  res.json(result.success ? result.data : { success: false, error: result.error });
});

// Alerts
router.get('/predictive/alerts', async (req, res) => {
  const { severity, status } = req.query;
  let path = '/api/alerts?';
  if (severity) path += `severity=${severity}&`;
  if (status) path += `status=${status}&`;
  const result = await callService(SERVICES.predictiveMaint, path);
  res.json(result.success ? result.data : { success: false, error: result.error });
});

// Dashboard & Analytics
router.get('/predictive/dashboard', async (req, res) => {
  const result = await callService(SERVICES.predictiveMaint, '/api/dashboard');
  res.json(result.success ? result.data : { success: false, error: result.error });
});

router.get('/predictive/analytics/health-trends', async (req, res) => {
  const result = await callService(SERVICES.predictiveMaint, '/api/analytics/health-trends');
  res.json(result.success ? result.data : { success: false, error: result.error });
});

router.get('/predictive/analytics/maintenance', async (req, res) => {
  const result = await callService(SERVICES.predictiveMaint, '/api/analytics/maintenance');
  res.json(result.success ? result.data : { success: false, error: result.error });
});

// ==================== CROSS-SYSTEM WORKFLOWS ====================

// Hotel + Marketplace Integration
router.post('/cross/hotel-app-install', async (req, res) => {
  const { hotelId, appId, config } = req.body;

  // Install app for hotel
  const installResult = await callService(SERVICES.marketplace, '/api/installations', 'POST', {
    appId, hotelId, config
  });

  if (!installResult.success) {
    return res.status(500).json({ success: false, error: 'Installation failed' });
  }

  // Create digital twin for app
  const twinResult = await callService(SERVICES.twin, '/api/twins', 'POST', {
    type: 'app_installation',
    entityId: installResult.data.installation.id,
    metadata: { appId, hotelId }
  });

  res.json({
    success: true,
    installation: installResult.data,
    twin: twinResult.success ? twinResult.data : null
  });
});

// Property + Predictive Maintenance
router.get('/cross/property-equipment/:propertyId', async (req, res) => {
  // Get all devices for a property location
  const devicesResult = await callService(SERVICES.predictiveMaint, '/api/devices');
  const dashboardResult = await callService(SERVICES.predictiveMaint, '/api/dashboard');

  // Filter devices by location (simplified - in real app would use propertyId)
  const propertyDevices = devicesResult.success ? devicesResult.data.devices : [];

  res.json({
    success: true,
    propertyId: req.params.propertyId,
    totalDevices: propertyDevices.length,
    devices: propertyDevices.slice(0, 10),
    healthOverview: dashboardResult.success ? dashboardResult.data.dashboard.overview : null
  });
});

// Enterprise Analytics (Multi-Property + CXO)
router.get('/cross/enterprise-analytics', async (req, res) => {
  const portfolioResult = await callService(SERVICES.multiProperty, '/api/portfolio/overview');
  const cxoResult = await callService(SERVICES.cxo, '/health');

  res.json({
    success: true,
    enterprise: {
      portfolio: portfolioResult.success ? portfolioResult.data.portfolio : null,
      cxoConnected: cxoResult.success,
      generatedAt: new Date().toISOString()
    }
  });
});

module.exports = router;
