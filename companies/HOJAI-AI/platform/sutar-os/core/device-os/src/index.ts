import { requireAuth } from '@rtmn/shared/auth';
/**
 * Device OS - Production Implementation
 * Device fleet management, groups, configurations
 * Port: 4868
 */
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4868;
const START_TIME = Date.now();
app.use(helmet()); app.use(cors()); app.use(express.json());

// ============ TYPES ============
interface Device { id: string; name: string; type: string; group: string; status: string; firmware: string; lastSeen: string; config: Record<string, unknown>; tags: string[]; metadata: Record<string, string>; location?: string; }
interface DeviceGroup { id: string; name: string; description: string; deviceCount: number; color: string; }
interface DeviceConfig { id: string; deviceId: string; config: Record<string, unknown>; appliedAt: string; appliedBy: string; }
interface Firmware { id: string; version: string; type: string; size: number; releaseNotes: string; releasedAt: string; }

const devices = new Map<string, Device>();
const groups = new Map<string, DeviceGroup>();
const configs = new Map<string, DeviceConfig>();
const firmwares = new Map<string, Firmware>();

// Seed defaults
groups.set('default', { id: 'default', name: 'Default', description: 'Default device group', deviceCount: 0, color: '#888888' });
groups.set('production', { id: 'production', name: 'Production', description: 'Production devices', deviceCount: 0, color: '#0066FF' });
groups.set('staging', { id: 'staging', name: 'Staging', description: 'Staging devices', deviceCount: 0, color: '#FF6B35' });

// Seed firmware
firmwares.set('1.0.0', { id: 'fw-1.0.0', version: '1.0.0', type: 'release', size: 5000000, releaseNotes: 'Initial release', releasedAt: '2024-01-01' });
firmwares.set('1.1.0', { id: 'fw-1.1.0', version: '1.1.0', type: 'release', size: 5500000, releaseNotes: 'Bug fixes and improvements', releasedAt: '2024-02-01' });
firmwares.set('2.0.0', { id: 'fw-2.0.0', version: '2.0.0', type: 'release', size: 8000000, releaseNotes: 'Major update with new features', releasedAt: '2024-03-01' });

// ============ HEALTH ============
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'device-os', uptime: Math.floor((Date.now() - START_TIME) / 1000), devices: devices.size }));
app.get('/ready', (_req, res) => res.json({ ready: true }));

// ============ DEVICES ============
app.get('/api/devices', (req, res) => {
  let result = Array.from(devices.values());
  if (req.query.group) result = result.filter(d => d.group === req.query.group);
  if (req.query.type) result = result.filter(d => d.type === req.query.type);
  if (req.query.status) result = result.filter(d => d.status === req.query.status);
  if (req.query.tag) result = result.filter(d => d.tags.includes(req.query.tag as string));
  res.json({ total: result.length, devices: result });
});

app.get('/api/devices/:id', (req, res) => {
  const device = devices.get(req.params.id);
  if (!device) return res.status(404).json({ error: 'Device not found' });
  const deviceConfigs = Array.from(configs.values()).filter(c => c.deviceId === device.id);
  res.json({ ...device, configs: deviceConfigs });
});

app.post('/api/devices',requireAuth,  (req, res) => {
  const { name, type, group, config, tags, metadata, location } = req.body;
  if (!name || !type) return res.status(400).json({ error: 'name, type required' });
  const id = uuidv4();
  devices.set(id, { id, name, type, group: group || 'default', status: 'active', firmware: '1.0.0', lastSeen: new Date().toISOString(), config: config || {}, tags: tags || [], metadata: metadata || {}, location });
  const g = groups.get(group || 'default');
  if (g) g.deviceCount++;
  res.status(201).json(devices.get(id));
});

app.put('/api/devices/:id',requireAuth,  (req, res) => {
  const device = devices.get(req.params.id);
  if (!device) return res.status(404).json({ error: 'Device not found' });
  const { name, type, status, tags, metadata, location } = req.body;
  if (name) device.name = name;
  if (type) device.type = type;
  if (status) device.status = status;
  if (tags) device.tags = tags;
  if (metadata) device.metadata = { ...device.metadata, ...metadata };
  if (location) device.location = location;
  device.lastSeen = new Date().toISOString();
  res.json(device);
});

app.delete('/api/devices/:id',requireAuth,  (req, res) => {
  const device = devices.get(req.params.id);
  if (!device) return res.status(404).json({ error: 'Device not found' });
  const g = groups.get(device.group);
  if (g) g.deviceCount--;
  devices.delete(req.params.id);
  res.json({ success: true });
});

app.post('/api/devices/:id/heartbeat',requireAuth,  (req, res) => {
  const device = devices.get(req.params.id);
  if (!device) return res.status(404).json({ error: 'Device not found' });
  device.lastSeen = new Date().toISOString();
  device.status = 'active';
  if (req.body.status) device.status = req.body.status;
  res.json({ success: true, lastSeen: device.lastSeen });
});

// ============ GROUPS ============
app.get('/api/groups', (_req, res) => res.json({ groups: Array.from(groups.values()) }));

app.get('/api/groups/:id', (req, res) => {
  const group = groups.get(req.params.id);
  if (!group) return res.status(404).json({ error: 'Group not found' });
  const groupDevices = Array.from(devices.values()).filter(d => d.group === group.id);
  res.json({ ...group, devices: groupDevices });
});

app.post('/api/groups',requireAuth,  (req, res) => {
  const { name, description, color } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const id = uuidv4();
  groups.set(id, { id, name, description: description || '', deviceCount: 0, color: color || '#888888' });
  res.status(201).json(groups.get(id));
});

app.put('/api/groups/:id',requireAuth,  (req, res) => {
  const group = groups.get(req.params.id);
  if (!group) return res.status(404).json({ error: 'Group not found' });
  const { name, description, color } = req.body;
  if (name) group.name = name;
  if (description) group.description = description;
  if (color) group.color = color;
  res.json(group);
});

app.delete('/api/groups/:id',requireAuth,  (req, res) => {
  const group = groups.get(req.params.id);
  if (!group) return res.status(404).json({ error: 'Group not found' });
  if (group.deviceCount > 0) return res.status(400).json({ error: 'Cannot delete group with devices' });
  groups.delete(req.params.id);
  res.json({ success: true });
});

// ============ CONFIGURATIONS ============
app.get('/api/devices/:id/config', (req, res) => {
  const device = devices.get(req.params.id);
  if (!device) return res.status(404).json({ error: 'Device not found' });
  res.json(device.config);
});

app.put('/api/devices/:id/config',requireAuth,  (req, res) => {
  const device = devices.get(req.params.id);
  if (!device) return res.status(404).json({ error: 'Device not found' });
  const { config, appliedBy } = req.body;
  if (!config) return res.status(400).json({ error: 'config required' });

  // Store config history
  const configId = uuidv4();
  configs.set(configId, { id: configId, deviceId: device.id, config: device.config, appliedAt: new Date().toISOString(), appliedBy: appliedBy || 'system' });

  device.config = { ...device.config, ...config };
  device.lastSeen = new Date().toISOString();

  res.json({ success: true, config: device.config });
});

app.get('/api/devices/:id/config/history', (req, res) => {
  const history = Array.from(configs.values()).filter(c => c.deviceId === req.params.id);
  history.sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime());
  res.json({ total: history.length, configs: history });
});

// ============ FIRMWARE ============
app.get('/api/firmware', (_req, res) => {
  const versions = Array.from(firmwares.values());
  versions.sort((a, b) => new Date(b.releasedAt).getTime() - new Date(a.releasedAt).getTime());
  res.json({ total: versions.length, firmware: versions });
});

app.get('/api/firmware/:version', (req, res) => {
  const fw = firmwares.get(req.params.version);
  if (!fw) return res.status(404).json({ error: 'Firmware not found' });
  res.json(fw);
});

app.post('/api/firmware',requireAuth,  (req, res) => {
  const { version, type, size, releaseNotes } = req.body;
  if (!version) return res.status(400).json({ error: 'version required' });
  if (firmwares.has(version)) return res.status(409).json({ error: 'Version already exists' });
  const id = uuidv4();
  firmwares.set(version, { id, version, type: type || 'release', size: size || 0, releaseNotes: releaseNotes || '', releasedAt: new Date().toISOString() });
  res.status(201).json(firmwares.get(version));
});

app.post('/api/devices/:id/firmware',requireAuth,  (req, res) => {
  const device = devices.get(req.params.id);
  if (!device) return res.status(404).json({ error: 'Device not found' });
  const { version } = req.body;
  const fw = firmwares.get(version);
  if (!fw) return res.status(404).json({ error: 'Firmware not found' });
  device.firmware = version;
  device.lastSeen = new Date().toISOString();
  res.json({ success: true, firmware: fw });
});

app.get('/api/devices/firmware-update', (req, res) => {
  const { version } = req.query;
  if (!version) return res.status(400).json({ error: 'version required' });
  const devices_ = Array.from(devices.values()).filter(d => d.firmware !== version);
  res.json({ total: devices_.length, devices: devices_ });
});

// ============ BULK OPERATIONS ============
app.post('/api/devices/bulk',requireAuth,  (req, res) => {
  const { deviceIds, action, params } = req.body;
  if (!deviceIds || !action) return res.status(400).json({ error: 'deviceIds, action required' });

  const results: { deviceId: string; success: boolean; error?: string }[] = [];
  for (const id of deviceIds) {
    const device = devices.get(id);
    if (!device) { results.push({ deviceId: id, success: false, error: 'Not found' }); continue; }

    switch (action) {
      case 'update_config':
        device.config = { ...device.config, ...(params?.config || {}) };
        break;
      case 'update_status':
        device.status = params?.status || device.status;
        break;
      case 'update_group':
        const oldGroup = groups.get(device.group);
        if (oldGroup) oldGroup.deviceCount--;
        device.group = params?.group || device.group;
        const newGroup = groups.get(device.group);
        if (newGroup) newGroup.deviceCount++;
        break;
      case 'update_firmware':
        device.firmware = params?.version || device.firmware;
        break;
    }
    device.lastSeen = new Date().toISOString();
    results.push({ deviceId: id, success: true });
  }
  res.json({ success: results.filter(r => r.success).length, failed: results.filter(r => !r.success).length, results });
});

// ============ STATS ============
app.get('/api/stats', (_req, res) => {
  const all = Array.from(devices.values());
  const byStatus = { active: all.filter(d => d.status === 'active').length, inactive: all.filter(d => d.status === 'inactive').length, error: all.filter(d => d.status === 'error').length };
  const byGroup: Record<string, number> = {};
  for (const d of all) { byGroup[d.group] = (byGroup[d.group] || 0) + 1; }
  res.json({ total: all.length, byStatus, byGroup, totalGroups: groups.size });
});

app.listen(PORT, () => console.log(`[device-os] listening on :${PORT}`));
export default app;