// Policy OS Canonical (4155) — single source of truth for policies
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuid } from 'uuid';

const app = express();
app.use(helmet()); app.use(cors()); app.use(compression());
app.use(express.json({ limit: '2mb' })); app.use(morgan('tiny'));

const PORT = process.env.PORT || 4155;
const SERVICE = 'policy-os-canonical';

const policies = new Map(); // id -> { id, name, version, rules, status, created_at }
const evaluations = new Map(); // evalId -> log of evaluation

const ok = (d) => ({ ok: true, ...d });
const fail = (m, c = 400) => ({ ok: false, error: m });

function evalRule(rule, context) {
  if (rule.type === 'allow') return { allow: true };
  if (rule.type === 'deny') return { allow: false, reason: rule.reason || 'denied' };
  if (rule.type === 'rate_limit') {
    const key = rule.key || 'default';
    const cur = (context.counters && context.counters[key]) || 0;
    return { allow: cur < rule.limit, reason: cur >= rule.limit ? 'rate_limit_exceeded' : null, counter: key, current: cur, limit: rule.limit };
  }
  if (rule.type === 'field_match') {
    const v = context[rule.field];
    const ok = v === rule.equals;
    return { allow: ok, reason: ok ? null : `field ${rule.field} != ${rule.equals}` };
  }
  return { allow: true };
}

function seed() {
  const seeds = [
    { name: 'rate-limit-api', version: 1, rules: [{ type: 'rate_limit', key: 'api', limit: 100 }] },
    { name: 'refund-window-30d', version: 2, rules: [{ type: 'field_match', field: 'days_since_purchase', equals: 30 }] },
    { name: 'gdpr-consent-required', version: 1, rules: [{ type: 'field_match', field: 'gdpr_consent', equals: true }] },
    { name: 'access-control-admin', version: 1, rules: [{ type: 'field_match', field: 'role', equals: 'admin' }] },
    { name: 'pii-redaction', version: 1, rules: [{ type: 'deny', reason: 'redact_pii' }] },
    { name: 'public-read-allow', version: 1, rules: [{ type: 'allow' }] }
  ];
  seeds.forEach(s => {
    const id = uuid();
    policies.set(id, { id, ...s, status: 'active', created_at: new Date().toISOString() });
  });
}

app.get('/health', (_q, r) => r.json(ok({ service: SERVICE, port: PORT, status: 'healthy', policies: policies.size })));
app.get('/ready', (_q, r) => r.json(ok({ ready: true })));

app.post('/api/policies', (req, res) => {
  const { name, rules } = req.body || {};
  if (!name || !Array.isArray(rules)) return res.status(400).json(fail('name, rules[] required'));
  const id = uuid();
  const policy = { id, name, version: 1, rules, status: 'active', created_at: new Date().toISOString() };
  policies.set(id, policy);
  res.status(201).json(ok({ policy }));
});
app.get('/api/policies', (_q, r) => r.json(ok({ policies: [...policies.values()], count: policies.size })));
app.get('/api/policies/:id', (req, res) => {
  const p = policies.get(req.params.id);
  if (!p) return res.status(404).json(fail('not found'));
  res.json(ok({ policy: p }));
});
app.patch('/api/policies/:id', (req, res) => {
  const p = policies.get(req.params.id);
  if (!p) return res.status(404).json(fail('not found'));
  if (req.body.rules) { p.rules = req.body.rules; p.version += 1; }
  if (req.body.status) p.status = req.body.status;
  res.json(ok({ policy: p }));
});

// Evaluate a policy against a context
app.post('/api/policies/:id/evaluate', (req, res) => {
  const p = policies.get(req.params.id);
  if (!p) return res.status(404).json(fail('not found'));
  if (p.status !== 'active') return res.status(409).json(fail('policy not active'));
  const ctx = req.body || {};
  const results = p.rules.map(r => evalRule(r, ctx));
  const allowed = results.every(r => r.allow);
  const evalId = uuid();
  evaluations.set(evalId, { id: evalId, policy_id: p.id, allowed, results, ts: new Date().toISOString() });
  res.json(ok({ evaluation_id: evalId, allowed, results }));
});

app.get('/api/evaluations', (_q, r) => r.json(ok({ evaluations: [...evaluations.values()].slice(-50) })));

seed();
app.listen(PORT, () => console.log(`${SERVICE} listening on ${PORT}`));