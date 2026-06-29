/**
 * BLR AI Marketplace Server
 * API for AI agents, workflows, department packs, and actors
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const { v4: uuid } = require('uuid');

const app = express();
const PORT = process.env.PORT || 4400;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json());

// In-memory database (replace with real DB in production)
const db = {
  agents: [
    { id: 'sdr-agent', name: 'SDR Agent', department: 'Sales', price: 15000, rating: 4.8, installs: 234 },
    { id: 'support-agent', name: 'Support Agent', department: 'Support', price: 12000, rating: 4.9, installs: 456 },
    { id: 'finance-agent', name: 'Finance Agent', department: 'Finance', price: 18000, rating: 4.7, installs: 123 },
    { id: 'marketing-agent', name: 'Marketing Agent', department: 'Marketing', price: 15000, rating: 4.6, installs: 234 },
    { id: 'hr-agent', name: 'HR Agent', department: 'HR', price: 10000, rating: 4.8, installs: 156 },
  ],
  workflows: [
    { id: 'lead-qual-pipeline', name: 'Lead Qualification Pipeline', category: 'Sales', price: 999, rating: 4.8, installs: 567 },
    { id: 'ai-first-response', name: 'AI First Response', category: 'Support', price: 1499, rating: 4.9, installs: 890 },
    { id: 'invoice-processing', name: 'Invoice Processing', category: 'Finance', price: 1999, rating: 4.7, installs: 345 },
    { id: 'content-calendar', name: 'Content Calendar', category: 'Marketing', price: 999, rating: 4.6, installs: 456 },
    { id: 'onboarding', name: 'Employee Onboarding', category: 'HR', price: 799, rating: 4.8, installs: 234 },
  ],
  departments: [
    { id: 'sales-dept', name: 'Sales Department Pack', description: '5 AI agents + 10 workflows', price: 45000, rating: 4.9, installs: 567 },
    { id: 'marketing-dept', name: 'Marketing Department Pack', description: '5 AI agents + 10 workflows', price: 50000, rating: 4.8, installs: 456 },
    { id: 'support-dept', name: 'Support Department Pack', description: '5 AI agents + 10 workflows', price: 35000, rating: 4.9, installs: 678 },
    { id: 'finance-dept', name: 'Finance Department Pack', description: '5 AI agents + 10 workflows', price: 60000, rating: 4.7, installs: 234 },
    { id: 'hr-dept', name: 'HR Department Pack', description: '5 AI agents + 10 workflows', price: 30000, rating: 4.8, installs: 345 },
  ],
  actors: [
    { id: 'google-maps', name: 'Google Maps Actor', description: 'Business search and reviews', price: 4999, rating: 4.5, installs: 890 },
    { id: 'linkedin', name: 'LinkedIn Actor', description: 'Profile and company scraping', price: 4999, rating: 4.6, installs: 567 },
    { id: 'zomato', name: 'Zomato Actor', description: 'Restaurant data extraction', price: 2999, rating: 4.7, installs: 456 },
    { id: 'news', name: 'News Actor', description: 'News monitoring and sentiment', price: 2999, rating: 4.5, installs: 345 },
  ],
};

// Routes

// Get all items
app.get('/api/marketplace', (req, res) => {
  const { category, search, limit = 20 } = req.query;

  let items = [];

  if (category === 'all' || !category) {
    items = [
      ...db.agents.map(a => ({ ...a, type: 'agent' })),
      ...db.workflows.map(w => ({ ...w, type: 'workflow' })),
      ...db.departments.map(d => ({ ...d, type: 'department' })),
      ...db.actors.map(a => ({ ...a, type: 'actor' })),
    ];
  } else if (category === 'agents') {
    items = db.agents.map(a => ({ ...a, type: 'agent' }));
  } else if (category === 'workflows') {
    items = db.workflows.map(w => ({ ...w, type: 'workflow' }));
  } else if (category === 'departments') {
    items = db.departments.map(d => ({ ...d, type: 'department' }));
  } else if (category === 'actors') {
    items = db.actors.map(a => ({ ...a, type: 'actor' }));
  }

  // Filter by search
  if (search) {
    items = items.filter(i =>
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      (i.description || '').toLowerCase().includes(search.toLowerCase())
    );
  }

  res.json({
    items: items.slice(0, parseInt(limit)),
    total: items.length,
    categories: ['agents', 'workflows', 'departments', 'actors']
  });
});

// Get single item
app.get('/api/marketplace/:type/:id', (req, res) => {
  const { type, id } = req.params;

  const collections = {
    agents: db.agents,
    workflows: db.workflows,
    departments: db.departments,
    actors: db.actors,
  };

  const collection = collections[type];
  if (!collection) {
    return res.status(404).json({ error: 'Category not found' });
  }

  const item = collection.find(i => i.id === id);
  if (!item) {
    return res.status(404).json({ error: 'Item not found' });
  }

  res.json({ ...item, type });
});

// Install item
app.post('/api/marketplace/install', (req, res) => {
  const { type, id, userId } = req.body;

  // In production, this would:
  // 1. Validate user subscription
  // 2. Create tenant-specific instance
  // 3. Update analytics
  // 4. Send webhook to notify deployed services

  const installId = uuid();

  res.json({
    success: true,
    installId,
    message: `${type} installed successfully`,
    status: 'deploying'
  });
});

// Search
app.get('/api/search', (req, res) => {
  const { q, type, limit = 10 } = req.query;

  if (!q) {
    return res.json({ results: [] });
  }

  const query = q.toLowerCase();
  const results = [];

  const searchIn = (items, itemType) => {
    items.forEach(item => {
      if (item.name.toLowerCase().includes(query) ||
          (item.description || '').toLowerCase().includes(query) ||
          (item.department || '').toLowerCase().includes(query)) {
        results.push({ ...item, type: itemType });
      }
    });
  };

  searchIn(db.agents, 'agent');
  searchIn(db.workflows, 'workflow');
  searchIn(db.departments, 'department');
  searchIn(db.actors, 'actor');

  res.json({
    results: results.slice(0, parseInt(limit)),
    total: results.length
  });
});

// Featured items
app.get('/api/featured', (req, res) => {
  const featured = [
    db.departments[0],
    db.agents[0],
    db.workflows[1],
    db.actors[0],
  ].map(item => ({
    ...item,
    featured: true
  }));

  res.json({ featured });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🏪 BLR AI Marketplace running on port ${PORT}`);
});
