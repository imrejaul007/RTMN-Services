import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 4999;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Federated trust stores
const organizations = new Map();
const trustRelationships = new Map();
const sharedTrust = new Map();

// Register organization
function registerOrg(org) {
  const id = `org-${Date.now()}`;
  const entry = {
    id,
    ...org,
    registeredAt: new Date().toISOString(),
    status: 'active'
  };
  organizations.set(id, entry);
  return entry;
}

// Share trust score with federation
function shareTrust(orgId, trustData) {
  const key = `${orgId}:${trustData.entityId}`;
  const entry = {
    ...trustData,
    sharedBy: orgId,
    sharedAt: new Date().toISOString()
  };
  sharedTrust.set(key, entry);
  return entry;
}

// Aggregate trust from federation
function aggregateTrust(entityId) {
  const scores = [];
  for (const [key, entry] of sharedTrust) {
    if (key.endsWith(`:${entityId}`)) {
      scores.push(entry);
    }
  }

  if (scores.length === 0) return { trustScore: null, sources: 0 };

  const avgScore = scores.reduce((sum, s) => sum + s.trustScore, 0) / scores.length;
  const avgConfidence = scores.reduce((sum, s) => sum + (s.confidence || 0.5), 0) / scores.length;

  return {
    trustScore: avgScore,
    confidence: avgConfidence,
    sources: scores.length,
    organizations: scores.map(s => s.sharedBy)
  };
}

// Query trust from federation
function queryFederatedTrust(entityId) {
  const aggregated = aggregateTrust(entityId);
  const details = [];

  for (const [key, entry] of sharedTrust) {
    if (key.endsWith(`:${entityId}`)) {
      details.push(entry);
    }
  }

  return { aggregated, details };
}

app.post('/orgs', (req, res) => {
  const org = registerOrg(req.body);
  res.json({ success: true, org });
});

app.get('/orgs', (req, res) => {
  res.json({ orgs: Array.from(organizations.values()) });
});

app.post('/share', (req, res) => {
  const { orgId, entityId, trustScore, confidence, metadata } = req.body;
  const entry = shareTrust(orgId, { entityId, trustScore, confidence, metadata });
  res.json({ success: true, entry });
});

app.get('/trust/:entityId', (req, res) => {
  const result = queryFederatedTrust(req.params.entityId);
  res.json(result);
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'federated-trust', port: PORT, orgs: organizations.size });
});

app.listen(PORT, () => console.log(`Federated Trust running on port ${PORT}`));
export default app;
