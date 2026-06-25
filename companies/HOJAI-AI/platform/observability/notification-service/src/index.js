/**
 * RTMN Notification Service v2.0 — Self-Contained
 * -----------------------------------------------------------------
 * Port: 4870
 * Auth: X-Internal-Token header
 *
 * Multi-channel notifications (email, SMS, push, in-app) with:
 *   - CRUD for notifications, templates, subscriptions
 *   - Variable interpolation ({{name}}, {{amount}}, etc.)
 *   - Channel status management + test endpoints
 *   - Statistics (delivery rate, read rate, avg delivery time)
 *   - Bulk send
 *
 * Storage: in-memory Map (file-backed via DATA_DIR)
 */

'use strict';

const express = require('express');
const crypto  = require('crypto');
const fs      = require('fs');
const path    = require('path');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const PORT           = parseInt(process.env.PORT || '4870', 10);
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'notification-internal-token';
const DATA_DIR       = process.env.DATA_DIR || path.join(__dirname, '..', 'data');

function ensureDir()  { try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (_) {} }
function dataFile(n)   { return path.join(DATA_DIR, n + '.json'); }
function loadJson(f)   { ensureDir(); try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (_) { return null; } }
function saveJson(f, d){ ensureDir(); const tmp = f + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(d, null, 2)); fs.renameSync(tmp, f); }
function uuid()       { return crypto.randomUUID(); }

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------
const notifications = new Map();
const templates    = new Map();
const subscriptions = new Map();

// ---------------------------------------------------------------------------
// Channel statuses
// ---------------------------------------------------------------------------
const channelStatuses = {
  email:  { status: 'active', lastTest: new Date().toISOString() },
  sms:    { status: 'active', lastTest: new Date().toISOString() },
  push:   { status: 'active', lastTest: new Date().toISOString() },
  inapp:  { status: 'active', lastTest: new Date().toISOString() },
  slack:   { status: 'active', lastTest: new Date().toISOString() },
  webhook: { status: 'active', lastTest: new Date().toISOString() },
};

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------
const sampleTemplates = [
  { id: 'tmpl-1', name: 'Welcome Email', type: 'email', subject: 'Welcome to RTMN Platform', body: 'Dear {{name}},\n\nWelcome! Your account ({{email}}) is ready.\n\nBest,\nRTMN Team', variables: ['name', 'email'], status: 'active', createdAt: '2025-01-01T00:00:00.000Z' },
  { id: 'tmpl-2', name: 'Password Reset', type: 'email', subject: 'Reset Your Password', body: 'Hi {{name}},\n\nClick to reset: {{resetLink}}\n\nExpires in 24h.', variables: ['name', 'resetLink'], status: 'active', createdAt: '2025-01-01T00:00:00.000Z' },
  { id: 'tmpl-3', name: 'Deal Won', type: 'inapp', subject: 'Deal Closed!', body: '🎉 Closed with {{customer}} for {{amount}}!', variables: ['customer', 'amount'], status: 'active', createdAt: '2025-01-15T00:00:00.000Z' },
  { id: 'tmpl-4', name: 'Ticket Assigned', type: 'inapp', subject: 'New Ticket Assigned', body: 'Ticket #{{ticketId}}\nSubject: {{subject}}\nPriority: {{priority}}', variables: ['ticketId', 'subject', 'priority'], status: 'active', createdAt: '2025-02-01T00:00:00.000Z' },
  { id: 'tmpl-5', name: 'Meeting Reminder', type: 'sms', subject: '', body: 'Reminder: "{{title}}" in {{time}}\nJoin: {{meetingLink}}', variables: ['title', 'time', 'meetingLink'], status: 'active', createdAt: '2025-02-15T00:00:00.000Z' },
];

const sampleSubscriptions = [
  { id: 'sub-1', userId: 'user-1', userName: 'John Doe',    email: 'john@example.com',  channels: ['email', 'inapp'], preferences: { marketing: true, product: true, weekly: true },  status: 'active', createdAt: '2025-01-01T00:00:00.000Z' },
  { id: 'sub-2', userId: 'user-2', userName: 'Jane Smith',  email: 'jane@example.com',  channels: ['email', 'sms', 'inapp'], preferences: { marketing: false, product: true, weekly: false }, status: 'active', createdAt: '2025-01-01T00:00:00.000Z' },
  { id: 'sub-3', userId: 'user-3', userName: 'Bob Wilson',  email: 'bob@example.com',   phone: '+1234567890', channels: ['push', 'inapp'], preferences: { marketing: true, product: false, weekly: true }, status: 'active', createdAt: '2025-01-01T00:00:00.000Z' },
];

function loadAll() {
  const n = loadJson(dataFile('notifications'));
  if (n) { for (const e of n) notifications.set(e.id, e); }
  const t = loadJson(dataFile('templates'));
  if (t) { for (const e of t) templates.set(e.id, e); }
  const s = loadJson(dataFile('subscriptions'));
  if (s) { for (const e of s) subscriptions.set(e.id, e); }
  // Seed if empty
  if (templates.size === 0)    { sampleTemplates.forEach(t => templates.set(t.id, t)); }
  if (subscriptions.size === 0){ sampleSubscriptions.forEach(s => subscriptions.set(s.id, s)); }
}

function persist() {
  saveJson(dataFile('notifications'), Array.from(notifications.values()));
  saveJson(dataFile('templates'),     Array.from(templates.values()));
  saveJson(dataFile('subscriptions'), Array.from(subscriptions.values()));
}
loadAll();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function interpolateTemplate(template, data) {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] !== undefined ? data[key] : match;
  });
}

function extractVariables(template) {
  const matches = template.match(/\{\{(\w+)\}\}/g) || [];
  return [...new Set(matches.map(m => m.replace(/\{\{|\}\}/g, '')))];
}

function requireInternal(req, res, next) {
  if (req.headers['x-internal-token'] !== INTERNAL_TOKEN) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
const app = express();
app.use(express.json());

// ── Health ──────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy', service: 'notification-service', port: PORT,
    counts: { notifications: notifications.size, templates: templates.size, subscriptions: subscriptions.size },
    timestamp: new Date().toISOString(),
  });
});

app.get('/ready', (_req, res) => { res.json({ ready: true, timestamp: new Date().toISOString() }); });

// ── Notifications ─────────────────────────────────────────────────────────────
app.post('/api/notifications/send', requireInternal, (req, res) => {
  const { recipientId, recipientName, recipientEmail, channel, templateId, subject, body, data, priority } = req.body;
  if (!channel || (!templateId && !body)) {
    return res.status(400).json({ error: 'Channel and template or body are required' });
  }
  const notification = {
    id:              `notif-${uuid().slice(0, 8)}`,
    recipientId:     recipientId || 'unknown',
    recipientName:   recipientName || 'Anonymous',
    recipientEmail:   recipientEmail || '',
    channel,
    subject:         subject || '',
    body:            body || '',
    priority:        priority || 'normal',
    status:          'pending',
    sentAt:          null,
    deliveredAt:    null,
    readAt:          null,
    data:            data || {},
    createdAt:       new Date().toISOString(),
  };
  if (templateId && templates.has(templateId)) {
    const tpl = templates.get(templateId);
    notification.subject = tpl.subject || notification.subject;
    notification.body = interpolateTemplate(tpl.body, data || {});
    notification.templateId = templateId;
  }
  notifications.set(notification.id, notification);
  persist();

  // Simulate send → delivered
  setTimeout(() => {
    notification.status = 'sent';
    notification.sentAt = new Date().toISOString();
    setTimeout(() => {
      notification.status = 'delivered';
      notification.deliveredAt = new Date().toISOString();
    }, 100);
  }, 50);

  res.status(201).json(notification);
});

app.get('/api/notifications', (req, res) => {
  const { recipientId, channel, status, priority, limit = 50, offset = 0 } = req.query;
  let result = Array.from(notifications.values());
  if (recipientId) result = result.filter(n => n.recipientId === recipientId);
  if (channel)     result = result.filter(n => n.channel === channel);
  if (status)      result = result.filter(n => n.status === status);
  if (priority)    result = result.filter(n => n.priority === priority);
  result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const total = result.length;
  result = result.slice(Number(offset), Number(offset) + Number(limit));
  res.json({ notifications: result, total, limit: Number(limit), offset: Number(offset) });
});

app.get('/api/notifications/:id', (req, res) => {
  const n = notifications.get(req.params.id);
  if (!n) return res.status(404).json({ error: 'Notification not found' });
  res.json(n);
});

app.post('/api/notifications/:id/read', requireInternal, (req, res) => {
  const n = notifications.get(req.params.id);
  if (!n) return res.status(404).json({ error: 'Notification not found' });
  n.readAt = new Date().toISOString();
  persist();
  res.json(n);
});

app.post('/api/notifications/read-all', requireInternal, (req, res) => {
  const { recipientId } = req.body;
  let updated = 0;
  notifications.forEach(n => {
    if ((!recipientId || n.recipientId === recipientId) && !n.readAt) {
      n.readAt = new Date().toISOString();
      updated++;
    }
  });
  persist();
  res.json({ message: `Marked ${updated} notifications as read` });
});

app.delete('/api/notifications/:id', requireInternal, (req, res) => {
  if (!notifications.has(req.params.id)) return res.status(404).json({ error: 'Notification not found' });
  notifications.delete(req.params.id);
  persist();
  res.json({ message: 'Notification deleted successfully' });
});

app.post('/api/notifications/bulk', requireInternal, (req, res) => {
  const { notifications: items } = req.body;
  if (!items || !Array.isArray(items)) return res.status(400).json({ error: 'Array of notifications required' });
  const results = items.map(data => {
    const n = {
      id: `notif-${uuid().slice(0, 8)}`,
      recipientId:   data.recipientId || 'unknown',
      recipientName: data.recipientName || 'Anonymous',
      recipientEmail: data.recipientEmail || '',
      channel:       data.channel,
      subject:        data.subject || '',
      body:           data.body || '',
      priority:       data.priority || 'normal',
      status:         'pending',
      sentAt:         null,
      deliveredAt:    null,
      readAt:         null,
      data:           data.data || {},
      createdAt:      new Date().toISOString(),
    };
    if (data.templateId && templates.has(data.templateId)) {
      const tpl = templates.get(data.templateId);
      n.subject = tpl.subject || n.subject;
      n.body = interpolateTemplate(tpl.body, data.data || {});
      n.templateId = data.templateId;
    }
    notifications.set(n.id, n);
    setTimeout(() => { n.status = 'sent'; n.sentAt = new Date().toISOString(); }, 50);
    return n;
  });
  persist();
  res.status(201).json({ message: `Queued ${results.length} notifications`, notifications: results });
});

// ── Templates ─────────────────────────────────────────────────────────────────
app.get('/api/templates', (req, res) => {
  const { type, status } = req.query;
  let result = Array.from(templates.values());
  if (type)   result = result.filter(t => t.type === type);
  if (status) result = result.filter(t => t.status === status);
  res.json({ templates: result, total: result.length });
});

app.get('/api/templates/:id', (req, res) => {
  const t = templates.get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Template not found' });
  res.json(t);
});

app.post('/api/templates', requireInternal, (req, res) => {
  const { name, type, subject, body, variables } = req.body;
  if (!name || !type || !body) return res.status(400).json({ error: 'Name, type, and body required' });
  const t = { id: `tmpl-${uuid().slice(0, 8)}`, name, type, subject: subject || '', body, variables: variables || extractVariables(body), status: 'active', createdAt: new Date().toISOString() };
  templates.set(t.id, t);
  persist();
  res.status(201).json(t);
});

app.put('/api/templates/:id', requireInternal, (req, res) => {
  const t = templates.get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Template not found' });
  const { name, type, subject, body, variables, status } = req.body;
  if (name)       t.name = name;
  if (type)       t.type = type;
  if (subject)    t.subject = subject;
  if (body) { t.body = body; t.variables = variables || extractVariables(body); }
  if (variables)  t.variables = variables;
  if (status)     t.status = status;
  persist();
  res.json(t);
});

app.delete('/api/templates/:id', requireInternal, (req, res) => {
  if (!templates.has(req.params.id)) return res.status(404).json({ error: 'Template not found' });
  templates.delete(req.params.id);
  persist();
  res.json({ message: 'Template deleted successfully' });
});

app.post('/api/templates/:id/preview', requireInternal, (req, res) => {
  const t = templates.get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Template not found' });
  const { data } = req.body;
  const sampleData = { name: 'John Doe', email: 'john@example.com', resetLink: 'https://rtmn.app/reset/abc123', customer: 'Acme Corp', amount: '$50,000', title: 'Weekly Sync', time: '30 minutes' };
  const merged = { ...sampleData, ...data };
  res.json({ templateId: t.id, preview: { subject: interpolateTemplate(t.subject, merged), body: interpolateTemplate(t.body, merged) }, variables: t.variables, usedData: merged });
});

// ── Subscriptions ─────────────────────────────────────────────────────────────
app.get('/api/subscriptions', (req, res) => {
  const { userId, status } = req.query;
  let result = Array.from(subscriptions.values());
  if (userId) result = result.filter(s => s.userId === userId);
  if (status) result = result.filter(s => s.status === status);
  res.json({ subscriptions: result, total: result.length });
});

app.get('/api/subscriptions/:id', (req, res) => {
  const s = subscriptions.get(req.params.id);
  if (!s) return res.status(404).json({ error: 'Subscription not found' });
  res.json(s);
});

app.post('/api/subscriptions', requireInternal, (req, res) => {
  const { userId, userName, email, phone, channels, preferences } = req.body;
  if (!userId || !email) return res.status(400).json({ error: 'userId and email required' });
  const s = { id: `sub-${uuid().slice(0, 8)}`, userId, userName: userName || 'Unknown', email, phone: phone || '', channels: channels || ['email', 'inapp'], preferences: preferences || { marketing: true, product: true, weekly: true }, status: 'active', createdAt: new Date().toISOString() };
  subscriptions.set(s.id, s);
  persist();
  res.status(201).json(s);
});

app.put('/api/subscriptions/:id', requireInternal, (req, res) => {
  const s = subscriptions.get(req.params.id);
  if (!s) return res.status(404).json({ error: 'Subscription not found' });
  const { userName, email, phone, channels, preferences, status } = req.body;
  if (userName)     s.userName = userName;
  if (email)        s.email = email;
  if (phone)        s.phone = phone;
  if (channels)     s.channels = channels;
  if (preferences)  s.preferences = preferences;
  if (status)       s.status = status;
  persist();
  res.json(s);
});

app.delete('/api/subscriptions/:id', requireInternal, (req, res) => {
  if (!subscriptions.has(req.params.id)) return res.status(404).json({ error: 'Subscription not found' });
  subscriptions.delete(req.params.id);
  persist();
  res.json({ message: 'Subscription deleted successfully' });
});

// ── Channels ──────────────────────────────────────────────────────────────────
app.get('/api/channels', (_req, res) => { res.json({ channels: channelStatuses }); });

app.put('/api/channels/:channel', requireInternal, (req, res) => {
  const { status } = req.body;
  if (!channelStatuses[req.params.channel]) return res.status(404).json({ error: 'Channel not found' });
  channelStatuses[req.params.channel].status = status || 'active';
  channelStatuses[req.params.channel].lastTest = new Date().toISOString();
  res.json(channelStatuses[req.params.channel]);
});

app.post('/api/channels/:channel/test', requireInternal, (req, res) => {
  const channel = req.params.channel;
  if (!channelStatuses[channel]) return res.status(404).json({ error: 'Channel not found' });
  const { recipient, testMessage } = req.body;
  res.json({ channel, recipient: recipient || 'test@example.com', message: testMessage || 'This is a test notification', status: 'sent', sentAt: new Date().toISOString() });
});

// ── Statistics ────────────────────────────────────────────────────────────────
app.get('/api/statistics', (_req, res) => {
  const all = Array.from(notifications.values());
  const stats = { total: all.length, byChannel: {}, byStatus: {}, byPriority: {}, deliveryRate: '0', readRate: '0', avgDeliveryTime: '0s', topTemplates: [] };
  all.forEach(n => {
    stats.byChannel[n.channel] = (stats.byChannel[n.channel] || 0) + 1;
    stats.byStatus[n.status]  = (stats.byStatus[n.status]  || 0) + 1;
    stats.byPriority[n.priority] = (stats.byPriority[n.priority] || 0) + 1;
  });
  const delivered = all.filter(n => n.status === 'delivered').length;
  const read      = all.filter(n => n.readAt).length;
  stats.deliveryRate = all.length > 0 ? (delivered / all.length * 100).toFixed(1) : '0';
  stats.readRate     = delivered > 0  ? (read / delivered * 100).toFixed(1) : '0';
  const withTime = all.filter(n => n.sentAt && n.deliveredAt);
  if (withTime.length > 0) {
    const total = withTime.reduce((sum, n) => sum + (new Date(n.deliveredAt) - new Date(n.sentAt)), 0);
    stats.avgDeliveryTime = (total / withTime.length / 1000).toFixed(2) + 's';
  }
  const usage = {};
  all.forEach(n => { if (n.templateId) usage[n.templateId] = (usage[n.templateId] || 0) + 1; });
  stats.topTemplates = Object.entries(usage).map(([id, count]) => ({ id, count })).sort((a, b) => b.count - a.count).slice(0, 5);
  res.json(stats);
});

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
const server = app.listen(PORT, () => {
  console.log(`📬 Notification Service running on port ${PORT}`);
  console.log(`   Templates: ${templates.size}, Subscriptions: ${subscriptions.size}`);
});

process.on('SIGTERM', () => { persist(); server.close(() => process.exit(0)); });
process.on('SIGINT',  () => { persist(); server.close(() => process.exit(0)); });

// Reset + re-seed (for test harness)
function resetState() {
  notifications.clear();
  templates.clear();
  subscriptions.clear();
  loadAll(); // re-seeds if empty
}

module.exports = { app, startServer: (port) => new Promise(resolve => {
  const s = app.listen(port || PORT, '127.0.0.1', () => resolve({ server: s, port: s.address().port }));
}), resetState };
