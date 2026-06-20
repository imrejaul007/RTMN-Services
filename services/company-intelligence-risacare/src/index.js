// Company Intelligence: RisaCare (4160) — healthcare vertical
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuid } from 'uuid';

const app = express();
app.use(helmet()); app.use(cors()); app.use(compression());
app.use(express.json({ limit: '2mb' })); app.use(morgan('tiny'));

const PORT = process.env.PORT || 4160;
const SERVICE = 'company-intelligence-risacare';
const COMPANY = 'RisaCare';
const VERTICAL = 'healthcare';

const templates = new Map();
const protocols = new Map();

const ok = (d) => ({ ok: true, ...d });
const fail = (m, c = 400) => ({ ok: false, error: m });

function seed() {
  const ts = [
    { name: 'HIPAA Consent Gate', kind: 'compliance', inputs: ['phi_field', 'consent_ts'], outputs: ['redact_required'] },
    { name: 'FHIR Resource Mapper', kind: 'integration', inputs: ['internal_patient_id'], outputs: ['fhir_patient_resource'] },
    { name: 'Triage Routing', kind: 'workflow', inputs: ['symptoms', 'severity'], outputs: ['care_path'] },
    { name: 'Patient Journey Tracker', kind: 'analytics', inputs: ['patient_id'], outputs: ['stage', 'next_action'] },
    { name: 'Clinical Protocol Lookup', kind: 'knowledge', inputs: ['condition_icd10'], outputs: ['protocol_id'] }
  ];
  ts.forEach(t => { const id = uuid(); templates.set(id, { id, company: COMPANY, vertical: VERTICAL, ...t, created_at: new Date().toISOString() }); });

  const ps = [
    { name: 'Diabetes Type 2 Management', icd10: 'E11', steps: ['A1c test', 'Lifestyle counseling', 'Metformin'] },
    { name: 'Hypertension First-line', icd10: 'I10', steps: ['BP measurement', 'Lifestyle', 'ACE inhibitor'] }
  ];
  ps.forEach(p => { const id = uuid(); protocols.set(id, { id, ...p, created_at: new Date().toISOString() }); });
}

app.get('/health', (_q, r) => r.json(ok({ service: SERVICE, port: PORT, status: 'healthy', company: COMPANY, vertical: VERTICAL, templates: templates.size, protocols: protocols.size })));
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
  res.json(ok({ run: { template_id: t.id, ran_at: new Date().toISOString(), output: { mock: true, received: Object.keys(req.body || {}) } } }));
});

app.get('/api/protocols', (req, res) => {
  const { icd10 } = req.query;
  let list = [...protocols.values()];
  if (icd10) list = list.filter(p => p.icd10 === icd10);
  res.json(ok({ protocols: list, count: list.length }));
});
app.post('/api/protocols', (req, res) => {
  const { name, icd10, steps } = req.body || {};
  if (!name || !icd10 || !Array.isArray(steps)) return res.status(400).json(fail('name, icd10, steps[] required'));
  const id = uuid();
  const p = { id, ...req.body, created_at: new Date().toISOString() };
  protocols.set(id, p);
  res.status(201).json(ok({ protocol: p }));
});

seed();
app.listen(PORT, () => console.log(`${SERVICE} listening on ${PORT}`));