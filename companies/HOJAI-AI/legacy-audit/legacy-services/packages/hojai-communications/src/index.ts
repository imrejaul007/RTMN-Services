import express from 'express';
import mongoose from 'mongoose';
import { communicationsService } from './services/notificationService.js';
import { Channel } from './types/index.js';

const app = express();
app.use(express.json({ limit: "10kb" }));

const PORT = process.env.PORT || 4590;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai-communications';

app.get('/health', (req, res) => res.json({ status: 'healthy', service: 'hojai-communications' }));

// Send message
app.post('/api/messages', async (req, res) => {
  const message = await communicationsService.sendMessage({
    tenantId: req.headers['x-tenant-id'] as string,
    ...req.body
  });
  res.status(201).json({ success: true, data: message });
});

// Webhook (from providers)
app.post('/api/webhooks/:channel', async (req, res) => {
  const { channel } = req.params;
  const { externalId, status, metadata } = req.body;

  await communicationsService.handleWebhook({
    tenantId: req.headers['x-tenant-id'] as string,
    channel: channel as Channel,
    externalId,
    event: status,
    metadata
  });

  res.sendStatus(200);
});

// Templates
app.post('/api/templates', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  const template = await communicationsService.createTemplate({ ...req.body, tenantId });
  res.status(201).json({ success: true, data: template });
});

app.get('/api/templates', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  const templates = await communicationsService.getTemplates(tenantId, req.query.channel as Channel);
  res.json({ success: true, data: templates });
});

// Campaigns
app.post('/api/campaigns', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  const campaign = await communicationsService.createCampaign({ ...req.body, tenantId });
  res.status(201).json({ success: true, data: campaign });
});

app.get('/api/campaigns', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  const CampaignModel = mongoose.model('Campaign');
  const campaigns = await CampaignModel.find({ tenantId }).sort({ createdAt: -1 });
  res.json({ success: true, data: campaigns });
});

app.get('/api/campaigns/:id', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  const CampaignModel = mongoose.model('Campaign');
  const campaign = await CampaignModel.findOne({ _id: req.params.id, tenantId });
  if (!campaign) {
    return res.status(404).json({ success: false, error: 'Campaign not found' });
  }
  res.json({ success: true, data: campaign });
});

app.post('/api/campaigns/:id/execute', async (req, res) => {
  try {
    const result = await communicationsService.executeCampaign(req.params.id);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('[Campaign] Execution failed:', error);
    res.status(500).json({ success: false, error: String(error) });
  }
});

app.get('/api/campaigns/:id/stats', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  const stats = await communicationsService.getCampaignStats(tenantId, req.params.id);
  res.json({ success: true, data: stats });
});

// Process scheduled messages (for cron job)
app.post('/api/messages/process-scheduled', async (req, res) => {
  try {
    const result = await communicationsService.processScheduledMessages();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

async function start() {
  await mongoose.connect(MONGODB_URI);
  app.listen(PORT, () => console.log(`[Hojai Communications] Running on port ${PORT}`));
}

start().catch(console.error);
export default app;
