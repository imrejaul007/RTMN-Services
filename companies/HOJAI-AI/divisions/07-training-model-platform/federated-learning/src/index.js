// Federated Learning Coordinator (4871)
// Lightweight FL simulation. Real FL requires secure aggregation + DP + multi-org GPU coordination
// (still BLOCKED on infra). This service provides the orchestration layer: client registry,
// rounds, gradient aggregation (FedAvg), and model versioning.

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import crypto from 'crypto';
import { v4 as uuid } from 'uuid';

const app = express();
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '5mb' }));
app.use(morgan('tiny'));

const PORT = process.env.PORT || 4871;
const SERVICE = 'federated-learning';

const jobs = new Map();      // jobId -> { id, name, base_model, aggregation, rounds_total, status, created }
const clients = new Map();   // clientId -> { id, name, org, data_size, status, last_seen }
const rounds = new Map();    // roundId -> { id, job_id, round_num, status, client_updates, global_model, started, ended }
const updates = new Map();   // updateId -> { id, job_id, round_id, client_id, gradients_hash, samples, loss, ts }

const ok = (data) => ({ ok: true, ...data });
const fail = (msg, code = 400) => ({ ok: false, error: msg });

function hashGradient(grad) {
  return crypto.createHash('sha256').update(JSON.stringify(grad)).digest('hex').slice(0, 16);
}

function fedAvg(updates) {
  // Weighted average of gradient vectors by sample count.
  // Each update has `samples` and `gradient` (array of numbers).
  if (!updates.length) return [];
  const totalSamples = updates.reduce((s, u) => s + (u.samples || 1), 0);
  const dim = updates[0].gradient.length;
  const result = new Array(dim).fill(0);
  updates.forEach(u => {
    const weight = (u.samples || 1) / totalSamples;
    for (let i = 0; i < dim; i++) {
      result[i] += (u.gradient[i] || 0) * weight;
    }
  });
  return result.map(v => parseFloat(v.toFixed(6)));
}

function seed() {
  // Job
  const jid = uuid();
  jobs.set(jid, {
    id: jid, name: 'cross-org-finetune', base_model: 'llama-3-8b',
    aggregation: 'fedavg', rounds_total: 5, status: 'active', created: new Date().toISOString()
  });
  // Clients
  const clientSeeds = [
    { name: 'hospital-A', org: 'rabcurae', data_size: 5000 },
    { name: 'hospital-B', org: 'medplus', data_size: 8000 },
    { name: 'bank-X', org: 'finhold', data_size: 12000 },
    { name: 'retail-Y', org: 'shopco', data_size: 30000 }
  ];
  clientSeeds.forEach(c => {
    const id = uuid();
    clients.set(id, { id, ...c, status: 'active', last_seen: new Date().toISOString() });
  });
  // Round
  const rid = uuid();
  rounds.set(rid, {
    id: rid, job_id: jid, round_num: 1, status: 'completed',
    started: new Date().toISOString(), ended: new Date().toISOString()
  });
}

app.get('/health', (_req, res) => res.json(ok({ service: SERVICE, port: PORT, status: 'healthy' })));
app.get('/', (_req, res) => res.json(ok({
  service: SERVICE,
  endpoints: ['/api/jobs', '/api/jobs/:id', '/api/clients', '/api/clients/:id',
              '/api/rounds', '/api/updates', '/api/aggregate']
})));

// Jobs
app.get('/api/jobs', (_req, res) => res.json(ok({ jobs: [...jobs.values()] })));
app.post('/api/jobs', (req, res) => {
  const { name, base_model, rounds_total = 10, aggregation = 'fedavg' } = req.body || {};
  if (!name) return res.status(400).json(fail('name required'));
  const id = uuid();
  const job = { id, name, base_model: base_model || 'unknown', rounds_total, aggregation, status: 'active', created: new Date().toISOString() };
  jobs.set(id, job);
  res.status(201).json(ok({ job }));
});
app.get('/api/jobs/:id', (req, res) => {
  const j = jobs.get(req.params.id);
  if (!j) return res.status(404).json(fail('job not found'));
  res.json(ok({ job: j }));
});

// Clients
app.get('/api/clients', (_req, res) => res.json(ok({ clients: [...clients.values()] })));
app.post('/api/clients', (req, res) => {
  const { name, org, data_size = 1000 } = req.body || {};
  if (!name) return res.status(400).json(fail('name required'));
  const id = uuid();
  const c = { id, name, org: org || 'unknown', data_size, status: 'active', last_seen: new Date().toISOString() };
  clients.set(id, c);
  res.status(201).json(ok({ client: c }));
});
app.get('/api/clients/:id', (req, res) => {
  const c = clients.get(req.params.id);
  if (!c) return res.status(404).json(fail('client not found'));
  res.json(ok({ client: c }));
});
app.post('/api/clients/:id/heartbeat', (req, res) => {
  const c = clients.get(req.params.id);
  if (!c) return res.status(404).json(fail('client not found'));
  c.last_seen = new Date().toISOString();
  clients.set(c.id, c);
  res.json(ok({ client: c }));
});

// Rounds
app.post('/api/jobs/:id/rounds', (req, res) => {
  const j = jobs.get(req.params.id);
  if (!j) return res.status(404).json(fail('job not found'));
  const id = uuid();
  const existing = [...rounds.values()].filter(r => r.job_id === j.id);
  const r = {
    id, job_id: j.id, round_num: existing.length + 1, status: 'collecting',
    started: new Date().toISOString(), ended: null
  };
  rounds.set(id, r);
  res.status(201).json(ok({ round: r }));
});

app.get('/api/rounds', (req, res) => {
  const { job_id } = req.query;
  let list = [...rounds.values()];
  if (job_id) list = list.filter(r => r.job_id === job_id);
  res.json(ok({ rounds: list }));
});

// Client updates (gradients submitted by clients)
app.post('/api/updates', (req, res) => {
  const { job_id, round_id, client_id, gradient, samples = 1, loss } = req.body || {};
  if (!job_id || !round_id || !client_id || !Array.isArray(gradient)) {
    return res.status(400).json(fail('job_id + round_id + client_id + gradient[] required'));
  }
  if (!jobs.has(job_id)) return res.status(404).json(fail('job not found'));
  if (!rounds.has(round_id)) return res.status(404).json(fail('round not found'));
  if (!clients.has(client_id)) return res.status(404).json(fail('client not found'));
  const id = uuid();
  const u = { id, job_id, round_id, client_id, gradient, samples, loss: loss || 0,
    gradients_hash: hashGradient(gradient), ts: new Date().toISOString() };
  updates.set(id, u);
  res.status(201).json(ok({ update: u }));
});

app.get('/api/updates', (req, res) => {
  const { job_id, round_id, client_id } = req.query;
  let list = [...updates.values()];
  if (job_id) list = list.filter(u => u.job_id === job_id);
  if (round_id) list = list.filter(u => u.round_id === round_id);
  if (client_id) list = list.filter(u => u.client_id === client_id);
  res.json(ok({ updates: list }));
});

// Aggregate a round (FedAvg) and produce global model
app.post('/api/rounds/:id/aggregate', (req, res) => {
  const r = rounds.get(req.params.id);
  if (!r) return res.status(404).json(fail('round not found'));
  const clientUpdates = [...updates.values()].filter(u => u.round_id === r.id);
  if (clientUpdates.length === 0) return res.status(400).json(fail('no updates submitted yet'));
  const global = fedAvg(clientUpdates);
  const totalSamples = clientUpdates.reduce((s, u) => s + u.samples, 0);
  const avgLoss = clientUpdates.reduce((s, u) => s + (u.loss || 0) * u.samples, 0) / totalSamples;
  r.status = 'completed';
  r.ended = new Date().toISOString();
  r.client_updates = clientUpdates.length;
  r.global_model = { vector: global, total_samples: totalSamples, loss: parseFloat(avgLoss.toFixed(4)) };
  rounds.set(r.id, r);
  res.json(ok({ round: r }));
});

seed();
app.listen(PORT, () => console.log(`${SERVICE} listening on ${PORT}`));