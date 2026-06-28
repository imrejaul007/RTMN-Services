// Governance OS - AI policy enforcement, audit trails, compliance checks
// Port 4895

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { readJson, writeJson } from './store.js';

const app = express();
const PORT = 4895;
app.use(express.json());

// --- Policy Management ---

function loadPolicies() { return readJson('policies.json') || []; }
function savePolicies(list) { writeJson('policies.json', list); }

function loadAudits() { return readJson('audits.json') || []; }
function saveAudits(list) { writeJson('audits.json', list); }

function loadViolations() { return readJson('violations.json') || []; }
function saveViolations(list) { writeJson('violations.json', list); }

// GET /api/policies
app.get('/api/policies', (req, res) => {
  const { type, status } = req.query;
  let policies = loadPolicies();
  if (type) policies = policies.filter(p => p.type === type);
  if (status) policies = policies.filter(p => p.status === status);
  res.json({ policies, count: policies.length });
});

// GET /api/policies/:id
app.get('/api/policies/:id', (req, res) => {
  const policy = loadPolicies().find(p => p.id === req.params.id);
  if (!policy) return res.status(404).json({ error: 'Policy not found' });
  res.json(policy);
});

// POST /api/policies
app.post('/api/policies', (req, res) => {
  const { name, description, type, rules, severity = 'medium' } = req.body;
  if (!name || !type || !rules) return res.status(400).json({ error: 'name, type, rules required' });

  const policy = {
    id: uuidv4(),
    name,
    description,
    type,
    rules,
    severity,
    status: 'active',
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const policies = loadPolicies();
  policies.push(policy);
  savePolicies(policies);
  res.status(201).json(policy);
});

// POST /api/policies/:id/evaluate
app.post('/api/policies/:id/evaluate', (req, res) => {
  const { action, actor, resource, context = {} } = req.body;
  if (!action || !actor) return res.status(400).json({ error: 'action and actor required' });

  const policy = loadPolicies().find(p => p.id === req.params.id);
  if (!policy) return res.status(404).json({ error: 'Policy not found' });

  // Simple rule evaluation
  const violated = policy.rules.some(rule => {
    if (rule.type === 'deny' && rule.action === action) return true;
    if (rule.type === 'allow' && rule.condition) {
      try { return eval(rule.condition); } catch { return false; }
    }
    return false;
  });

  const result = {
    policyId: policy.id,
    action,
    actor,
    resource,
    decision: violated ? 'deny' : 'allow',
    reason: violated ? 'Policy rule violated' : 'Allowed by policy',
    evaluatedAt: new Date().toISOString(),
  };

  if (violated) {
    const violations = loadViolations();
    violations.push({ ...result, policyName: policy.name, severity: policy.severity });
    saveViolations(violations);
  }

  res.json(result);
});

// --- Audit Trail ---

// POST /api/audits
app.post('/api/audits', (req, res) => {
  const { actor, action, resource, outcome, metadata = {} } = req.body;
  if (!actor || !action) return res.status(400).json({ error: 'actor and action required' });

  const audit = {
    id: uuidv4(),
    actor,
    action,
    resource,
    outcome: outcome || 'success',
    metadata,
    timestamp: new Date().toISOString(),
  };

  const audits = loadAudits();
  audits.push(audit);
  saveAudits(audits);
  res.status(201).json(audit);
});

// GET /api/audits
app.get('/api/audits', (req, res) => {
  const { actor, action, from, to, limit = 100 } = req.query;
  let audits = loadAudits();
  if (actor) audits = audits.filter(a => a.actor === actor);
  if (action) audits = audits.filter(a => a.action === action);
  if (from) audits = audits.filter(a => new Date(a.timestamp) >= new Date(from));
  if (to) audits = audits.filter(a => new Date(a.timestamp) <= new Date(to));
  res.json({ audits: audits.slice(-parseInt(limit)), count: audits.length });
});

// GET /api/audits/:id
app.get('/api/audits/:id', (req, res) => {
  const audit = loadAudits().find(a => a.id === req.params.id);
  if (!audit) return res.status(404).json({ error: 'Audit not found' });
  res.json(audit);
});

// --- Compliance Checks ---

// GET /api/compliance/report
app.get('/api/compliance/report', (req, res) => {
  const violations = loadViolations();
  const policies = loadPolicies();
  const audits = loadAudits();

  const severityCounts = violations.reduce((acc, v) => {
    acc[v.severity] = (acc[v.severity] || 0) + 1;
    return acc;
  }, {});

  res.json({
    summary: {
      totalPolicies: policies.length,
      activePolicies: policies.filter(p => p.status === 'active').length,
      totalAudits: audits.length,
      totalViolations: violations.length,
      criticalViolations: severityCounts.critical || 0,
      highViolations: severityCounts.high || 0,
    },
    byPolicy: policies.map(p => ({
      policyId: p.id,
      name: p.name,
      violations: violations.filter(v => v.policyId === p.id).length,
    })),
    complianceScore: policies.length ? Math.max(0, 100 - (violations.length / policies.length) * 10) : 100,
  });
});

// --- Violations ---

// GET /api/violations
app.get('/api/violations', (req, res) => {
  const { severity, policyId, from, to } = req.query;
  let violations = loadViolations();
  if (severity) violations = violations.filter(v => v.severity === severity);
  if (policyId) violations = violations.filter(v => v.policyId === policyId);
  if (from) violations = violations.filter(v => new Date(v.evaluatedAt) >= new Date(from));
  if (to) violations = violations.filter(v => new Date(v.evaluatedAt) <= new Date(to));
  res.json({ violations, count: violations.length });
});

// --- Health ---
app.get('/health', (req, res) => res.json({ service: 'governance-os', status: 'healthy' }));
app.get('/ready', (req, res) => res.json({ ready: true }));

const server = app.listen(PORT, () => {
  console.log(`Governance OS running on port ${PORT}`);
});

export default server;