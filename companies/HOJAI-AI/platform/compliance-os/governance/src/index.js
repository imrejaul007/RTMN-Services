// Governance OS - AI policy enforcement, audit trails, compliance checks. Port 4895
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { readJson, writeJson } from './store.js';

const app = express();
const PORT = 4895;
app.use(express.json());

// Policies
app.get('/api/policies', (req, res) => {
  let policies = readJson('policies.json') || [];
  if (req.query.type) policies = policies.filter(p => p.type === req.query.type);
  if (req.query.status) policies = policies.filter(p => p.status === req.query.status);
  res.json({ policies, count: policies.length });
});

app.get('/api/policies/:id', (req, res) => {
  const policy = (readJson('policies.json') || []).find(p => p.id === req.params.id);
  if (!policy) return res.status(404).json({ error: 'Policy not found' });
  res.json(policy);
});

app.post('/api/policies', (req, res) => {
  const { name, description, type, rules, severity = 'medium' } = req.body;
  if (!name || !type || !rules) return res.status(400).json({ error: 'name, type, rules required' });
  const policy = { id: uuidv4(), name, description, type, rules, severity, status: 'active', version: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  const policies = readJson('policies.json') || [];
  policies.push(policy);
  writeJson('policies.json', policies);
  res.status(201).json(policy);
});

app.post('/api/policies/:id/evaluate', (req, res) => {
  const { action, actor, resource, context = {} } = req.body;
  if (!action || !actor) return res.status(400).json({ error: 'action and actor required' });
  const policies = readJson('policies.json') || [];
  const policy = policies.find(p => p.id === req.params.id);
  if (!policy) return res.status(404).json({ error: 'Policy not found' });

  const violated = policy.rules.some(rule => {
    if (rule.type === 'deny' && rule.action === action) return true;
    return false;
  });

  const result = { policyId: policy.id, action, actor, resource, decision: violated ? 'deny' : 'allow', reason: violated ? 'Policy rule violated' : 'Allowed by policy', evaluatedAt: new Date().toISOString() };

  if (violated) {
    const violations = readJson('violations.json') || [];
    violations.push({ ...result, policyName: policy.name, severity: policy.severity });
    writeJson('violations.json', violations);
  }

  res.json(result);
});

// Audit Trail
app.post('/api/audits', (req, res) => {
  const { actor, action, resource, outcome = 'success', metadata = {} } = req.body;
  if (!actor || !action) return res.status(400).json({ error: 'actor and action required' });
  const audit = { id: uuidv4(), actor, action, resource, outcome, metadata, timestamp: new Date().toISOString() };
  const audits = readJson('audits.json') || [];
  audits.push(audit);
  writeJson('audits.json', audits);
  res.status(201).json(audit);
});

app.get('/api/audits', (req, res) => {
  let audits = readJson('audits.json') || [];
  if (req.query.actor) audits = audits.filter(a => a.actor === req.query.actor);
  if (req.query.action) audits = audits.filter(a => a.action === req.query.action);
  if (req.query.from) audits = audits.filter(a => new Date(a.timestamp) >= new Date(req.query.from));
  if (req.query.to) audits = audits.filter(a => new Date(a.timestamp) <= new Date(req.query.to));
  res.json({ audits: audits.slice(-parseInt(req.query.limit || 100)), count: audits.length });
});

app.get('/api/audits/:id', (req, res) => {
  const audit = (readJson('audits.json') || []).find(a => a.id === req.params.id);
  if (!audit) return res.status(404).json({ error: 'Audit not found' });
  res.json(audit);
});

// Compliance Report
app.get('/api/compliance/report', (req, res) => {
  const violations = readJson('violations.json') || [];
  const policies = readJson('policies.json') || [];
  const audits = readJson('audits.json') || [];
  const severityCounts = violations.reduce((acc, v) => { acc[v.severity] = (acc[v.severity] || 0) + 1; return acc; }, {});
  res.json({
    summary: {
      totalPolicies: policies.length,
      activePolicies: policies.filter(p => p.status === 'active').length,
      totalAudits: audits.length,
      totalViolations: violations.length,
      criticalViolations: severityCounts.critical || 0,
      highViolations: severityCounts.high || 0,
    },
    byPolicy: policies.map(p => ({ policyId: p.id, name: p.name, violations: violations.filter(v => v.policyId === p.id).length })),
    complianceScore: policies.length ? Math.max(0, 100 - (violations.length / policies.length) * 10) : 100,
  });
});

// Violations
app.get('/api/violations', (req, res) => {
  let violations = readJson('violations.json') || [];
  if (req.query.severity) violations = violations.filter(v => v.severity === req.query.severity);
  if (req.query.policyId) violations = violations.filter(v => v.policyId === req.query.policyId);
  if (req.query.from) violations = violations.filter(v => new Date(v.evaluatedAt) >= new Date(req.query.from));
  if (req.query.to) violations = violations.filter(v => new Date(v.evaluatedAt) <= new Date(req.query.to));
  res.json({ violations, count: violations.length });
});

app.get('/health', (req, res) => res.json({ service: 'governance-os', status: 'healthy' }));
app.get('/ready', (req, res) => res.json({ ready: true }));

const server = app.listen(PORT, () => { console.log(`Governance OS running on port ${PORT}`); });
export default server;
