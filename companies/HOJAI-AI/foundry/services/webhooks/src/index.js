/**
 * HOJAI Studio - Webhooks Service
 * Event-driven integrations
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';

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
const PORT = 4784;
app.use(express.json());

const subscriptions = new Map(); // subId -> subscription
const events = []; // event log
const deliveries = []; // delivery attempts

// REST API - Create Subscription
app.post('/api/subscriptions', requireInternal, (req, res) => {
  const { projectId, url, events: eventTypes, secret, enabled = true, retries = 3 } = req.body;
  const sub = {
    id: uuidv4(),
    projectId,
    url,
    events: eventTypes || ['*'],
    secret: secret || uuidv4(),
    enabled,
    retries,
    status: 'active',
    createdAt: new Date().toISOString()
  };
  subscriptions.set(sub.id, sub);
  res.json(sub);
});

// REST API - List Subscriptions
app.get('/api/subscriptions', (req, res) => {
  const { projectId, event } = req.query;
  let list = Array.from(subscriptions.values());
  if (projectId) list = list.filter(s => s.projectId === projectId);
  if (event) list = list.filter(s => s.events.includes('*') || s.events.includes(event));
  res.json(list);
});

// REST API - Get Subscription
app.get('/api/subscriptions/:id', (req, res) => {
  const sub = subscriptions.get(req.params.id);
  if (!sub) return res.status(404).json({ error: 'Not found' });
  res.json(sub);
});

// REST API - Update Subscription
app.patch('/api/subscriptions/:id', requireInternal, (req, res) => {
  const sub = subscriptions.get(req.params.id);
  if (!sub) return res.status(404).json({ error: 'Not found' });
  Object.assign(sub, req.body);
  res.json(sub);
});

// REST API - Delete Subscription
app.delete('/api/subscriptions/:id', requireInternal, (req, res) => {
  if (!subscriptions.has(req.params.id)) return res.status(404).json({ error: 'Not found' });
  subscriptions.delete(req.params.id);
  res.json({ deleted: true });
});

// REST API - Emit Event
app.post('/api/events', requireInternal, (req, res) => {
  const { projectId, event, data } = req.body;
  const eventId = uuidv4();

  const evt = {
    id: eventId,
    projectId,
    event,
    data,
    subscriptions: [],
    delivered: 0,
    failed: 0,
    timestamp: new Date().toISOString()
  };

  events.push(evt);

  // Find matching subscriptions
  subscriptions.forEach(sub => {
    if (sub.projectId === projectId && sub.enabled) {
      if (sub.events.includes('*') || sub.events.includes(event)) {
        evt.subscriptions.push(sub.id);
        deliverEvent(sub, evt);
      }
    }
  });

  res.json({ eventId, subscriptions: evt.subscriptions.length });
});

// REST API - Get Event
app.get('/api/events/:id', (req, res) => {
  const evt = events.find(e => e.id === req.params.id);
  if (!evt) return res.status(404).json({ error: 'Not found' });

  const evtDeliveries = deliveries.filter(d => d.eventId === evt.id);
  res.json({ ...evt, deliveries: evtDeliveries });
});

// REST API - Event History
app.get('/api/events', (req, res) => {
  const { projectId, event, limit = 100 } = req.query;
  let list = events;
  if (projectId) list = list.filter(e => e.projectId === projectId);
  if (event) list = list.filter(e => e.event === event);
  res.json(list.slice(-parseInt(limit)));
});

// REST API - Retry Failed
app.post('/api/events/:id/retry', requireInternal, (req, res) => {
  const evt = events.find(e => e.id === req.params.id);
  if (!evt) return res.status(404).json({ error: 'Not found' });

  const failedDeliveries = deliveries.filter(d => d.eventId === evt.id && d.status === 'failed');
  failedDeliveries.forEach(d => {
    const sub = subscriptions.get(d.subscriptionId);
    if (sub) deliverEvent(sub, evt);
  });

  res.json({ retried: failedDeliveries.length });
});

// REST API - Test Webhook
app.post('/api/subscriptions/:id/test', requireInternal, (req, res) => {
  const sub = subscriptions.get(req.params.id);
  if (!sub) return res.status(404).json({ error: 'Not found' });

  const testEvent = {
    id: uuidv4(),
    projectId: sub.projectId,
    event: 'webhook.test',
    data: { message: 'This is a test webhook' },
    timestamp: new Date().toISOString()
  };

  const delivery = deliverEvent(sub, testEvent, true);
  res.json({ testEvent, delivery });
});

function deliverEvent(sub, evt, isTest = false) {
  const delivery = {
    id: uuidv4(),
    eventId: evt.id,
    subscriptionId: sub.id,
    url: sub.url,
    status: 'pending',
    attempts: 0,
    isTest,
    createdAt: new Date().toISOString()
  };

  deliveries.push(delivery);

  // Simulate delivery
  setTimeout(() => {
    delivery.attempts++;
    const success = Math.random() > 0.1;
    delivery.status = success ? 'delivered' : 'failed';
    delivery.deliveredAt = new Date().toISOString();
    delivery.response = { status: success ? 200 : 500 };
  }, 500 + Math.random() * 1000);

  return delivery;
}

app.get('/health', (req, res) => res.json({ status: 'healthy', service: 'webhooks', subscriptions: subscriptions.size, events: events.length }));
app.listen(PORT, () => console.log(`Webhooks running on port ${PORT}`));
