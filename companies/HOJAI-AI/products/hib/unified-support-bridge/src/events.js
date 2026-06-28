/**
 * Real-Time Events (SSE + WebSocket)
 * ==================================
 * Provides real-time event streaming for:
 *
 * - Agent dashboards (live conversation updates)
 * - Customer-facing chat (message typing indicators)
 * - Admin panels (new ticket notifications)
 *
 * Supported transports:
 * 1. SSE (Server-Sent Events) — for agent dashboards, admin panels
 * 2. WebSocket — for real-time bidirectional communication
 * 3. Redis Pub/Sub — for multi-process / multi-service broadcasting
 */

const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');

// ─── Event Types ───────────────────────────────────────────────
const EVENTS = {
  // Customer events
  MESSAGE_RECEIVED: 'message.received',
  CONVERSATION_CREATED: 'conversation.created',
  CONVERSATION_UPDATED: 'conversation.updated',
  CONVERSATION_MERGED: 'conversation.merged',
  TICKET_CREATED: 'ticket.created',
  TICKET_UPDATED: 'ticket.updated',

  // Agent events
  CONVERSATION_ASSIGNED: 'conversation.assigned',
  CONVERSATION_UNASSIGNED: 'conversation.unassigned',
  ESCALATION: 'escalation.created',

  // System events
  CUSTOMER_LINKED: 'customer.linked',
  CHANNEL_CONNECTED: 'channel.connected',
  CHANNEL_DISCONNECTED: 'channel.disconnected',
};

// ─── Event Emitter (in-process) ────────────────────────────────
class UnifiedEventEmitter extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(10000); // Support many SSE connections
  }
}

const emitter = new UnifiedEventEmitter();

// ─── SSE (Server-Sent Events) ──────────────────────────────────
// For agent dashboards and admin panels
function createSseEndpoint(req, res) {
  const { customerId, conversationId, agentId, channel } = req.query;

  // Determine which events this client wants
  const filters = {
    customerId: customerId || null,
    conversationId: conversationId || null,
    agentId: agentId || null,
    channel: channel || null,
  };

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
  res.flushHeaders();

  // Send keep-alive comment every 30s
  const keepAlive = setInterval(() => {
    res.write(': keep-alive\n\n');
  }, 30000);

  // Create event stream
  const connectionId = uuidv4();

  const handler = (event) => {
    // Filter: if client specified customerId, only events for that customer
    if (filters.customerId && event.customerId && event.customerId !== filters.customerId) return;
    // Filter: if client specified conversationId, only events for that conversation
    if (filters.conversationId && event.conversationId && event.conversationId !== filters.conversationId) return;
    // Filter: if client specified agentId, only events for that agent
    if (filters.agentId && event.agentId && event.agentId !== filters.agentId) return;
    // Filter: if client specified channel, only events for that channel
    if (filters.channel && event.channel && event.channel !== filters.channel) return;

    const sseData = formatSseEvent(event);
    res.write(sseData);
  };

  // Subscribe to events
  emitter.on(EVENTS.MESSAGE_RECEIVED, handler);
  emitter.on(EVENTS.CONVERSATION_CREATED, handler);
  emitter.on(EVENTS.CONVERSATION_UPDATED, handler);
  emitter.on(EVENTS.CONVERSATION_MERGED, handler);
  emitter.on(EVENTS.TICKET_CREATED, handler);
  emitter.on(EVENTS.TICKET_UPDATED, handler);
  emitter.on(EVENTS.CONVERSATION_ASSIGNED, handler);
  emitter.on(EVENTS.CONVERSATION_UNASSIGNED, handler);
  emitter.on(EVENTS.ESCALATION, handler);
  emitter.on(EVENTS.CUSTOMER_LINKED, handler);
  emitter.on(EVENTS.CHANNEL_CONNECTED, handler);
  emitter.on(EVENTS.CHANNEL_DISCONNECTED, handler);

  // Send connection established event
  const connectEvent = {
    type: 'connected',
    connectionId,
    filters,
    timestamp: new Date().toISOString(),
  };
  res.write(formatSseEvent(connectEvent));

  // Cleanup on disconnect
  req.on('close', () => {
    clearInterval(keepAlive);
    emitter.off(EVENTS.MESSAGE_RECEIVED, handler);
    emitter.off(EVENTS.CONVERSATION_CREATED, handler);
    emitter.off(EVENTS.CONVERSATION_UPDATED, handler);
    emitter.off(EVENTS.CONVERSATION_MERGED, handler);
    emitter.off(EVENTS.TICKET_CREATED, handler);
    emitter.off(EVENTS.TICKET_UPDATED, handler);
    emitter.off(EVENTS.CONVERSATION_ASSIGNED, handler);
    emitter.off(EVENTS.CONVERSATION_UNASSIGNED, handler);
    emitter.off(EVENTS.ESCALATION, handler);
    emitter.off(EVENTS.CUSTOMER_LINKED, handler);
    emitter.off(EVENTS.CHANNEL_CONNECTED, handler);
    emitter.off(EVENTS.CHANNEL_DISCONNECTED, handler);
    console.log(`[sse] client disconnected: ${connectionId}`);
  });

  console.log(`[sse] client connected: ${connectionId} filters:`, filters);
}

function formatSseEvent(event) {
  const data = JSON.stringify({
    ...event,
    timestamp: event.timestamp || new Date().toISOString(),
  });
  return `event: ${event.type || 'event'}\ndata: ${data}\n\n`;
}

// ─── WebSocket ────────────────────────────────────────────────
// For real-time bidirectional chat
let wss = null;

function initWebSocket(server) {
  const { WebSocketServer } = require('ws');

  wss = new WebSocketServer({ server, path: '/ws/events' });

  wss.on('connection', (ws, req) => {
    const connectionId = uuidv4();
    ws.subscriptions = new Set();
    ws.isAlive = true;

    ws.on('pong', () => { ws.isAlive = true; });

    // Heartbeat to detect stale connections
    const heartbeat = setInterval(() => {
      if (!ws.isAlive) {
        clearInterval(heartbeat);
        ws.terminate();
        return;
      }
      ws.isAlive = false;
      ws.ping();
    }, 30000);

    // Parse auth token (JWT in query param or Authorization header)
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get('token') || req.headers['authorization']?.replace('Bearer ', '');

    ws.send(JSON.stringify({
      type: 'connected',
      connectionId,
      timestamp: new Date().toISOString(),
    }));

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        handleWebSocketMessage(ws, msg);
      } catch (e) {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
      }
    });

    ws.on('close', () => {
      clearInterval(heartbeat);
      // Emit disconnection
      emitter.emit(EVENTS.CHANNEL_DISCONNECTED, {
        type: 'channel.disconnected',
        connectionId,
        protocol: 'websocket',
        timestamp: new Date().toISOString(),
      });
    });

    ws.on('error', (e) => {
      console.error(`[ws] connection error ${connectionId}:`, e.message);
    });

    console.log(`[ws] client connected: ${connectionId}`);
  });

  // Broadcast to all subscribers
  const broadcastHandler = (event) => {
    const payload = JSON.stringify({
      ...event,
      timestamp: event.timestamp || new Date().toISOString(),
    });
    wss.clients.forEach((client) => {
      if (client.readyState === 1 && matchesSubscriptions(client, event)) {
        client.send(payload);
      }
    });
  };

  for (const eventName of Object.values(EVENTS)) {
    emitter.on(eventName, broadcastHandler);
  }

  console.log('[ws] WebSocket server initialized on /ws/events');
}

function matchesSubscriptions(ws, event) {
  if (ws.subscriptions.size === 0) return true; // Subscribe to all
  if (event.customerId && ws.subscriptions.has(`customer:${event.customerId}`)) return true;
  if (event.conversationId && ws.subscriptions.has(`conversation:${event.conversationId}`)) return true;
  if (event.channel && ws.subscriptions.has(`channel:${event.channel}`)) return true;
  return false;
}

function handleWebSocketMessage(ws, msg) {
  switch (msg.type) {
    case 'subscribe':
      if (msg.channel) ws.subscriptions.add(msg.channel);
      ws.send(JSON.stringify({ type: 'subscribed', channels: [...ws.subscriptions] }));
      break;
    case 'unsubscribe':
      if (msg.channel) ws.subscriptions.delete(msg.channel);
      ws.send(JSON.stringify({ type: 'unsubscribed', channels: [...ws.subscriptions] }));
      break;
    case 'ping':
      ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
      break;
    default:
      ws.send(JSON.stringify({ type: 'error', message: `Unknown message type: ${msg.type}` }));
  }
}

// ─── Redis Pub/Sub (multi-process) ────────────────────────────
// For when you run multiple instances of the service
let redisSub = null;
let redisPub = null;

async function initRedisPubSub(redisUrl) {
  try {
    const { Redis } = require('ioredis');
    redisPub = new Redis(redisUrl);
    redisSub = new Redis(redisUrl);

    await redisSub.subscribe('usb:event:*');

    redisSub.on('message', (channel, message) => {
      const eventName = channel.replace('usb:event:', '');
      try {
        const event = JSON.parse(message);
        emitter.emit(eventName, event);
      } catch (e) {
        // Ignore parse errors
      }
    });

    console.log('[events] Redis pub/sub initialized');
  } catch (e) {
    console.warn('[events] Redis pub/sub not available:', e.message);
  }
}

// ─── Emit Helpers ────────────────────────────────────────────
function emit(type, data) {
  const event = { type, ...data, timestamp: new Date().toISOString() };

  // Local emitter
  emitter.emit(type, event);

  // Redis pub/sub (for multi-process)
  if (redisPub) {
    redisPub.publish(`usb:event:${type}`, JSON.stringify(event)).catch(() => {});
  }

  return event;
}

// Convenience methods
function emitMessageReceived(data) {
  return emit(EVENTS.MESSAGE_RECEIVED, data);
}
function emitConversationCreated(data) {
  return emit(EVENTS.CONVERSATION_CREATED, data);
}
function emitConversationUpdated(data) {
  return emit(EVENTS.CONVERSATION_UPDATED, data);
}
function emitConversationMerged(data) {
  return emit(EVENTS.CONVERSATION_MERGED, data);
}
function emitTicketCreated(data) {
  return emit(EVENTS.TICKET_CREATED, data);
}
function emitTicketUpdated(data) {
  return emit(EVENTS.TICKET_UPDATED, data);
}
function emitConversationAssigned(data) {
  return emit(EVENTS.CONVERSATION_ASSIGNED, data);
}
function emitCustomerLinked(data) {
  return emit(EVENTS.CUSTOMER_LINKED, data);
}
function emitEscalation(data) {
  return emit(EVENTS.ESCALATION, data);
}

// ─── SSE Endpoint Routes ──────────────────────────────────────
// Attach to Express app
function attachEventRoutes(app) {
  // SSE endpoint
  app.get('/api/events/stream', createSseEndpoint);

  // WebSocket is attached to the HTTP server externally via initWebSocket(server)

  // REST endpoint for getting active connections (admin)
  app.get('/api/events/stats', (req, res) => {
    res.json({
      sseConnections: emitter.listenerCount(EVENTS.MESSAGE_RECEIVED),
      wsConnections: wss ? wss.clients.size : 0,
      redisPubSub: redisPub ? 'active' : 'inactive',
    });
  });

  // Manually trigger an event (for testing/webhooks)
  app.post('/api/events/emit', (req, res) => {
    const { type, ...data } = req.body;
    if (!type) return res.status(400).json({ error: 'type required' });
    const event = emit(type, data);
    res.json({ success: true, event });
  });

  // Subscribe WebSocket clients
  app.post('/api/events/subscribe', (req, res) => {
    const { connectionId, channels } = req.body;
    if (!wss || !connectionId || !channels) {
      return res.status(400).json({ error: 'WebSocket not initialized or missing params' });
    }
    for (const client of wss.clients) {
      if (client.connectionId === connectionId) {
        channels.forEach(c => client.subscriptions.add(c));
        client.send(JSON.stringify({ type: 'subscribed', channels: [...client.subscriptions] }));
        break;
      }
    }
    res.json({ success: true });
  });
}

module.exports = {
  EVENTS,
  emitter,
  createSseEndpoint,
  initWebSocket,
  initRedisPubSub,
  emit,
  emitMessageReceived,
  emitConversationCreated,
  emitConversationUpdated,
  emitConversationMerged,
  emitTicketCreated,
  emitTicketUpdated,
  emitConversationAssigned,
  emitCustomerLinked,
  emitEscalation,
  attachEventRoutes,
};
