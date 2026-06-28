/**
 * Storage Abstraction Layer
 * =========================
 * Provides a unified storage interface that works with:
 * - In-memory (dev/default) — no external dependencies
 * - Redis + MongoDB (production) — persistent, scalable
 *
 * Usage: set USE_REDIS=true + REDIS_URL + MONGODB_URI env vars to enable
 * persistent storage. Otherwise falls back to in-memory Maps.
 */

const { v4: uuidv4 } = require('uuid');

// ─── Storage Factory ───────────────────────────────────────────
let storage = null;

function createStorage() {
  const useRedis = process.env.USE_REDIS === 'true';
  const useMongoDB = process.env.USE_MONGODB === 'true';

  if (useRedis && useMongoDB) {
    return new RedisMongoStorage();
  } else if (useRedis) {
    return new RedisStorage();
  } else if (useMongoDB) {
    return new MongoDBStorage();
  } else {
    return new InMemoryStorage();
  }
}

// ─── In-Memory Storage (default/dev) ───────────────────────────
class InMemoryStorage {
  constructor() {
    this.customers = new Map();
    this.conversations = new Map();
    this.messages = new Map();
    this.channelToCustomer = new Map();
    this.customerSessions = new Map();
    this.listeners = new Map(); // event → [callback]
  }

  // ── Customer ────────────────────────────────────────────────
  async upsertCustomer(data) {
    let customer = this.customers.get(data.customerId);
    if (!customer) {
      customer = { ...data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      this.customers.set(data.customerId, customer);
    } else {
      Object.assign(customer, data, { updatedAt: new Date().toISOString() });
    }
    return customer;
  }

  async getCustomer(customerId) {
    return this.customers.get(customerId) || null;
  }

  async getAllCustomers() {
    return [...this.customers.values()];
  }

  async findCustomerByChannel(channel, identifier) {
    return this.channelToCustomer.get(`${channel}:${identifier}`) || null;
  }

  async registerChannelLink(customerId, channel, identifier) {
    this.channelToCustomer.set(`${channel}:${identifier}`, customerId);
    const customer = this.customers.get(customerId);
    if (customer && !customer.channels.includes(channel)) {
      customer.channels.push(channel);
    }
  }

  // ── Conversation ──────────────────────────────────────────
  async createConversation(data) {
    const conv = {
      ...data,
      id: data.id || `conv-${uuidv4().slice(0, 12)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.conversations.set(conv.id, conv);
    return conv;
  }

  async getConversation(convId) {
    return this.conversations.get(convId) || null;
  }

  async updateConversation(convId, data) {
    const conv = this.conversations.get(convId);
    if (!conv) return null;
    Object.assign(conv, data, { updatedAt: new Date().toISOString() });
    return conv;
  }

  async getConversationsByCustomer(customerId) {
    return [...this.conversations.values()].filter(c => c.customerId === customerId);
  }

  async getAllConversations() {
    return [...this.conversations.values()];
  }

  // ── Message ────────────────────────────────────────────────
  async createMessage(data) {
    const msg = {
      ...data,
      id: `msg-${uuidv4().slice(0, 12)}`,
      createdAt: new Date().toISOString(),
    };
    this.messages.set(msg.id, msg);
    return msg;
  }

  async getMessagesByConversation(convId) {
    return [...this.messages.values()]
      .filter(m => m.conversationId === convId)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }

  async getMessagesByCustomer(customerId) {
    const convs = await this.getConversationsByCustomer(customerId);
    const convIds = new Set(convs.map(c => c.id));
    return [...this.messages.values()]
      .filter(m => convIds.has(m.conversationId))
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }

  // ── Session ─────────────────────────────────────────────────
  async setSession(customerId, channel, data) {
    this.customerSessions.set(`${customerId}:${channel}`, {
      ...data,
      customerId,
      channel,
      updatedAt: new Date().toISOString(),
    });
  }

  async getSession(customerId, channel) {
    return this.customerSessions.get(`${customerId}:${channel}`) || null;
  }

  async getSessionsByCustomer(customerId) {
    return [...this.customerSessions.values()].filter(s => s.customerId === customerId);
  }

  // ── Events (SSE) ───────────────────────────────────────────
  on(event, callback) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event).push(callback);
  }

  emit(event, data) {
    const cbs = this.listeners.get(event) || [];
    for (const cb of cbs) {
      try { cb(data); } catch (e) { /* don't break other listeners */ }
    }
  }
}

// ─── Redis Storage (production) ──────────────────────────────
class RedisStorage {
  constructor() {
    this.connected = false;
    this.client = null;
    this._connect();
  }

  async _connect() {
    try {
      const { Redis } = require('ioredis');
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      this.client = new Redis(redisUrl);
      this.client.on('error', (e) => console.error('[redis] error:', e.message));
      this.client.on('connect', () => { this.connected = true; console.log('[redis] connected'); });
    } catch (e) {
      console.warn('[redis] not available, falling back to in-memory:', e.message);
      // Fall back to in-memory
      this._fallback = new InMemoryStorage();
    }
  }

  _ns(key) { return `usb:${key}`; }

  async _hset(key, data) {
    if (!this.connected) return this._fallback?._hset?.(key, data);
    const flat = {};
    for (const [k, v] of Object.entries(data)) {
      flat[k] = typeof v === 'object' ? JSON.stringify(v) : String(v);
    }
    return this.client.hset(this._ns(key), flat);
  }

  async _hgetall(key) {
    if (!this.connected) return this._fallback?._hgetall?.(key);
    const data = await this.client.hgetall(this._ns(key));
    if (!data || !Object.keys(data).length) return null;
    const result = {};
    for (const [k, v] of Object.entries(data)) {
      try { result[k] = JSON.parse(v); } catch { result[k] = v; }
    }
    return result;
  }

  async _get(key) {
    if (!this.connected) return this._fallback?._get?.(key);
    const data = await this.client.get(this._ns(key));
    return data ? JSON.parse(data) : null;
  }

  async _set(key, value) {
    if (!this.connected) return this._fallback?._set?.(key, value);
    return this.client.set(this._ns(key), JSON.stringify(value));
  }

  async _del(key) {
    if (!this.connected) return this._fallback?._del?.(key);
    return this.client.del(this._ns(key));
  }

  async _keys(pattern) {
    if (!this.connected) return this._fallback?._keys?.(pattern);
    const all = await this.client.keys(this._ns('*'));
    return all.map(k => k.replace(this._ns(''), ''));
  }

  async _smembers(key) {
    if (!this.connected) return this._fallback?._smembers?.(key);
    return this.client.smembers(this._ns(key));
  }

  async _sadd(key, ...members) {
    if (!this.connected) return this._fallback?._sadd?.(key, ...members);
    return this.client.sadd(this._ns(key), ...members);
  }

  async upsertCustomer(data) {
    if (!this.connected) return this._fallback.upsertCustomer(data);
    await this._hset(`customer:${data.customerId}`, { ...data, updatedAt: new Date().toISOString() });
    return data;
  }

  async getCustomer(customerId) {
    if (!this.connected) return this._fallback.getCustomer(customerId);
    return this._get(`customer:${customerId}`);
  }

  async getAllCustomers() {
    if (!this.connected) return this._fallback.getAllCustomers();
    const keys = await this._keys('customer:*');
    const customers = [];
    for (const k of keys) {
      const c = await this._get(k);
      if (c) customers.push(c);
    }
    return customers;
  }

  async findCustomerByChannel(channel, identifier) {
    if (!this.connected) return this._fallback.findCustomerByChannel(channel, identifier);
    return this._get(`channel:${channel}:${identifier}`);
  }

  async registerChannelLink(customerId, channel, identifier) {
    if (!this.connected) return this._fallback.registerChannelLink(customerId, channel, identifier);
    await this._set(`channel:${channel}:${identifier}`, customerId);
    // Also add to customer's channels set
    await this._sadd(`customer:${customerId}:channels`, channel);
  }

  async createConversation(data) {
    if (!this.connected) return this._fallback.createConversation(data);
    const conv = { ...data, id: data.id || `conv-${uuidv4().slice(0, 12)}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    await this._set(`conversation:${conv.id}`, conv);
    await this._sadd('conversations', conv.id);
    return conv;
  }

  async getConversation(convId) {
    if (!this.connected) return this._fallback.getConversation(convId);
    return this._get(`conversation:${convId}`);
  }

  async updateConversation(convId, data) {
    if (!this.connected) return this._fallback.updateConversation(convId, data);
    const existing = await this._get(`conversation:${convId}`);
    if (!existing) return null;
    const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };
    await this._set(`conversation:${convId}`, updated);
    return updated;
  }

  async getConversationsByCustomer(customerId) {
    if (!this.connected) return this._fallback.getConversationsByCustomer(customerId);
    const convIds = await this._smembers(`customer:${customerId}:conversations`);
    const convs = [];
    for (const id of convIds) {
      const c = await this._get(`conversation:${id}`);
      if (c) convs.push(c);
    }
    return convs;
  }

  async getAllConversations() {
    if (!this.connected) return this._fallback.getAllConversations();
    const ids = await this._smembers('conversations');
    const convs = [];
    for (const id of ids) {
      const c = await this._get(`conversation:${id}`);
      if (c) convs.push(c);
    }
    return convs;
  }

  async createMessage(data) {
    if (!this.connected) return this._fallback.createMessage(data);
    const msg = { ...data, id: `msg-${uuidv4().slice(0, 12)}`, createdAt: new Date().toISOString() };
    await this._set(`message:${msg.id}`, msg);
    await this._sadd(`conversation:${data.conversationId}:messages`, msg.id);
    return msg;
  }

  async getMessagesByConversation(convId) {
    if (!this.connected) return this._fallback.getMessagesByConversation(convId);
    const msgIds = await this._smembers(`conversation:${convId}:messages`);
    const msgs = [];
    for (const id of msgIds) {
      const m = await this._get(`message:${id}`);
      if (m) msgs.push(m);
    }
    return msgs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }

  async getMessagesByCustomer(customerId) {
    if (!this.connected) return this._fallback.getMessagesByCustomer(customerId);
    const convs = await this.getConversationsByCustomer(customerId);
    const msgs = [];
    for (const conv of convs) {
      const m = await this.getMessagesByConversation(conv.id);
      msgs.push(...m);
    }
    return msgs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }

  async setSession(customerId, channel, data) {
    if (!this.connected) return this._fallback.setSession(customerId, channel, data);
    await this._set(`session:${customerId}:${channel}`, { ...data, customerId, channel, updatedAt: new Date().toISOString() });
  }

  async getSession(customerId, channel) {
    if (!this.connected) return this._fallback.getSession(customerId, channel);
    return this._get(`session:${customerId}:${channel}`);
  }

  async getSessionsByCustomer(customerId) {
    if (!this.connected) return this._fallback.getSessionsByCustomer(customerId);
    const keys = await this._keys(`session:${customerId}:*`);
    const sessions = [];
    for (const k of keys) {
      const s = await this._get(k);
      if (s) sessions.push(s);
    }
    return sessions;
  }

  // SSE: Redis pub/sub
  on(event, callback) {
    if (!this.connected) return this._fallback?.on?.(event, callback);
    // Redis pub/sub — publish to channel, we subscribe in the SSE endpoint
    this._callbacks = this._callbacks || {};
    this._callbacks[event] = this._callbacks[event] || [];
    this._callbacks[event].push(callback);
  }

  emit(event, data) {
    if (!this.connected) return this._fallback?.emit?.(event, data);
    const cbs = this._callbacks?.[event] || [];
    for (const cb of cbs) {
      try { cb(data); } catch (e) { /* noop */ }
    }
    // Also publish to Redis for multi-process
    if (this.client && this.connected) {
      this.client.publish(`usb:event:${event}`, JSON.stringify(data)).catch(() => {});
    }
  }
}

// ─── MongoDB Storage ───────────────────────────────────────────
// For production use when you need relational queries
class MongoDBStorage {
  constructor() {
    this.connected = false;
    this.client = null;
    this._connect();
  }

  async _connect() {
    try {
      const { MongoClient } = require('mongodb');
      const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/unified-support-bridge';
      this.client = new MongoClient(uri);
      await this.client.connect();
      this.db = this.client.db();
      this.connected = true;
      console.log('[mongodb] connected');

      // Create indexes
      await this.db.collection('customers').createIndex({ customerId: 1 }, { unique: true });
      await this.db.collection('customers').createIndex({ email: 1 });
      await this.db.collection('customers').createIndex({ phone: 1 });
      await this.db.collection('customers').createIndex({ appUserId: 1 });
      await this.db.collection('conversations').createIndex({ conversationId: 1 }, { unique: true });
      await this.db.collection('conversations').createIndex({ customerId: 1 });
      await this.db.collection('conversations').createIndex({ channel: 1 });
      await this.db.collection('messages').createIndex({ conversationId: 1 });
      await this.db.collection('messages').createIndex({ createdAt: 1 });
      await this.db.collection('sessions').createIndex({ customerId: 1, channel: 1 }, { unique: true });
    } catch (e) {
      console.warn('[mongodb] not available, falling back to in-memory:', e.message);
      this._fallback = new InMemoryStorage();
    }
  }

  _c(name) { return this.db.collection(name); }

  async upsertCustomer(data) {
    if (!this.connected) return this._fallback.upsertCustomer(data);
    const result = await this._c('customers').findOneAndUpdate(
      { customerId: data.customerId },
      { $set: { ...data, updatedAt: new Date().toISOString() } },
      { upsert: true, returnDocument: 'after' }
    );
    return result;
  }

  async getCustomer(customerId) {
    if (!this.connected) return this._fallback.getCustomer(customerId);
    return this._c('customers').findOne({ customerId });
  }

  async getAllCustomers() {
    if (!this.connected) return this._fallback.getAllCustomers();
    return this._c('customers').find({}).toArray();
  }

  async findCustomerByChannel(channel, identifier) {
    if (!this.connected) return this._fallback.findCustomerByChannel(channel, identifier);
    const doc = await this._c('channel_map').findOne({ channel, identifier });
    return doc?.customerId || null;
  }

  async registerChannelLink(customerId, channel, identifier) {
    if (!this.connected) return this._fallback.registerChannelLink(customerId, channel, identifier);
    await this._c('channel_map').updateOne(
      { channel, identifier },
      { $set: { customerId, updatedAt: new Date().toISOString() } },
      { upsert: true }
    );
    await this._c('customers').updateOne(
      { customerId },
      { $addToSet: { channels: channel }, $set: { updatedAt: new Date().toISOString() } }
    );
  }

  async createConversation(data) {
    if (!this.connected) return this._fallback.createConversation(data);
    const conv = { ...data, conversationId: data.id || `conv-${uuidv4().slice(0, 12)}`, createdAt: new Date(), updatedAt: new Date() };
    await this._c('conversations').insertOne(conv);
    await this._c('customers').updateOne(
      { customerId: data.customerId },
      { $addToSet: { conversations: conv.conversationId } }
    );
    return conv;
  }

  async getConversation(convId) {
    if (!this.connected) return this._fallback.getConversation(convId);
    return this._c('conversations').findOne({ conversationId: convId });
  }

  async updateConversation(convId, data) {
    if (!this.connected) return this._fallback.updateConversation(convId, data);
    const result = await this._c('conversations').findOneAndUpdate(
      { conversationId: convId },
      { $set: { ...data, updatedAt: new Date().toISOString() } },
      { returnDocument: 'after' }
    );
    return result;
  }

  async getConversationsByCustomer(customerId) {
    if (!this.connected) return this._fallback.getConversationsByCustomer(customerId);
    return this._c('conversations').find({ customerId }).toArray();
  }

  async getAllConversations() {
    if (!this.connected) return this._fallback.getAllConversations();
    return this._c('conversations').find({}).toArray();
  }

  async createMessage(data) {
    if (!this.connected) return this._fallback.createMessage(data);
    const msg = { ...data, messageId: `msg-${uuidv4().slice(0, 12)}`, createdAt: new Date() };
    await this._c('messages').insertOne(msg);
    return msg;
  }

  async getMessagesByConversation(convId) {
    if (!this.connected) return this._fallback.getMessagesByConversation(convId);
    return this._c('messages').find({ conversationId: convId }).sort({ createdAt: 1 }).toArray();
  }

  async getMessagesByCustomer(customerId) {
    if (!this.connected) return this._fallback.getMessagesByCustomer(customerId);
    const convs = await this.getConversationsByCustomer(customerId);
    const convIds = convs.map(c => c.conversationId);
    return this._c('messages').find({ conversationId: { $in: convIds } }).sort({ createdAt: 1 }).toArray();
  }

  async setSession(customerId, channel, data) {
    if (!this.connected) return this._fallback.setSession(customerId, channel, data);
    await this._c('sessions').updateOne(
      { customerId, channel },
      { $set: { ...data, customerId, channel, updatedAt: new Date().toISOString() } },
      { upsert: true }
    );
  }

  async getSession(customerId, channel) {
    if (!this.connected) return this._fallback.getSession(customerId, channel);
    return this._c('sessions').findOne({ customerId, channel });
  }

  async getSessionsByCustomer(customerId) {
    if (!this.connected) return this._fallback.getSessionsByCustomer(customerId);
    return this._c('sessions').find({ customerId }).toArray();
  }

  on(event, callback) { this._fallback?.on?.(event, callback); }
  emit(event, data) { this._fallback?.emit?.(event, data); }
}

// ─── Redis + MongoDB Combined (full production) ─────────────────
class RedisMongoStorage {
  constructor() {
    this.redis = new RedisStorage();
    this.mongo = new MongoDBStorage();
    console.log('[storage] Redis + MongoDB combined storage initialized');
  }

  async upsertCustomer(data) { return this.mongo.upsertCustomer(data); }
  async getCustomer(id) { return this.mongo.getCustomer(id); }
  async getAllCustomers() { return this.mongo.getAllCustomers(); }
  async findCustomerByChannel(c, i) { return this.mongo.findCustomerByChannel(c, i); }
  async registerChannelLink(cid, c, i) { return this.mongo.registerChannelLink(cid, c, i); }
  async createConversation(data) { return this.mongo.createConversation(data); }
  async getConversation(id) { return this.mongo.getConversation(id); }
  async updateConversation(id, data) { return this.mongo.updateConversation(id, data); }
  async getConversationsByCustomer(cid) { return this.mongo.getConversationsByCustomer(cid); }
  async getAllConversations() { return this.mongo.getAllConversations(); }
  async createMessage(data) { return this.mongo.createMessage(data); }
  async getMessagesByConversation(cid) { return this.mongo.getMessagesByConversation(cid); }
  async getMessagesByCustomer(cid) { return this.mongo.getMessagesByCustomer(cid); }
  async setSession(cid, c, data) { return this.mongo.setSession(cid, c, data); }
  async getSession(cid, c) { return this.mongo.getSession(cid, c); }
  async getSessionsByCustomer(cid) { return this.mongo.getSessionsByCustomer(cid); }
  on(e, cb) { this.mongo.on(e, cb); }
  emit(e, d) { this.redis.emit(e, d); this.mongo.emit(e, d); }
}

// Export singleton
module.exports = { createStorage };
