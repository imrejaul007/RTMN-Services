/**
 * Physical World OS - Production Implementation
 * IoT device management, telemetry, device commands
 * Port: 4867
 */
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4867;
const START_TIME = Date.now();
app.use(helmet()); app.use(cors()); app.use(express.json());

// ============ TYPES ============
interface Device { id: string; name: string; type: string; status: 'online' | 'offline' | 'error' | 'maintenance'; location: string; metadata: Record<string, string>; lastSeen: string; firmware: string; battery?: number; }
interface DeviceCommand { id: string; deviceId: string; command: string; params: Record<string, unknown>; status: 'pending' | 'sent' | 'acknowledged' | 'failed'; createdAt: string; completedAt?: string; result?: unknown; }
interface Telemetry { deviceId: string; timestamp: string; metrics: Record<string, number>; location?: { lat: number; lng: number }; }
interface Webhook { id: string; deviceId: string; url: string; events: string[]; active: boolean; }
const devices = new Map<string, Device>();
const commands = new Map<string, DeviceCommand>();
const telemetry = new Map<string, Telemetry[]>();
const webhooks: Webhook[] = [];

// ============ HEALTH ============
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'physical-world-os', uptime: Math.floor((Date.now() - START_TIME) / 1000), devices: devices.size }));
app.get('/ready', (_req, res) => res.json({ ready: true }));

// ============ DEVICES ============
app.get('/api/devices', (req, res) => {
  let result = Array.from(devices.values());
  if (req.query.type) result = result.filter(d => d.type === req.query.type);
  if (req.query.status) result = result.filter(d => d.status === req.query.status);
  if (req.query.location) result = result.filter(d => d.location === req.query.location);
  res.json({ total: result.length, devices: result });
});

app.get('/api/devices/:id', (req, res) => {
  const device = devices.get(req.params.id);
  if (!device) return res.status(404).json({ error: 'Device not found' });
  res.json(device);
});

app.post('/api/devices', (req, res) => {
  const { name, type, location, metadata, firmware } = req.body;
  if (!name || !type) return res.status(400).json({ error: 'name, type required' });
  const id = uuidv4();
  devices.set(id, { id, name, type, status: 'offline', location: location || '', metadata: metadata || {}, lastSeen: new Date().toISOString(), firmware: firmware || '1.0.0' });
  res.status(201).json(devices.get(id));
});

app.put('/api/devices/:id', (req, res) => {
  const device = devices.get(req.params.id);
  if (!device) return res.status(404).json({ error: 'Device not found' });
  Object.assign(device, req.body);
  device.lastSeen = new Date().toISOString();
  res.json(device);
});

app.delete('/api/devices/:id', (req, res) => {
  if (!devices.has(req.params.id)) return res.status(404).json({ error: 'Device not found' });
  devices.delete(req.params.id);
  res.json({ success: true });
});

// ============ COMMANDS ============
app.post('/api/devices/:id/command', (req, res) => {
  const device = devices.get(req.params.id);
  if (!device) return res.status(404).json({ error: 'Device not found' });
  const { command, params } = req.body;
  if (!command) return res.status(400).json({ error: 'command required' });
  const cmd: DeviceCommand = { id: uuidv4(), deviceId: device.id, command, params: params || {}, status: 'pending', createdAt: new Date().toISOString() };
  commands.set(cmd.id, cmd);
  device.lastSeen = new Date().toISOString();
  device.status = 'online';
  res.status(201).json(cmd);
});

app.get('/api/devices/:id/commands', (req, res) => {
  const cmds = Array.from(commands.values()).filter(c => c.deviceId === req.params.id);
  res.json({ commands: cmds });
});

app.get('/api/devices/:id/status', (req, res) => {
  const device = devices.get(req.params.id);
  if (!device) return res.status(404).json({ error: 'Device not found' });
  const lastTelemetry = telemetry.get(device.id)?.slice(-1)[0];
  res.json({ id: device.id, status: device.status, lastSeen: device.lastSeen, telemetry: lastTelemetry });
});

// ============ TELEMETRY ============
app.post('/api/devices/:id/telemetry', (req, res) => {
  const device = devices.get(req.params.id);
  if (!device) return res.status(404).json({ error: 'Device not found' });
  const { metrics, location } = req.body;
  if (!metrics) return res.status(400).json({ error: 'metrics required' });
  const entry: Telemetry = { deviceId: device.id, timestamp: new Date().toISOString(), metrics, location };
  if (!telemetry.has(device.id)) telemetry.set(device.id, []);
  telemetry.get(device.id)!.push(entry);
  if (telemetry.get(device.id)!.length > 1000) telemetry.get(device.id)!.splice(0, 100);
  device.lastSeen = entry.timestamp;
  device.status = 'online';
  if (metrics.battery !== undefined) device.battery = metrics.battery;
  res.json({ success: true });
});

app.get('/api/devices/:id/telemetry', (req, res) => {
  const data = telemetry.get(req.params.id) || [];
  const { from, to, limit = 100 } = req.query;
  let result = data;
  if (from) result = result.filter(t => t.timestamp >= from as string);
  if (to) result = result.filter(t => t.timestamp <= to as string);
  res.json({ total: result.length, telemetry: result.slice(-Number(limit)) });
});

// ============ WEBHOOKS ============
app.post('/api/webhooks', (req, res) => {
  const { deviceId, url, events } = req.body;
  if (!url) return res.status(400).json({ error: 'url required' });
  const webhook: Webhook = { id: uuidv4(), deviceId: deviceId || '', url, events: events || ['status_change'], active: true };
  webhooks.push(webhook);
  res.status(201).json(webhook);
});

app.post('/api/devices/:id/webhook', (req, res) => {
  const device = devices.get(req.params.id);
  if (!device) return res.status(404).json({ error: 'Device not found' });
  res.json({ received: true, deviceId: device.id, timestamp: new Date().toISOString() });
});

// ============ STATS ============
app.get('/api/stats', (_req, res) => {
  const all = Array.from(devices.values());
  res.json({ total: all.length, online: all.filter(d => d.status === 'online').length, offline: all.filter(d => d.status === 'offline').length, error: all.filter(d => d.status === 'error').length });
});

app.listen(PORT, () => console.log(`[physical-world-os] listening on :${PORT}`));
export default app;