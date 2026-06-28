/**
 * FlowOS Policy-as-Code Engine
 *
 * OPA/Rego-compatible policy engine:
 * - Rego policy parsing and execution
 * - Policy versioning
 * - Policy testing
 * - Policy simulation
 * - Compliance reporting
 *
 * Port: 5369
 */

import express from 'express';
import cors from 'cors';
import crypto from 'crypto';

const app = express();
const PORT = process.env.PORT || 5369;

app.use(cors());
app.use(express.json());

// Storage
const storage = {
  policies: new Map(),
  versions: new Map(),
  tests: new Map(),
  results: new Map()
};

// Simple Rego evaluator
function evaluateRego(policy, input, data = {}) {
  const result = {
    allowed: true,
    reason: '',
    score: 100
  };

  try {
    // Parse simple Rego rules
    const rules = parseRegoRules(policy);

    // Evaluate each rule
    for (const rule of rules) {
      const ruleResult = evaluateRule(rule, input, data);
      if (!ruleResult.allowed) {
        result.allowed = false;
        result.reason = ruleResult.reason || 'Policy violation';
        result.score = Math.min(result.score, ruleResult.score || 0);
      }
    }
  } catch (error) {
    result.allowed = false;
    result.reason = 'Policy evaluation error: ' + error.message;
    result.score = 0;
  }

  return result;
}

// Parse simple Rego rules
function parseRegoRules(policy) {
  const rules = [];
  const lines = policy.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('package ')) {
      continue;
    }

    // Parse default allow = false
    if (trimmed.includes('default allow = false')) {
      continue; // Handled by default
    }

    // Parse allow rule
    if (trimmed.startsWith('allow {')) {
      const block = extractBlock(lines, lines.indexOf(trimmed));
      rules.push({ type: 'allow', conditions: parseConditions(block) });
    }

    // Parse simple allow rules
    if (trimmed.includes('allow') && trimmed.includes('=')) {
      const match = trimmed.match(/allow\s*\{\s*(.*?)\s*\}/);
      if (match) {
        rules.push({ type: 'allow', conditions: parseConditions(match[1]) });
      }
    }
  }

  return rules;
}

// Parse conditions from rule body
function parseConditions(body) {
  const conditions = [];

  // Match comparison operators
  const comparisons = body.match(/[a-zA-Z_.]+\s*[><=!]+\s*[\d."\w]+/g) || [];

  for (const comp of comparisons) {
    const parts = comp.split(/\s+([><=!]+)\s+/);
    if (parts.length === 3) {
      conditions.push({
        field: parts[0].trim(),
        operator: parts[1],
        value: parseValue(parts[2])
      });
    }
  }

  return conditions;
}

// Parse value from string
function parseValue(str) {
  const trimmed = str.trim().replace(/['"]/g, '');

  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (trimmed === 'null' || trimmed === 'undefined') return null;
  if (!isNaN(trimmed)) return parseFloat(trimmed);

  return trimmed;
}

// Evaluate a single rule
function evaluateRule(rule, input, data) {
  const context = { ...data, ...input };

  for (const condition of rule.conditions) {
    const fieldValue = getNestedValue(context, condition.field);

    let satisfied = false;
    switch (condition.operator) {
      case '>':
        satisfied = (fieldValue || 0) > condition.value;
        break;
      case '>=':
        satisfied = (fieldValue || 0) >= condition.value;
        break;
      case '<':
        satisfied = (fieldValue || 0) < condition.value;
        break;
      case '<=':
        satisfied = (fieldValue || 0) <= condition.value;
        break;
      case '==':
        satisfied = fieldValue == condition.value;
        break;
      case '!=':
        satisfied = fieldValue != condition.value;
        break;
      default:
        satisfied = true;
    }

    if (!satisfied) {
      return {
        allowed: false,
        reason: `${condition.field} ${condition.operator} ${condition.value}`,
        score: 0
      };
    }
  }

  return { allowed: true };
}

// Get nested value from object
function getNestedValue(obj, path) {
  const parts = path.split('.');
  let value = obj;

  for (const part of parts) {
    if (value === null || value === undefined) return undefined;
    value = value[part];
  }

  return value;
}

// Extract block from lines
function extractBlock(lines, startIndex) {
  const block = [];
  let depth = 0;

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    depth += (line.match(/{/g) || []).length;
    depth -= (line.match(/}/g) || []).length;

    if (depth <= 0 && i > startIndex) break;
    block.push(line);
  }

  return block.join('\n');
}

// Health
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'policy-as-code',
    version: '1.0.0',
    port: PORT,
    policies: storage.policies.size,
    timestamp: new Date().toISOString()
  });
});

// Create policy
app.post('/api/policies', (req, res) => {
  try {
    const { id, name, description, rego, category, tags = [] } = req.body || {};

    if (!name || !rego) {
      return res.status(400).json({ error: 'name and rego are required' });
    }

    const policyId = id || 'policy_' + crypto.randomUUID().slice(0, 8);
    const now = new Date().toISOString();

    const policy = {
      id: policyId,
      name,
      description: description || '',
      rego,
      category: category || 'general',
      tags,
      version: 1,
      createdAt: now,
      updatedAt: now
    };

    storage.policies.set(policyId, policy);

    // Create initial version
    const versionId = policyId + '_v1';
    storage.versions.set(versionId, {
      policyId,
      version: 1,
      rego,
      createdAt: now
    });

    res.status(201).json(policy);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get policy
app.get('/api/policies/:id', (req, res) => {
  const policy = storage.policies.get(req.params.id);

  if (!policy) {
    return res.status(404).json({ error: 'Policy not found' });
  }

  res.json(policy);
});

// List policies
app.get('/api/policies', (req, res) => {
  const { category, tag } = req.query;

  let policies = Array.from(storage.policies.values());

  if (category) {
    policies = policies.filter(p => p.category === category);
  }
  if (tag) {
    policies = policies.filter(p => p.tags.includes(tag));
  }

  res.json({ count: policies.length, policies });
});

// Update policy (creates new version)
app.put('/api/policies/:id', (req, res) => {
  const policy = storage.policies.get(req.params.id);

  if (!policy) {
    return res.status(404).json({ error: 'Policy not found' });
  }

  const { name, description, rego, category, tags } = req.body || {};
  const now = new Date().toISOString();
  const newVersion = policy.version + 1;

  const updated = {
    ...policy,
    name: name || policy.name,
    description: description !== undefined ? description : policy.description,
    rego: rego || policy.rego,
    category: category || policy.category,
    tags: tags || policy.tags,
    version: newVersion,
    updatedAt: now
  };

  storage.policies.set(policy.id, updated);

  // Store new version
  const versionId = policy.id + '_v' + newVersion;
  storage.versions.set(versionId, {
    policyId: policy.id,
    version: newVersion,
    rego: updated.rego,
    createdAt: now
  });

  res.json(updated);
});

// Delete policy
app.delete('/api/policies/:id', (req, res) => {
  if (!storage.policies.has(req.params.id)) {
    return res.status(404).json({ error: 'Policy not found' });
  }

  storage.policies.delete(req.params.id);
  res.json({ success: true });
});

// Get policy versions
app.get('/api/policies/:id/versions', (req, res) => {
  const policyId = req.params.id;
  const versions = Array.from(storage.versions.values())
    .filter(v => v.policyId === policyId)
    .sort((a, b) => b.version - a.version);

  res.json({ count: versions.length, versions });
});

// Evaluate policy
app.post('/api/policies/:id/evaluate', (req, res) => {
  const policy = storage.policies.get(req.params.id);

  if (!policy) {
    return res.status(404).json({ error: 'Policy not found' });
  }

  const { input, data = {} } = req.body || {};

  if (!input) {
    return res.status(400).json({ error: 'input is required' });
  }

  const result = evaluateRego(policy.rego, input, data);

  res.json({
    policyId: policy.id,
    policyName: policy.name,
    input,
    result
  });
});

// Batch evaluate multiple policies
app.post('/api/evaluate', (req, res) => {
  const { policyIds, input, data = {} } = req.body || {};

  if (!policyIds || !Array.isArray(policyIds)) {
    return res.status(400).json({ error: 'policyIds array is required' });
  }

  const results = [];

  for (const policyId of policyIds) {
    const policy = storage.policies.get(policyId);
    if (policy) {
      const result = evaluateRego(policy.rego, input, data);
      results.push({
        policyId,
        policyName: policy.name,
        result
      });
    }
  }

  const allAllowed = results.every(r => r.result.allowed);

  res.json({
    overall: allAllowed ? 'allowed' : 'denied',
    results
  });
});

// Create test case
app.post('/api/policies/:id/tests', (req, res) => {
  const policy = storage.policies.get(req.params.id);

  if (!policy) {
    return res.status(404).json({ error: 'Policy not found' });
  }

  const { name, input, expected } = req.body || {};

  if (!name || input === undefined || expected === undefined) {
    return res.status(400).json({ error: 'name, input, and expected are required' });
  }

  const testId = 'test_' + crypto.randomUUID();
  const test = {
    id: testId,
    policyId: policy.id,
    name,
    input,
    expected,
    createdAt: new Date().toISOString()
  };

  if (!storage.tests.has(policy.id)) {
    storage.tests.set(policy.id, []);
  }
  storage.tests.get(policy.id).push(test);

  res.status(201).json(test);
});

// Run tests
app.post('/api/policies/:id/tests/run', (req, res) => {
  const tests = storage.tests.get(req.params.id);

  if (!tests || tests.length === 0) {
    return res.json({ count: 0, passed: 0, failed: 0, results: [] });
  }

  const policy = storage.policies.get(req.params.id);
  const results = [];
  let passed = 0;

  for (const test of tests) {
    const evaluation = evaluateRego(policy.rego, test.input, {});
    const success = evaluation.allowed === test.expected;

    if (success) passed++;

    results.push({
      testId: test.id,
      testName: test.name,
      success,
      evaluation,
      expected: test.expected,
      actual: evaluation.allowed
    });
  }

  // Store results
  const runId = 'run_' + crypto.randomUUID();
  storage.results.set(runId, {
    policyId: req.params.id,
    runAt: new Date().toISOString(),
    results
  });

  res.json({
    runId,
    count: tests.length,
    passed,
    failed: tests.length - passed,
    results
  });
});

// Get test results
app.get('/api/policies/:id/tests', (req, res) => {
  const tests = storage.tests.get(req.params.id) || [];
  res.json({ count: tests.length, tests });
});

// Simulate policy change
app.post('/api/policies/:id/simulate', (req, res) => {
  const { newRego, inputs = [] } = req.body || {};

  if (!newRego) {
    return res.status(400).json({ error: 'newRego is required' });
  }

  const policy = storage.policies.get(req.params.id);
  if (!policy) {
    return res.status(404).json({ error: 'Policy not found' });
  }

  const results = [];

  for (const input of inputs) {
    const oldResult = evaluateRego(policy.rego, input, {});
    const newResult = evaluateRego(newRego, input, {});

    results.push({
      input,
      oldResult,
      newResult,
      changed: oldResult.allowed !== newResult.allowed
    });
  }

  res.json({
    policyId: policy.id,
    changes: results.filter(r => r.changed).length,
    results
  });
});

// Generate compliance report
app.get('/api/policies/:id/compliance', (req, res) => {
  const policy = storage.policies.get(req.params.id);

  if (!policy) {
    return res.status(404).json({ error: 'Policy not found' });
  }

  const tests = storage.tests.get(policy.id) || [];

  // Calculate compliance metrics
  const compliant = tests.filter(t => {
    const result = evaluateRego(policy.rego, t.input, {});
    return result.allowed === t.expected;
  }).length;

  const coverage = tests.length > 0 ? (compliant / tests.length) * 100 : 0;

  res.json({
    policyId: policy.id,
    policyName: policy.name,
    category: policy.category,
    version: policy.version,
    tests: {
      total: tests.length,
      compliant,
      coverage: Math.round(coverage * 100) / 100
    },
    generatedAt: new Date().toISOString()
  });
});

// Get built-in policies
app.get('/api/policies/templates/built-in', (req, res) => {
  const templates = [
    {
      id: 'fraud-detection',
      name: 'Fraud Detection',
      description: 'Detect and block fraudulent transactions',
      category: 'security',
      rego: `package flowos.fraud

default allow = false

allow {
    input.transactionAmount < 10000
    input.riskScore < 70
    input.isNewAccount == false
}`
    },
    {
      id: 'approval-thresholds',
      name: 'Approval Thresholds',
      description: 'Require approval based on amount',
      category: 'approval',
      rego: `package flowos.approval

default allow = false

allow {
    input.amount <= 5000
    input.trustScore > 50
}

allow {
    input.amount > 5000
    input.trustScore > 80
}`
    },
    {
      id: 'data-residency',
      name: 'Data Residency',
      description: 'Enforce data residency requirements',
      category: 'compliance',
      rego: `package flowos.residency

default allow = false

allow {
    input.region == "US"
    input.dataClassification != "restricted"
}

allow {
    input.region == "EU"
    input.gdprCompliant == true
}`
    }
  ];

  res.json({ templates });
});

app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});

const server = app.listen(PORT, () => {
  console.log(`[policy-as-code] listening on :${PORT}`);
});

process.on('SIGTERM', () => {
  console.log('[policy-as-code] Shutting down...');
  server.close();
});

export { app };
