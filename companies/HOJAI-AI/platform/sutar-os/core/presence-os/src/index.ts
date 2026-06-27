/**
 * Presence OS - User Presence and Status
 * Port: 4880
 */
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4880;
const START_TIME = Date.now();
app.use(helmet()); app.use(cors()); app.use(express.json());

interface UserPresence { userId: string; status: 'online' | 'away' | 'busy' | 'offline'; lastSeen: string; statusMessage?: string; inMeeting: boolean; location?: string; }
interface PresenceEvent { id: string; userId: string; previousStatus: string; newStatus: string; timestamp: string; }

const users = new Map<string, UserPresence>();
const history: PresenceEvent[] = [];

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'presence-os', uptime: Math.floor((Date.now() - START_TIME) / 1000) }));
app.get('/ready', (_req, res) => res.json({ ready: true }));

app.get('/api/users', (req, res) => {
  const { status } = req.query;
  let result = Array.from(users.values());
  if (status) result = result.filter(u => u.status === status);
  res.json({ users: result });
});

app.get('/api/users/:userId', (req, res) => {
  const user = users.get(req.params.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

app.post('/api/update', (req, res) => {
  const { userId, status, statusMessage, inMeeting, location } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  const previous = users.get(userId);
  const now = new Date().toISOString();
  const newPresence: UserPresence = {
    userId,
    status: status || 'online',
    lastSeen: now,
    statusMessage,
    inMeeting: inMeeting || false,
    location,
  };
  users.set(userId, newPresence);

  if (previous && previous.status !== newPresence.status) {
    history.push({ id: uuidv4(), userId, previousStatus: previous.status, newStatus: newPresence.status, timestamp: now });
    if (history.length > 10000) history.splice(0, history.length - 10000);
  }

  res.json(newPresence);
});

app.get('/api/history/:userId', (req, res) => {
  const events = history.filter(e => e.userId === req.params.userId);
  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const limit = parseInt(req.query.limit as string) || 50;
  res.json({ events: events.slice(0, limit) });
});

app.get('/api/meeting', (req, res) => {
  const inMeeting = Array.from(users.values()).filter(u => u.inMeeting);
  res.json({ count: inMeeting.length, users: inMeeting });
});

app.listen(PORT, () => console.log(`[presence-os] listening on :${PORT}`));
export default app;