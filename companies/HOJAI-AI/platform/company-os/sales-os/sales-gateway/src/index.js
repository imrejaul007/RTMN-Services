/**
 * SalesOS + CustomerJourneyOS Unified Gateway
 *
 * Version: 2.0.0
 * Port: 5055
 *
 * Provides unified access to all SalesOS and CustomerJourneyOS services:
 * - SalesOS Core (port 5055)
 * - CustomerSuccessOS (port 4050)
 * - Customer Intelligence Gateway (port 4896)
 * - Twin Platform
 * - AI Workforce
 * - SiteOS CRM (port 5484)
 * - SiteOS Pipeline (port 5485)
 * - Engagement Hub
 * - Conversation Intelligence
 * - Journey Engine
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 5055;

// Service URLs
const SERVICES = {
  salesOs: process.env.SALES_OS_URL || 'http://localhost:5055',
  customerSuccessOs: process.env.CUSTOMER_SUCCESS_URL || 'http://localhost:4050',
  customerIntelligence: process.env.CUSTOMER_INTEL_URL || 'http://localhost:4896',
  twinPlatform: process.env.TWIN_PLATFORM_URL || 'http://localhost:5056',
  aiWorkforce: process.env.AI_WORKFORCE_URL || 'http://localhost:5057',
  siteosCrm: process.env.SITEOS_CRM_URL || 'http://localhost:5484',
  siteosPipeline: process.env.SITEOS_PIPELINE_URL || 'http://localhost:5485',
  twinOsHub: process.env.TWIN_OS_URL || 'http://localhost:4705',
  memoryOs: process.env.MEMORY_OS_URL || 'http://localhost:4703',
  agentOs: process.env.AGENT_OS_URL || 'http://localhost:4802',
  sutarOs: process.env.SUTAR_OS_URL || 'http://localhost:4140',
  engagement: process.env.ENGAGEMENT_URL || 'http://localhost:5058',
  conversation: process.env.CONVERSATION_URL || 'http://localhost:5059',
  journeys: process.env.JOURNEYS_URL || 'http://localhost:5060',
  command: process.env.COMMAND_URL || 'http://localhost:5061',
  experimentation: process.env.EXPERIMENTATION_URL || 'http://localhost:5062',
};

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.use(cors());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json());

// Request ID middleware
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
});

// ============================================================
// HEALTH & STATUS
// ============================================================

app.get('/health', async (req, res) => {
  const services = await checkServices();
  const allHealthy = Object.values(services).every(s => s.status === 'up');

  res.json({
    status: allHealthy ? 'healthy' : 'degraded',
    service: 'SalesOS Gateway',
    version: '2.0.0',
    port: PORT,
    timestamp: new Date().toISOString(),
    services,
    uptime: process.uptime(),
  });
});

app.get('/ready', async (req, res) => {
  const services = await checkServices();
  const criticalServices = ['salesOs', 'customerIntelligence'];
  const ready = criticalServices.every(s => services[s]?.status === 'up');

  res.status(ready ? 200 : 503).json({ ready, services });
});

app.get('/status', (req, res) => {
  res.json({
    gateway: 'SalesOS Gateway v2.0.0',
    services: {
      salesOs: SERVICES.salesOs,
      customerSuccessOs: SERVICES.customerSuccessOs,
      customerIntelligence: SERVICES.customerIntelligence,
    },
    routes: {
      crm: '/crm/*',
      customerSuccess: '/cs/*',
      twins: '/twins/*',
      workers: '/workers/*',
      intelligence: '/intelligence/*',
      engagement: '/engagement/*',
      conversations: '/conversations/*',
      journeys: '/journeys/*',
      command: '/command/*',
    },
    timestamp: new Date().toISOString(),
  });
});

// ============================================================
// DASHBOARD
// ============================================================

app.get('/dashboard', async (req, res) => {
  try {
    const [salesDashboard, twinsDashboard, workersStats, intelStats] = await Promise.allSettled([
      fetch(`${SERVICES.salesOs}/api/dashboard`).then(r => r?.json()).catch(() => null),
      fetch(`${SERVICES.twinPlatform}/dashboard`).then(r => r?.json()).catch(() => null),
      fetch(`${SERVICES.aiWorkforce}/stats`).then(r => r?.json()).catch(() => null),
      fetch(`${SERVICES.customerIntelligence}/api/stats`).then(r => r?.json()).catch(() => null),
    ]);

    res.json({
      dashboard: 'SalesOS + CustomerJourneyOS Unified',
      timestamp: new Date().toISOString(),
      sales: salesDashboard.status === 'fulfilled' ? salesDashboard.value : null,
      twins: twinsDashboard.status === 'fulfilled' ? twinsDashboard.value : null,
      workers: workersStats.status === 'fulfilled' ? workersStats.value : null,
      intelligence: intelStats.status === 'fulfilled' ? intelStats.value : null,
      services: {
        salesOs: servicesStatus.salesOs,
        customerSuccess: servicesStatus.customerSuccess,
        intelligence: servicesStatus.intelligence,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Dashboard aggregation failed', details: error.message });
  }
});

// ============================================================
// CRM ROUTES (→ SalesOS Core)
// ============================================================

app.use('/crm', createProxyMiddleware({
  target: SERVICES.salesOs,
  changeOrigin: true,
  pathRewrite: { '^/crm': '/api' },
  onError: (err, req, res) => {
    console.error('CRM Proxy Error:', err.message);
    res.status(502).json({ error: 'SalesOS unavailable', message: err.message });
  },
}));

// ============================================================
// CUSTOMER SUCCESS ROUTES (→ CustomerSuccessOS)
// ============================================================

app.use('/cs', createProxyMiddleware({
  target: SERVICES.customerSuccessOs,
  changeOrigin: true,
  pathRewrite: { '^/cs': '/api' },
  onError: (err, req, res) => {
    console.error('CS Proxy Error:', err.message);
    res.status(502).json({ error: 'CustomerSuccessOS unavailable', message: err.message });
  },
}));

// ============================================================
// TWIN ROUTES
// ============================================================

app.use('/twins/customers', createProxyMiddleware({
  target: SERVICES.twinPlatform,
  changeOrigin: true,
  onError: (err, req, res) => {
    res.status(502).json({ error: 'Twin Platform unavailable', message: err.message });
  },
}));

app.use('/twins/accounts', createProxyMiddleware({
  target: SERVICES.twinPlatform,
  changeOrigin: true,
  onError: (err, req, res) => {
    res.status(502).json({ error: 'Twin Platform unavailable', message: err.message });
  },
}));

app.use('/twins/opportunities', createProxyMiddleware({
  target: SERVICES.twinPlatform,
  changeOrigin: true,
  onError: (err, req, res) => {
    res.status(502).json({ error: 'Twin Platform unavailable', message: err.message });
  },
}));

app.use('/twins/revenue', createProxyMiddleware({
  target: SERVICES.twinPlatform,
  changeOrigin: true,
  onError: (err, req, res) => {
    res.status(502).json({ error: 'Twin Platform unavailable', message: err.message });
  },
}));

// ============================================================
// WORKER ROUTES (→ AI Workforce)
// ============================================================

app.use('/workers', createProxyMiddleware({
  target: SERVICES.aiWorkforce,
  changeOrigin: true,
  onError: (err, req, res) => {
    res.status(502).json({ error: 'AI Workforce unavailable', message: err.message });
  },
}));

// ============================================================
// INTELLIGENCE ROUTES (→ Customer Intelligence)
// ============================================================

app.use('/intelligence', createProxyMiddleware({
  target: SERVICES.customerIntelligence,
  changeOrigin: true,
  pathRewrite: { '^/intelligence': '/api' },
  onError: (err, req, res) => {
    res.status(502).json({ error: 'Customer Intelligence unavailable', message: err.message });
  },
}));

// ============================================================
// SITEOS ROUTES
// ============================================================

app.use('/siteos/crm', createProxyMiddleware({
  target: SERVICES.siteosCrm,
  changeOrigin: true,
  onError: (err, req, res) => {
    res.status(502).json({ error: 'SiteOS CRM unavailable', message: err.message });
  },
}));

app.use('/siteos/pipeline', createProxyMiddleware({
  target: SERVICES.siteosPipeline,
  changeOrigin: true,
  onError: (err, req, res) => {
    res.status(502).json({ error: 'SiteOS Pipeline unavailable', message: err.message });
  },
}));

// ============================================================
// ENGAGEMENT ROUTES (→ Sales Engagement Hub)
// ============================================================

app.use('/engagement', createProxyMiddleware({
  target: SERVICES.engagement,
  changeOrigin: true,
  onError: (err, req, res) => {
    // Fallback to placeholder if service not available
    res.status(200).json({
      status: 'service_unavailable',
      message: 'Engagement service not yet started',
      placeholder: true,
    });
  },
}));

// ============================================================
// CONVERSATION ROUTES (→ Conversation Intelligence)
// ============================================================

app.use('/conversations', createProxyMiddleware({
  target: SERVICES.conversation,
  changeOrigin: true,
  onError: (err, req, res) => {
    res.status(200).json({
      status: 'service_unavailable',
      message: 'Conversation Intelligence not yet started',
      placeholder: true,
    });
  },
}));

// ============================================================
// JOURNEY ROUTES (→ Journey Engine)
// ============================================================

app.use('/journeys', createProxyMiddleware({
  target: SERVICES.journeys,
  changeOrigin: true,
  onError: (err, req, res) => {
    res.status(200).json({
      status: 'service_unavailable',
      message: 'Journey Engine not yet started',
      placeholder: true,
    });
  },
}));

// ============================================================
// COMMAND CENTER ROUTES
// ============================================================

app.use('/command', createProxyMiddleware({
  target: SERVICES.command,
  changeOrigin: true,
  onError: (err, req, res) => {
    res.status(200).json({
      status: 'service_unavailable',
      message: 'Command Center not yet started',
      placeholder: true,
    });
  },
}));

// ============================================================
// EXPERIMENTATION ROUTES
// ============================================================

app.use('/experiments', createProxyMiddleware({
  target: SERVICES.experimentation,
  changeOrigin: true,
  onError: (err, req, res) => {
    res.status(200).json({
      status: 'service_unavailable',
      message: 'ExperimentationOS not yet started',
      placeholder: true,
    });
  },
}));

// ============================================================
// TWINOS HUB DIRECT ACCESS
// ============================================================

app.use('/twinos', createProxyMiddleware({
  target: SERVICES.twinOsHub,
  changeOrigin: true,
  onError: (err, req, res) => {
    res.status(502).json({ error: 'TwinOS Hub unavailable', message: err.message });
  },
}));

// ============================================================
// MEMORYOS DIRECT ACCESS
// ============================================================

app.use('/memory', createProxyMiddleware({
  target: SERVICES.memoryOs,
  changeOrigin: true,
  onError: (err, req, res) => {
    res.status(502).json({ error: 'MemoryOS unavailable', message: err.message });
  },
}));

// ============================================================
// AGENTOS DIRECT ACCESS
// ============================================================

app.use('/agentos', createProxyMiddleware({
  target: SERVICES.agentOs,
  changeOrigin: true,
  onError: (err, req, res) => {
    res.status(502).json({ error: 'AgentOS unavailable', message: err.message });
  },
}));

// ============================================================
// SUTAR OS DIRECT ACCESS
// ============================================================

app.use('/sutar', createProxyMiddleware({
  target: SERVICES.sutarOs,
  changeOrigin: true,
  onError: (err, req, res) => {
    res.status(502).json({ error: 'SUTAR OS unavailable', message: err.message });
  },
}));

// ============================================================
// ERROR HANDLING
// ============================================================

app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
    method: req.method,
    suggestion: 'Check /status for available routes',
  });
});

app.use((err, req, res, next) => {
  console.error('Gateway Error:', err);
  res.status(500).json({
    error: 'Internal Gateway Error',
    requestId: req.id,
    message: err.message,
  });
});

// ============================================================
// HELPERS
// ============================================================

const servicesStatus = {
  salesOs: 'unknown',
  customerSuccess: 'unknown',
  intelligence: 'unknown',
};

async function checkServices() {
  const results = {};

  const checks = [
    { name: 'salesOs', url: `${SERVICES.salesOs}/health` },
    { name: 'customerSuccess', url: `${SERVICES.customerSuccessOs}/health` },
    { name: 'intelligence', url: `${SERVICES.customerIntelligence}/health` },
    { name: 'twinPlatform', url: `${SERVICES.twinPlatform}/health` },
    { name: 'aiWorkforce', url: `${SERVICES.aiWorkforce}/health` },
    { name: 'siteosCrm', url: `${SERVICES.siteosCrm}/health` },
    { name: 'siteosPipeline', url: `${SERVICES.siteosPipeline}/health` },
  ];

  const promises = checks.map(async ({ name, url }) => {
    try {
      const response = await fetch(url, { timeout: 2000 });
      const status = response.ok ? 'up' : 'down';
      servicesStatus[name] = status;
      return { name, status, latency: Date.now() - start };
    } catch (error) {
      servicesStatus[name] = 'down';
      return { name, status: 'down', error: error.message };
    }
  });

  const start = Date.now();
  const statuses = await Promise.all(promises);

  statuses.forEach(s => {
    results[s.name] = { status: s.status };
    if (s.error) results[s.name].error = s.error;
  });

  return results;
}

// ============================================================
// START
// ============================================================

const server = app.listen(PORT, () => {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         SalesOS + CustomerJourneyOS Gateway v2.0          ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║  Port: ${PORT}                                            ║`);
  console.log('║                                                            ║');
  console.log('║  Routes:                                                   ║');
  console.log('║    /health          - Health check                         ║');
  console.log('║    /dashboard       - Unified dashboard                   ║');
  console.log('║    /crm/*          - SalesOS Core                        ║');
  console.log('║    /cs/*           - CustomerSuccessOS                    ║');
  console.log('║    /twins/*        - Twin Platform                        ║');
  console.log('║    /workers/*      - AI Workforce                        ║');
  console.log('║    /intelligence/*  - Customer Intelligence               ║');
  console.log('║    /engagement/*   - Sales Engagement                    ║');
  console.log('║    /conversations/* - Conversation Intelligence          ║');
  console.log('║    /journeys/*     - Journey Engine                      ║');
  console.log('║    /command/*      - Command Center                     ║');
  console.log('║    /experiments/*  - ExperimentationOS                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
});

module.exports = app;
