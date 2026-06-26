/**
 * HOJAI Analytics Service
 * Tracks usage metrics, events, and user behavior
 */

import express from 'express';

const app = express();
const PORT = process.env.PORT || 4530;

// Middleware
app.use(express.json());

// In-memory storage
const events = [];
const metrics = {
  requests: 0,
  errors: 0,
  users: new Set(),
  endpoints: {}
};

// Health
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'analytics-service',
    version: '1.0.0',
    port: PORT,
    events: events.length,
    uptime: process.uptime()
  });
});

app.get('/ready', (req, res) => {
  res.json({ status: 'ready' });
});

// Track event
app.post('/api/v1/events', (req, res) => {
  const { type, userId, data = {} } = req.body;
  const event = {
    id: `evt_${Date.now()}`,
    type,
    userId,
    data,
    timestamp: new Date().toISOString()
  };
  events.push(event);
  metrics.requests++;
  if (userId) metrics.users.add(userId);
  res.json({ success: true, event });
});

// Get metrics
app.get('/api/v1/metrics', (req, res) => {
  res.json({
    totalEvents: events.length,
    uniqueUsers: metrics.users.size,
    requests: metrics.requests,
    errors: metrics.errors,
    eventsByType: events.reduce((acc, e) => {
      acc[e.type] = (acc[e.type] || 0) + 1;
      return acc;
    }, {})
  });
});

// Query events
app.get('/api/v1/events', (req, res) => {
  const { type, userId, limit = 100 } = req.query;
  let filtered = events;
  if (type) filtered = filtered.filter(e => e.type === type);
  if (userId) filtered = filtered.filter(e => e.userId === userId);
  res.json({ events: filtered.slice(-limit), total: filtered.length });
});

// 404/Error handlers
app.use((req, res) => res.status(404).json({ error: 'not_found' }));
app.use((err, req, res, next) => {
  metrics.errors++;
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`[analytics-service] listening on :${PORT}`);
});
