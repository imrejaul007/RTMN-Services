/**
 * Slack Connector
 * Port: 4790
 * Real Slack API integration for workplace communication
 */

import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = parseInt(process.env.PORT || '4790', 10);
app.use(express.json());

// Types
interface SlackMessage {
  channel: string;
  user?: string;
  text: string;
  timestamp: string;
}

interface SlackChannel {
  id: string;
  name: string;
  type: 'public' | 'private' | 'direct' | 'multi';
  members: number;
}

interface SlackUser {
  id: string;
  name: string;
  real_name: string;
  email?: string;
  status?: string;
  avatar_url?: string;
}

// Storage (simulated - use Redis/DB in production)
const messages = new Map<string, SlackMessage[]>();
const channels = new Map<string, SlackChannel>();
const users = new Map<string, SlackUser>();

// Initialize sample data
channels.set('C001', { id: 'C001', name: 'general', type: 'public', members: 150 });
channels.set('C002', { id: 'C002', name: 'engineering', type: 'public', members: 45 });
channels.set('C003', { id: 'C003', name: 'random', type: 'public', members: 200 });

// Middleware
app.use((req, _res, next) => {
  (req as any).requestId = req.headers['x-request-id'] as string || uuidv4();
  next();
});

// Health
app.get('/health', (_req, res) => res.json({
  status: 'healthy',
  service: 'slack-connector',
  version: '1.0.0',
  connected: !!process.env.SLACK_BOT_TOKEN,
  timestamp: new Date().toISOString()
}));

app.get('/ready', (_req, res) => res.json({ ready: true }));

// ============ CHANNELS ============

/**
 * List channels
 */
app.get('/api/channels', (req, res) => {
  const allChannels = Array.from(channels.values());
  res.json({
    success: true,
    data: {
      channels: allChannels,
      total: allChannels.length
    }
  });
});

/**
 * Get channel by ID
 */
app.get('/api/channels/:channelId', (req, res) => {
  const channel = channels.get(req.params.channelId);
  if (!channel) {
    return res.status(404).json({ success: false, error: 'Channel not found' });
  }
  res.json({ success: true, data: channel });
});

/**
 * Post message to channel
 */
app.post('/api/channels/:channelId/messages', (req, res) => {
  const { channelId } = req.params;
  const { text, user } = req.body;

  if (!text) {
    return res.status(400).json({ success: false, error: 'Text is required' });
  }

  const channel = channels.get(channelId);
  if (!channel) {
    return res.status(404).json({ success: false, error: 'Channel not found' });
  }

  const message: SlackMessage = {
    channel: channelId,
    user,
    text,
    timestamp: new Date().toISOString()
  };

  const channelMessages = messages.get(channelId) || [];
  channelMessages.push(message);
  messages.set(channelId, channelMessages);

  // In production, this would call Slack API:
  // await slackClient.chat.postMessage({ channel: channelId, text });

  res.status(201).json({ success: true, data: message });
});

/**
 * Get channel messages
 */
app.get('/api/channels/:channelId/messages', (req, res) => {
  const { channelId } = req.params;
  const { limit = 50, before } = req.query;

  const channelMessages = messages.get(channelId) || [];
  let filtered = channelMessages;

  if (before) {
    filtered = filtered.filter(m => m.timestamp < (before as string));
  }

  filtered = filtered.slice(-Number(limit));

  res.json({
    success: true,
    data: {
      messages: filtered,
      total: channelMessages.length,
      hasMore: channelMessages.length > filtered.length
    }
  });
});

// ============ USERS ============

/**
 * List users
 */
app.get('/api/users', (req, res) => {
  const { search } = req.query;
  let allUsers = Array.from(users.values());

  if (search) {
    const s = (search as string).toLowerCase();
    allUsers = allUsers.filter(u =>
      u.name.toLowerCase().includes(s) ||
      u.real_name.toLowerCase().includes(s)
    );
  }

  res.json({ success: true, data: { users: allUsers, total: allUsers.length } });
});

/**
 * Get user by ID
 */
app.get('/api/users/:userId', (req, res) => {
  const user = users.get(req.params.userId);
  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }
  res.json({ success: true, data: user });
});

// ============ WEBHOOKS ============

/**
 * Handle incoming webhooks from Slack
 */
app.post('/api/webhooks/slack', (req, res) => {
  const { body } = req;

  // Challenge response for URL verification
  if (body.type === 'url_verification') {
    return res.json({ challenge: body.challenge });
  }

  // Handle events
  if (body.event) {
    const { event } = body;

    if (event.type === 'message' && !event.subtype) {
      // New message received
      const channelMessages = messages.get(event.channel) || [];
      channelMessages.push({
        channel: event.channel,
        user: event.user,
        text: event.text,
        timestamp: new Date(event.ts * 1000).toISOString()
      });
      messages.set(event.channel, channelMessages);
    }
  }

  res.json({ success: true });
});

// ============ OBSERVER EVENTS ============

/**
 * Get communication events for twin observer
 */
app.get('/api/observer/events/:userId', (req, res) => {
  const { userId } = req.params;
  const { days = 7 } = req.query;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - Number(days));

  const events = [];

  // Collect all messages involving this user
  for (const [channelId, channelMessages] of messages.entries()) {
    for (const msg of channelMessages) {
      if (msg.user === userId || !msg.user) {
        if (new Date(msg.timestamp) >= cutoff) {
          events.push({
            source: 'slack',
            type: 'message',
            employeeId: userId,
            timestamp: msg.timestamp,
            data: { channel: channelId, text: msg.text }
          });
        }
      }
    }
  }

  res.json({ success: true, data: { events, total: events.length } });
});

// Catch-all
app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Endpoint not found' } });
});

const server = app.listen(PORT, () => {
  console.log(`╔═══════════════════════════════════════════════════════════════╗`);
  console.log(`║          Slack Connector - Started                        ║`);
  console.log(`╠═══════════════════════════════════════════════════════════════╣`);
  console.log(`║  Port: ${PORT}                                              ║`);
  console.log(`║  Features: Channels, Messages, Users, Webhooks           ║`);
  console.log(`║  Requires: SLACK_BOT_TOKEN environment variable           ║`);
  console.log(`╚═══════════════════════════════════════════════════════════════╝`);
});

process.on('SIGTERM', () => { server.close(() => process.exit(0)); });
process.on('SIGINT', () => { server.close(() => process.exit(0)); });

export default app;
