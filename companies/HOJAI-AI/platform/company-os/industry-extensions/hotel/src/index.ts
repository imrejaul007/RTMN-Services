/**
 * Hotel Extension - Room, Guest, Housekeeping Management
 */
import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 5025;

interface TenantStore { rooms: Map<string, any>; guests: Map<string, any>; tasks: Map<string, any>; }
const stores = new Map<string, TenantStore>();

const getStore = (tid: string) => {
  if (!stores.has(tid)) stores.set(tid, { rooms: new Map(), guests: new Map(), tasks: new Map() });
  return stores.get(tid)!;
};

// Rooms
app.get('/api/rooms', (req, res) => {
  const tid = req.headers['x-tenant-id'] as string;
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  res.json({ rooms: Array.from(getStore(tid).rooms.values()) });
});
app.post('/api/rooms', (req, res) => {
  const tid = req.headers['x-tenant-id'] as string;
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  const room = { id: `room_${uuidv4().slice(0,8)}`, tenantId: tid, ...req.body };
  getStore(tid).rooms.set(room.id, room);
  res.status(201).json(room);
});
app.patch('/api/rooms/:id/status', (req, res) => {
  const tid = req.headers['x-tenant-id'] as string;
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  const room = getStore(tid).rooms.get(req.params.id);
  if (!room) return res.status(404).json({ error: 'Not found' });
  Object.assign(room, req.body);
  res.json(room);
});

// Guests
app.get('/api/guests', (req, res) => {
  const tid = req.headers['x-tenant-id'] as string;
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  res.json({ guests: Array.from(getStore(tid).guests.values()) });
});
app.post('/api/guests', (req, res) => {
  const tid = req.headers['x-tenant-id'] as string;
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  const guest = { id: `guest_${uuidv4().slice(0,8)}`, tenantId: tid, ...req.body };
  getStore(tid).guests.set(guest.id, guest);
  res.status(201).json(guest);
});

// Housekeeping Tasks
app.get('/api/tasks', (req, res) => {
  const tid = req.headers['x-tenant-id'] as string;
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  res.json({ tasks: Array.from(getStore(tid).tasks.values()) });
});
app.post('/api/tasks', (req, res) => {
  const tid = req.headers['x-tenant-id'] as string;
  if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' });
  const task = { id: `task_${uuidv4().slice(0,8)}`, tenantId: tid, status: 'pending', ...req.body };
  getStore(tid).tasks.set(task.id, task);
  res.status(201).json(task);
});

// Health
app.get('/health', (_req, res) => res.json({ status: 'healthy', service: 'hotel-extension', port: PORT }));

app.listen(PORT, () => console.log(`Hotel Extension running on port ${PORT}`));
export default app;
