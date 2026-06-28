/**
 * FlowOS Workflow Marketplace
 *
 * Extends workflow templates with full marketplace capabilities:
 * - Browse, search, and filter workflows
 * - Ratings and reviews
 * - Categories and collections
 * - Licensing and pricing
 * - Installation and configuration
 *
 * Port: 5372
 */

import express from 'express';
import cors from 'cors';
import crypto from 'crypto';

const app = express();
const PORT = process.env.PORT || 5372;

app.use(cors());
app.use(express.json());

// Storage
const storage = {
  listings: new Map(),
  reviews: new Map(),
  installations: new Map(),
  categories: new Map(),
  collections: new Map()
};

// Default categories
const DEFAULT_CATEGORIES = {
  hr: { id: 'hr', name: 'HR & Recruitment', icon: '👥', description: 'Onboarding, offboarding, performance reviews' },
  finance: { id: 'finance', name: 'Finance & Accounting', icon: '💰', description: 'Invoicing, approvals, expense management' },
  operations: { id: 'operations', name: 'Operations', icon: '⚙️', description: 'Process automation, task management' },
  sales: { id: 'sales', name: 'Sales & Marketing', icon: '📈', description: 'Lead management, follow-ups, campaigns' },
  customer_service: { id: 'customer_service', name: 'Customer Service', icon: '🎧', description: 'Ticketing, support, feedback' },
  it: { id: 'it', name: 'IT & DevOps', icon: '🔧', description: 'CI/CD, deployments, monitoring' },
  legal: { id: 'legal', name: 'Legal & Compliance', icon: '⚖️', description: 'Contract review, compliance checks' },
  healthcare: { id: 'healthcare', name: 'Healthcare', icon: '🏥', description: 'Patient intake, scheduling, billing' }
};

// Default workflow templates
const DEFAULT_TEMPLATES = [
  {
    id: 'wf_hr_onboarding',
    name: 'Employee Onboarding',
    description: 'Complete onboarding workflow with document collection, equipment setup, and training assignments',
    category: 'hr',
    author: 'FlowOS',
    version: '1.0',
    workflow: {
      nodes: [
        { id: 'start', type: 'trigger', name: 'New Employee', config: { type: 'webhook' } },
        { id: 'docs', type: 'task', name: 'Collect Documents', config: { action: 'form', fields: ['name', 'email', 'department'] } },
        { id: 'equipment', type: 'task', name: 'Setup Equipment', config: { action: 'it_request' } },
        { id: 'training', type: 'task', name: 'Assign Training', config: { action: 'lms_enroll' } },
        { id: 'welcome', type: 'task', name: 'Send Welcome', config: { action: 'email', template: 'welcome' } }
      ],
      connections: [
        { source: 'start', target: 'docs' },
        { source: 'docs', target: 'equipment' },
        { source: 'docs', target: 'training' },
        { source: 'equipment', target: 'welcome' },
        { source: 'training', target: 'welcome' }
      ]
    },
    stats: { installs: 1247, rating: 4.8, reviews: 89 },
    pricing: { type: 'free' },
    tags: ['onboarding', 'hr', 'automation']
  },
  {
    id: 'wf_loan_processing',
    name: 'Loan Processing',
    description: 'End-to-end loan application workflow with credit check and approval routing',
    category: 'finance',
    author: 'FlowOS',
    version: '1.0',
    workflow: {
      nodes: [
        { id: 'start', type: 'trigger', name: 'Application', config: { type: 'webhook' } },
        { id: 'credit', type: 'task', name: 'Credit Check', config: { action: 'credit_score' } },
        { id: 'approve', type: 'human_task', name: 'Manager Approval', config: { approvers: ['manager'] } },
        { id: 'disburse', type: 'task', name: 'Disburse Funds', config: { action: 'payment' } }
      ],
      connections: [
        { source: 'start', target: 'credit' },
        { source: 'credit', target: 'approve' },
        { source: 'approve', target: 'disburse' }
      ]
    },
    stats: { installs: 892, rating: 4.6, reviews: 67 },
    pricing: { type: 'paid', price: 49 },
    tags: ['loan', 'finance', 'approval']
  },
  {
    id: 'wf_restaurant_order',
    name: 'Restaurant Order',
    description: 'Full restaurant ordering workflow with kitchen display and delivery tracking',
    category: 'operations',
    author: 'FlowOS',
    version: '1.0',
    workflow: {
      nodes: [
        { id: 'order', type: 'trigger', name: 'New Order', config: { type: 'webhook' } },
        { id: 'validate', type: 'task', name: 'Validate Order', config: { action: 'validate_items' } },
        { id: 'kitchen', type: 'task', name: 'Send to Kitchen', config: { action: 'kds_display' } },
        { id: 'delivery', type: 'task', name: 'Arrange Delivery', config: { action: 'courier_assign' } }
      ],
      connections: [
        { source: 'order', target: 'validate' },
        { source: 'validate', target: 'kitchen' },
        { source: 'kitchen', target: 'delivery' }
      ]
    },
    stats: { installs: 2134, rating: 4.9, reviews: 156 },
    pricing: { type: 'free' },
    tags: ['restaurant', 'ordering', 'food']
  }
];

// Seed default templates
DEFAULT_TEMPLATES.forEach(t => storage.listings.set(t.id, t));

// Health
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'workflow-marketplace',
    version: '1.0.0',
    port: PORT,
    listings: storage.listings.size,
    categories: Object.keys(DEFAULT_CATEGORIES).length,
    timestamp: new Date().toISOString()
  });
});

// Get all categories
app.get('/api/categories', (req, res) => {
  const categories = Object.values(DEFAULT_CATEGORIES).map(cat => ({
    ...cat,
    count: Array.from(storage.listings.values()).filter(l => l.category === cat.id).length
  }));
  res.json({ categories });
});

// Browse workflows
app.get('/api/listings', (req, res) => {
  const { category, search, sort = 'popular', limit = 20, offset = 0 } = req.query;

  let listings = Array.from(storage.listings.values());

  if (category) {
    listings = listings.filter(l => l.category === category);
  }

  if (search) {
    const query = search.toLowerCase();
    listings = listings.filter(l =>
      l.name.toLowerCase().includes(query) ||
      l.description.toLowerCase().includes(query) ||
      l.tags.some(t => t.toLowerCase().includes(query))
    );
  }

  switch (sort) {
    case 'rating':
      listings.sort((a, b) => b.stats.rating - a.stats.rating);
      break;
    case 'newest':
      listings.sort((a, b) => b.stats.installs - a.stats.installs);
      break;
    default:
      listings.sort((a, b) => b.stats.installs - a.stats.installs);
  }

  const total = listings.length;
  const paginated = listings.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

  res.json({ total, limit: parseInt(limit), offset: parseInt(offset), listings: paginated });
});

// Get listing by ID
app.get('/api/listings/:id', (req, res) => {
  const listing = storage.listings.get(req.params.id);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  res.json(listing);
});

// Publish workflow
app.post('/api/listings', (req, res) => {
  const { name, description, category, workflow, pricing = { type: 'free' }, tags = [], author } = req.body || {};

  if (!name || !workflow) {
    return res.status(400).json({ error: 'name and workflow are required' });
  }

  const id = 'wf_' + crypto.randomUUID().slice(0, 8);
  const listing = {
    id,
    name,
    description: description || '',
    category: category || 'operations',
    author: author || 'User',
    version: '1.0',
    workflow,
    stats: { installs: 0, rating: 0, reviews: 0 },
    pricing,
    tags,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  storage.listings.set(id, listing);
  res.status(201).json(listing);
});

// Get reviews
app.get('/api/listings/:id/reviews', (req, res) => {
  const reviews = Array.from(storage.reviews.values()).filter(r => r.listingId === req.params.id);
  res.json({ reviews, totalReviews: reviews.length });
});

// Add review
app.post('/api/listings/:id/reviews', (req, res) => {
  const { rating, comment, author } = req.body || {};
  const listing = storage.listings.get(req.params.id);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'rating must be between 1 and 5' });
  }

  const reviewId = 'review_' + crypto.randomUUID();
  const review = {
    id: reviewId,
    listingId: req.params.id,
    rating,
    comment: comment || '',
    author: author || 'Anonymous',
    createdAt: new Date().toISOString()
  };

  storage.reviews.set(reviewId, review);
  res.status(201).json(review);
});

// Install workflow
app.post('/api/installations', (req, res) => {
  const { listingId, workspaceId, name } = req.body || {};

  const listing = storage.listings.get(listingId);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });

  const installId = 'install_' + crypto.randomUUID();
  const installation = {
    id: installId,
    listingId,
    workspaceId: workspaceId || 'default',
    name: name || listing.name,
    workflow: listing.workflow,
    installedAt: new Date().toISOString(),
    status: 'active'
  };

  storage.installations.set(installId, installation);
  listing.stats.installs++;

  res.status(201).json({ installation, workflow: listing.workflow, message: 'Successfully installed' });
});

// Get installations
app.get('/api/installations', (req, res) => {
  const installations = Array.from(storage.installations.values());
  res.json({ installations });
});

// Featured workflows
app.get('/api/featured', (req, res) => {
  const listings = Array.from(storage.listings.values());
  res.json({
    topRated: [...listings].sort((a, b) => b.stats.rating - a.stats.rating).slice(0, 5),
    popular: [...listings].sort((a, b) => b.stats.installs - a.stats.installs).slice(0, 5),
    free: listings.filter(l => l.pricing.type === 'free').slice(0, 5)
  });
});

// Stats
app.get('/api/stats', (req, res) => {
  const listings = Array.from(storage.listings.values());
  const installations = Array.from(storage.installations.values());
  res.json({
    totalListings: listings.length,
    totalInstalls: installations.length,
    totalReviews: storage.reviews.size
  });
});

app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});

const server = app.listen(PORT, () => {
  console.log(`[workflow-marketplace] listening on :${PORT}`);
  console.log(`[workflow-marketplace] ${storage.listings.size} templates loaded`);
});

process.on('SIGTERM', () => {
  console.log('[workflow-marketplace] Shutting down...');
  server.close();
});

export { app };
