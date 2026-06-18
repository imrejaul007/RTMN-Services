/**
 * Customer Success routes for Unified Hub
 */

const axios = require('axios');
const CS_SERVICE_URL = process.env.CUSTOMER_SUCCESS_URL || 'http://localhost:4050';

const client = axios.create({
  baseURL: CS_SERVICE_URL,
  timeout: 8000,
  headers: { 'Content-Type': 'application/json' }
});

// ============================================
// CUSTOMER SUCCESS ROUTES
// ============================================

module.exports = (app) => {
  // Customer Success Management
  app.get('/api/cs/:path(*)', async (req, res) => {
    try {
      const response = await client.get(req.params.path, { params: req.query });
      res.json({ success: true, ...response.data });
    } catch (error) {
      res.json({ success: false, error: error.message, service: 'customer-success-os' });
    }
  });

  app.post('/api/cs/:path(*)', async (req, res) => {
    try {
      const response = await client.post(req.params.path, req.body);
      res.json({ success: true, ...response.data });
    } catch (error) {
      res.json({ success: false, error: error.message, service: 'customer-success-os' });
    }
  });

  // Customer Success Core Routes
  app.get('/api/customers', async (req, res) => {
    try {
      const response = await client.get('/api/customers');
      res.json({ success: true, ...response.data });
    } catch (error) {
      res.json({ success: false, error: error.message, service: 'customer-success-os' });
    }
  });

  app.post('/api/customers', async (req, res) => {
    try {
      const response = await client.post('/api/customers', req.body);
      res.json({ success: true, ...response.data });
    } catch (error) {
      res.json({ success: false, error: error.message, service: 'customer-success-os' });
    }
  });

  app.patch('/api/customers/:id/lifecycle', async (req, res) => {
    try {
      const response = await client.patch(`/api/customers/${req.params.id}/lifecycle`, req.body);
      res.json({ success: true, ...response.data });
    } catch (error) {
      res.json({ success: false, error: error.message, service: 'customer-success-os' });
    }
  });

  // Onboarding Journeys
  app.post('/api/journeys', async (req, res) => {
    try {
      const response = await client.post('/api/journeys', req.body);
      res.json({ success: true, ...response.data });
    } catch (error) {
      res.json({ success: false, error: error.message, service: 'customer-success-os' });
    }
  });

  app.post('/api/journeys/:id/tasks', async (req, res) => {
    try {
      const response = await client.post(`/api/journeys/${req.params.id}/tasks`, req.body);
      res.json({ success: true, ...response.data });
    } catch (error) {
      res.json({ success: false, error: error.message, service: 'customer-success-os' });
    }
  });

  // NPS Surveys
  app.post('/api/nps/send', async (req, res) => {
    try {
      const response = await client.post('/api/nps/send', req.body);
      res.json({ success: true, ...response.data });
    } catch (error) {
      res.json({ success: false, error: error.message, service: 'customer-success-os' });
    }
  });

  app.post('/api/nps/:id/respond', async (req, res) => {
    try {
      const response = await client.post(`/api/nps/${req.params.id}/respond`, req.body);
      res.json({ success: true, ...response.data });
    } catch (error) {
      res.json({ success: false, error: error.message, service: 'customer-success-os' });
    }
  });

  // Health Scores
  app.get('/api/health/:customerId', async (req, res) => {
    try {
      const response = await client.get(`/api/health/${req.params.customerId}`);
      res.json({ success: true, ...response.data });
    } catch (error) {
      res.json({ success: false, error: error.message, service: 'customer-success-os' });
    }
  });

  // Churn Prediction
  app.get('/api/churn/predictions', async (req, res) => {
    try {
      const response = await client.get('/api/churn/predictions');
      res.json({ success: true, ...response.data });
    } catch (error) {
      res.json({ success: false, error: error.message, service: 'customer-success-os' });
    }
  });

  app.post('/api/churn/:customerId/predict', async (req, res) => {
    try {
      const response = await client.post(`/api/churn/${req.params.customerId}/predict`);
      res.json({ success: true, ...response.data });
    } catch (error) {
      res.json({ success: false, error: error.message, service: 'customer-success-os' });
    }
  });

  // Check-ins
  app.post('/api/checkins', async (req, res) => {
    try {
      const response = await client.post('/api/checkins', req.body);
      res.json({ success: true, ...response.data });
    } catch (error) {
      res.json({ success: false, error: error.message, service: 'customer-success-os' });
    }
  });

  app.get('/api/checkins/upcoming', async (req, res) => {
    try {
      const response = await client.get('/api/checkins/upcoming');
      res.json({ success: true, ...response.data });
    } catch (error) {
      res.json({ success: false, error: error.message, service: 'customer-success-os' });
    }
  });

  // Touchpoints
  app.post('/api/touchpoints', async (req, res) => {
    try {
      const response = await client.post('/api/touchpoints', req.body);
      res.json({ success: true, ...response.data });
    } catch (error) {
      res.json({ success: false, error: error.message, service: 'customer-success-os' });
    }
  });

  // NPS Trends
  app.get('/api/nps/:customerId/trends', async (req, res) => {
    try {
      const response = await client.get(`/api/nps/${req.params.customerId}/trends`);
      res.json({ success: true, ...response.data });
    } catch (error) {
      res.json({ success: false, error: error.message, service: 'customer-success-os' });
    }
  });
};
