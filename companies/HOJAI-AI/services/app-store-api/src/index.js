/**
 * HOJAI App Store API
 * Port: 4400
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { listCategories, listApps, getFeaturedApps, getStats } from './store.js';
import appsRouter from './routes/apps.js';

const PORT = process.env.PORT || 4400;
const HOST = process.env.HOST || '0.0.0.0';

const app = express();

// ── Internal Auth ────────────────────────────────────────────────
function requireInternal(req, res, next) {
  const token = req.headers['x-internal-token'];
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  if (token && expected && token === expected) {
    req.user = { type: 'service', id: 'internal' };
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}


// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    console.log(`${new Date().toISOString()} ${req.method} ${req.path} ${res.statusCode} ${ms}ms`);
  });
  next();
});

// ── Health ─────────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'app-store-api', version: '1.0.0', timestamp: new Date().toISOString() });
});

app.get('/ready', (req, res) => {
  res.json({ status: 'ready', service: 'app-store-api', timestamp: new Date().toISOString() });
});

// ── API ─────────────────────────────────────────────────────────────────────

app.get('/api/v1', (req, res) => {
  res.json({
    service: 'HOJAI App Store API',
    version: '1.0.0',
    description: 'Catalog for skills, agents, workflows, templates, and IndustryOS',
    endpoints: {
      apps: {
        'GET /api/v1/apps': 'List all apps (filter: type, category, search)',
        'GET /api/v1/apps/featured': 'Get featured apps',
        'GET /api/v1/apps/:id': 'Get app details',
        'POST /api/v1/apps': 'Create new app',
        'PATCH /api/v1/apps/:id': 'Update app',
        'DELETE /api/v1/apps/:id': 'Delete app',
        'GET /api/v1/apps/:id/reviews': 'Get app reviews',
        'POST /api/v1/apps/:id/reviews': 'Create review',
        'POST /api/v1/apps/:id/install': 'Install app',
        'DELETE /api/v1/apps/:id/install': 'Uninstall app'
      },
      categories: {
        'GET /api/v1/categories': 'List all categories',
        'GET /api/v1/categories/:id': 'Get category details'
      },
      stats: {
        'GET /api/v1/stats': 'Get store statistics'
      }
    }
  });
});

// Categories
app.get('/api/v1/categories', (req, res) => {
  try {
    const categories = listCategories();
    res.json({ success: true, categories });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/v1/categories/:id', (req, res) => {
  try {
    const category = getCategory(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    const apps = listApps({ category: req.params.id, status: 'published' });
    res.json({ success: true, category, apps: apps.apps });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Apps routes
app.use('/api/v1/apps', appsRouter);

// Stats
app.get('/api/v1/stats', (req, res) => {
  try {
    const stats = getStats();
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search
app.get('/api/v1/search', (req, res) => {
  try {
    const { q, type, limit } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'q (query) is required' });
    }
    const result = listApps({
      search: q,
      type,
      limit: limit ? parseInt(limit) : 10
    });
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── Root ──────────────────────────────────────────────────────────────────

app.get('/', (req, res) => {
  res.json({
    name: 'HOJAI App Store',
    tagline: 'The marketplace for AI-native businesses',
    description: 'Discover and install skills, agents, workflows, templates, and IndustryOS',
    version: '1.0.0',
    port: PORT,
    categories: [
      'AI & Agents',
      'Commerce',
      'CRM & Sales',
      'Communication',
      'Analytics',
      'Productivity',
      'Industry Solutions',
      'Integrations'
    ]
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Start
app.listen(PORT, HOST, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║     🏪 HOJAI APP STORE — PORT ${PORT}                                ║
║                                                                  ║
║     The marketplace for AI-native businesses                      ║
║                                                                  ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║     Endpoints:                                                 ║
║       GET  /                — Service info                      ║
║       GET  /health          — Health check                      ║
║       GET  /api/v1          — API documentation                 ║
║                                                                  ║
║       GET  /api/v1/apps           — List apps                    ║
║       GET  /api/v1/apps/featured — Featured apps               ║
║       GET  /api/v1/categories    — List categories             ║
║       GET  /api/v1/stats         — Store stats                  ║
║       GET  /api/v1/search        — Search apps                 ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
  `);
});

export default app;
