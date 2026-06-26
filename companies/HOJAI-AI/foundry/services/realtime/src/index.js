/**
 * HOJAI Studio - Realtime Service
 * WebSocket infrastructure for live features
 */

import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 4756;
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json());

const connections = new Map(); // ws -> connection data
const channels = new Map(); // channelId -> { subscribers, messages }
const presence = new Map(); // channelId -> presence data

// REST API - Channels
app.post('/api/channels', (req, res) => {
  const { name, projectId, type = 'broadcast', persistence = false } = req.body;
  const channel = {
    id: uuidv4(),
    name,
    projectId,
    type,
    persistence,
    subscribers: new Set(),
    messages: [],
    createdAt: new Date().toISOString()
  };
  channels.set(channel.id, channel);
  res.json(channel);
});

app.get('/api/channels', (req, res) => {
  const { projectId } = req.query;
  let list = Array.from(channels.values()).map(c => ({
    id: c.id,
    name: c.name,
    projectId: c.projectId,
    type: c.type,
    subscriberCount: c.subscribers.size,
    messageCount: c.messages.length
  }));

  if (projectId) list = list.filter(c => c.projectId === projectId);
  res.json(list);
});

app.get('/api/channels/:channelId', (req, res) => {
  const channel = channels.get(req.params.channelId);
  if (!channel) return res.status(404).json({ error: 'Channel not found' });
  res.json({
    id: channel.id,
    name: channel.name,
    subscriberCount: channel.subscribers.size,
    messageCount: channel.messages.length
  });
});

// REST API - Messages
app.get('/api/channels/:channelId/messages', (req, res) => {
  const channel = channels.get(req.params.channelId);
  if (!channel) return res.status(404).json({ error: 'Channel not found' });

  const { limit = 50, before } = req.query;
  let messages = channel.messages;

  if (before) {
    messages = messages.filter(m => new Date(m.timestamp) < new Date(before));
  }

  res.json(messages.slice(-parseInt(limit)));
});

app.post('/api/channels/:channelId/messages', (req, res) => {
  const channel = channels.get(req.params.channelId);
  if (!channel) return res.status(404).json({ error: 'Channel not found' });

  const { userId, text, data } = req.body;
  const message = {
    id: uuidv4(),
    channelId: channel.id,
    userId,
    text,
    data,
    timestamp: new Date().toISOString()
  };

  channel.messages.push(message);

  // Broadcast to subscribers
  broadcast(channel.id, { type: 'message', ...message });

  res.json(message);
});

// REST API - Presence
app.get('/api/channels/:channelId/presence', (req, res) => {
  const pres = presence.get(req.params.channelId) || {};
  res.json(Object.values(pres));
});

app.post('/api/channels/:channelId/typing', (req, res) => {
  const { userId, isTyping } = req.body;
  broadcast(req.params.channelId, { type: 'typing', userId, isTyping });
  res.json({ ok: true });
});

// WebSocket handling
wss.on('connection', (ws, req) => {
  const connectionId = uuidv4();
  connections.set(ws, { id: connectionId, channels: new Set() });

  console.log(`WebSocket connected: ${connectionId}`);

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      handleWSMessage(ws, msg);
    } catch (e) {
      console.error('Invalid message:', e);
    }
  });

  ws.on('close', () => {
    handleDisconnect(ws);
  });
});

function handleWSMessage(ws, msg) {
  const conn = connections.get(ws);
  if (!conn) return;

  switch (msg.type) {
    case 'subscribe':
      subscribe(ws, msg.channelId, msg.userId, msg.userData);
      break;
    case 'unsubscribe':
      unsubscribe(ws, msg.channelId);
      break;
    case 'message':
      sendMessage(msg.channelId, msg.userId, msg.text, msg.data);
      break;
    case 'typing':
      broadcast(msg.channelId, { type: 'typing', userId: msg.userId, isTyping: true });
      break;
    case 'ping':
      ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      break;
  }
}

function subscribe(ws, channelId, userId, userData) {
  const channel = channels.get(channelId);
  if (!channel) return;

  const conn = connections.get(ws);
  conn.channels.add(channelId);
  conn.userId = userId;

  // Add to presence
  if (!presence.has(channelId)) presence.set(channelId, {});
  presence.get(channelId)[userId] = {
    userId,
    userData,
    joinedAt: new Date().toISOString(),
    lastSeen: new Date().toISOString()
  };

  // Notify others
  broadcast(channelId, { type: 'presence_join', userId, userData }, ws);

  // Send channel state
  ws.send(JSON.stringify({
    type: 'subscribed',
    channelId,
    messageCount: channel.messages.length,
    presence: Object.values(presence.get(channelId))
  }));
}

function unsubscribe(ws, channelId) {
  const conn = connections.get(ws);
  if (!conn) return;

  conn.channels.delete(channelId);

  // Remove from presence
  if (presence.has(channelId) && presence.get(channelId)[conn.userId]) {
    delete presence.get(channelId)[conn.userId];
  }

  broadcast(channelId, { type: 'presence_leave', userId: conn.userId });
}

function sendMessage(channelId, userId, text, data) {
  const channel = channels.get(channelId);
  if (!channel) return;

  const message = {
    id: uuidv4(),
    channelId,
    userId,
    text,
    data,
    timestamp: new Date().toISOString()
  };

  channel.messages.push(message);
  broadcast(channelId, { type: 'message', ...message });
}

function broadcast(channelId, message, excludeWs = null) {
  const channel = channels.get(channelId);
  if (!channel) return;

  const data = JSON.stringify(message);
  connections.forEach((conn, ws) => {
    if (conn.channels.has(channelId) && ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  });
}

function handleDisconnect(ws) {
  const conn = connections.get(ws);
  if (!conn) return;

  // Leave all channels
  conn.channels.forEach(channelId => {
    if (presence.has(channelId) && presence.get(channelId)[conn.userId]) {
      delete presence.get(channelId)[conn.userId];
    }
    broadcast(channelId, { type: 'presence_leave', userId: conn.userId });
  });

  connections.delete(ws);
  console.log(`WebSocket disconnected: ${conn.id}`);
}

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'realtime',
    connections: wss.clients.size,
    channels: channels.size
  });
});

server.listen(PORT, () => console.log(`Realtime running on port ${PORT}`));
