import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 4998;

app.use(helmet());
app.use(cors());
app.use(express.json());

const policies = new Map();

function createPolicy(policy) {
  const id = `policy-${Date.now()}`;
  const newPolicy = {
    id,
    ...policy,
    active: true,
    createdAt: new Date().toISOString(),
    version: 1
  };
  policies.set(id, newPolicy);
  return newPolicy;
}

function evaluatePolicy(policy, context) {
  if (!policy.active) return { allowed: false, reason: 'Policy inactive' };

  const conditions = policy.conditions || [];
  for (const condition of conditions) {
    const result = evaluateCondition(condition, context);
    if (!result.pass) return { allowed: false, reason: result.reason };
  }

  return { allowed: true, policyId: policy.id };
}

function evaluateCondition(condition, context) {
  const value = context[condition.field];

  switch (condition.operator) {
    case 'gte': return { pass: value >= condition.value, reason: `${condition.field} must be >= ${condition.value}` };
    case 'lte': return { pass: value <= condition.value, reason: `${condition.field} must be <= ${condition.value}` };
    case 'eq': return { pass: value === condition.value, reason: `${condition.field} must equal ${condition.value}` };
    case 'in': return { pass: condition.value.includes(value), reason: `${condition.field} must be in [${condition.value.join(', ')}]` };
    case 'exists': return { pass: value !== undefined, reason: `${condition.field} must exist` };
    default: return { pass: true };
  }
}

app.post('/policies', (req, res) => {
  const policy = createPolicy(req.body);
  res.json({ success: true, policy });
});

app.get('/policies', (req, res) => {
  res.json({ policies: Array.from(policies.values()) });
});

app.post('/evaluate', (req, res) => {
  const { context, policyId } = req.body;

  if (policyId) {
    const policy = policies.get(policyId);
    if (!policy) return res.status(404).json({ error: 'Policy not found' });
    const result = evaluatePolicy(policy, context);
    return res.json(result);
  }

  // Evaluate all applicable policies
  const results = [];
  for (const policy of policies.values()) {
    results.push(evaluatePolicy(policy, context));
  }

  const overall = results.every(r => r.allowed);
  res.json({ allowed: overall, results });
});

app.listen(PORT, () => console.log(`Trust Policy Engine running on port ${PORT}`));
export default app;
