// Company Intelligence: Rendez (4161) — events vertical
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuid } from 'uuid';

const app = express();
app.use(helmet()); app.use(cors()); app.use(compression());
app.use(express.json({ limit: '2mb' })); app.use(morgan('tiny'));

const PORT = process.env.PORT || 4161;
const SERVICE = 'company-intelligence-rendez';
const COMPANY = 'Rendez';
const VERTICAL = 'events';

const templates = new Map();
const events = new Map();

const ok = (d) => ({ ok: true, ...d });
const fail = (m, c = 400) => ({ ok: false, error: m });

function seed() {
  const ts = [
    { name: 'Capacity Estimator', kind: 'analytics', inputs: ['venue_capacity', 'rsvp_count'], outputs: ['fill_rate', 'overbook_risk'] },
    { name: 'Sponsorship Tier Mapper', kind: 'pricing', inputs: ['event_type', 'expected_attendance'], outputs: ['tiers'] },
    { name: 'RSVP Reminder Cadence', kind: 'workflow', inputs: ['event_date', 'rsvp_status'], outputs: ['next_reminder_at'] },
    { name: 'Ticket Pricing Curve', kind: 'pricing', inputs: ['days_to_event', 'tier'], outputs: ['price_multiplier'] }
  ];
  ts.forEach(t => { const id = uuid(); templates.set(id, { id, company: COMPANY, vertical: VERTICAL, ...t, created_at: new Date().toISOString() }); });

  const evts = [
    { name: 'GCC Tech Summit 2026', date: '2026-09-15', venue_capacity: 500, rsvp_count: 312, status: 'open' },
    { name: 'Wedding Expo Riyadh', date: '2026-07-22', venue_capacity: 200, rsvp_count: 198, status: 'near_capacity' }
  ];
  evts.forEach(e => { const id = uuid(); events.set(id, { id, ...e, created_at: new Date().toISOString() }); });
}

app.get('/health', (_q, r) => r.json(ok({ service: SERVICE, port: PORT, status: 'healthy', company: COMPANY, vertical: VERTICAL, templates: templates.size, events: events.size })));
app.get('/ready', (_q, r) => r.json(ok({ ready: true })));

app.get('/api/templates', (_q, r) => r.json(ok({ templates: [...templates.values()], count: templates.size })));
app.get('/api/templates/:id', (req, res) => {
  const t = templates.get(req.params.id);
  if (!t) return res.status(404).json(fail('not found'));
  res.json(ok({ template: t }));
});
app.post('/api/templates', (req, res) => {
  const { name, kind, inputs, outputs } = req.body || {};
  if (!name || !kind) return res.status(400).json(fail('name, kind required'));
  const id = uuid();
  const t = { id, company: COMPANY, vertical: VERTICAL, ...req.body, created_at: new Date().toISOString() };
  templates.set(id, t);
  res.status(201).json(ok({ template: t }));
});
app.post('/api/templates/:id/run', (req, res) => {
  const t = templates.get(req.params.id);
  if (!t) return res.status(404).json(fail('not found'));
  res.json(ok({ run: { template_id: t.id, ran_at: new Date().toISOString(), output: { mock: true } } }));
});

app.get('/api/events', (_q, r) => r.json(ok({ events: [...events.values()], count: events.size })));
app.post('/api/events', (req, res) => {
  const { name, date, venue_capacity } = req.body || {};
  if (!name || !date || venue_capacity == null) return res.status(400).json(fail('name, date, venue_capacity required'));
  const id = uuid();
  const e = { id, ...req.body, rsvp_count: 0, status: 'open', created_at: new Date().toISOString() };
  events.set(id, e);
  res.status(201).json(ok({ event: e }));
});

seed();
app.listen(PORT, () => console.log(`${SERVICE} listening on ${PORT}`));