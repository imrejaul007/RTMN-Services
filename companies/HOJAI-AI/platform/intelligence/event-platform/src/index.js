// Event Platform - Schema registry, ingestion, subscription, routing, replay. Port 4901
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { readJson, writeJson, upsert } from './store.js';

const app = express();
const PORT = 4901;
app.use(express.json());

// Schema Registry
app.get('/api/schemas', (req, res) => {
  res.json({ schemas: readJson('schemas.json') || [], count: (readJson('schemas.json') || []).length });
});

app.get('/api/schemas/:name', (req, res) => {
  const schemas = readJson('schemas.json') || [];
  const schema = schemas.find(s => s.name === req.params.name);
  if (!schema) return res.status(404).json({ error: 'Schema not found' });
  res.json(schema);
});

app.post('/api/schemas', (req, res) => {
  const { name, version, fields } = req.body;
  if (!name || !fields) return res.status(400).json({ error: 'name and fields required' });
  const schema = { id: uuidv4(), name, version: version || 1, fields, createdAt: new Date().toISOString() };
  upsert('schemas.json', schema);
  res.status(201).json(schema);
});

app.delete('/api/schemas/:name/:version', (req, res) => {
  const schemas = readJson('schemas.json') || [];
  const schema = schemas.find(s => s.name === req.params.name && s.version === parseInt(req.params.version));
  if (!schema) return res.status(404).json({ error: 'Schema not found' });
  schema.deprecated = true;
  schema.deprecatedAt = new Date().toISOString();
  writeJson('schemas.json', schemas);
  res.json({ deprecated: true, schema });
});

// Event Ingestion
app.post('/api/events', (req, res) => {
  const { type, source, data, schemaVersion } = req.body;
  if (!type || !source) return res.status(400).json({ error: 'type and source required' });
  const event = { id: uuidv4(), type, source, data: data || {}, schemaVersion, timestamp: new Date().toISOString(), deliveredTo: [] };
  const events = readJson('events.json') || [];
  events.push(event);
  writeJson('events.json', events);
  // Simulate subscription delivery
  deliverToSubscriptions(event);
  res.status(201).json(event);
});

app.get('/api/events', (req, res) => {
  const { type, source, from, to, limit } = req.query;
  let events = readJson('events.json') || [];
  if (type) events = events.filter(e => e.type === type);
  if (source) events = events.filter(e => e.source === source);
  if (from) events = events.filter(e => new Date(e.timestamp) >= new Date(from));
  if (to) events = events.filter(e => new Date(e.timestamp) <= new Date(to));
  events = events.slice(-(parseInt(limit) || 100));
  res.json({ events, count: events.length });
});

// Subscriptions
app.get('/api/subscriptions', (req, res) => {
  res.json({ subscriptions: readJson('subscriptions.json') || [], count: (readJson('subscriptions.json') || []).length });
});

app.post('/api/subscriptions', (req, res) => {
  const { name, type, callback, filter } = req.body;
  if (!name || !type || !callback) return res.status(400).json({ error: 'name, type, callback required' });
  const sub = { id: uuidv4(), name, type, callback, filter: filter || null, active: true, createdAt: new Date().toISOString() };
  upsert('subscriptions.json', sub);
  res.status(201).json(sub);
});

app.delete('/api/subscriptions/:id', (req, res) => {
  const subs = readJson('subscriptions.json') || [];
  if (!subs.find(s => s.id === req.params.id)) return res.status(404).json({ error: 'Subscription not found' });
  writeJson('subscriptions.json', subs.filter(s => s.id !== req.params.id));
  res.json({ deleted: true });
});

// Routing Rules
app.get('/api/rules', (req, res) => {
  res.json({ rules: readJson('rules.json') || [], count: (readJson('rules.json') || []).length });
});

app.post('/api/rules', (req, res) => {
  const { name, eventType, condition, destination } = req.body;
  if (!name || !eventType || !destination) return res.status(400).json({ error: 'name, eventType, destination required' });
  const rule = { id: uuidv4(), name, eventType, condition: condition || null, destination, createdAt: new Date().toISOString() };
  upsert('rules.json', rule);
  res.status(201).json(rule);
});

app.delete('/api/rules/:id', (req, res) => {
  const rules = readJson('rules.json') || [];
  if (!rules.find(r => r.id === req.params.id)) return res.status(404).json({ error: 'Rule not found' });
  writeJson('rules.json', rules.filter(r => r.id !== req.params.id));
  res.json({ deleted: true });
});

// Replay
app.post('/api/replay', (req, res) => {
  const { from, to, eventType, target } = req.body;
  if (!from || !to || !target) return res.status(400).json({ error: 'from, to, target required' });
  const replay = { id: uuidv4(), from, to, eventType: eventType || null, target, status: 'running', eventCount: 0, createdAt: new Date().toISOString() };
  const replays = readJson('replays.json') || [];
  replays.push(replay);
  writeJson('replays.json', replays);
  // Simulate replay
  setTimeout(function() {
    const reps = readJson('replays.json') || [];
    const r = reps.find(x => x.id === replay.id);
    if (r) { r.status = 'completed'; r.completedAt = new Date().toISOString(); r.eventCount = Math.floor(Math.random() * 100); writeJson('replays.json', reps); }
  }, 500);
  res.status(201).json(replay);
});

app.get('/api/replay/:id', (req, res) => {
  const replay = (readJson('replays.json') || []).find(r => r.id === req.params.id);
  if (!replay) return res.status(404).json({ error: 'Replay not found' });
  res.json(replay);
});

// Analytics
app.get('/api/analytics', (req, res) => {
  const events = readJson('events.json') || [];
  const now = Date.now();
  const hourAgo = now - 3600000;
  const byType = {};
  events.forEach(function(e) { byType[e.type] = (byType[e.type] || 0) + 1; });
  res.json({
    total: events.length,
    lastHour: events.filter(function(e) { return new Date(e.timestamp).getTime() > hourAgo; }).length,
    byType: byType,
    avgPerHour: events.length > 0 ? Math.round(events.length / Math.max(1, (now - new Date(events[0].timestamp).getTime()) / 3600000)) : 0,
  });
});

function deliverToSubscriptions(event) {
  const subs = readJson('subscriptions.json') || [];
  const rules = readJson('rules.json') || [];
  subs.filter(function(s) { return s.active && s.type === event.type; }).forEach(function(s) {
    console.log('[subscription:' + s.name + '] delivered event ' + event.id + ': ' + JSON.stringify(event.data));
    event.deliveredTo.push({ subscriptionId: s.id, deliveredAt: new Date().toISOString() });
  });
  const matchingRules = rules.filter(function(r) { return r.eventType === event.type; });
  matchingRules.forEach(function(r) {
    console.log('[rule:' + r.name + '] routing event ' + event.id + ' to ' + r.destination);
  });
}

app.get('/health', (req, res) => res.json({ service: 'event-platform', status: 'healthy' }));
app.get('/ready', (req, res) => res.json({ ready: true }));

const server = app.listen(PORT, () => { console.log('Event Platform running on port ' + PORT); });
export default server;
