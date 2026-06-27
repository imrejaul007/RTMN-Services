/**
 * Physical World OS - IoT Device Management
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

interface Device { id: string; name: string; type: string; status: 'online' | 'offline' | 'error'; location: string; metadata: Record<string, string>; lastSeen: string; telemetry: Record<string, number>; }
interface DeviceCommand { id: string; deviceId: string; command: string; params: Record<string, unknown>; status: 'pending' | 'sent' | 'acknowledged' | 'failed'; createdAt: string; }
const devices = new Map<string, Device>();
const commands = new Map<string, DeviceCommand>();
const webhooks: { url: string; events: string[] }[] = [];

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'physical-world-os', uptime: Math.floor((Date.now() - START_TIME) / 1000), devices: devices.size }));
app.get('/ready', (_req, res) => res.json({ ready: true }));

app.get('/api/devices', (req, res) => {
  let result = Array.from(devices.values());
  if (req.query.type) result = result.filter(d => d.type === req.query.type);
  if (req.query.status) result = result.filter(d => d.status === req.query.status);
  res.json({ total: result.length, devices: result });
});

app.get('/api/devices/:id', (req, res) => {
  const device = devices.get(req.params.id);
  if (!device) return res.status(404).json({ error: 'Device not found' });
  res.json(device);
});

app.post('/api/devices', (req, res) => {
  const { name, type, location, metadata } = req.body;
  const id = uuidv4();
  const device: Device = { id, name, type, status: 'offline', location: location || '', metadata: metadata || {}, lastSeen: new Date().toISOString(), telemetry: {} };
  devices.set(id, device);
  res.status(201).json(device);
});

app.post('/api/devices/:id/command', (req, res) => {
  const device = devices.get(req.params.id);
  if (!device) return res.status(404).json({ error: 'Device not found' });
  const { command, params } = req.body;
  const cmd: DeviceCommand = { id: uuidv4(), deviceId: device.id, command, params: params || {}, status: 'sent', createdAt: new Date().toISOString() };
  commands.set(cmd.id, cmd);
  device.lastSeen = new Date().toISOString();
  res.status(201).json(cmd);
});

app.get('/api/devices/:id/status', (req, res) => {
  const device = devices.get(req.params.id);
  if (!device) return res.status(404).json({ error: 'Device not found' });
  res.json({ id: device.id, status: device.status, lastSeen: device.lastSeen, telemetry: device.telemetry });
});

app.post('/api/devices/:id/telemetry', (req, res) => {
  const device = devices.get(req.params.id);
  if (!device) return res.status(404).json({ error: 'Device not found' });
  device.telemetry = { ...device.telemetry, ...req.body };
  device.lastSeen = new Date().toISOString();
  device.status = 'online';
  res.json({ success: true });
});

app.post('/api/webhooks', (req, res) => {
  const { url, events } = req.body;
  webhooks.push({ url, events: events || ['status_change'] });
  res.status(201).json({ success: true });
});

app.post('/api/devices/:id/webhook', (req, res) => {
  const device = devices.get(req.params.id);
  if (!device) return res.status(404).json({ error: 'Device not found' });
  res.json({ received: true, deviceId: device.id });
});

app.listen(PORT, () => console.log(`[physical-world-os] listening on :${PORT}`));
export default app;
