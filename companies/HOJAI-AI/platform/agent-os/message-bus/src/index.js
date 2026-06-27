/**
 * message-bus (port 4807) — Phase 32.7
 *
 * Inter-agent pub/sub messaging bus for HOJAI AI Agent OS.
 *   - Topics are persisted as JSONL per topic (one line per message).
 *   - Subscriptions use simple glob patterns: `*` matches one segment;
 *     bare `*` matches any sequence including dots.
 *   - Both push (on-demand pull) and replay are supported.
 *
 * Storage layout (under MESSAGE_BUS_DATA_DIR, defaults to ./data):
 *   topics.json
 *   subscriptions.json
 *   messages/<topic>.jsonl
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PORT = parseInt(process.env.PORT, 10) || 4807;
const SERVICE_NAME = 'message-bus';
const VERSION = '1.0.0';
const DATA_DIR = process.env.MESSAGE_BUS_DATA_DIR || path.join(__dirname, '../data');
const TOPICS_FILE = path.join(DATA_DIR, 'topics.json');
const SUBSCRIPTIONS_FILE = path.join(DATA_DIR, 'subscriptions.json');
const MESSAGES_DIR = path.join(DATA_DIR, 'messages');

function ensureDir(dir) { try { fs.mkdirSync(dir, { recursive: true }); } catch (_) { /* ignore */ } }
function ensureDataDirs() { ensureDir(DATA_DIR); ensureDir(MESSAGES_DIR); }
function nowIso() { return new Date().toISOString(); }
function rid() { return crypto.randomBytes(8).toString('hex'); }
function subId() { return `sub_${rid()}`; }
function msgId() { return `msg_${rid()}`; }
function safeTopicName(name) {
  // Topic names map to a filename; allow alphanum + . - _ so we can use them as JSONL files.
  if (!name || typeof name !== 'string') return null;
  if (!/^[A-Za-z0-9._-]+$/.test(name)) return null;
  return name;
}
function topicFile(name) { return path.join(MESSAGES_DIR, `${name}.jsonl`); }

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validateTopic(body) {
  const errors = [];
  if (!body || typeof body !== 'object') { errors.push('body must be object'); return errors; }
  if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
    errors.push('name required (non-empty string)');
  } else if (!/^[A-Za-z0-9._-]+$/.test(body.name)) {
    errors.push('name may only contain A-Z a-z 0-9 . _ -');
  }
  if (body.description !== undefined && typeof body.description !== 'string') {
    errors.push('description must be string when provided');
  }
  return errors;
}

function validateMessage(body) {
  const errors = [];
  if (!body || typeof body !== 'object') { errors.push('body must be object'); return errors; }
  // payload may be any JSON (including null); only enforce typeof object
  if (!Object.prototype.hasOwnProperty.call(body, 'payload')) {
    errors.push('payload required (any JSON value)');
  }
  if (body.headers !== undefined && (body.headers === null || typeof body.headers !== 'object' || Array.isArray(body.headers))) {
    errors.push('headers must be object when provided');
  }
  return errors;
}

function validateSubscription(body) {
  const errors = [];
  if (!body || typeof body !== 'object') { errors.push('body must be object'); return errors; }
  if (!body.pattern || typeof body.pattern !== 'string' || body.pattern.trim().length === 0) {
    errors.push('pattern required (non-empty string)');
  }
  if (!body.subscriber || typeof body.subscriber !== 'string' || body.subscriber.trim().length === 0) {
    errors.push('subscriber required (non-empty string)');
  }
  return errors;
}

function normalizeTopic(body, existing) {
  const now = nowIso();
  return {
    name: body.name,
    description: body.description ?? existing?.description ?? '',
    createdAt: existing?.createdAt || now,
    messageCount: existing?.messageCount || 0,
    subscriberCount: existing?.subscriberCount || 0,
  };
}

function normalizeMessage(body, topic, publisher) {
  const now = nowIso();
  return {
    id: body.id || msgId(),
    topic,
    payload: body.payload,
    headers: body.headers && typeof body.headers === 'object' && !Array.isArray(body.headers) ? body.headers : {},
    publisher: publisher || 'anonymous',
    timestamp: body.timestamp || now,
  };
}

function normalizeSubscription(body, existing) {
  const now = nowIso();
  return {
    id: body.id || existing?.id || subId(),
    pattern: body.pattern,
    subscriber: body.subscriber,
    createdAt: existing?.createdAt || now,
    lastDeliveredId: body.lastDeliveredId ?? existing?.lastDeliveredId ?? null,
    active: body.active !== undefined ? !!body.active : (existing?.active !== undefined ? !!existing.active : true),
  };
}

// ---------------------------------------------------------------------------
// Pattern matching
// ---------------------------------------------------------------------------

// Simple glob:
//   '*'           -> matches everything
//   'foo.*'       -> matches one segment after 'foo.'
//   '*.events'    -> matches one segment before '.events'
//   'a.b.c'       -> exact match
//
// We split both pattern and topic on '.' and compare segment by segment.
// A '*' segment matches exactly one segment. A bare '*' alone (no dots) matches everything.
function patternMatches(pattern, topic) {
  if (!pattern || typeof pattern !== 'string') return false;
  if (!topic || typeof topic !== 'string') return false;
  if (pattern === '*') return true;
  const patSegs = pattern.split('.');
  const topSegs = topic.split('.');
  if (patSegs.length !== topSegs.length) return false;
  for (let i = 0; i < patSegs.length; i += 1) {
    const p = patSegs[i];
    const t = topSegs[i];
    if (p === '*') continue; // matches any single segment
    if (p !== t) return false;
  }
  return true;
}

function matchTopic(pattern, topic) { return patternMatches(pattern, topic); }

function findMatchingTopics(pattern, topics) {
  if (!Array.isArray(topics)) return [];
  return topics.filter((t) => patternMatches(pattern, t.name));
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

function loadTopics() {
  ensureDataDirs();
  if (!fs.existsSync(TOPICS_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(TOPICS_FILE, 'utf8')); } catch { return []; }
}

function saveTopics(topics) {
  ensureDataDirs();
  fs.writeFileSync(TOPICS_FILE, JSON.stringify(topics, null, 2));
}

function loadSubscriptions() {
  ensureDataDirs();
  if (!fs.existsSync(SUBSCRIPTIONS_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(SUBSCRIPTIONS_FILE, 'utf8')); } catch { return []; }
}

function saveSubscriptions(subs) {
  ensureDataDirs();
  fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(subs, null, 2));
}

function appendMessage(topic, message) {
  ensureDataDirs();
  fs.appendFileSync(topicFile(topic), `${JSON.stringify(message)}\n`);
  return message;
}

function readMessages(topic, opts = {}) {
  ensureDataDirs();
  const f = topicFile(topic);
  if (!fs.existsSync(f)) return [];
  const raw = fs.readFileSync(f, 'utf8');
  const lines = raw.split('\n').filter((l) => l.length > 0);
  let messages = lines.map((l) => {
    try { return JSON.parse(l); } catch { return null; }
  }).filter((m) => m !== null);

  if (opts.since) {
    const sinceTs = new Date(opts.since).getTime();
    messages = messages.filter((m) => {
      const ts = new Date(m.timestamp).getTime();
      return Number.isFinite(ts) && ts > sinceTs;
    });
  }
  if (typeof opts.offset === 'number' && opts.offset > 0) {
    messages = messages.slice(opts.offset);
  }
  if (typeof opts.limit === 'number' && opts.limit >= 0) {
    messages = messages.slice(0, opts.limit);
  }
  return messages;
}

function clearMessages(topic) {
  ensureDataDirs();
  const f = topicFile(topic);
  if (fs.existsSync(f)) fs.unlinkSync(f);
}

function summarizeTopic(topic) {
  if (!topic || typeof topic !== 'object') return null;
  return {
    name: topic.name,
    description: topic.description || '',
    createdAt: topic.createdAt,
    messageCount: topic.messageCount || 0,
    subscriberCount: topic.subscriberCount || 0,
  };
}

function findTopic(topics, name) {
  if (!Array.isArray(topics)) return null;
  return topics.find((t) => t.name === name) || null;
}

function findSubscription(subs, id) {
  if (!Array.isArray(subs)) return null;
  return subs.find((s) => s.id === id) || null;
}

function listAll(arr) { return Array.isArray(arr) ? arr : []; }

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

const app = express();

// ── Internal Auth ────────────────────────────────────────────────
function requireInternal(req, res, next) {
  const token = req.headers['x-internal-token'];
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  if (token && expected && token === expected) {
    req.user = { type: 'service', id: 'internal' };
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('tiny'));

// Health
app.get('/health', (_req, res) => res.json({ service: SERVICE_NAME, version: VERSION, port: PORT, status: 'ok' }));
app.get('/ready', (_req, res) => res.json({ ready: true }));

// ---------------------------------------------------------------------------
// Topics
// ---------------------------------------------------------------------------

// Create topic
app.post('/api/topics', requireInternal, (req, res) => {
  const errs = validateTopic(req.body);
  if (errs.length) return res.status(400).json({ error: 'validation', details: errs });

  const topics = loadTopics();
  if (findTopic(topics, req.body.name)) {
    return res.status(409).json({ error: 'already_exists', name: req.body.name });
  }
  const topic = normalizeTopic(req.body, null);
  topics.push(topic);
  saveTopics(topics);
  res.status(201).json(summarizeTopic(topic));
});

// List topics
app.get('/api/topics', (_req, res) => {
  const topics = loadTopics();
  res.json({ count: topics.length, topics: topics.map(summarizeTopic) });
});

// IMPORTANT: specific routes MUST come BEFORE /:name

// Topic stats
app.get('/api/topics/:name/stats', (req, res) => {
  const topics = loadTopics();
  const t = findTopic(topics, req.params.name);
  if (!t) return res.status(404).json({ error: 'not_found', name: req.params.name });
  const subs = loadSubscriptions();
  const matchingSubs = subs.filter((s) => s.active && patternMatches(req.params.name, t.name) || patternMatches(s.pattern, t.name));
  // The expression above reduces to: subs whose pattern matches this topic name.
  const lastMsg = readMessages(req.params.name);
  const lastPublishedAt = lastMsg.length > 0 ? lastMsg[lastMsg.length - 1].timestamp : null;
  res.json({
    name: t.name,
    messageCount: t.messageCount || lastMsg.length,
    subscriberCount: matchingSubs.length,
    lastPublishedAt,
  });
});

// Latest messages
app.get('/api/topics/:name/messages/latest', (req, res) => {
  const topics = loadTopics();
  const t = findTopic(topics, req.params.name);
  if (!t) return res.status(404).json({ error: 'not_found', name: req.params.name });
  const limit = parseInt(req.query.limit, 10) > 0 ? parseInt(req.query.limit, 10) : 10;
  const all = readMessages(req.params.name);
  const latest = all.slice(-limit);
  res.json({ topic: req.params.name, count: latest.length, messages: latest });
});

// Publish message
app.post('/api/topics/:name/messages', requireInternal, (req, res) => {
  const topics = loadTopics();
  const idx = topics.findIndex((t) => t.name === req.params.name);
  if (idx === -1) return res.status(404).json({ error: 'not_found', name: req.params.name });

  const errs = validateMessage(req.body);
  if (errs.length) return res.status(400).json({ error: 'validation', details: errs });

  const publisher = (req.get('X-Agent-Id') || '').trim() || 'anonymous';
  const message = normalizeMessage(req.body, req.params.name, publisher);
  appendMessage(req.params.name, message);

  topics[idx].messageCount = (topics[idx].messageCount || 0) + 1;
  saveTopics(topics);

  res.status(201).json(message);
});

// Replay messages (filters: ?since, ?limit, ?offset)
app.get('/api/topics/:name/messages', (req, res) => {
  const topics = loadTopics();
  if (!findTopic(topics, req.params.name)) {
    return res.status(404).json({ error: 'not_found', name: req.params.name });
  }
  const opts = {};
  if (req.query.since) opts.since = req.query.since;
  if (req.query.limit !== undefined) {
    const n = parseInt(req.query.limit, 10);
    if (Number.isFinite(n)) opts.limit = n;
  }
  if (req.query.offset !== undefined) {
    const n = parseInt(req.query.offset, 10);
    if (Number.isFinite(n)) opts.offset = n;
  }
  const messages = readMessages(req.params.name, opts);
  res.json({ topic: req.params.name, count: messages.length, messages });
});

// Clear messages
app.delete('/api/topics/:name/messages', requireInternal, (req, res) => {
  const topics = loadTopics();
  const idx = topics.findIndex((t) => t.name === req.params.name);
  if (idx === -1) return res.status(404).json({ error: 'not_found', name: req.params.name });
  clearMessages(req.params.name);
  topics[idx].messageCount = 0;
  saveTopics(topics);
  res.json({ name: req.params.name, messageCount: 0, cleared: true });
});

// Get one topic
app.get('/api/topics/:name', (req, res) => {
  const topics = loadTopics();
  const t = findTopic(topics, req.params.name);
  if (!t) return res.status(404).json({ error: 'not_found', name: req.params.name });
  res.json(summarizeTopic(t));
});

// Delete topic
app.delete('/api/topics/:name', requireInternal, (req, res) => {
  const topics = loadTopics();
  const idx = topics.findIndex((t) => t.name === req.params.name);
  if (idx === -1) return res.status(404).json({ error: 'not_found', name: req.params.name });
  clearMessages(req.params.name);
  const removed = topics.splice(idx, 1)[0];
  saveTopics(topics);
  // Also remove subscriptions that matched this topic name (any pattern)
  const subs = loadSubscriptions();
  const remaining = subs.filter((s) => !patternMatches(s.pattern, removed.name));
  if (remaining.length !== subs.length) saveSubscriptions(remaining);
  res.json({ removed: summarizeTopic(removed) });
});

// ---------------------------------------------------------------------------
// Subscriptions
// ---------------------------------------------------------------------------

app.post('/api/subscriptions', requireInternal, (req, res) => {
  const errs = validateSubscription(req.body);
  if (errs.length) return res.status(400).json({ error: 'validation', details: errs });

  const subs = loadSubscriptions();
  const sub = normalizeSubscription(req.body, null);
  subs.push(sub);
  saveSubscriptions(subs);

  // Recompute subscriberCount for each topic
  const topics = loadTopics();
  for (let i = 0; i < topics.length; i += 1) {
    const t = topics[i];
    const count = subs.filter((s) => s.active && patternMatches(s.pattern, t.name)).length;
    if (t.subscriberCount !== count) {
      topics[i] = { ...t, subscriberCount: count };
    }
  }
  saveTopics(topics);

  res.status(201).json(sub);
});

app.get('/api/subscriptions', (req, res) => {
  let subs = loadSubscriptions();
  if (req.query.subscriber) {
    subs = subs.filter((s) => s.subscriber === req.query.subscriber);
  }
  res.json({ count: subs.length, subscriptions: subs });
});

app.get('/api/subscriptions/:id', (req, res) => {
  const subs = loadSubscriptions();
  const s = findSubscription(subs, req.params.id);
  if (!s) return res.status(404).json({ error: 'not_found', id: req.params.id });
  res.json(s);
});

app.post('/api/subscriptions/:id/pull', requireInternal, (req, res) => {
  const subs = loadSubscriptions();
  const idx = subs.findIndex((s) => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not_found', id: req.params.id });
  const sub = subs[idx];

  // Find all topics matching the subscription pattern
  const topics = loadTopics();
  const matching = topics.filter((t) => patternMatches(sub.pattern, t.name));

  // Collect messages from each matching topic, then sort by timestamp globally
  // so the consumer sees them in chronological (pub-time) order regardless of topic.
  let allMessages = [];
  for (const t of matching) {
    const msgs = readMessages(t.name);
    for (const m of msgs) allMessages.push(m);
  }
  allMessages.sort((a, b) => {
    const ta = new Date(a.timestamp).getTime() || 0;
    const tb = new Date(b.timestamp).getTime() || 0;
    if (ta !== tb) return ta - tb;
    // Stable secondary sort by id so identical timestamps have deterministic order
    if (a.id < b.id) return -1;
    if (a.id > b.id) return 1;
    return 0;
  });

  // Drop everything up to and including lastDeliveredId
  if (sub.lastDeliveredId) {
    const cutIdx = allMessages.findIndex((m) => m.id === sub.lastDeliveredId);
    if (cutIdx !== -1) {
      allMessages = allMessages.slice(cutIdx + 1);
    } else {
      // lastDeliveredId not present in any matching topic's buffer.
      // The message was either deleted/cleared or belongs to a topic no longer matched.
      // Return empty so the consumer does not re-process historical messages.
      allMessages = [];
    }
  }

  // Advance lastDeliveredId to the last message id (if any)
  if (allMessages.length > 0) {
    const lastMsg = allMessages[allMessages.length - 1];
    subs[idx] = { ...sub, lastDeliveredId: lastMsg.id };
    saveSubscriptions(subs);
  }

  res.json({ subscriptionId: sub.id, pattern: sub.pattern, count: allMessages.length, messages: allMessages });
});

app.delete('/api/subscriptions/:id', requireInternal, (req, res) => {
  const subs = loadSubscriptions();
  const idx = subs.findIndex((s) => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not_found', id: req.params.id });
  const removed = subs.splice(idx, 1)[0];
  saveSubscriptions(subs);

  // Recompute subscriberCount for each topic
  const topics = loadTopics();
  for (let i = 0; i < topics.length; i += 1) {
    const t = topics[i];
    const count = subs.filter((s) => s.active && patternMatches(s.pattern, t.name)).length;
    if (t.subscriberCount !== count) {
      topics[i] = { ...t, subscriberCount: count };
    }
  }
  saveTopics(topics);

  res.json({ removed });
});

// 404
app.use((req, res) => res.status(404).json({ error: 'not_found', path: req.path }));

if (require.main === module) {
  app.listen(PORT, () => {
    ensureDataDirs();
    console.log(`${SERVICE_NAME} listening on :${PORT}`);
  });
}

module.exports = {
  app,
  PORT, SERVICE_NAME, VERSION,
  TOPICS_FILE, SUBSCRIPTIONS_FILE, MESSAGES_DIR,
  validateTopic, validateMessage, validateSubscription,
  normalizeTopic, normalizeMessage, normalizeSubscription,
  patternMatches, matchTopic, findMatchingTopics,
  loadTopics, saveTopics, loadSubscriptions, saveSubscriptions,
  appendMessage, readMessages, clearMessages,
  summarizeTopic, findTopic, findSubscription, listAll,
};
