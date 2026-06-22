/**
 * CorpPerks Integration Routes
 * Health monitoring, OAuth, Webhooks
 */

const express = require('express');
const router = express.Router();

// Integration status store
const integrationsStatus = {
  makcorps: { provider: 'makcorps', connected: true, lastSync: new Date().toISOString(), healthy: true },
  nextabizz: { provider: 'nextabizz', connected: true, lastSync: new Date().toISOString(), healthy: true },
  hris: { provider: 'hris', connected: false, lastSync: null, healthy: false },
  finance: { provider: 'finance', connected: true, lastSync: new Date().toISOString(), healthy: true },
  wallet: { provider: 'wallet', connected: true, lastSync: new Date().toISOString(), healthy: true },
  notification: { provider: 'notification', connected: true, lastSync: new Date().toISOString(), healthy: true },
};

// Auth middleware
const requireAuth = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  next();
};

// GET /api/integrations/health
router.get('/health', (req, res) => {
  const health = Object.values(integrationsStatus).map(i => ({
    ...i,
    issues: i.healthy ? [] : [`${i.provider} connection issue`],
  }));

  const allHealthy = health.every(i => i.healthy);

  res.json({
    success: true,
    data: {
      status: allHealthy ? 'healthy' : 'degraded',
      services: health,
      checkedAt: new Date().toISOString(),
    }
  });
});

// GET /api/integrations/health/:provider
router.get('/health/:provider', (req, res) => {
  const integration = integrationsStatus[req.params.provider];
  if (!integration) return res.status(404).json({ success: false, message: 'Provider not found' });

  res.json({
    success: true,
    data: {
      ...integration,
      issues: integration.healthy ? [] : [`${integration.provider} connection issue`],
    }
  });
});

// GET /api/integrations/:provider/status
router.get('/:provider/status', (req, res) => {
  const integration = integrationsStatus[req.params.provider];
  if (!integration) return res.status(404).json({ success: false, message: 'Provider not found' });

  res.json({
    success: true,
    data: {
      connected: integration.connected,
      healthy: integration.healthy,
      lastSync: integration.lastSync,
    }
  });
});

// POST /api/integrations/:provider/connect
router.post('/:provider/connect', requireAuth, (req, res) => {
  const { provider } = req.params;
  const { apiKey, clientId, clientSecret } = req.body;

  // Simulate connection
  if (!apiKey && !clientId) {
    return res.status(400).json({ success: false, message: 'API key or client ID required' });
  }

  integrationsStatus[provider] = {
    provider,
    connected: true,
    lastSync: new Date().toISOString(),
    healthy: true,
    config: { apiKey: apiKey ? '***' : null, clientId },
  };

  res.json({
    success: true,
    data: {
      message: `Connected to ${provider}`,
      integration: integrationsStatus[provider],
    }
  });
});

// POST /api/integrations/:provider/disconnect
router.post('/:provider/disconnect', requireAuth, (req, res) => {
  const { provider } = req.params;

  if (!integrationsStatus[provider]) {
    return res.status(404).json({ success: false, message: 'Provider not found' });
  }

  integrationsStatus[provider] = {
    provider,
    connected: false,
    lastSync: integrationsStatus[provider].lastSync,
    healthy: false,
  };

  res.json({ success: true, message: `Disconnected from ${provider}` });
});

// POST /api/integrations/:provider/check
router.post('/:provider/check', requireAuth, async (req, res) => {
  const { provider } = req.params;

  // Simulate health check
  await new Promise(resolve => setTimeout(resolve, 500));

  if (integrationsStatus[provider]) {
    integrationsStatus[provider].lastSync = new Date().toISOString();
    integrationsStatus[provider].healthy = Math.random() > 0.1; // 90% healthy
  }

  res.json({
    success: true,
    data: {
      healthy: true,
      responseTime: Math.floor(Math.random() * 200) + 50,
      checkedAt: new Date().toISOString(),
    }
  });
});

// ============ OAUTH ROUTES ============

// GET /api/integrations/:provider/connect-oauth
router.get('/:provider/connect-oauth', (req, res) => {
  const { provider } = req.params;
  const redirectUri = `${process.env.CORP_API_URL}/api/integrations/${provider}/callback`;

  const oauthUrls = {
    makcorps: `https://api.makcorps.com/oauth/authorize?client_id=${process.env.MAKCORPS_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code`,
    nextabizz: `https://api.nextabizz.com/oauth/authorize?client_id=${process.env.NEXTABIZZ_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code`,
    hris: `https://api.hris.com/oauth/authorize?client_id=${process.env.HRIS_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code`,
  };

  if (!oauthUrls[provider]) {
    return res.status(404).json({ success: false, message: 'OAuth not supported for this provider' });
  }

  res.json({ success: true, data: { url: oauthUrls[provider] } });
});

// GET /api/integrations/:provider/callback
router.get('/:provider/callback', (req, res) => {
  const { provider, code } = req.params;

  // In production, exchange code for token
  integrationsStatus[provider] = {
    provider,
    connected: true,
    lastSync: new Date().toISOString(),
    healthy: true,
  };

  // Redirect to admin dashboard
  res.redirect('/corp-integrations?connected=true');
});

// ============ WEBHOOK ROUTES ============

// POST /api/integrations/makcorps/webhook
router.post('/makcorps/webhook', (req, res) => {
  const { event, data } = req.body;
  logger.info([Webhook] Makcorps: ${event}`, data);

  if (event === 'booking.confirmed') {
    // Handle booking confirmation
  } else if (event === 'booking.cancelled') {
    // Handle booking cancellation
  }

  res.json({ success: true, received: true });
});

// POST /api/integrations/nextabizz/webhook
router.post('/nextabizz/webhook', (req, res) => {
  const { event, data } = req.body;
  logger.info([Webhook] NextaBizz: ${event}`, data);

  if (event === 'order.confirmed') {
    // Handle order confirmation
  } else if (event === 'order.shipped') {
    // Handle shipment
  }

  res.json({ success: true, received: true });
});

// POST /api/integrations/hris/webhook
router.post('/hris/webhook', (req, res) => {
  const { event, data } = req.body;
  logger.info([Webhook] HRIS: ${event}`, data);

  if (event === 'employee.added') {
    // Auto-enroll employee
  } else if (event === 'employee.departed') {
    // Suspend employee
  }

  res.json({ success: true, received: true });
});

// POST /api/integrations/finance/webhook
router.post('/finance/webhook', (req, res) => {
  const { event, data } = req.body;
  logger.info([Webhook] Finance: ${event}`, data);

  res.json({ success: true, received: true });
});

module.exports = router;
