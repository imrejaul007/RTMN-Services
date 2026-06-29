import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 4887;

app.use(helmet());
app.use(cors());
app.use(express.json());

const namespaceRules = new Map();

function getNamespaceForType(entityType, context = {}) {
  const typeRules = namespaceRules.get(entityType);
  if (typeRules) return typeRules;
  const defaults = {
    employee: `company_${context.companyId || 'default'}`,
    customer: `customer_${context.customerId || 'default'}`,
    user: `user_${context.userId || 'default'}`,
    family: `family_${context.familyId || 'default'}`
  };
  return defaults[entityType] || 'default';
}

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

app.put('/rules/:entityType', (req, res) => {
  const { entityType } = req.params;
  const { namespace, pattern } = req.body;
  namespaceRules.set(entityType, { namespace, pattern });
  res.json({ success: true, rule: { entityType, namespace, pattern } });
});

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
