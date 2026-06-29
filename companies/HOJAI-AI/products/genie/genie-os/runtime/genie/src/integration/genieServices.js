/**
 * Genie Services Integration — Wires all 14 Genie services to Genie OS Runtime
 *
 * This file adds routes for all 14 new Genie services to the existing
 * genie-os runtime at port 7100. Each service is mounted at /api/genie/<service>/*
 *
 * Usage in genie-os runtime/genie/src/index.js:
 *   import { mountGenieServices } from './integration/genieServices.js';
 *   mountGenieServices(app);
 */

import axios from 'axios';

const SERVICE_URLS = {
  decisionIntelligence: process.env.DECISION_INTELLIGENCE_URL || 'http://localhost:4740',
  learningLoop: process.env.LEARNING_LOOP_URL || 'http://localhost:4742',
  anticipation: process.env.ANTICIPATION_URL || 'http://localhost:4745',
  ambient: process.env.AMBIENT_URL || 'http://localhost:4746',
  constitution: process.env.CONSTITUTION_URL || 'http://localhost:4743',
  financialLife: process.env.FINANCIAL_LIFE_URL || 'http://localhost:4747',
  healthIntel: process.env.HEALTH_URL || 'http://localhost:4748',
  household: process.env.HOUSEHOLD_URL || 'http://localhost:4749',
  travel: process.env.TRAVEL_URL || 'http://localhost:4750',
  spiritual: process.env.SPIRITUAL_URL || 'http://localhost:4751',
  lifeSimulation: process.env.LIFE_SIMULATION_URL || 'http://localhost:4752',
  focus: process.env.FOCUS_URL || 'http://localhost:4753',
  dreams: process.env.DREAMS_URL || 'http://localhost:4754',
  legacy: process.env.LEGACY_URL || 'http://localhost:4755',
};

const SERVICE_META = [
  { name: 'Decision Intelligence', prefix: '/decisions', url: SERVICE_URLS.decisionIntelligence, port: 4740 },
  { name: 'Learning Loop', prefix: '/learning', url: SERVICE_URLS.learningLoop, port: 4742 },
  { name: 'Anticipation', prefix: '/anticipation', url: SERVICE_URLS.anticipation, port: 4745 },
  { name: 'Ambient', prefix: '/ambient', url: SERVICE_URLS.ambient, port: 4746 },
  { name: 'Constitution', prefix: '/constitution', url: SERVICE_URLS.constitution, port: 4743 },
  { name: 'Financial Life', prefix: '/financial', url: SERVICE_URLS.financialLife, port: 4747 },
  { name: 'Health Intelligence', prefix: '/health-intel', url: SERVICE_URLS.healthIntel, port: 4748 },
  { name: 'Household', prefix: '/household', url: SERVICE_URLS.household, port: 4749 },
  { name: 'Travel', prefix: '/travel', url: SERVICE_URLS.travel, port: 4750 },
  { name: 'Spiritual', prefix: '/spiritual', url: SERVICE_URLS.spiritual, port: 4751 },
  { name: 'Life Simulation', prefix: '/simulation', url: SERVICE_URLS.lifeSimulation, port: 4752 },
  { name: 'Focus', prefix: '/focus', url: SERVICE_URLS.focus, port: 4753 },
  { name: 'Dreams', prefix: '/dreams', url: SERVICE_URLS.dreams, port: 4754 },
  { name: 'Legacy', prefix: '/legacy', url: SERVICE_URLS.legacy, port: 4755 },
];

async function proxyRequest(req, res, serviceUrl, prefix) {
  try {
    const strippedUrl = req.originalUrl.replace(`/api/genie${prefix}`, '') || '/';
    const targetUrl = `${serviceUrl}${strippedUrl}`;

    const response = await axios({
      method: req.method,
      url: targetUrl,
      data: req.body,
      params: req.query,
      headers: {
        'x-internal-token': process.env.INTERNAL_SERVICE_TOKEN || '',
        'content-type': 'application/json',
      },
      timeout: 15000,
      validateStatus: () => true,
    });

    res.status(response.status).json(response.data);
  } catch (error) {
    console.error(`[genie-services] ${req.method} ${req.originalUrl} failed: ${error.message}`);
    res.status(502).json({
      success: false,
      error: { code: 'DOWNSTREAM', message: 'Service unavailable' },
      meta: { timestamp: new Date().toISOString() },
    });
  }
}

export function mountGenieServices(app) {
  // Mount each service
  for (const svc of SERVICE_META) {
    // Catch both /api/genie/<prefix>/* and /api/genie/<prefix>
    app.use(`/api/genie${svc.prefix}`, (req, res) => proxyRequest(req, res, svc.url, svc.prefix));
    app.use(`/api/genie${svc.prefix}/*`, (req, res) => proxyRequest(req, res, svc.url, svc.prefix));
  }

  // Status endpoint — returns all 14 service statuses
  app.get('/api/genie-services/all/status', async (req, res) => {
    const checks = await Promise.all(
      SERVICE_META.map(async (svc) => {
        try {
          const response = await axios.get(`${svc.url}/health`, {
            timeout: 3000,
            validateStatus: () => true,
          });
          return {
            name: svc.name,
            prefix: svc.prefix,
            port: svc.port,
            url: svc.url,
            healthy: response.status === 200,
            status: response.status,
          };
        } catch (e) {
          return {
            name: svc.name,
            prefix: svc.prefix,
            port: svc.port,
            url: svc.url,
            healthy: false,
            error: e.message,
          };
        }
      })
    );

    const summary = {
      total: checks.length,
      healthy: checks.filter(c => c.healthy).length,
      unhealthy: checks.filter(c => !c.healthy).length,
      allHealthy: checks.every(c => c.healthy),
      services: checks,
    };

    res.json(summary);
  });

  console.log(`[genie-services] Mounted ${SERVICE_META.length} service routers at /api/genie/*`);
}

export { SERVICE_META, SERVICE_URLS };