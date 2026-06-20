// Company Intelligence: Nexha (4159) — jewelry vertical
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuid } from 'uuid';

const app = express();
app.use(helmet()); app.use(cors()); app.use(compression());
app.use(express.json({ limit: '2mb' })); app.use(morgan('tiny'));

const PORT = process.env.PORT || 4159;
const SERVICE = 'company-intelligence-nexha';
const COMPANY = 'Nexha';
const VERTICAL = 'jewelry';

const templates = new Map();
const campaigns = new Map();

const ok = (d) => ({ ok: true, ...d });
const fail = (m, c = 400) => ({ ok: false, error: m });

function seed() {
  const ts = [
    { name: 'Gold Pricing Sync', kind: 'pricing', inputs: ['gold_rate_inr', 'making_charge_pct'], outputs: ['product_price'], market: 'GCC' },
    { name: 'Arabic Product Descriptions', kind: 'content', inputs: ['sku', 'en_desc'], outputs: ['ar_desc'], languages: ['ar', 'en'] },
    { name: 'Occasion Recommender', kind: 'recommender', inputs: ['occasion', 'budget_inr', 'gender'], outputs: ['product_ids'] },
    { name: 'Ramadan Campaign', kind: 'campaign', inputs: ['segment', 'lang'], outputs: ['sms_template', 'whatsapp_template'], market: 'GCC' },
    { name: 'Karat Authenticity', kind: 'verification', inputs: ['sku', 'weight_g'], outputs: ['expected_karat', 'hallmark_required'] }
  ];
  ts.forEach(t => { const id = uuid(); templates.set(id, { id, company: COMPANY, vertical: VERTICAL, ...t, created_at: new Date().toISOString() }); });
}

app.get('/health', (_q, r) => r.json(ok({ service: SERVICE, port: PORT, status: 'healthy', company: COMPANY, vertical: VERTICAL, templates: templates.size })));
app.get('/ready', (_q, r) => r.json(ok({ ready: true })));

app.get('/api/templates', (_q, r) => r.json(ok({ templates: [...templates.values()], count: templates.size })));
app.get('/api/templates/:id', (req, res) => {
  const t = templates.get(req.params.id);
  if (!t) return res.status(404).json(fail('not found'));
  res.json(ok({ template: t }));
});
app.post('/api/templates', (req, res) => {
  const { name, kind, inputs, outputs } = req.body || {};
  if (!name || !kind || !Array.isArray(inputs) || !Array.isArray(outputs)) return res.status(400).json(fail('name, kind, inputs[], outputs[] required'));
  const id = uuid();
  const t = { id, company: COMPANY, vertical: VERTICAL, ...req.body, created_at: new Date().toISOString() };
  templates.set(id, t);
  res.status(201).json(ok({ template: t }));
});

// Run a template against provided inputs
app.post('/api/templates/:id/run', (req, res) => {
  const t = templates.get(req.params.id);
  if (!t) return res.status(404).json(fail('not found'));
  const inputs = req.body || {};
  const result = {
    template_id: t.id, template_name: t.name, ran_at: new Date().toISOString(),
    output: { received_inputs: Object.keys(inputs), note: `${COMPANY} template '${t.name}' executed (mock)` }
  };
  res.json(ok({ run: result }));
});

app.post('/api/campaigns', (req, res) => {
  const { name, segment, lang } = req.body || {};
  if (!name || !segment) return res.status(400).json(fail('name, segment required'));
  const id = uuid();
  const c = { id, company: COMPANY, name, segment, lang: lang || 'ar', status: 'draft', created_at: new Date().toISOString() };
  campaigns.set(id, c);
  res.status(201).json(ok({ campaign: c }));
});
app.get('/api/campaigns', (_q, r) => r.json(ok({ campaigns: [...campaigns.values()], count: campaigns.size })));

seed();
app.listen(PORT, () => console.log(`${SERVICE} listening on ${PORT}`));