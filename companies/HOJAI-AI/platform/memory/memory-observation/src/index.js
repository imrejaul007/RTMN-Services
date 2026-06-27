import express from 'express';
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

const PORT = process.env.OBSERVATION_ENGINE_PORT || 4854;
const events = new Map();
const observations = new Map();
function nowIso() { return new Date().toISOString(); }
function ok(res, d) { res.json({ success: true, ...d }); }
function fail(res, code, msg) { res.status(400).json({ success: false, error: code, message: msg }); }
function generateId() { return `obs-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`; }
function extractTimePattern(dateStr) { const d = new Date(dateStr); return { hour: d.getHours(), dayOfWeek: d.getDay() }; }
app.use(express.json());
app.get('/health', (_req, res) => { ok(res, { status: 'healthy', service: 'memory-observation', port: PORT }); });
app.get('/', (_req, res) => { ok(res, { service: 'memory-observation', port: PORT }); });
app.post('/api/events', requireInternal, (req, res) => {
  const { twinId, eventType, timestamp } = req.body || {};
  if (!twinId || !eventType) return fail(res, 'INVALID_INPUT', 'twinId and eventType required');
  const event = { id: generateId(), twinId, eventType, timestamp: timestamp || nowIso(), timePattern: extractTimePattern(timestamp || nowIso()), createdAt: nowIso() };
  events.set(event.id, event);
  ok(res, { event: { id: event.id, twinId, eventType } });
});
app.post('/api/observe', requireInternal, (req, res) => {
  const { twinId, events: twinEvents } = req.body || {};
  if (!twinId) return fail(res, 'INVALID_INPUT', 'twinId required');
  const patterns = [];
  const byType = {};
  for (const e of (twinEvents || [])) { if (!byType[e.eventType]) byType[e.eventType] = []; byType[e.eventType].push(e); }
  for (const [type, typeEvents] of Object.entries(byType)) {
    if (typeEvents.length >= 2) patterns.push({ type: 'temporal_recurrence', eventType: type, count: typeEvents.length, confidence: Math.min(1, typeEvents.length / 10) });
  }
  const generated = patterns.map(p => ({ id: generateId(), twinId, type: 'pattern', observation: `Events of type ${p.eventType} occur ${p.count} times`, confidence: p.confidence, createdAt: nowIso() }));
  generated.forEach(o => observations.set(o.id, o));
  ok(res, { twinId, patternsFound: patterns.length, observations: generated });
});
app.get('/api/observations', (req, res) => {
  const { twinId } = req.query;
  let results = Array.from(observations.values());
  if (twinId) results = results.filter(o => o.twinId === twinId);
  ok(res, { count: results.length, observations: results });
});
app.post('/api/analyze/anomalies', requireInternal, (req, res) => {
  const { twinId } = req.body || {};
  if (!twinId) return fail(res, 'INVALID_INPUT', 'twinId required');
  const twinEvents = Array.from(events.values()).filter(e => e.twinId === twinId);
  ok(res, { twinId, eventCount: twinEvents.length, anomalyCount: 0, anomalies: [] });
});
app.get('/api/stats', (_req, res) => { ok(res, { events: events.size, observations: observations.size }); });
app.listen(PORT, () => console.log(`Observation Engine running on port ${PORT}`));
