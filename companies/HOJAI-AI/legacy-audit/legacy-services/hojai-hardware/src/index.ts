/**
 * Hojai Hardware Service
 * AI Device Management Platform
 *
 * Features:
 * - Genie Pin (Wearable AI)
 * - Merchant AI Terminal
 * - CorpID Smart ID
 * - REZ Smart QR Reader
 * - Device provisioning
 * - OTA updates
 * - Device management
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = process.env.PORT || 4350;

app.use(express.json({ limit: "10kb" }));
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(helmet());

// ============================================
// TYPES
// ============================================

interface Device {
  id: string;
  deviceType: 'genie_pin' | 'merchant_terminal' | 'smart_id' | 'qr_reader' | 'home_hub';
  serialNumber: string;
  model: string;
  firmware: string;
  ownerId: string;
  ownerType: 'user' | 'merchant' | 'business';
  status: 'inactive' | 'active' | 'suspended' | 'stolen' | 'factory_resetted';
  battery?: number;
  lastSeen?: Date;
  location?: { lat: number; lng: number };
  provisioningStatus: 'unprovisioned' | 'provisioning' | 'provisioned';
  provisioningData?: Record<string, unknown>;
  settings: Record<string, unknown>;
  createdAt: Date;
  activatedAt?: Date;
}

interface GeniePin extends Device {
  deviceType: 'genie_pin';
  voiceActivated: boolean;
  alwaysListening: boolean;
  ledColor: string;
  tapGestures: boolean;
  hapticFeedback: boolean;
}

interface MerchantTerminal extends Device {
  deviceType: 'merchant_terminal';
  screenSize: number;
  hasPrinter: boolean;
  hasScanner: boolean;
  hasCamera: boolean;
  paymentModes: string[];
  connectedPeripherals: string[];
}

interface SmartID extends Device {
  deviceType: 'smart_id';
  idType: 'aadhaar' | 'pan' | 'driving_license' | 'voter_id';
  nfcEnabled: boolean;
  biometricEnabled: boolean;
  qrEnabled: boolean;
}

interface QRReader extends Device {
  deviceType: 'qr_reader';
  scanRange: number;
  hasNFC: boolean;
  hasBarcode: boolean;
  supportedFormats: string[];
}

interface OTAUpdate {
  id: string;
  deviceType: string;
  version: string;
  releaseNotes: string;
  mandatory: boolean;
  rolloutPercentage: number;
  status: 'draft' | 'testing' | 'staged' | 'rolling_out' | 'completed';
  devicesUpdated: number;
  successRate: number;
  createdAt: Date;
}

interface DeviceEvent {
  id: string;
  deviceId: string;
  eventType: string;
  data: Record<string, unknown>;
  timestamp: Date;
}

interface DeviceCommand {
  id: string;
  deviceId: string;
  command: string;
  params?: Record<string, unknown>;
  status: 'pending' | 'sent' | 'delivered' | 'executed' | 'failed';
  sentAt?: Date;
  deliveredAt?: Date;
  executedAt?: Date;
  result?: unknown;
}

// In-memory stores
const devices = new Map<string, Device>();
const otaUpdates = new Map<string, OTAUpdate>();
const deviceEvents = new Map<string, DeviceEvent>();
const deviceCommands = new Map<string, DeviceCommand>();

// ============================================
// SEED DATA
// ============================================

function seedData() {
  // Sample Genie Pin
  const geniePin: GeniePin = {
    id: 'device-genie-001',
    deviceType: 'genie_pin',
    serialNumber: 'GP-2026-001234',
    model: 'Genie Pin Pro',
    firmware: '1.0.5',
    ownerId: 'user-001',
    ownerType: 'user',
    status: 'active',
    battery: 87,
    lastSeen: new Date(),
    location: { lat: 19.0760, lng: 72.8777 },
    provisioningStatus: 'provisioned',
    activatedAt: new Date('2026-01-15'),
    createdAt: new Date('2026-01-10'),
    voiceActivated: true,
    alwaysListening: true,
    ledColor: '#00FF00',
    tapGestures: true,
    hapticFeedback: true,
    settings: { language: 'en', wakeWord: 'Hey Genie' }
  };
  devices.set(geniePin.id, geniePin);

  // Sample Merchant Terminal
  const terminal: MerchantTerminal = {
    id: 'device-term-001',
    deviceType: 'merchant_terminal',
    serialNumber: 'MT-2026-005678',
    model: 'REZ Smart POS Pro',
    firmware: '2.1.0',
    ownerId: 'merchant-001',
    ownerType: 'merchant',
    status: 'active',
    battery: 100,
    lastSeen: new Date(),
    location: { lat: 18.9220, lng: 72.8337 },
    provisioningStatus: 'provisioned',
    activatedAt: new Date('2026-02-20'),
    createdAt: new Date('2026-02-15'),
    screenSize: 10.1,
    hasPrinter: true,
    hasScanner: true,
    hasCamera: true,
    paymentModes: ['upi', 'card', 'cash', 'wallet', 'bnpl'],
    connectedPeripherals: ['receipt_printer', 'barcode_scanner', 'cash_drawer'],
    settings: { merchantName: 'Quick Mart', gstin: '27AABCU9603R1ZM' }
  };
  devices.set(terminal.id, terminal);

  // Sample QR Reader
  const qrReader: QRReader = {
    id: 'device-qr-001',
    deviceType: 'qr_reader',
    serialNumber: 'QR-2026-009012',
    model: 'REZ Pro Scanner',
    firmware: '1.5.2',
    ownerId: 'merchant-002',
    ownerType: 'merchant',
    status: 'active',
    lastSeen: new Date(),
    provisioningStatus: 'provisioned',
    activatedAt: new Date('2026-03-01'),
    createdAt: new Date('2026-02-25'),
    scanRange: 10,
    hasNFC: true,
    hasBarcode: true,
    supportedFormats: ['qr', 'ean', 'upc', 'code128', 'code39'],
    settings: { beepOnScan: true, vibrationOnScan: true }
  };
  devices.set(qrReader.id, qrReader);

  console.log(`Seeded ${devices.size} devices`);
}

// ============================================
// HEALTH CHECK
// ============================================

app.get('/health', (_req, res) => {
  res.json({
    service: 'hojai-hardware',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    stats: {
      totalDevices: devices.size,
      activeDevices: Array.from(devices.values()).filter(d => d.status === 'active').length,
      byType: {
        genie_pin: Array.from(devices.values()).filter(d => d.deviceType === 'genie_pin').length,
        merchant_terminal: Array.from(devices.values()).filter(d => d.deviceType === 'merchant_terminal').length,
        smart_id: Array.from(devices.values()).filter(d => d.deviceType === 'smart_id').length,
        qr_reader: Array.from(devices.values()).filter(d => d.deviceType === 'qr_reader').length
      }
    }
  });
});

// ============================================
// DEVICE APIs
// ============================================

// Register device
app.post('/api/devices', (req, res) => {
  const { deviceType, serialNumber, model, ownerId, ownerType } = req.body;

  if (!deviceType || !serialNumber || !model) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'deviceType, serialNumber, and model are required' }
    });
    return;
  }

  // Check if serial exists
  const existing = Array.from(devices.values()).find(d => d.serialNumber === serialNumber);
  if (existing) {
    res.status(400).json({
      success: false,
      error: { code: 'DUPLICATE', message: 'Device with this serial number already exists' }
    });
    return;
  }

  const id = `device-${uuidv4().slice(0, 8)}`;
  const device: Device = {
    id,
    deviceType,
    serialNumber,
    model,
    firmware: '1.0.0',
    ownerId: ownerId || '',
    ownerType: ownerType || 'user',
    status: 'inactive',
    provisioningStatus: 'unprovisioned',
    settings: {},
    createdAt: new Date()
  };

  devices.set(id, device);
  res.status(201).json({ success: true, data: device });
});

// Provision device
app.post('/api/devices/:id/provision', (req, res) => {
  const device = devices.get(req.params.id);

  if (!device) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Device not found' }
    });
    return;
  }

  const { ownerId, ownerType, settings } = req.body;

  device.ownerId = ownerId || device.ownerId;
  device.ownerType = ownerType || device.ownerType;
  device.provisioningStatus = 'provisioned';
  device.status = 'active';
  device.activatedAt = new Date();
  device.settings = { ...device.settings, ...settings };

  devices.set(device.id, device);

  res.json({ success: true, data: device });
});

// Get device
app.get('/api/devices/:id', (req, res) => {
  const device = devices.get(req.params.id);

  if (!device) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Device not found' }
    });
    return;
  }

  res.json({ success: true, data: device });
});

// Get device by serial
app.get('/api/devices/serial/:serialNumber', (req, res) => {
  const device = Array.from(devices.values()).find(d => d.serialNumber === req.params.serialNumber);

  if (!device) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Device not found' }
    });
    return;
  }

  res.json({ success: true, data: device });
});

// List devices
app.get('/api/devices', (req, res) => {
  const { ownerId, ownerType, deviceType, status } = req.query;
  let results = Array.from(devices.values());

  if (ownerId) results = results.filter(d => d.ownerId === String(ownerId));
  if (ownerType) results = results.filter(d => d.ownerType === ownerType);
  if (deviceType) results = results.filter(d => d.deviceType === deviceType);
  if (status) results = results.filter(d => d.status === status);

  res.json({ success: true, data: results, meta: { total: results.length } });
});

// Update device
app.patch('/api/devices/:id', (req, res) => {
  const device = devices.get(req.params.id);

  if (!device) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Device not found' }
    });
    return;
  }

  Object.assign(device, req.body);
  devices.set(device.id, device);

  res.json({ success: true, data: device });
});

// Suspend device
app.post('/api/devices/:id/suspend', (req, res) => {
  const device = devices.get(req.params.id);

  if (!device) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Device not found' }
    });
    return;
  }

  device.status = 'suspended';
  devices.set(device.id, device);

  res.json({ success: true, data: device });
});

// Report stolen
app.post('/api/devices/:id/report-stolen', (req, res) => {
  const device = devices.get(req.params.id);

  if (!device) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Device not found' }
    });
    return;
  }

  device.status = 'stolen';
  devices.set(device.id, device);

  res.json({ success: true, data: device, message: 'Device reported as stolen' });
});

// Factory reset
app.post('/api/devices/:id/factory-reset', (req, res) => {
  const device = devices.get(req.params.id);

  if (!device) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Device not found' }
    });
    return;
  }

  device.status = 'inactive';
  device.provisioningStatus = 'unprovisioned';
  device.ownerId = '';
  device.settings = {};
  device.activatedAt = undefined;
  devices.set(device.id, device);

  res.json({ success: true, data: device, message: 'Device factory reset complete' });
});

// ============================================
// DEVICE HEARTBEAT
// ============================================

app.post('/api/devices/:id/heartbeat', (req, res) => {
  const device = devices.get(req.params.id);

  if (!device) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Device not found' }
    });
    return;
  }

  device.lastSeen = new Date();
  if (req.body.battery !== undefined) device.battery = req.body.battery;
  if (req.body.location) device.location = req.body.location;

  devices.set(device.id, device);

  // Log event
  const event: DeviceEvent = {
    id: `event-${uuidv4().slice(0, 8)}`,
    deviceId: device.id,
    eventType: 'heartbeat',
    data: { battery: device.battery, location: device.location },
    timestamp: new Date()
  };
  deviceEvents.set(event.id, event);

  res.json({ success: true, timestamp: device.lastSeen });
});

// ============================================
// DEVICE COMMANDS
// ============================================

// Send command to device
app.post('/api/devices/:id/commands', (req, res) => {
  const device = devices.get(req.params.id);

  if (!device) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Device not found' }
    });
    return;
  }

  const { command, params } = req.body;

  if (!command) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'command is required' }
    });
    return;
  }

  const id = `cmd-${uuidv4().slice(0, 8)}`;
  const cmd: DeviceCommand = {
    id,
    deviceId: device.id,
    command,
    params,
    status: 'pending'
  };

  deviceCommands.set(id, cmd);

  // In production, would queue command for delivery via MQTT or similar
  setTimeout(() => {
    cmd.status = 'sent';
    cmd.sentAt = new Date();
    deviceCommands.set(cmd.id, cmd);
  }, 100);

  res.status(201).json({ success: true, data: cmd });
});

// Get command status
app.get('/api/devices/:id/commands/:commandId', (req, res) => {
  const cmd = deviceCommands.get(req.params.commandId);

  if (!cmd) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Command not found' }
    });
    return;
  }

  res.json({ success: true, data: cmd });
});

// Device reports command result
app.post('/api/devices/:id/commands/:commandId/result', (req, res) => {
  const cmd = deviceCommands.get(req.params.commandId);

  if (!cmd) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Command not found' }
    });
    return;
  }

  const { status, result } = req.body;

  if (status === 'executed' || status === 'delivered') {
    cmd.status = status;
    cmd.executedAt = new Date();
    cmd.result = result;
  } else if (status === 'failed') {
    cmd.status = 'failed';
    cmd.result = result;
  }

  deviceCommands.set(cmd.id, cmd);

  res.json({ success: true, data: cmd });
});

// ============================================
// OTA UPDATES
// ============================================

// Create OTA update
app.post('/api/ota', (req, res) => {
  const { deviceType, version, releaseNotes, mandatory, rolloutPercentage } = req.body;

  if (!deviceType || !version) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'deviceType and version are required' }
    });
    return;
  }

  const id = `ota-${uuidv4().slice(0, 8)}`;
  const update: OTAUpdate = {
    id,
    deviceType,
    version,
    releaseNotes: releaseNotes || '',
    mandatory: mandatory || false,
    rolloutPercentage: rolloutPercentage || 0,
    status: 'draft',
    devicesUpdated: 0,
    successRate: 0,
    createdAt: new Date()
  };

  otaUpdates.set(id, update);
  res.status(201).json({ success: true, data: update });
});

// List OTA updates
app.get('/api/ota', (req, res) => {
  const { deviceType, status } = req.query;
  let results = Array.from(otaUpdates.values());

  if (deviceType) results = results.filter(u => u.deviceType === deviceType);
  if (status) results = results.filter(u => u.status === status);

  results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  res.json({ success: true, data: results });
});

// Get update for device
app.get('/api/devices/:id/update', (req, res) => {
  const device = devices.get(req.params.id);

  if (!device) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Device not found' }
    });
    return;
  }

  // Find available update
  const availableUpdate = Array.from(otaUpdates.values())
    .filter(u => u.deviceType === device.deviceType)
    .filter(u => u.status === 'rolling_out' || u.status === 'staged')
    .filter(u => compareVersions(u.version, device.firmware) > 0)
    .sort((a, b) => compareVersions(b.version, a.version))[0];

  if (!availableUpdate) {
    res.json({ success: true, data: { update: null, message: 'Device is up to date' } });
    return;
  }

  res.json({
    success: true,
    data: {
      update: {
        id: availableUpdate.id,
        version: availableUpdate.version,
        releaseNotes: availableUpdate.releaseNotes,
        mandatory: availableUpdate.mandatory,
        downloadUrl: `/api/ota/${availableUpdate.id}/firmware`
      }
    }
  });
});

// Check for update
function compareVersions(a: string, b: string): number {
  const partsA = a.split('.').map(Number);
  const partsB = b.split('.').map(Number);
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const pA = partsA[i] || 0;
    const pB = partsB[i] || 0;
    if (pA > pB) return 1;
    if (pA < pB) return -1;
  }
  return 0;
}

// Report update result
app.post('/api/devices/:id/update/result', (req, res) => {
  const { updateId, success, fromVersion, toVersion } = req.body;
  const device = devices.get(req.params.id);

  if (!device) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Device not found' }
    });
    return;
  }

  if (success && toVersion) {
    device.firmware = toVersion;
    devices.set(device.id, device);

    // Update OTA stats
    const update = otaUpdates.get(updateId);
    if (update) {
      update.devicesUpdated++;
      update.successRate = (update.devicesUpdated / (update.devicesUpdated + 1)) * 100;
      otaUpdates.set(update.id, update);
    }
  }

  res.json({ success: true });
});

// ============================================
// DEVICE EVENTS
// ============================================

// Get device events
app.get('/api/devices/:id/events', (req, res) => {
  const { type, limit = 100 } = req.query;
  let events = Array.from(deviceEvents.values())
    .filter(e => e.deviceId === req.params.id);

  if (type) events = events.filter(e => e.eventType === String(type));

  events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  res.json({ success: true, data: events.slice(0, Number(limit)) });
});

// ============================================
// ANALYTICS
// ============================================

app.get('/api/analytics', (_req, res) => {
  const allDevices = Array.from(devices.values());

  const byType = {
    genie_pin: allDevices.filter(d => d.deviceType === 'genie_pin'),
    merchant_terminal: allDevices.filter(d => d.deviceType === 'merchant_terminal'),
    smart_id: allDevices.filter(d => d.deviceType === 'smart_id'),
    qr_reader: allDevices.filter(d => d.deviceType === 'qr_reader')
  };

  res.json({
    success: true,
    data: {
      totalDevices: allDevices.length,
      activeDevices: allDevices.filter(d => d.status === 'active').length,
      inactiveDevices: allDevices.filter(d => d.status === 'inactive').length,
      stolenDevices: allDevices.filter(d => d.status === 'stolen').length,
      byType: {
        genie_pin: {
          total: byType.genie_pin.length,
          active: byType.genie_pin.filter(d => d.status === 'active').length
        },
        merchant_terminal: {
          total: byType.merchant_terminal.length,
          active: byType.merchant_terminal.filter(d => d.status === 'active').length
        },
        smart_id: {
          total: byType.smart_id.length,
          active: byType.smart_id.filter(d => d.status === 'active').length
        },
        qr_reader: {
          total: byType.qr_reader.length,
          active: byType.qr_reader.filter(d => d.status === 'active').length
        }
      },
      otaUpdates: {
        total: otaUpdates.size,
        inProgress: Array.from(otaUpdates.values()).filter(u => u.status === 'rolling_out').length
      }
    }
  });
});

// ============================================
// ERROR HANDLER
// ============================================

app.use((err: Error, _req: Request, res: Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Internal server error' }
  });
});

// Start server
seedData();
app.listen(PORT, () => {
  console.log(`Hojai Hardware Service running on port ${PORT}`);
  console.log(`📱 ${devices.size} devices registered`);
});

export default app;
