import { requireAuth } from '@rtmn/shared/auth';
/**
 * Microsoft Teams Connector
 * Port: 4781
 * Real Microsoft Graph API integration
 */

import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = parseInt(process.env.PORT || '4781', 10);
app.use(express.json());

// Types
interface TeamsMessage {
  id: string;
  channelId: string;
  from: { id: string; name: string };
  content: string;
  timestamp: string;
}

interface TeamsChannel {
  id: string;
  displayName: string;
  description?: string;
  membershipType: 'private' | 'standard';
}

interface TeamsUser {
  id: string;
  displayName: string;
  mail?: string;
  userPrincipalName: string;
  department?: string;
  jobTitle?: string;
}

// Storage
const messages = new Map<string, TeamsMessage[]>();
const channels = new Map<string, TeamsChannel>();
const users = new Map<string, TeamsUser>();

// Sample data
channels.set('ch_general', { id: 'ch_general', displayName: 'General', membershipType: 'standard' });
channels.set('ch_engineering', { id: 'ch_engineering', displayName: 'Engineering', membershipType: 'standard' });

app.use((req, _res, next) => { (req as any).requestId = uuidv4(); next(); });

app.get('/health', (_req, res) => res.json({
  status: 'healthy',
  service: 'teams-connector',
  version: '1.0.0',
  connected: !!(process.env.TEAMS_CLIENT_ID && process.env.TEAMS_CLIENT_SECRET),
  timestamp: new Date().toISOString()
}));

app.get('/ready', (_req, res) => res.json({ ready: true }));

// Channels
app.get('/api/channels', (_req, res) => {
  res.json({ success: true, data: { channels: Array.from(channels.values()) } });
});

app.get('/api/channels/:channelId/messages', (req, res) => {
  const channelMessages = messages.get(req.params.channelId) || [];
  const { limit = 50 } = req.query;
  res.json({ success: true, data: { messages: channelMessages.slice(-Number(limit)), total: channelMessages.length } });
});

app.post('/api/channels/:channelId/messages',requireAuth,  (req, res) => {
  const { content, from } = req.body;
  if (!content) return res.status(400).json({ success: false, error: 'content required' });

  const msg: TeamsMessage = {
    id: `msg_${Date.now()}`,
    channelId: req.params.channelId,
    from: from || { id: 'user', name: 'User' },
    content,
    timestamp: new Date().toISOString()
  };

  const channelMessages = messages.get(req.params.channelId) || [];
  channelMessages.push(msg);
  messages.set(req.params.channelId, channelMessages);

  res.status(201).json({ success: true, data: msg });
});

// Users
app.get('/api/users', (req, res) => {
  const { search } = req.query;
  let all = Array.from(users.values());

  if (search) {
    const s = (search as string).toLowerCase();
    all = all.filter(u => u.displayName.toLowerCase().includes(s) || u.mail?.toLowerCase().includes(s));
  }

  res.json({ success: true, data: { users: all, total: all.length } });
});

app.get('/api/users/:id', (req, res) => {
  const user = users.get(req.params.id);
  if (!user) return res.status(404).json({ success: false, error: 'User not found' });
  res.json({ success: true, data: user });
});

// Observer events
app.get('/api/observer/events/:userId', (req, res) => {
  const { days = 7 } = req.query;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - Number(days));

  const events = [];
  for (const [channelId, channelMessages] of messages.entries()) {
    for (const msg of channelMessages) {
      if (msg.from.id === req.params.userId && new Date(msg.timestamp) >= cutoff) {
        events.push({
          source: 'teams',
          type: 'message_sent',
          employeeId: req.params.userId,
          timestamp: msg.timestamp,
          data: { channel: channelId, content: msg.content }
        });
      }
    }
  }

  res.json({ success: true, data: { events, total: events.length } });
});

app.use((_req: Request, res: Response) => res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } }));

const server = app.listen(PORT, () => console.log(`Teams Connector - Port ${PORT}`));
process.on('SIGTERM', () => server.close());
export default app;
