'use strict';

const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');

const EVENTS = {
  MESSAGE_RECEIVED: 'message.received',
  CONVERSATION_CREATED: 'conversation.created',
  CONVERSATION_UPDATED: 'conversation.updated',
  CONVERSATION_MERGED: 'conversation.merged',
  TICKET_CREATED: 'ticket.created',
  TICKET_UPDATED: 'ticket.updated',
  CONVERSATION_ASSIGNED: 'conversation.assigned',
  CONVERSATION_UNASSIGNED: 'conversation.unassigned',
  ESCALATION: 'escalation.created',
  CUSTOMER_LINKED: 'customer.linked',
  CHANNEL_CONNECTED: 'channel.connected',
  CHANNEL_DISCONNECTED: 'channel.disconnected',
};

class UnifiedEventEmitter extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(10000);
  }
}

const emitter = new UnifiedEventEmitter();

function formatSseEvent(event) {
  const data = JSON.stringify(Object.assign({}, event, { timestamp: event.timestamp || new Date().toISOString() }));
  return 'event: ' + (event.type || 'event') + '\ndata: ' + data + '\n\n';
}

function createSseEndpoint(req, res) {
  const q = req.query || {};
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const connectionId = uuidv4();
  const keepAlive = setInterval(function() { res.write(': keep-alive\n\n'); }, 30000);

  const handler = function(event) {
    if (q.customerId && event.customerId && event.customerId !== q.customerId) return;
    if (q.conversationId && event.conversationId && event.conversationId !== q.conversationId) return;
    if (q.agentId && event.agentId && event.agentId !== q.agentId) return;
    if (q.channel && event.channel && event.channel !== q.channel) return;
    res.write(formatSseEvent(event));
  };

  Object.values(EVENTS).forEach(function(ev) { emitter.on(ev, handler); });

  res.write(formatSseEvent({ type: 'connected', connectionId: connectionId, filters: q, timestamp: new Date().toISOString() }));

  req.on('close', function() {
    clearInterval(keepAlive);
    Object.values(EVENTS).forEach(function(ev) { emitter.off(ev, handler); });
  });
}

let wss = null;

function initWebSocket(server) {
  let Ws;
  try {
    Ws = require('ws');
  } catch (e) {
    console.log('[ws] ws not available, WebSocket disabled');
    return;
  }

  wss = new Ws.Server({ server: server, path: '/ws/events' });

  wss.on('connection', function(ws, req) {
    const connectionId = uuidv4();
    ws.subscriptions = new Set();
    ws.isAlive = true;
    ws.connectionId = connectionId;

    const heartbeat = setInterval(function() {
      if (!ws.isAlive) { clearInterval(heartbeat); ws.terminate(); return; }
      ws.isAlive = false;
      ws.ping();
    }, 30000);

    ws.send(JSON.stringify({ type: 'connected', connectionId: connectionId, timestamp: new Date().toISOString() }));

    ws.on('message', function(data) {
      try {
        handleWsMessage(ws, JSON.parse(data.toString()));
      } catch (e) {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
      }
    });

    ws.on('close', function() {
      clearInterval(heartbeat);
      emitter.emit(EVENTS.CHANNEL_DISCONNECTED, {
        type: 'channel.disconnected', connectionId: connectionId, protocol: 'websocket', timestamp: new Date().toISOString(),
      });
    });

    ws.on('error', function(e) { console.error('[ws] error ' + connectionId + ':', e.message); });
    ws.on('pong', function() { ws.isAlive = true; });
    console.log('[ws] client connected: ' + connectionId);
  });

  wss.on('error', function(e) { console.error('[ws] server error:', e.message); });

  var broadcastHandler = function(event) {
    if (!wss) return;
    var payload = JSON.stringify(Object.assign({}, event, { timestamp: event.timestamp || new Date().toISOString() }));
    wss.clients.forEach(function(client) {
      if (client.readyState === 1 && wsMatchesSubscriptions(client, event)) {
        client.send(payload);
      }
    });
  };

  Object.values(EVENTS).forEach(function(ev) { emitter.on(ev, broadcastHandler); });
  console.log('[ws] initialized on /ws/events');
}

function wsMatchesSubscriptions(ws, event) {
  if (ws.subscriptions.size === 0) return true;
  if (event.customerId && ws.subscriptions.has('customer:' + event.customerId)) return true;
  if (event.conversationId && ws.subscriptions.has('conversation:' + event.conversationId)) return true;
  if (event.channel && ws.subscriptions.has('channel:' + event.channel)) return true;
  return false;
}

function handleWsMessage(ws, msg) {
  switch (msg.type) {
    case 'subscribe':
      if (msg.channel) ws.subscriptions.add(msg.channel);
      ws.send(JSON.stringify({ type: 'subscribed', channels: Array.from(ws.subscriptions) }));
      break;
    case 'unsubscribe':
      if (msg.channel) ws.subscriptions.delete(msg.channel);
      ws.send(JSON.stringify({ type: 'unsubscribed', channels: Array.from(ws.subscriptions) }));
      break;
    case 'ping':
      ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
      break;
    default:
      ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type: ' + (msg.type || '') }));
  }
}

let redisPub = null;
let redisSub = null;

async function initRedisPubSub(redisUrl) {
  try {
    var Redis = require('ioredis');
    redisPub = new Redis(redisUrl);
    redisSub = new Redis(redisUrl);
    await new Promise(function(resolve, reject) {
      redisSub.on('ready', resolve);
      redisSub.on('error', reject);
    });
    await new Promise(function(r) { setTimeout(r, 100); });
    await redisSub.subscribe('usb:event:*');
    redisSub.on('message', function(channel, message) {
      var eventName = channel.replace('usb:event:', '');
      try { emitter.emit(eventName, JSON.parse(message)); } catch (e) { /* ignore */ }
    });
    console.log('[events] Redis pub/sub initialized');
  } catch (e) {
    console.warn('[events] Redis pub/sub not available: ' + e.message);
  }
}

function emit(type, data) {
  var event = Object.assign({ type: type }, data, { timestamp: new Date().toISOString() });
  emitter.emit(type, event);
  if (redisPub) redisPub.publish('usb:event:' + type, JSON.stringify(event)).catch(function() {});
  return event;
}

function emitMessageReceived(data) { return emit(EVENTS.MESSAGE_RECEIVED, data); }
function emitConversationCreated(data) { return emit(EVENTS.CONVERSATION_CREATED, data); }
function emitConversationUpdated(data) { return emit(EVENTS.CONVERSATION_UPDATED, data); }
function emitConversationMerged(data) { return emit(EVENTS.CONVERSATION_MERGED, data); }
function emitTicketCreated(data) { return emit(EVENTS.TICKET_CREATED, data); }
function emitTicketUpdated(data) { return emit(EVENTS.TICKET_UPDATED, data); }
function emitConversationAssigned(data) { return emit(EVENTS.CONVERSATION_ASSIGNED, data); }
function emitCustomerLinked(data) { return emit(EVENTS.CUSTOMER_LINKED, data); }
function emitEscalation(data) { return emit(EVENTS.ESCALATION, data); }

function attachEventRoutes(app) {
  app.get('/api/events/stream', createSseEndpoint);
  app.get('/api/events/stats', function(req, res) {
    res.json({
      sseListeners: emitter.listenerCount(EVENTS.MESSAGE_RECEIVED),
      wsConnections: wss ? wss.clients.size : 0,
      redisPubSub: redisPub ? 'active' : 'inactive',
    });
  });
  app.post('/api/events/emit', function(req, res) {
    if (!req.body || !req.body.type) return res.status(400).json({ error: 'type required' });
    var event = emit(req.body.type, req.body);
    res.json({ success: true, event: event });
  });
}

module.exports = {
  EVENTS: EVENTS,
  emitter: emitter,
  createSseEndpoint: createSseEndpoint,
  initWebSocket: initWebSocket,
  initRedisPubSub: initRedisPubSub,
  emit: emit,
  emitMessageReceived: emitMessageReceived,
  emitConversationCreated: emitConversationCreated,
  emitConversationUpdated: emitConversationUpdated,
  emitConversationMerged: emitConversationMerged,
  emitTicketCreated: emitTicketCreated,
  emitTicketUpdated: emitTicketUpdated,
  emitConversationAssigned: emitConversationAssigned,
  emitCustomerLinked: emitCustomerLinked,
  emitEscalation: emitEscalation,
  attachEventRoutes: attachEventRoutes,
};
