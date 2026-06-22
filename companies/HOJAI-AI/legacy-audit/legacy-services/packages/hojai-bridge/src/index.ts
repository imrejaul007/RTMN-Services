import express from 'express';
import mongoose from 'mongoose';
import { bridgeService } from './services/bridgeService.js';
import { TenantType } from './types/index.js';

const app = express();
app.use(express.json({ limit: "10kb" }));

const PORT = process.env.PORT || 4519;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai-bridge';

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'hojai-bridge' });
});

// Bridge configuration
app.post('/api/bridge/config', async (req, res) => {
  const config = await bridgeService.configureBridge(req.body);
  res.json({ success: true, data: config });
});

app.get('/api/bridge/config/:tenantId', async (req, res) => {
  const config = await bridgeService.getBridgeConfig(req.params.tenantId);
  res.json({ success: true, data: config });
});

// Event bridging
app.post('/api/bridge/event', async (req, res) => {
  const { tenantId, event, sourceService, sourceApp } = req.body;
  const result = await bridgeService.processBridgeEvent({ tenantId, event, sourceService, sourceApp });
  res.json({ success: true, data: result });
});

// Cross-app identity
app.post('/api/bridge/identity/link', async (req, res) => {
  const identity = await bridgeService.linkCrossAppIdentity(req.body);
  res.status(201).json({ success: true, data: identity });
});

// Unified profiles (REZ-only)
app.get('/api/bridge/unified/:entityType/:entityId', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  const profile = await bridgeService.getUnifiedProfile({
    tenantId,
    entityId: req.params.entityId,
    entityType: req.params.entityType as 'user' | 'merchant'
  });
  res.json({ success: true, data: profile });
});

// Behavioral signals
app.get('/api/bridge/signals/:userId', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  const signals = await bridgeService.getBehavioralSignals(tenantId, req.params.userId);
  res.json({ success: true, data: signals });
});

// Intelligence sharing
app.post('/api/bridge/intelligence', async (req, res) => {
  const share = await bridgeService.shareIntelligence(req.body);
  res.status(201).json({ success: true, data: share });
});

// Audience sync
app.post('/api/bridge/audience/sync', async (req, res) => {
  await bridgeService.syncAudience(req.body);
  res.json({ success: true });
});

// Cross-app attribution
app.get('/api/bridge/attribution/:sessionId', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  const touchpoints = await bridgeService.getCrossAppTouchpoints(tenantId, req.params.sessionId);
  res.json({ success: true, data: touchpoints });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Bridge Error]', err);
  res.status(500).json({ success: false, error: err.message });
});

async function start() {
  await mongoose.connect(MONGODB_URI);
  console.log('[Hojai Bridge] MongoDB connected');
  app.listen(PORT, () => {
    console.log(`[Hojai Bridge] Running on port ${PORT}`);
  });
}

start().catch(console.error);
export default app;
