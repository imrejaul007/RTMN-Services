// government-os (5275) - Government & Public Sector Management.
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuid } from 'uuid';

const SERVICE = 'government-os';
const PORT = parseInt(process.env.PORT || '5275', 10);

const app = express();
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('tiny'));

const ok = (data) => ({ ok: true, ...data });
const fail = (msg) => ({ ok: false, error: msg });

const agencies = new Map();    // agId -> { id, name, jurisdiction, level, head, contact }
const services = new Map();    // svcId -> { id, agency_id, name, description, fee, processing_days, required_docs[] }
const citizens = new Map();    // citId -> { id, name, national_id, email, phone, address }
const applications = new Map(); // appId -> { id, citizen_id, service_id, status, submitted_at, decided_at, decision_notes }
const permits = new Map();     // pId -> { id, application_id, type, issued_at, expires_at, conditions[] }
const cases = new Map();       // caseId -> { id, agency_id, citizen_id, subject, status, priority, opened_at, closed_at }
const records = new Map();     // recId -> { id, agency_id, type, title, content, classification, created }

// Seed
(function seed() {
  const agId = uuid();
  agencies.set(agId, { id: agId, name: 'Department of Motor Vehicles', jurisdiction: 'State of California',
    level: 'state', head: 'Director Smith', contact: 'dmv@ca.example' });
  services.set(uuid(), { id: uuid(), agency_id: agId, name: "Driver's License Renewal",
    description: 'Renew your driver license', fee: 35, processing_days: 7, required_docs: ['proof_of_identity', 'proof_of_residency'] });
  cases.set(uuid(), { id: uuid(), agency_id: agId, subject: 'License dispute', status: 'open', priority: 'medium', opened_at: new Date().toISOString() });
  records.set(uuid(), { id: uuid(), agency_id: agId, type: 'policy', title: 'Vehicle Registration Requirements',
    content: 'All vehicles must be registered...', classification: 'public', created: new Date().toISOString() });
})();

app.get('/health', (_req, res) => res.json(ok({ service: SERVICE, port: PORT, status: 'healthy' })));
app.get('/', (_req, res) => res.json(ok({
  service: SERVICE, port: PORT,
  endpoints: ['/api/agencies', '/api/services', '/api/citizens', '/api/applications',
              '/api/permits', '/api/cases', '/api/records']
})));

// Agencies
app.get('/api/agencies', (req, res) => {
  let list = [...agencies.values()];
  if (req.query.level) list = list.filter(a => a.level === req.query.level);
  res.json(ok({ agencies: list }));
});
app.post('/api/agencies', (req, res) => {
  const { name, jurisdiction, level = 'federal', head = '', contact = '' } = req.body || {};
  if (!name || !jurisdiction) return res.status(400).json(fail('name + jurisdiction required'));
  const id = uuid();
  agencies.set(id, { id, name, jurisdiction, level, head, contact });
  res.status(201).json(ok({ agency: agencies.get(id) }));
});

// Services (government services offered)
app.get('/api/services', (req, res) => {
  let list = [...services.values()];
  if (req.query.agency_id) list = list.filter(s => s.agency_id === req.query.agency_id);
  res.json(ok({ services: list }));
});
app.post('/api/services', (req, res) => {
  const { agency_id, name, description = '', fee = 0, processing_days = 14, required_docs = [] } = req.body || {};
  if (!agency_id || !name) return res.status(400).json(fail('agency_id + name required'));
  if (!agencies.has(agency_id)) return res.status(400).json(fail('agency_id invalid'));
  const id = uuid();
  services.set(id, { id, agency_id, name, description, fee, processing_days, required_docs });
  res.status(201).json(ok({ service: services.get(id) }));
});

// Citizens
app.get('/api/citizens', (_req, res) => res.json(ok({ citizens: [...citizens.values()] })));
app.post('/api/citizens', (req, res) => {
  const { name, national_id, email = '', phone = '', address = '' } = req.body || {};
  if (!name || !national_id) return res.status(400).json(fail('name + national_id required'));
  const id = uuid();
  citizens.set(id, { id, name, national_id, email, phone, address });
  res.status(201).json(ok({ citizen: citizens.get(id) }));
});

// Applications (citizens apply for services)
app.get('/api/applications', (req, res) => {
  let list = [...applications.values()];
  if (req.query.citizen_id) list = list.filter(a => a.citizen_id === req.query.citizen_id);
  if (req.query.service_id) list = list.filter(a => a.service_id === req.query.service_id);
  if (req.query.status) list = list.filter(a => a.status === req.query.status);
  res.json(ok({ applications: list }));
});
app.post('/api/applications', (req, res) => {
  const { citizen_id, service_id, documents = [] } = req.body || {};
  if (!citizen_id || !service_id) return res.status(400).json(fail('citizen_id + service_id required'));
  if (!citizens.has(citizen_id)) return res.status(400).json(fail('citizen_id invalid'));
  if (!services.has(service_id)) return res.status(400).json(fail('service_id invalid'));
  // Validate required docs
  const svc = services.get(service_id);
  const missing = (svc.required_docs || []).filter(d => !documents.includes(d));
  if (missing.length) return res.status(400).json(fail(`missing required docs: ${missing.join(', ')}`));
  const id = uuid();
  applications.set(id, { id, citizen_id, service_id, status: 'submitted',
    submitted_at: new Date().toISOString(), decided_at: null, decision_notes: '', documents });
  res.status(201).json(ok({ application: applications.get(id) }));
});
app.patch('/api/applications/:id', (req, res) => {
  const a = applications.get(req.params.id);
  if (!a) return res.status(404).json(fail('application not found'));
  if (req.body.status) {
    a.status = req.body.status;
    if (['approved', 'rejected'].includes(req.body.status)) a.decided_at = new Date().toISOString();
  }
  if (req.body.decision_notes) a.decision_notes = req.body.decision_notes;
  applications.set(a.id, a);
  // If approved, auto-issue permit
  if (a.status === 'approved' && !permits.has(a.id)) {
    const pid = a.id; // permit uses application id
    permits.set(pid, { id: pid, application_id: a.id, type: 'auto-issued',
      issued_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
      conditions: [] });
  }
  res.json(ok({ application: a }));
});

// Permits
app.get('/api/permits', (req, res) => {
  let list = [...permits.values()];
  if (req.query.application_id) list = list.filter(p => p.application_id === req.query.application_id);
  res.json(ok({ permits: list }));
});

// Cases (case management)
app.get('/api/cases', (req, res) => {
  let list = [...cases.values()];
  if (req.query.agency_id) list = list.filter(c => c.agency_id === req.query.agency_id);
  if (req.query.status) list = list.filter(c => c.status === req.query.status);
  res.json(ok({ cases: list }));
});
app.post('/api/cases', (req, res) => {
  const { agency_id, citizen_id, subject, priority = 'medium' } = req.body || {};
  if (!agency_id || !subject) return res.status(400).json(fail('agency_id + subject required'));
  if (!agencies.has(agency_id)) return res.status(400).json(fail('agency_id invalid'));
  const id = uuid();
  cases.set(id, { id, agency_id, citizen_id: citizen_id || null, subject, status: 'open', priority,
    opened_at: new Date().toISOString(), closed_at: null });
  res.status(201).json(ok({ case: cases.get(id) }));
});
app.patch('/api/cases/:id', (req, res) => {
  const c = cases.get(req.params.id);
  if (!c) return res.status(404).json(fail('case not found'));
  if (req.body.status) {
    c.status = req.body.status;
    if (req.body.status === 'closed' && !c.closed_at) c.closed_at = new Date().toISOString();
  }
  cases.set(c.id, c);
  res.json(ok({ case: c }));
});

// Public Records
app.get('/api/records', (req, res) => {
  let list = [...records.values()];
  if (req.query.agency_id) list = list.filter(r => r.agency_id === req.query.agency_id);
  if (req.query.classification) list = list.filter(r => r.classification === req.query.classification);
  res.json(ok({ records: list }));
});
app.post('/api/records', (req, res) => {
  const { agency_id, type, title, content, classification = 'public' } = req.body || {};
  if (!agency_id || !type || !title) return res.status(400).json(fail('agency_id + type + title required'));
  if (!agencies.has(agency_id)) return res.status(400).json(fail('agency_id invalid'));
  if (!['public', 'internal', 'restricted'].includes(classification)) return res.status(400).json(fail('invalid classification'));
  const id = uuid();
  records.set(id, { id, agency_id, type, title, content, classification,
    created: new Date().toISOString() });
  res.status(201).json(ok({ record: records.get(id) }));
});

app.listen(PORT, () => console.log(`${SERVICE} listening on ${PORT}`));
