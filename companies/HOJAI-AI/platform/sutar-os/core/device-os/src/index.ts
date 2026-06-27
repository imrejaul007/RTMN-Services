/**
 * Device OS - Fleet Management
 * Port: 4868
 */
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4868;
const START_TIME = Date.now();
app.use(helmet()); app.use(cors()); app.use(express.json());

interface Device { id: string; name: string; type: string; group: string; status: string; firmware: string; lastSeen: string; config: Record<string, unknown>; tags: string[]; }
interface DeviceGroup { id: string; name: string; description: string; deviceCount: number; }
const devices = new Map<string, Device>();
const groups = new Map<string, DeviceGroup>();

// Seed default groups
groups.set('default', { id: 'default', name: 'Default', description: 'Default device group', deviceCount: 0 });

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'device-os', uptime: Math.floor((Date.now() - START_TIME) / 1000), devices: devices.size }));
app.get('/ready', (_req, res) => res.json({ ready: true }));

app.get('/api/devices', (req, res) => {
  let result = Array.from(devices.values());
  if (req.query.group) result = result.filter(d => d.group === req.query.group);
  if (req.query.type) result = result.filter(d => d.type === req.query.type);
  res.json({ total: result.length, devices: result });
});

app.get('/api/devices/:id', (req, res) => {
  const device = devices.get(req.params.id);
  if (!device) return res.status(404).json({ error: 'Device not found' });
  res.json(device);
});

app.post('/api/devices', (req, res) => {
  const { name, type, group, config, tags } = req.body;
  const id = uuidv4();
  const device: Device = { id, name, type, group: group || 'default', status: 'active', firmware: '1.0.0', lastSeen: new Date().toISOString(), config: config || {}, tags: tags || [] };
  devices.set(id, device);
  const g = groups.get(device.group);
  if (g) g.deviceCount++;
  res.status(201).json(device);
});

app.put('/api/devices/:id', (req, res) => {
  const device = devices.get(req.params.id);
  if (!device) return res.status(404).json({ error: 'Device not found' });
  Object.assign(device, req.body);
  device.lastSeen = new Date().toISOString();
  res.json(device);
});

app.delete('/api/devices/:id', (req, res) => {
  const device = devices.get(req.params.id);
  if (!device) return res.status(404).json({ error: 'Device not found' });
  devices.delete(req.params.id);
  res.json({ success: true });
});

app.get('/api/groups', (_req, res) => res.json({ groups: Array.from(groups.values()) }));

app.post('/api/groups', (req, res) => {
  const { name, description } = req.body;
  const id = uuidv4();
  groups.set(id, { id, name, description: description || '', deviceCount: 0 });
  res.status(201).json(groups.get(id));
});

app.get('/api/devices/:id/config', (req, res) => {
  const device = devices.get(req.params.id);
  if (!device) return res.status(404).json({ error: 'Device not found' });
  res.json(device.config);
});

app.put('/api/devices/:id/config', (req, res) => {
  const device = devices.get(req.params.id);
  if (!device) return res.status(404).json({ error: 'Device not found' });
  device.config = { ...device.config, ...req.body };
  res.json(device.config);
});

app.post('/api/devices/:id/firmware', (req, res) => {
  const device = devices.get(req.params.id);
  if (!device) return res.status(404).json({ error: 'Device not found' });
  device.firmware = req.body.version || device.firmware;
  res.json({ success: true, firmware: device.firmware });
});

app.listen(PORT, () => console.log(`[device-os] listening on :${PORT}`));
export default app;
