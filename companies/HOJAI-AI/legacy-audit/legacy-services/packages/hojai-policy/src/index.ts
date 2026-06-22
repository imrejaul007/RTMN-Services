import express from 'express';
import mongoose from 'mongoose';
import { policyService } from './services/consentService.js';
import { ConsentType, DataRightType } from './types/index.js';

const app = express();
app.use(express.json({ limit: "10kb" }));

const PORT = process.env.PORT || 4505;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai-policy';

app.get('/health', (req, res) => res.json({ status: 'healthy', service: 'hojai-policy' }));

// Policy check
app.post('/api/policy/check', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  const result = await policyService.canProcess({
    tenantId,
    ...req.body
  });
  res.json({ success: true, data: result });
});

// Consent management
app.post('/api/consent', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  const consent = await policyService.grantConsent({
    tenantId,
    ...req.body
  });
  res.status(201).json({ success: true, data: consent });
});

app.delete('/api/consent/:type', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  await policyService.withdrawConsent({
    tenantId,
    userId: req.body.userId,
    type: req.params.type as ConsentType
  });
  res.json({ success: true });
});

app.get('/api/consent/:userId', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  const summary = await policyService.getConsentSummary(tenantId, req.params.userId);
  res.json({ success: true, data: summary });
});

// Data rights
app.post('/api/data-rights', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  const request = await policyService.handleDataRightRequest({
    tenantId,
    ...req.body
  });
  res.status(201).json({ success: true, data: request });
});

app.post('/api/data-rights/:id/fulfill', async (req, res) => {
  await policyService.fulfillDataRight({
    requestId: req.params.id,
    ...req.body
  });
  res.json({ success: true });
});

// Audit logs
app.get('/api/audit', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  const logs = await policyService.exportAuditLogs({
    tenantId,
    startDate: new Date(req.query.startDate as string),
    endDate: new Date(req.query.endDate as string),
    category: req.query.category as string
  });
  res.json({ success: true, data: logs });
});

async function start() {
  await mongoose.connect(MONGODB_URI);
  app.listen(PORT, () => console.log(`[Hojai Policy] Running on port ${PORT}`));
}

start().catch(console.error);
export default app;
