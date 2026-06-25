/**
 * HOJAI Cost Tracker API
 * Port: 4410
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import {
  trackUsage, getUsage, getUsageSummary,
  setBudget, getBudget,
  createAlert, listAlerts, deleteAlert,
  getStats, getPricing
} from './store.js';

const PORT = process.env.PORT || 4410;
const HOST = process.env.HOST || '0.0.0.0';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
});

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'cost-tracker', version: '1.0.0', timestamp: new Date().toISOString() });
});

app.get('/ready', (req, res) => {
  res.json({ status: 'ready', timestamp: new Date().toISOString() });
});

// API info
app.get('/api/v1', (req, res) => {
  res.json({
    service: 'HOJAI Cost Tracker API',
    version: '1.0.0',
    description: 'AI usage metering and billing',
    endpoints: {
      usage: {
        'POST /api/v1/usage': 'Track usage',
        'GET /api/v1/usage': 'Get usage records',
        'GET /api/v1/usage/summary': 'Get usage summary'
      },
      budgets: {
        'POST /api/v1/budgets': 'Set budget',
        'GET /api/v1/budgets/:userId': 'Get budget'
      },
      alerts: {
        'POST /api/v1/alerts': 'Create alert',
        'GET /api/v1/alerts/:userId': 'List alerts',
        'DELETE /api/v1/alerts/:id': 'Delete alert'
      },
      pricing: {
        'GET /api/v1/pricing': 'Get current pricing'
      },
      stats: {
        'GET /api/v1/stats': 'Get platform stats'
      }
    }
  });
});

// Track usage
app.post('/api/v1/usage', (req, res) => {
  try {
    const record = trackUsage(req.body);
    res.status(201).json({ success: true, record });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get usage
app.get('/api/v1/usage', (req, res) => {
  try {
    const { userId, projectId, startDate, endDate, limit } = req.query;
    const records = getUsage({ userId, projectId, startDate, endDate, limit: limit ? parseInt(limit) : 100 });
    res.json({ success: true, count: records.length, records });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get usage summary
app.get('/api/v1/usage/summary', (req, res) => {
  try {
    const { userId, projectId, period } = req.query;
    const summary = getUsageSummary({ userId, projectId, period });
    res.json({ success: true, summary });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Set budget
app.post('/api/v1/budgets', (req, res) => {
  try {
    const { userId, monthlyLimit, alertThreshold } = req.body;
    if (!userId || !monthlyLimit) {
      return res.status(400).json({ error: 'userId and monthlyLimit are required' });
    }
    const budget = setBudget({ userId, monthlyLimit, alertThreshold });
    res.status(201).json({ success: true, budget });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get budget
app.get('/api/v1/budgets/:userId', (req, res) => {
  try {
    const budget = getBudget(req.params.userId);
    if (!budget) return res.status(404).json({ error: 'Budget not found' });
    res.json({ success: true, budget });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create alert
app.post('/api/v1/alerts', (req, res) => {
  try {
    const alert = createAlert(req.body);
    res.status(201).json({ success: true, alert });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// List alerts
app.get('/api/v1/alerts/:userId', (req, res) => {
  try {
    const alerts = listAlerts(req.params.userId);
    res.json({ success: true, count: alerts.length, alerts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete alert
app.delete('/api/v1/alerts/:id', (req, res) => {
  try {
    const deleted = deleteAlert(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Alert not found' });
    res.json({ success: true, message: 'Alert deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get pricing
app.get('/api/v1/pricing', (req, res) => {
  try {
    const pricing = getPricing();
    res.json({ success: true, pricing });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get stats
app.get('/api/v1/stats', (req, res) => {
  try {
    const stats = getStats();
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Root
app.get('/', (req, res) => {
  res.json({
    name: 'HOJAI Cost Tracker',
    tagline: 'AI usage metering and billing',
    version: '1.0.0',
    port: PORT
  });
});

app.listen(PORT, HOST, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║     💰 HOJAI COST TRACKER — PORT ${PORT}                            ║
║                                                                  ║
║     AI usage metering and billing                                ║
║                                                                  ║
╠══════════════════════════════════════════════════════════════════╣
║     POST /api/v1/usage           — Track usage                ║
║     GET  /api/v1/usage           — Get usage                  ║
║     GET  /api/v1/usage/summary  — Usage summary              ║
║     POST /api/v1/budgets        — Set budget                 ║
║     GET  /api/v1/pricing        — Current pricing             ║
╚══════════════════════════════════════════════════════════════════╝
  `);
});

export default app;
