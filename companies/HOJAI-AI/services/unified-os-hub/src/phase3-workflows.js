/**
 * RTMN Unified Hub - Phase 3 Workflows
 * Energy Management + Security OS + API Platform
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');

// Service URLs
const SERVICES = {
  energy: 'http://localhost:5260',
  security: 'http://localhost:5270',
  apiPlatform: 'http://localhost:5280',
  hotel: 'http://localhost:5025',
  cxo: 'http://localhost:5100',
  operations: 'http://localhost:5250',
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
// ENERGY MANAGEMENT
// ============================================

router.get('/energy/health', async (req, res) => {
  const result = await callService(SERVICES.energy, '/health');
  res.json({ service: 'Energy Management OS', ...result });
});

router.get('/energy/dashboard', async (req, res) => {
  const result = await callService(SERVICES.energy, '/api/dashboard');
  res.json({ workflow: 'energy-dashboard', ...result });
});

router.get('/energy/consumption', async (req, res) => {
  const { building, period } = req.query;
  const result = await callService(SERVICES.energy, '/api/energy/consumption', 'GET', { params: { building, period } });
  res.json({ workflow: 'energy-consumption', ...result });
});

router.get('/energy/real-time', async (req, res) => {
  const result = await callService(SERVICES.energy, '/api/energy/real-time');
  res.json({ workflow: 'energy-realtime', ...result });
});

router.get('/energy/solar', async (req, res) => {
  const result = await callService(SERVICES.energy, '/api/solar');
  res.json({ workflow: 'solar-status', ...result });
});

router.get('/energy/carbon', async (req, res) => {
  const result = await callService(SERVICES.energy, '/api/carbon');
  res.json({ workflow: 'carbon-dashboard', ...result });
});

router.post('/energy/solar/optimize', async (req, res) => {
  const { weather, season } = req.body;
  const result = await callService(SERVICES.energy, '/api/solar/optimize', 'POST', { weather, season });
  res.json({ workflow: 'solar-optimization', ...result });
});

router.get('/energy/maintenance', async (req, res) => {
  const result = await callService(SERVICES.energy, '/api/maintenance/predict');
  res.json({ workflow: 'predictive-maintenance', ...result });
});

router.post('/energy/rooms/:id/control', async (req, res) => {
  const { ac, lights, temperature } = req.body;
  const result = await callService(SERVICES.energy, `/api/rooms/${req.params.id}/control`, 'PUT', { ac, lights, temperature });
  res.json({ workflow: 'room-control', ...result });
});

router.post('/energy/iot/simulate', async (req, res) => {
  const { action, targets } = req.body;
  const result = await callService(SERVICES.energy, '/api/iot/simulate', 'POST', { action, targets });
  res.json({ workflow: 'iot-simulation', ...result });
});

router.get('/energy/analytics/savings', async (req, res) => {
  const { period } = req.query;
  const result = await callService(SERVICES.energy, '/api/analytics/savings', 'GET', { params: { period } });
  res.json({ workflow: 'energy-savings', ...result });
});

// Hotel + Energy Integration
router.post('/hotel/energy/optimize', async (req, res) => {
  const { hotelId, mode } = req.body;

  // Get current energy
  const energyResult = await callService(SERVICES.energy, '/api/energy/consumption');

  // Get occupancy
  const occupancyResult = await callService(SERVICES.energy, '/api/rooms');

  // Apply optimization
  let action = 'normal';
  if (mode === 'eco') action = 'all_off';
  const controlResult = await callService(SERVICES.energy, '/api/iot/simulate', 'POST', { action, targets: [] });

  res.json({
    workflow: 'hotel-energy-optimization',
    hotelId,
    mode,
    energy: energyResult,
    occupancy: occupancyResult,
    control: controlResult
  });
});

// ============================================
// SECURITY MANAGEMENT
// ============================================

router.get('/security/health', async (req, res) => {
  const result = await callService(SERVICES.security, '/health');
  res.json({ service: 'Security OS', ...result });
});

router.get('/security/dashboard', async (req, res) => {
  const result = await callService(SERVICES.security, '/api/dashboard');
  res.json({ workflow: 'security-dashboard', ...result });
});

// Cameras
router.get('/security/cameras', async (req, res) => {
  const { zone, status } = req.query;
  const result = await callService(SERVICES.security, '/api/cameras', 'GET', { params: { zone, status } });
  res.json({ workflow: 'cameras-list', ...result });
});

router.get('/security/cameras/:id', async (req, res) => {
  const result = await callService(SERVICES.security, `/api/cameras/${req.params.id}`);
  res.json({ workflow: 'camera-details', ...result });
});

router.get('/security/cameras/:id/analytics', async (req, res) => {
  const result = await callService(SERVICES.security, `/api/cameras/${req.params.id}/analytics`);
  res.json({ workflow: 'camera-analytics', ...result });
});

// Face Recognition
router.post('/security/face/register', async (req, res) => {
  const { employeeId, name, photo, accessLevel } = req.body;
  const result = await callService(SERVICES.security, '/api/face/register', 'POST', { employeeId, name, photo, accessLevel });
  res.json({ workflow: 'face-registration', ...result });
});

router.post('/security/face/recognize', async (req, res) => {
  const { cameraId, image } = req.body;
  const result = await callService(SERVICES.security, '/api/face/recognize', 'POST', { cameraId, image });
  res.json({ workflow: 'face-recognition', ...result });
});

// Access Control
router.get('/security/access', async (req, res) => {
  const { type, status } = req.query;
  const result = await callService(SERVICES.security, '/api/access', 'GET', { params: { type, status } });
  res.json({ workflow: 'access-points', ...result });
});

router.post('/security/access/:id/unlock', async (req, res) => {
  const { reason, employeeId } = req.body;
  const result = await callService(SERVICES.security, `/api/access/${req.params.id}/unlock`, 'POST', { reason, employeeId });
  res.json({ workflow: 'access-unlock', ...result });
});

router.post('/security/access/:id/lock', async (req, res) => {
  const result = await callService(SERVICES.security, `/api/access/${req.params.id}/lock`, 'POST');
  res.json({ workflow: 'access-lock', ...result });
});

router.get('/security/access/logs', async (req, res) => {
  const { date, employeeId } = req.query;
  const result = await callService(SERVICES.security, '/api/access/logs', 'GET', { params: { date, employeeId } });
  res.json({ workflow: 'access-logs', ...result });
});

// Visitors
router.get('/security/visitors', async (req, res) => {
  const { status } = req.query;
  const result = await callService(SERVICES.security, '/api/visitors', 'GET', { params: { status } });
  res.json({ workflow: 'visitors-list', ...result });
});

router.post('/security/visitors', async (req, res) => {
  const { name, phone, purpose, host } = req.body;
  const result = await callService(SERVICES.security, '/api/visitors', 'POST', { name, phone, purpose, host });
  res.json({ workflow: 'visitor-registration', ...result });
});

router.post('/security/visitors/:id/checkin', async (req, res) => {
  const result = await callService(SERVICES.security, `/api/visitors/${req.params.id}/checkin`, 'POST');
  res.json({ workflow: 'visitor-checkin', ...result });
});

// Incidents
router.get('/security/incidents', async (req, res) => {
  const { severity, status } = req.query;
  const result = await callService(SERVICES.security, '/api/incidents', 'GET', { params: { severity, status } });
  res.json({ workflow: 'incidents-list', ...result });
});

router.post('/security/incidents', async (req, res) => {
  const { type, severity, location, description } = req.body;
  const result = await callService(SERVICES.security, '/api/incidents', 'POST', { type, severity, location, description });
  res.json({ workflow: 'incident-create', ...result });
});

// Alerts
router.get('/security/alerts', async (req, res) => {
  const { severity } = req.query;
  const result = await callService(SERVICES.security, '/api/alerts', 'GET', { params: { severity } });
  res.json({ workflow: 'alerts-list', ...result });
});

router.put('/security/alerts/:id/acknowledge', async (req, res) => {
  const result = await callService(SERVICES.security, `/api/alerts/${req.params.id}/acknowledge`, 'PUT');
  res.json({ workflow: 'alert-acknowledge', ...result });
});

// Emergency
router.get('/security/emergency/status', async (req, res) => {
  const result = await callService(SERVICES.security, '/api/emergency/status');
  res.json({ workflow: 'emergency-status', ...result });
});

router.post('/security/emergency/trigger', async (req, res) => {
  const { type, location, severity } = req.body;
  const result = await callService(SERVICES.security, '/api/emergency/trigger', 'POST', { type, location, severity });
  res.json({ workflow: 'emergency-trigger', ...result });
});

router.post('/security/emergency/evacuate', async (req, res) => {
  const { zones } = req.body;
  const result = await callService(SERVICES.security, '/api/emergency/evacuate', 'POST', { zones });
  res.json({ workflow: 'emergency-evacuation', ...result });
});

// ============================================
// API PLATFORM
// ============================================

router.get('/api/health', async (req, res) => {
  const result = await callService(SERVICES.apiPlatform, '/health');
  res.json({ service: 'API Platform', ...result });
});

router.get('/api/portal', async (req, res) => {
  const result = await callService(SERVICES.apiPlatform, '/portal');
  res.json({ workflow: 'developer-portal', ...result });
});

router.get('/api/docs', async (req, res) => {
  const result = await callService(SERVICES.apiPlatform, '/api/docs');
  res.json({ workflow: 'api-docs', ...result });
});

router.get('/api/docs/:id', async (req, res) => {
  const result = await callService(SERVICES.apiPlatform, `/api/docs/${req.params.id}`);
  res.json({ workflow: 'api-doc-details', ...result });
});

router.get('/api/sdks', async (req, res) => {
  const result = await callService(SERVICES.apiPlatform, '/api/sdks');
  res.json({ workflow: 'sdk-list', ...result });
});

router.get('/api/sdks/:id', async (req, res) => {
  const result = await callService(SERVICES.apiPlatform, `/api/sdks/${req.params.id}`);
  res.json({ workflow: 'sdk-details', ...result });
});

// Developer
router.post('/api/developers/register', async (req, res) => {
  const { name, email, company } = req.body;
  const result = await callService(SERVICES.apiPlatform, '/api/developers/register', 'POST', { name, email, company });
  res.json({ workflow: 'developer-registration', ...result });
});

router.post('/api/keys', async (req, res) => {
  const { developerId, name, scopes } = req.body;
  const result = await callService(SERVICES.apiPlatform, '/api/keys', 'POST', { developerId, name, scopes });
  res.json({ workflow: 'api-key-creation', ...result });
});

router.get('/api/keys', async (req, res) => {
  const { developerId } = req.query;
  const result = await callService(SERVICES.apiPlatform, '/api/keys', 'GET', { params: { developerId } });
  res.json({ workflow: 'api-keys-list', ...result });
});

// Webhooks
router.post('/api/webhooks', async (req, res) => {
  const { developerId, url, events } = req.body;
  const result = await callService(SERVICES.apiPlatform, '/api/webhooks', 'POST', { developerId, url, events });
  res.json({ workflow: 'webhook-creation', ...result });
});

router.get('/api/webhooks', async (req, res) => {
  const { developerId } = req.query;
  const result = await callService(SERVICES.apiPlatform, '/api/webhooks', 'GET', { params: { developerId } });
  res.json({ workflow: 'webhooks-list', ...result });
});

// Analytics
router.get('/api/analytics', async (req, res) => {
  const { developerId } = req.query;
  const result = await callService(SERVICES.apiPlatform, '/api/analytics', 'GET', { params: { developerId } });
  res.json({ workflow: 'api-analytics', ...result });
});

// ============================================
// CROSS-SYSTEM INTEGRATIONS
// ============================================

// Hotel + Security
router.post('/hotel/security/checkin', async (req, res) => {
  const { guestId, room, name } = req.body;

  // Register visitor
  const visitorResult = await callService(SERVICES.security, '/api/visitors', 'POST', {
    name: `Guest: ${name}`,
    purpose: 'Hotel Stay',
    room
  });

  // Register face
  const faceResult = await callService(SERVICES.security, '/api/face/register', 'POST', {
    employeeId: guestId,
    name,
    accessLevel: 3
  });

  // Unlock room access
  const accessResult = await callService(SERVICES.security, '/api/access/AP001/unlock', 'POST', {
    reason: 'Guest check-in',
    employeeId: guestId
  });

  res.json({
    workflow: 'hotel-security-checkin',
    guestId,
    visitor: visitorResult,
    face: faceResult,
    access: accessResult
  });
});

// Hotel + Energy + Security Integration
router.post('/hotel/comprehensive', async (req, res) => {
  const { hotelId, action } = req.body;

  // Energy
  const energyResult = await callService(SERVICES.energy, '/api/dashboard');

  // Security
  const securityResult = await callService(SERVICES.security, '/api/dashboard');

  // Operations based on action
  let operation = {};
  if (action === 'lockdown') {
    await callService(SERVICES.security, '/api/emergency/evacuate', 'POST');
    await callService(SERVICES.energy, '/api/iot/simulate', 'POST', { action: 'all_off' });
    operation = { action: 'lockdown', message: 'Building secured, energy optimized' };
  } else if (action === 'night_mode') {
    await callService(SERVICES.energy, '/api/iot/simulate', 'POST', { action: 'all_off' });
    operation = { action: 'night_mode', message: 'Energy reduced for night' };
  }

  res.json({
    workflow: 'hotel-comprehensive',
    hotelId,
    energy: energyResult,
    security: securityResult,
    operation
  });
});

// ============================================
// UTILITY
// ============================================

router.get('/status', async (req, res) => {
  const energy = await callService(SERVICES.energy, '/health');
  const security = await callService(SERVICES.security, '/health');
  const apiPlatform = await callService(SERVICES.apiPlatform, '/health');

  res.json({
    phase3: {
      energyManagement: energy.success,
      security: security.success,
      apiPlatform: apiPlatform.success
    },
    services: {
      energy: energy.success ? 'operational' : 'offline',
      security: security.success ? 'operational' : 'offline',
      apiPlatform: apiPlatform.success ? 'operational' : 'offline'
    }
  });
});

module.exports = router;
