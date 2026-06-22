// Behavior Intelligence (4158) — profile subjects from behavior signals
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuid } from 'uuid';

const app = express();
app.use(helmet()); app.use(cors()); app.use(compression());
app.use(express.json({ limit: '2mb' })); app.use(morgan('tiny'));

const PORT = process.env.PORT || 4158;
const SERVICE = 'behavior-intelligence';

const profiles = new Map(); // subjectId -> { id, subject_id, segments[], intents[], last_action, signals_count, updated_at }
const signals = new Map();  // signalId -> { id, subject_id, type, weight, payload, ts }
const segments = new Map(); // segmentId -> { id, name, criteria, members[] }

const ok = (d) => ({ ok: true, ...d });
const fail = (m, c = 400) => ({ ok: false, error: m });

const SEGMENT_RULES = [
  { name: 'high_intent', criteria: { signals: ['add_to_cart', 'view_pricing'], min_count: 3 } },
  { name: 'churn_risk', criteria: { signals: ['support_complaint', 'cancellation_visit'], min_count: 1 } },
  { name: 'power_user', criteria: { signals: ['purchase', 'share', 'review'], min_count: 5 } },
  { name: 'window_shopper', criteria: { signals: ['view_product'], min_count: 10 } }
];

function rebuildProfile(subject_id) {
  const sigs = [...signals.values()].filter(s => s.subject_id === subject_id);
  const counts = {};
  for (const s of sigs) counts[s.type] = (counts[s.type] || 0) + 1;
  const memberSegments = SEGMENT_RULES.filter(rule => {
    const matchedTypes = (rule.criteria.signals || []).filter(t => (counts[t] || 0) > 0).length;
    return matchedTypes > 0 && sigs.length >= rule.criteria.min_count;
  }).map(r => r.name);
  const intents = [];
  if (counts.add_to_cart > 0 && counts.view_pricing > 0) intents.push('ready_to_buy');
  if (counts.support_complaint > 0) intents.push('needs_assistance');
  if (counts.view_product > 5 && counts.purchase === 0) intents.push('hesitant');
  const last = sigs.length ? sigs[sigs.length - 1] : null;
  return {
    subject_id,
    segments: memberSegments,
    intents,
    last_action: last ? last.type : null,
    signals_count: sigs.length,
    signal_breakdown: counts,
    updated_at: new Date().toISOString()
  };
}

function seed() {
  SEGMENT_RULES.forEach(r => { const id = uuid(); segments.set(id, { id, ...r }); });

  // Demo: 3 subjects
  const subjects = ['cust-001', 'cust-002', 'cust-003'];
  const sigTypes = ['view_product', 'add_to_cart', 'view_pricing', 'purchase', 'support_complaint'];
  subjects.forEach((sid, i) => {
    for (let k = 0; k < (i + 2) * 3; k++) {
      const id = uuid();
      signals.set(id, {
        id, subject_id: sid, type: sigTypes[(k + i) % sigTypes.length],
        weight: 1, payload: {}, ts: new Date(Date.now() - (k * 3600000)).toISOString()
      });
    }
    const id = uuid();
    profiles.set(id, { id, ...rebuildProfile(sid) });
  });
}

app.get('/health', (_q, r) => r.json(ok({ service: SERVICE, port: PORT, status: 'healthy', profiles: profiles.size, signals: signals.size, segments: segments.size })));
app.get('/ready', (_q, r) => r.json(ok({ ready: true })));

app.post('/api/signals', (req, res) => {
  const { subject_id, type, weight, payload } = req.body || {};
  if (!subject_id || !type) return res.status(400).json(fail('subject_id, type required'));
  const id = uuid();
  const sig = { id, subject_id, type, weight: weight || 1, payload: payload || {}, ts: new Date().toISOString() };
  signals.set(id, sig);
  // Update profile
  const prof = rebuildProfile(subject_id);
  let pId = [...profiles.entries()].find(([, p]) => p.subject_id === subject_id)?.[0];
  if (!pId) { pId = uuid(); profiles.set(pId, { id: pId, ...prof }); }
  else { profiles.set(pId, { id: pId, ...prof }); }
  res.status(201).json(ok({ signal: sig, profile: profiles.get(pId) }));
});

app.get('/api/signals', (req, res) => {
  const { subject_id, type } = req.query;
  let list = [...signals.values()];
  if (subject_id) list = list.filter(s => s.subject_id === subject_id);
  if (type) list = list.filter(s => s.type === type);
  res.json(ok({ signals: list, count: list.length }));
});

app.get('/api/profiles', (req, res) => {
  const { segment, intent } = req.query;
  let list = [...profiles.values()];
  if (segment) list = list.filter(p => p.segments.includes(segment));
  if (intent) list = list.filter(p => p.intents.includes(intent));
  res.json(ok({ profiles: list, count: list.length }));
});
app.get('/api/profiles/:id', (req, res) => {
  const p = profiles.get(req.params.id);
  if (!p) return res.status(404).json(fail('not found'));
  res.json(ok({ profile: p }));
});
app.get('/api/profiles/by-subject/:subject_id', (req, res) => {
  const p = [...profiles.values()].find(p => p.subject_id === req.params.subject_id);
  if (!p) return res.status(404).json(fail('not found'));
  res.json(ok({ profile: p }));
});
app.get('/api/segments', (_q, r) => r.json(ok({ segments: [...segments.values()] })));
app.post('/api/profiles/:id/refresh', (req, res) => {
  const p = profiles.get(req.params.id);
  if (!p) return res.status(404).json(fail('not found'));
  const updated = { id: p.id, ...rebuildProfile(p.subject_id) };
  profiles.set(p.id, updated);
  res.json(ok({ profile: updated }));
});

seed();
app.listen(PORT, () => console.log(`${SERVICE} listening on ${PORT}`));