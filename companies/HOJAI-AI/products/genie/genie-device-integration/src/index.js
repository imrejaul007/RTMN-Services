/**
 * Genie Device Integration Service
 * Connects phones, watches, earbuds, glasses, cars
 * Port: 4769
 *
 * Endpoints:
 *   GET  /health                       - health
 *   GET  /api/device-types             - list supported device types + brands
 *   GET  /api/devices                  - list paired devices
 *   GET  /api/devices/:id              - get one
 *   POST /api/devices                  - pair/register a device
 *   DELETE /api/devices/:id            - unpair
 *   POST /api/devices/:id/handoff      - handoff active session to this device
 *   GET  /api/devices/by-user/:userId  - list devices for user
 *   GET  /api/capabilities/:type       - list capabilities of a device type
 *   POST /api/pair/code                - generate pairing code
 *   POST /api/pair/redeem              - redeem pairing code
 *   GET  /api/statistics               - device stats
 */

const express = require('express');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { requireAuth } = require('@rtmn/shared/auth');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');

const app = express();

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
const PORT = process.env.PORT || 4769;
const SERVICE_NAME = 'genie-device-integration';
const SERVICE_VERSION = '1.0.0';

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json());

const DEVICE_TYPES = {
  smartphone: {
    name: 'Smartphone',
    brands: ['iOS', 'Android'],
    capabilities: ['voice', 'touch', 'display', 'gps', 'notifications', 'camera', 'biometric'],
  },
  smartwatch: {
    name: 'Smartwatch',
    brands: ['Apple Watch', 'Galaxy Watch', 'Wear OS'],
    capabilities: ['voice', 'touch', 'haptic', 'heart-rate', 'gps'],
  },
  earbuds: {
    name: 'Earbuds',
    brands: ['AirPods', 'Galaxy Buds', 'Sony'],
    capabilities: ['voice', 'audio', 'haptic'],
  },
  glasses: {
    name: 'Smart Glasses',
    brands: ['Ray-Ban Meta', 'Snap Spectacles'],
    capabilities: ['voice', 'camera', 'display', 'gps'],
  },
  car: {
    name: 'Car',
    brands: ['Android Auto', 'CarPlay', 'Tesla'],
    capabilities: ['voice', 'audio', 'gps', 'display', 'climate'],
  },
  laptop: {
    name: 'Laptop',
    brands: ['Windows', 'macOS', 'Chrome OS'],
    capabilities: ['voice', 'keyboard', 'display', 'camera', 'biometric'],
  },
};

const devices = new PersistentMap('devices', { serviceName: 'genie-device-integration' });
const pairingCodes = new PersistentMap('pairing-codes', { serviceName: 'genie-device-integration' });
const handoffs = [];

function seed() {
  const seedDevices = [
    { id: 'dev-001', type: 'smartphone', brand: 'iOS', model: 'iPhone 15', userId: 'user-001', paired: true, status: 'online', capabilities: DEVICE_TYPES.smartphone.capabilities },
    { id: 'dev-002', type: 'smartwatch', brand: 'Apple Watch', model: 'Series 9', userId: 'user-001', paired: true, status: 'online', capabilities: DEVICE_TYPES.smartwatch.capabilities },
    { id: 'dev-003', type: 'earbuds', brand: 'AirPods', model: 'Pro 2', userId: 'user-002', paired: true, status: 'offline', capabilities: DEVICE_TYPES.earbuds.capabilities },
    { id: 'dev-004', type: 'glasses', brand: 'Ray-Ban Meta', model: 'Wayfarer', userId: 'user-002', paired: true, status: 'online', capabilities: DEVICE_TYPES.glasses.capabilities },
    { id: 'dev-005', type: 'car', brand: 'Tesla', model: 'Model 3', userId: 'user-003', paired: true, status: 'online', capabilities: DEVICE_TYPES.car.capabilities },
  ];
  seedDevices.forEach(d => devices.set(d.id, d));
}
seed();

app.get('/health', (req, res) => {
  const online = Array.from(devices.values()).filter(d => d.status === 'online').length;
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    version: SERVICE_VERSION,
    port: PORT,
    counts: {
      deviceTypes: Object.keys(DEVICE_TYPES).length,
      devices: devices.size,
      online,
      handoffs: handoffs.length,
    },
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/device-types', (req, res) => {
  res.json({ deviceTypes: DEVICE_TYPES, total: Object.keys(DEVICE_TYPES).length });
});

app.get('/api/devices', (req, res) => {
  const userId = req.query.userId;
  let list = Array.from(devices.values());
  if (userId) list = list.filter(d => d.userId === userId);
  res.json({ devices: list, total: list.length });
});

app.get('/api/devices/:id', (req, res) => {
  const d = devices.get(req.params.id);
  if (!d) return res.status(404).json({ error: 'Device not found' });
  res.json(d);
});

app.post('/api/devices',requireAuth,  (req, res) => {
  const { type, brand, model, userId } = req.body;
  if (!type || !DEVICE_TYPES[type]) return res.status(400).json({ error: 'valid type required', available: Object.keys(DEVICE_TYPES) });
  const id = 'dev-' + uuidv4().slice(0, 8);
  const device = {
    id,
    type,
    brand: brand || DEVICE_TYPES[type].brands[0],
    model: model || 'unknown',
    userId: userId || 'default',
    paired: true,
    status: 'online',
    capabilities: DEVICE_TYPES[type].capabilities,
    pairedAt: new Date().toISOString(),
    lastSeen: new Date().toISOString(),
  };
  devices.set(id, device);
  res.status(201).json(device);
});

app.delete('/api/devices/:id',requireAuth,  (req, res) => {
  if (!devices.has(req.params.id)) return res.status(404).json({ error: 'Device not found' });
  devices.delete(req.params.id);
  res.json({ deleted: true, id: req.params.id });
});

app.post('/api/devices/:id/handoff',requireAuth,  (req, res) => {
  const target = devices.get(req.params.id);
  if (!target) return res.status(404).json({ error: 'Target device not found' });
  const { fromDeviceId, sessionId } = req.body;
  const handoff = {
    id: uuidv4(),
    fromDeviceId,
    toDeviceId: req.params.id,
    sessionId: sessionId || uuidv4(),
    status: 'completed',
    timestamp: new Date().toISOString(),
  };
  handoffs.push(handoff);
  res.status(201).json(handoff);
});

app.get('/api/devices/by-user/:userId', (req, res) => {
  const list = Array.from(devices.values()).filter(d => d.userId === req.params.userId);
  res.json({ devices: list, total: list.length, userId: req.params.userId });
});

app.get('/api/capabilities/:type', (req, res) => {
  const t = DEVICE_TYPES[req.params.type];
  if (!t) return res.status(404).json({ error: 'Device type not found' });
  res.json({ type: req.params.type, capabilities: t.capabilities });
});

app.post('/api/pair/code',requireAuth,  (req, res) => {
  const { userId, deviceType } = req.body;
  const code = Math.random().toString(36).slice(2, 8).toUpperCase();
  const entry = {
    code,
    userId: userId || 'default',
    deviceType: deviceType || 'smartphone',
    expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    used: false,
  };
  pairingCodes.set(code, entry);
  res.status(201).json(entry);
});

app.post('/api/pair/redeem',requireAuth,  (req, res) => {
  const { code, brand, model } = req.body;
  const entry = pairingCodes.get(code);
  if (!entry) return res.status(404).json({ error: 'Invalid pairing code' });
  if (entry.used) return res.status(409).json({ error: 'Code already used' });
  if (new Date(entry.expiresAt) < new Date()) return res.status(410).json({ error: 'Code expired' });
  entry.used = true;
  entry.redeemedAt = new Date().toISOString();
  // Auto-create device
  const id = 'dev-' + uuidv4().slice(0, 8);
  const device = {
    id,
    type: entry.deviceType,
    brand: brand || DEVICE_TYPES[entry.deviceType].brands[0],
    model: model || 'unknown',
    userId: entry.userId,
    paired: true,
    status: 'online',
    capabilities: DEVICE_TYPES[entry.deviceType].capabilities,
    pairedAt: new Date().toISOString(),
  };
  devices.set(id, device);
  res.json({ device, pairing: entry });
});

app.get('/api/statistics', (req, res) => {
  const byType = {};
  const byStatus = { online: 0, offline: 0 };
  for (const d of devices.values()) {
    byType[d.type] = (byType[d.type] || 0) + 1;
    byStatus[d.status] = (byStatus[d.status] || 0) + 1;
  }
  res.json({ total: devices.size, byType, byStatus, handoffs: handoffs.length });
});

app.use((req, res) => res.status(404).json({ error: 'Route not found', path: req.path }));
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



const server = app.listen(PORT, () => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  Genie Device Integration v${SERVICE_VERSION}`);
  console.log(`  Listening on :${PORT}`);
  console.log(`  Device types: ${Object.keys(DEVICE_TYPES).join(', ')}`);
  console.log(`  Paired devices: ${devices.size}`);
  console.log(`${'='.repeat(60)}\n`);
});
installGracefulShutdown(server);
