/**
 * SiteOS Gateway - Unified entry point connecting widget to all RTMN services
 *
 * Port: 5450
 * Purpose: Glue layer that routes widget requests to existing RTMN services
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const siteosRoutes = require('./routes/siteos');
const {
  MEMORY_OS_URL,
  CUSTOMER_TWIN_URL,
  ORDER_TWIN_URL,
  WALLET_TWIN_URL,
  AGENT_OS_URL,
  SALES_OS_URL,
  MARKETING_OS_URL,
  CUSTOMER_SUCCESS_OS_URL,
  FLOW_OS_URL,
  GENIE_URL,
  CXO_OS_URL,
  VOICE_GATEWAY_URL,
  WIDGET_BACKEND_URL,
  ANALYTICS_URL,
  NEXHA_DISCOVERY_URL,
  NEXHA_REPUTATION_URL,
  HOJAI_API_KEY
} = require('./config');

const app = express();
const PORT = process.env.SITEOS_GATEWAY_PORT || 5450;

// Service URL configuration
const SERVICES = {
  WIDGET_BACKEND: WIDGET_BACKEND_URL || 'http://localhost:5380',
  MEMORY_OS: MEMORY_OS_URL || 'http://localhost:4703',
  CUSTOMER_TWIN: CUSTOMER_TWIN_URL || 'http://localhost:4895',
  ORDER_TWIN: ORDER_TWIN_URL || 'http://localhost:4885',
  WALLET_TWIN: WALLET_TWIN_URL || 'http://localhost:4896',
  AGENT_OS: AGENT_OS_URL || 'http://localhost:4802',
  SALES_OS: SALES_OS_URL || 'http://localhost:5055',
  MARKETING_OS: MARKETING_OS_URL || 'http://localhost:5500',
  CUSTOMER_SUCCESS_OS: CUSTOMER_SUCCESS_OS_URL || 'http://localhost:4050',
  FLOW_OS: FLOW_OS_URL || 'http://localhost:7007',
  GENIE: GENIE_URL || 'http://localhost:4701',
  CXO_OS: CXO_OS_URL || 'http://localhost:5100',
  VOICE_GATEWAY: VOICE_GATEWAY_URL || 'http://localhost:4880',
  ANALYTICS: ANALYTICS_URL || 'http://localhost:4750',
  NEXHA_DISCOVERY: NEXHA_DISCOVERY_URL || 'http://localhost:4272',
  NEXHA_REPUTATION: NEXHA_REPUTATION_URL || 'http://localhost:4271'
};

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'siteos-gateway',
    version: '1.0.0',
    port: PORT,
    timestamp: new Date().toISOString(),
    services: Object.keys(SERVICES)
  });
});

// Readiness check
app.get('/ready', async (req, res) => {
  try {
    const { checkServiceHealth } = require('./service-clients');
    const healthResults = {};

    // Check critical services
    const criticalServices = ['MEMORY_OS', 'CUSTOMER_TWIN', 'AGENT_OS'];

    for (const service of criticalServices) {
      try {
        healthResults[service] = await checkServiceHealth(SERVICES[service]);
      } catch (e) {
        healthResults[service] = { healthy: false, error: e.message };
      }
    }

    const allHealthy = Object.values(healthResults).every(r => r.healthy);

    res.status(allHealthy ? 200 : 503).json({
      ready: allHealthy,
      serviceHealth: healthResults
    });
  } catch (err) {
    res.status(503).json({ ready: false, error: err.message });
  }
});

// Mount SiteOS routes
app.use('/api/siteos', siteosRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path,
    method: req.method
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Start server
app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('SiteOS Gateway - Unified Widget Entry Point');
  console.log('='.repeat(60));
  console.log(`Listening on port: ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('\nConnected services:');
  Object.entries(SERVICES).forEach(([name, url]) => {
    console.log(`  ${name}: ${url}`);
  });
  console.log('='.repeat(60));
});

module.exports = app;
