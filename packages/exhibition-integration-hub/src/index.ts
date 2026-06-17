import express from 'express';

const app = express();
const PORT = 5060;

app.use(express.json());

// Mock data
const webhooks = [
  { id: '1', name: 'Lead Capture', url: 'https://api.example.com/leads', events: ['lead.created', 'lead.updated'], active: true, lastTriggered: '2026-06-16T10:30:00Z' },
  { id: '2', name: 'Badge Scan', url: 'https://api.example.com/badges', events: ['badge.scanned'], active: true, lastTriggered: '2026-06-16T09:15:00Z' },
  { id: '3', name: 'Session Feedback', url: 'https://api.example.com/feedback', events: ['session.completed'], active: false, lastTriggered: null },
];

const webhookLogs = [
  { id: '1', webhookId: '1', event: 'lead.created', status: 'success', timestamp: '2026-06-16T10:30:00Z', responseCode: 200 },
  { id: '2', webhookId: '1', event: 'lead.updated', status: 'success', timestamp: '2026-06-16T10:25:00Z', responseCode: 200 },
  { id: '3', webhookId: '2', event: 'badge.scanned', status: 'failed', timestamp: '2026-06-16T09:15:00Z', responseCode: 500, error: 'Internal Server Error' },
];

const integrations = [
  { id: '1', name: 'Salesforce', status: 'connected', lastSync: '2026-06-16T10:00:00Z', recordsSynced: 1523 },
  { id: '2', name: 'HubSpot', status: 'connected', lastSync: '2026-06-16T09:45:00Z', recordsSynced: 892 },
  { id: '3', name: 'Mailchimp', status: 'disconnected', lastSync: null, recordsSynced: 0 },
];

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'exhibition-integration-hub', port: PORT });
});

// Get all webhooks
app.get('/api/webhooks', (req, res) => {
  const { active } = req.query;
  let filtered = webhooks;
  if (active !== undefined) {
    filtered = filtered.filter(w => w.active === (active === 'true'));
  }
  res.json({ success: true, data: filtered });
});

// Get webhook by ID
app.get('/api/webhooks/:id', (req, res) => {
  const webhook = webhooks.find(w => w.id === req.params.id);
  if (!webhook) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Webhook not found' } });
  }
  res.json({ success: true, data: webhook });
});

// Create webhook
app.post('/api/webhooks', (req, res) => {
  const newWebhook = {
    id: String(webhooks.length + 1),
    ...req.body,
    active: true,
    lastTriggered: null,
  };
  webhooks.push(newWebhook);
  res.status(201).json({ success: true, data: newWebhook });
});

// Update webhook
app.patch('/api/webhooks/:id', (req, res) => {
  const index = webhooks.findIndex(w => w.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Webhook not found' } });
  }
  webhooks[index] = { ...webhooks[index], ...req.body };
  res.json({ success: true, data: webhooks[index] });
});

// Delete webhook
app.delete('/api/webhooks/:id', (req, res) => {
  const index = webhooks.findIndex(w => w.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Webhook not found' } });
  }
  webhooks.splice(index, 1);
  res.json({ success: true, message: 'Webhook deleted' });
});

// Get webhook logs
app.get('/api/webhooks/:id/logs', (req, res) => {
  const logs = webhookLogs.filter(l => l.webhookId === req.params.id);
  res.json({ success: true, data: logs });
});

// Trigger webhook (for testing)
app.post('/api/webhooks/:id/trigger', (req, res) => {
  const webhook = webhooks.find(w => w.id === req.params.id);
  if (!webhook) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Webhook not found' } });
  }
  const log = {
    id: String(webhookLogs.length + 1),
    webhookId: webhook.id,
    event: 'test.trigger',
    status: 'success',
    timestamp: new Date().toISOString(),
    responseCode: 200,
  };
  webhookLogs.push(log);
  webhook.lastTriggered = log.timestamp;
  res.json({ success: true, data: log });
});

// Get integrations
app.get('/api/integrations', (req, res) => {
  res.json({ success: true, data: integrations });
});

// Get integration by ID
app.get('/api/integrations/:id', (req, res) => {
  const integration = integrations.find(i => i.id === req.params.id);
  if (!integration) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Integration not found' } });
  }
  res.json({ success: true, data: integration });
});

// Connect integration (mock)
app.post('/api/integrations/:id/connect', (req, res) => {
  const index = integrations.findIndex(i => i.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Integration not found' } });
  }
  integrations[index].status = 'connected';
  integrations[index].lastSync = new Date().toISOString();
  res.json({ success: true, data: integrations[index] });
});

// Disconnect integration
app.post('/api/integrations/:id/disconnect', (req, res) => {
  const index = integrations.findIndex(i => i.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Integration not found' } });
  }
  integrations[index].status = 'disconnected';
  res.json({ success: true, data: integrations[index] });
});

// Get all webhook logs
app.get('/api/logs', (req, res) => {
  const { status } = req.query;
  let filtered = webhookLogs;
  if (status) filtered = filtered.filter(l => l.status === status);
  res.json({ success: true, data: filtered });
});

// Analytics
app.get('/api/analytics', (req, res) => {
  const analytics = {
    totalWebhooks: webhooks.length,
    activeWebhooks: webhooks.filter(w => w.active).length,
    totalIntegrations: integrations.length,
    connectedIntegrations: integrations.filter(i => i.status === 'connected').length,
    webhookSuccessRate: `${Math.round((webhookLogs.filter(l => l.status === 'success').length / webhookLogs.length) * 100)}%`,
    recentTriggers: webhookLogs.length,
    eventsByType: webhookLogs.reduce((acc, log) => {
      acc[log.event] = (acc[log.event] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  };
  res.json({ success: true, data: analytics });
});

app.listen(PORT, () => {
  console.log(`Exhibition Integration Hub running on port ${PORT}`);
});

export default app;
