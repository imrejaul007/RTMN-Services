const express = require('express');
const { v4: uuidv4 } = require('uuid');
const app = express();
const PORT = 4510;
app.use(express.json());

const subscriptions = new Map();
const events = new Map();

app.post('/api/events', (req, res) => {
  const { type, payload, source } = req.body;
  if (!type) return res.status(400).json({ error: 'Event type required' });
  const event = { id: uuidv4(), type, payload: payload || {}, source: source || 'unknown', timestamp: new Date().toISOString() };
  events.set(event.id, event);
  // Notify subscribers
  subscriptions.forEach((sub, key) => {
    if (sub.types.includes(type) || sub.types.includes('*')) {
      sub.handler(event);
    }
  });
  res.status(201).json(event);
});

app.get('/api/events', (req, res) => {
  const { type, limit = 50 } = req.query;
  let result = Array.from(events.values());
  if (type) result = result.filter(e => e.type === type);
  res.json({ events: result.slice(-limit).reverse() });
});

app.post('/api/subscribe', (req, res) => {
  const { types, handler } = req.body;
  if (!types) return res.status(400).json({ error: 'Event types required' });
  const sub = { id: uuidv4(), types: Array.isArray(types) ? types : [types], handler: handler || (() => {}) };
  subscriptions.set(sub.id, sub);
  res.status(201).json({ subscriptionId: sub.id, types: sub.types });
});

app.delete('/api/subscribe/:id', (req, res) => {
  subscriptions.delete(req.params.id);
  res.json({ message: 'Unsubscribed' });
});

app.get('/health', (r, res) => res.json({ status: 'healthy', service: 'EventBus', port: PORT }));
app.listen(PORT, () => console.log('EventBus running on port ' + PORT));
