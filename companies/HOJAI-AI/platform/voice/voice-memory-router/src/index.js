import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 4887;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Namespace routing rules
const namespaceRules = new Map();

function getNamespaceForType(entityType, context = {}) {
  const typeRules = namespaceRules.get(entityType);
  if (typeRules) return typeRules;

  // Default namespaces
  const defaults = {
    employee: `company_${context.companyId || 'default'}`,
    customer: `customer_${context.customerId || 'default'}`,
    user: `user_${context.userId || 'default'}`,
    family: `family_${context.familyId || 'default'}`
  };

  return defaults[entityType] || 'default';
}

// POST /route - Route voice to memory namespace
app.post('/route', (req, res) => {
  const { voiceFingerprint, corpId, entityType, context } = req.body;

  const namespace = getNamespaceForType(entityType || 'user', {
    ...context,
    corpId
  });

  res.json({
    voiceFingerprint,
    corpId,
    entityType,
    namespace,
    memoryEndpoint: `http://localhost:4703/api/memory/${namespace}`
  });
});

// PUT /rules/:entityType - Set namespace rule
app.put('/rules/:entityType', (req, res) => {
  const { entityType } = req.params;
  const { namespace, pattern } = req.body;

  namespaceRules.set(entityType, { namespace, pattern });

  res.json({ success: true, rule: { entityType, namespace, pattern } });
});

// GET /rules - List routing rules
app.get('/rules', (req, res) => {
  const rules = [];
  for (const [type, rule] of namespaceRules) {
    rules.push({ entityType: type, ...rule });
  }
  res.json({ rules });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'voice-memory-router', port: PORT });
});

app.listen(PORT, () => console.log(`Voice Memory Router running on port ${PORT}`));
export default app;
