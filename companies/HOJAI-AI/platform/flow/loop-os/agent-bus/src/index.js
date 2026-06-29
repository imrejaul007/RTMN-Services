/**
 * LoopOS Agent Bus
 * Inter-agent communication and messaging
 * Port: 4745
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { randomUUID } from 'node:crypto';
import winston from 'winston';

const app = express();
const PORT = process.env.PORT || 4745;
const API_KEY = process.env.HOJAI_API_KEY || 'dev-key';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()]
});

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

function requireAuth(req, res, next) {
  const key = req.headers.authorization?.replace('Bearer ', '');
  if (key !== API_KEY) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// Message types
const MESSAGE_TYPES = {
  REQUEST: 'request',
  RESPONSE: 'response',
  NOTIFICATION: 'notification',
  BROADCAST: 'broadcast',
  ERROR: 'error'
};

// Message priorities
const PRIORITIES = {
  LOW: 1,
  NORMAL: 5,
  HIGH: 8,
  CRITICAL: 10
};

// In-memory stores
const agents = new Map();      // agentId -> Agent
const channels = new Map();    // channelId -> Channel
const messages = new Map();    // messageId -> Message
const subscriptions = new Map(); // agentId -> Set<channelId>
const inboxes = new Map();     // agentId -> Message[]

// ── Health ──────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({
  status: 'ok',
  service: 'loopos-agent-bus',
  version: '1.0.0',
  port: PORT,
  registeredAgents: agents.size,
  channels: channels.size,
  pendingMessages: messages.size
}));

app.get('/ready', (_req, res) => res.json({ ready: true, timestamp: new Date().toISOString() }));

// ── Agent Registry ─────────────────────────────────────

/**
 * Register an agent
 * POST /api/agents
 */
app.post('/api/agents', requireAuth, (req, res) => {
  const { agentId, name, capabilities = [], channels = [], metadata = {} } = req.body || {};

  if (!agentId) return res.status(400).json({ error: 'agentId is required' });

  const agent = {
    id: agentId,
    name: name || agentId,
    capabilities,
    subscribedChannels: new Set(channels),
    status: 'online',
    inbox: [],
    metadata,
    registeredAt: new Date().toISOString(),
    lastActivity: new Date().toISOString()
  };

  agents.set(agentId, agent);
  inboxes.set(agentId, []);

  logger.info(`Agent registered: ${agentId}`);
  res.status(201).json(agent);
});

/**
 * Get agent
 * GET /api/agents/:id
 */
app.get('/api/agents/:id', (req, res) => {
  const agent = agents.get(req.params.id);
  if (!agent) return res.status(404).json({ error: 'agent not found' });

  res.json({
    id: agent.id,
    name: agent.name,
    capabilities: agent.capabilities,
    status: agent.status,
    subscribedChannels: [...agent.subscribedChannels],
    metadata: agent.metadata,
    registeredAt: agent.registeredAt,
    lastActivity: agent.lastActivity
  });
});

/**
 * List agents
 * GET /api/agents
 */
app.get('/api/agents', (req, res) => {
  const { capability, channel, status } = req.query;
  let items = [...agents.values()].map(a => ({
    id: a.id,
    name: a.name,
    capabilities: a.capabilities,
    status: a.status,
    subscribedChannels: [...a.subscribedChannels],
    lastActivity: a.lastActivity
  }));

  if (capability) {
    items = items.filter(a => a.capabilities.includes(capability));
  }
  if (channel) {
    items = items.filter(a => a.subscribedChannels.includes(channel));
  }
  if (status) {
    items = items.filter(a => a.status === status);
  }

  res.json({ count: items.length, agents: items });
});

/**
 * Update agent status
 * PUT /api/agents/:id/status
 */
app.put('/api/agents/:id/status', requireAuth, (req, res) => {
  const agent = agents.get(req.params.id);
  if (!agent) return res.status(404).json({ error: 'agent not found' });

  agent.status = req.body?.status || 'online';
  agent.lastActivity = new Date().toISOString();

  res.json({ id: agent.id, status: agent.status });
});

/**
 * Unregister agent
 * DELETE /api/agents/:id
 */
app.delete('/api/agents/:id', requireAuth, (req, res) => {
  agents.delete(req.params.id);
  inboxes.delete(req.params.id);

  // Remove from all subscriptions
  for (const agent of agents.values()) {
    agent.subscribedChannels.delete(req.params.id);
  }

  res.json({ unregistered: true });
});

// ── Channels ───────────────────────────────────────────

/**
 * Create channel
 * POST /api/channels
 */
app.post('/api/channels', requireAuth, (req, res) => {
  const { name, type = 'shared', subscribers = [], metadata = {} } = req.body || {};

  if (!name) return res.status(400).json({ error: 'name is required' });

  const id = `ch-${randomUUID().slice(0, 8)}`;

  const channel = {
    id,
    name,
    type,
    subscribers: new Set(subscribers),
    messageCount: 0,
    metadata,
    createdAt: new Date().toISOString()
  };

  channels.set(id, channel);

  // Add subscribers
  for (const agentId of subscribers) {
    const agent = agents.get(agentId);
    if (agent) {
      agent.subscribedChannels.add(id);
    }
  }

  logger.info(`Channel created: ${id} (${name})`);
  res.status(201).json(channel);
});

/**
 * Get channel
 * GET /api/channels/:id
 */
app.get('/api/channels/:id', (req, res) => {
  const channel = channels.get(req.params.id);
  if (!channel) return res.status(404).json({ error: 'channel not found' });

  res.json({
    ...channel,
    subscribers: [...channel.subscribers]
  });
});

/**
 * List channels
 * GET /api/channels
 */
app.get('/api/channels', (req, res) => {
  const { type } = req.query;
  let items = [...channels.values()];

  if (type) items = items.filter(c => c.type === type);

  res.json({
    count: items.length,
    channels: items.map(c => ({
      id: c.id,
      name: c.name,
      type: c.type,
      subscriberCount: c.subscribers.size,
      messageCount: c.messageCount,
      createdAt: c.createdAt
    }))
  });
});

/**
 * Subscribe to channel
 * POST /api/channels/:id/subscribe
 */
app.post('/api/channels/:id/subscribe', requireAuth, (req, res) => {
  const { agentId } = req.body || {};
  const channel = channels.get(req.params.id);
  if (!channel) return res.status(404).json({ error: 'channel not found' });

  const agent = agents.get(agentId);
  if (!agent) return res.status(404).json({ error: 'agent not found' });

  channel.subscribers.add(agentId);
  agent.subscribedChannels.add(req.params.id);

  res.json({ subscribed: true, channelId: channel.id, agentId });
});

/**
 * Unsubscribe from channel
 * POST /api/channels/:id/unsubscribe
 */
app.post('/api/channels/:id/unsubscribe', requireAuth, (req, res) => {
  const { agentId } = req.body || {};
  const channel = channels.get(req.params.id);
  if (!channel) return res.status(404).json({ error: 'channel not found' });

  channel.subscribers.delete(agentId);
  const agent = agents.get(agentId);
  if (agent) agent.subscribedChannels.delete(req.params.id);

  res.json({ unsubscribed: true });
});

// ── Messaging ───────────────────────────────────────────

/**
 * Send message
 * POST /api/messages
 */
app.post('/api/messages', requireAuth, (req, res) => {
  const {
    from,
    to,
    type = MESSAGE_TYPES.REQUEST,
    subject,
    content,
    channel,
    priority = PRIORITIES.NORMAL,
    metadata = {},
    replyTo
  } = req.body || {};

  if (!from) return res.status(400).json({ error: 'from is required' });
  if (!to && !channel) return res.status(400).json({ error: 'to or channel is required' });

  const id = `msg-${randomUUID().slice(0, 8)}`;

  const message = {
    id,
    from,
    to: to || null,
    channel: channel || null,
    type,
    subject,
    content,
    priority,
    metadata,
    replyTo,
    status: 'delivered',
    deliveredAt: null,
    readAt: null,
    createdAt: new Date().toISOString()
  };

  messages.set(id, message);

  // Deliver to recipient
  if (to) {
    deliverToAgent(to, message);
  }

  // Broadcast to channel
  if (channel) {
    broadcastToChannel(channel, message);
  }

  logger.info(`Message sent: ${id} from ${from} to ${to || channel}`);
  res.status(201).json(message);
});

/**
 * Send to multiple recipients
 * POST /api/messages/broadcast
 */
app.post('/api/messages/broadcast', requireAuth, (req, res) => {
  const { from, recipients = [], subject, content, type = MESSAGE_TYPES.BROADCAST, metadata = {} } = req.body || {};

  if (!from || !recipients.length) {
    return res.status(400).json({ error: 'from and recipients are required' });
  }

  const messageIds = [];

  for (const to of recipients) {
    const id = `msg-${randomUUID().slice(0, 8)}`;

    const message = {
      id,
      from,
      to,
      type,
      subject,
      content,
      priority: metadata.priority || PRIORITIES.NORMAL,
      metadata,
      status: 'delivered',
      createdAt: new Date().toISOString()
    };

    messages.set(id, message);
    deliverToAgent(to, message);
    messageIds.push(id);
  }

  res.status(201).json({ count: messageIds.length, messageIds });
});

/**
 * Get message
 * GET /api/messages/:id
 */
app.get('/api/messages/:id', (req, res) => {
  const message = messages.get(req.params.id);
  if (!message) return res.status(404).json({ error: 'message not found' });
  res.json(message);
});

/**
 * Get inbox
 * GET /api/agents/:id/inbox
 */
app.get('/api/agents/:id/inbox', (req, res) => {
  const { unreadOnly, limit = 50 } = req.query;
  let inbox = inboxes.get(req.params.id) || [];

  if (unreadOnly === 'true') {
    inbox = inbox.filter(m => !m.readAt);
  }

  // Sort by priority then time
  inbox.sort((a, b) => {
    if (a.priority !== b.priority) return b.priority - a.priority;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  res.json({
    agentId: req.params.id,
    count: inbox.length,
    unreadCount: inbox.filter(m => !m.readAt).length,
    messages: inbox.slice(0, Number(limit))
  });
});

/**
 * Mark message as read
 * POST /api/messages/:id/read
 */
app.post('/api/messages/:id/read', requireAuth, (req, res) => {
  const message = messages.get(req.params.id);
  if (!message) return res.status(404).json({ error: 'message not found' });

  message.readAt = new Date().toISOString();

  res.json({ id: message.id, readAt: message.readAt });
});

/**
 * Reply to message
 * POST /api/messages/:id/reply
 */
app.post('/api/messages/:id/reply', requireAuth, (req, res) => {
  const { from, content, metadata = {} } = req.body || {};

  const original = messages.get(req.params.id);
  if (!original) return res.status(404).json({ error: 'message not found' });

  const reply = {
    id: `msg-${randomUUID().slice(0, 8)}`,
    from,
    to: original.from,
    type: MESSAGE_TYPES.RESPONSE,
    content,
    metadata,
    replyTo: original.id,
    status: 'delivered',
    createdAt: new Date().toISOString()
  };

  messages.set(reply.id, reply);
  deliverToAgent(original.from, reply);

  res.status(201).json(reply);
});

// ── Discovery ───────────────────────────────────────────

/**
 * Find agents by capability
 * GET /api/discover
 */
app.get('/api/discover', (req, res) => {
  const { capability, channel, status = 'online' } = req.query;

  if (!capability && !channel) {
    return res.status(400).json({ error: 'capability or channel is required' });
  }

  let candidates = [...agents.values()];

  if (capability) {
    candidates = candidates.filter(a => a.capabilities.includes(capability));
  }

  if (channel) {
    candidates = candidates.filter(a => a.subscribedChannels.has(channel));
  }

  if (status) {
    candidates = candidates.filter(a => a.status === status);
  }

  res.json({
    count: candidates.length,
    agents: candidates.map(a => ({
      id: a.id,
      name: a.name,
      capabilities: a.capabilities,
      subscribedChannels: [...a.subscribedChannels]
    }))
  });
});

/**
 * Send direct message
 * POST /api/direct
 */
app.post('/api/direct', requireAuth, (req, res) => {
  const { from, to, content, metadata = {} } = req.body || {};

  if (!from || !to || !content) {
    return res.status(400).json({ error: 'from, to, and content are required' });
  }

  const id = `msg-${randomUUID().slice(0, 8)}`;

  const message = {
    id,
    from,
    to,
    type: MESSAGE_TYPES.REQUEST,
    content,
    metadata,
    status: 'delivered',
    createdAt: new Date().toISOString()
  };

  messages.set(id, message);
  deliverToAgent(to, message);

  res.status(201).json(message);
});

// ── Helper Functions ────────────────────────────────────

function deliverToAgent(agentId, message) {
  const inbox = inboxes.get(agentId);
  if (inbox) {
    inbox.push(message);
  }

  const agent = agents.get(agentId);
  if (agent) {
    agent.lastActivity = new Date().toISOString();
  }
}

function broadcastToChannel(channelId, message) {
  const channel = channels.get(channelId);
  if (!channel) return;

  channel.messageCount++;

  for (const subscriberId of channel.subscribers) {
    deliverToAgent(subscriberId, message);
  }
}

// ── Start Server ────────────────────────────────────────
const server = app.listen(PORT, () => {
  logger.info(`LoopOS Agent Bus listening on port ${PORT}`);
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => server.close(() => process.exit(0)));

export default app;