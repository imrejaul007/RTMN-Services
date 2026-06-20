// Company Intelligence: Airzy (4162) — travel vertical
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuid } from 'uuid';

const app = express();
app.use(helmet()); app.use(cors()); app.use(compression());
app.use(express.json({ limit: '2mb' })); app.use(morgan('tiny'));

const PORT = process.env.PORT || 4162;
const SERVICE = 'company-intelligence-airzy';
const COMPANY = 'Airzy';
const VERTICAL = 'travel';

const templates = new Map();
const itineraries = new Map();

const ok = (d) => ({ ok: true, ...d });
const fail = (m, c = 400) => ({ ok: false, error: m });

function seed() {
  const ts = [
    { name: 'Fare Class Recommender', kind: 'pricing', inputs: ['route', 'days_to_departure', 'flexibility'], outputs: ['recommended_class'] },
    { name: 'Hotel + Flight Bundle', kind: 'bundle', inputs: ['destination', 'nights', 'travelers'], outputs: ['bundle_id', 'total_price'] },
    { name: 'Itinerary Builder', kind: 'workflow', inputs: ['destination', 'days', 'interests'], outputs: ['day_plans'] },
    { name: 'Visa Requirement Lookup', kind: 'knowledge', inputs: ['passport_country', 'destination'], outputs: ['visa_required', 'processing_days'] }
  ];
  ts.forEach(t => { const id = uuid(); templates.set(id, { id, company: COMPANY, vertical: VERTICAL, ...t, created_at: new Date().toISOString() }); });

  const its = [
    { destination: 'Dubai', days: 5, travelers: 2, status: 'draft' },
    { destination: 'Istanbul', days: 4, travelers: 1, status: 'confirmed' }
  ];
  its.forEach(i => { const id = uuid(); itineraries.set(id, { id, ...i, created_at: new Date().toISOString() }); });
}

app.get('/health', (_q, r) => r.json(ok({ service: SERVICE, port: PORT, status: 'healthy', company: COMPANY, vertical: VERTICAL, templates: templates.size, itineraries: itineraries.size })));
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

app.get('/api/itineraries', (_q, r) => r.json(ok({ itineraries: [...itineraries.values()], count: itineraries.size })));
app.post('/api/itineraries', (req, res) => {
  const { destination, days, travelers } = req.body || {};
  if (!destination || !days || !travelers) return res.status(400).json(fail('destination, days, travelers required'));
  const id = uuid();
  const it = { id, ...req.body, status: 'draft', created_at: new Date().toISOString() };
  itineraries.set(id, it);
  res.status(201).json(ok({ itinerary: it }));
});

seed();
app.listen(PORT, () => console.log(`${SERVICE} listening on ${PORT}`));