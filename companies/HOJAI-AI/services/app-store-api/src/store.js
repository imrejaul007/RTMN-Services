/**
 * App Store - In-memory catalog store
 * Manages skills, agents, workflows, templates, and IndustryOS
 */

import { v4 as uuidv4 } from 'uuid';

// App types
export const AppType = {
  SKILL: 'skill',
  AGENT: 'agent',
  WORKFLOW: 'workflow',
  TEMPLATE: 'template',
  INDUSTRY_OS: 'industry-os'
};

// App status
export const AppStatus = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  DEPRECATED: 'deprecated',
  FEATURED: 'featured'
};

// In-memory stores
const apps = new Map();           // appId -> App
const installs = new Map();       // installId -> Install
const reviews = new Map();         // reviewId -> Review
const categories = new Map();     // categoryId -> Category

// Seed with sample data
function seedData() {
  // Categories
  const categoryData = [
    { id: 'cat-ai', name: 'AI & Agents', icon: '🤖', description: 'AI models and agent frameworks' },
    { id: 'cat-commerce', name: 'Commerce', icon: '🛒', description: 'E-commerce and payment solutions' },
    { id: 'cat-crm', name: 'CRM & Sales', icon: '👥', description: 'Customer relationship management' },
    { id: 'cat-communication', name: 'Communication', icon: '💬', description: 'Chat, email, and messaging' },
    { id: 'cat-analytics', name: 'Analytics', icon: '📊', description: 'Business intelligence and reporting' },
    { id: 'cat-productivity', name: 'Productivity', icon: '⚡', description: 'Workflow automation and tools' },
    { id: 'cat-industry', name: 'Industry Solutions', icon: '🏢', description: 'Vertical-specific solutions' },
    { id: 'cat-integration', name: 'Integrations', icon: '🔗', description: 'Connectors and APIs' }
  ];

  for (const cat of categoryData) {
    categories.set(cat.id, cat);
  }

  // Sample apps
  const sampleApps = [
    {
      id: 'skill-translation',
      name: 'Translation Skill',
      description: 'Multi-language translation with context awareness',
      shortDescription: 'Translate content across 50+ languages',
      type: AppType.SKILL,
      category: 'cat-ai',
      icon: '🌐',
      price: 0,
      rating: 4.8,
      reviewCount: 234,
      installCount: 15420,
      author: 'HOJAI AI',
      authorImage: null,
      version: '2.1.0',
      compatibility: '>=1.0.0',
      tags: ['translation', 'nlp', 'multilingual'],
      screenshots: [],
      features: [
        '50+ language support',
        'Context-aware translation',
        'Batch processing',
        'Custom glossary'
      ],
      requirements: ['memory-os'],
      status: AppStatus.FEATURED,
      featured: true,
      verified: true,
      createdAt: '2026-01-15T10:00:00Z',
      updatedAt: '2026-06-01T14:30:00Z'
    },
    {
      id: 'agent-sales-rep',
      name: 'Sales Rep Agent',
      description: 'AI-powered sales representative that handles lead qualification, follow-ups, and quote generation',
      shortDescription: 'Automated sales agent for lead conversion',
      type: AppType.AGENT,
      category: 'cat-crm',
      icon: '🎯',
      price: 49,
      rating: 4.6,
      reviewCount: 89,
      installCount: 3421,
      author: 'HOJAI AI',
      authorImage: null,
      version: '1.5.0',
      compatibility: '>=1.0.0',
      tags: ['sales', 'crm', 'automation', 'leads'],
      screenshots: [],
      features: [
        'Lead qualification',
        'Automated follow-ups',
        'Quote generation',
        'Pipeline tracking'
      ],
      requirements: ['corp-id', 'memory-os'],
      status: AppStatus.PUBLISHED,
      featured: false,
      verified: true,
      createdAt: '2026-02-20T09:00:00Z',
      updatedAt: '2026-05-15T11:00:00Z'
    },
    {
      id: 'workflow-lead-capture',
      name: 'Lead Capture Workflow',
      description: 'Automated workflow to capture, qualify, and route leads from multiple sources',
      shortDescription: 'End-to-end lead capture automation',
      type: AppType.WORKFLOW,
      category: 'cat-productivity',
      icon: '🔄',
      price: 0,
      rating: 4.5,
      reviewCount: 156,
      installCount: 8932,
      author: 'HOJAI AI',
      authorImage: null,
      version: '3.0.0',
      compatibility: '>=1.0.0',
      tags: ['leads', 'automation', 'crm', 'routing'],
      screenshots: [],
      features: [
        'Multi-source capture',
        'Auto-qualification',
        'Smart routing',
        'CRM sync'
      ],
      requirements: [],
      status: AppStatus.FEATURED,
      featured: true,
      verified: true,
      createdAt: '2026-01-10T08:00:00Z',
      updatedAt: '2026-06-10T16:00:00Z'
    },
    {
      id: 'template-marketplace',
      name: 'Marketplace Starter',
      description: 'Complete B2B/B2C marketplace template with RFQ, quotes, and order management',
      shortDescription: 'Full-featured marketplace template',
      type: AppType.TEMPLATE,
      category: 'cat-commerce',
      icon: '🏪',
      price: 199,
      rating: 4.7,
      reviewCount: 45,
      installCount: 1243,
      author: 'HOJAI AI',
      authorImage: null,
      version: '2.0.0',
      compatibility: '>=1.0.0',
      tags: ['marketplace', 'ecommerce', 'rfq', 'b2b'],
      screenshots: [],
      features: [
        'Buyer/seller portals',
        'RFQ and quotes',
        'Order management',
        'Payment integration'
      ],
      requirements: ['hojai-cloud'],
      status: AppStatus.PUBLISHED,
      featured: false,
      verified: true,
      createdAt: '2026-03-01T10:00:00Z',
      updatedAt: '2026-06-05T09:00:00Z'
    },
    {
      id: 'industry-restaurant',
      name: 'Restaurant OS',
      description: 'Complete restaurant management system with POS, kitchen display, and delivery integration',
      shortDescription: 'All-in-one restaurant management',
      type: AppType.INDUSTRY_OS,
      category: 'cat-industry',
      icon: '🍽️',
      price: 299,
      rating: 4.9,
      reviewCount: 312,
      installCount: 5678,
      author: 'HOJAI AI',
      authorImage: null,
      version: '4.0.0',
      compatibility: '>=1.0.0',
      tags: ['restaurant', 'pos', 'kitchen', 'delivery', 'hospitality'],
      screenshots: [],
      features: [
        'Point of Sale',
        'Kitchen Display System',
        'Menu Management',
        'Delivery Integration',
        'Reservation System'
      ],
      requirements: ['hojai-cloud', 'corp-id'],
      status: AppStatus.FEATURED,
      featured: true,
      verified: true,
      createdAt: '2025-12-01T10:00:00Z',
      updatedAt: '2026-06-20T12:00:00Z'
    },
    {
      id: 'agent-support-bot',
      name: 'Support Bot Agent',
      description: 'AI customer support agent with FAQ handling, ticket creation, and escalation',
      shortDescription: 'Automated customer support agent',
      type: AppType.AGENT,
      category: 'cat-communication',
      icon: '💬',
      price: 79,
      rating: 4.4,
      reviewCount: 67,
      installCount: 2341,
      author: 'HOJAI AI',
      authorImage: null,
      version: '2.2.0',
      compatibility: '>=1.0.0',
      tags: ['support', 'chatbot', 'faq', 'tickets'],
      screenshots: [],
      features: [
        'FAQ handling',
        'Ticket creation',
        'Smart escalation',
        'Multi-language'
      ],
      requirements: ['corp-id', 'memory-os'],
      status: AppStatus.PUBLISHED,
      featured: false,
      verified: true,
      createdAt: '2026-02-15T10:00:00Z',
      updatedAt: '2026-06-01T10:00:00Z'
    },
    {
      id: 'skill-seo-optimizer',
      name: 'SEO Optimizer Skill',
      description: 'AI-powered SEO optimization for content, meta tags, and structured data',
      shortDescription: 'Smart SEO optimization',
      type: AppType.SKILL,
      category: 'cat-analytics',
      icon: '📈',
      price: 29,
      rating: 4.3,
      reviewCount: 98,
      installCount: 4521,
      author: 'HOJAI AI',
      authorImage: null,
      version: '1.8.0',
      compatibility: '>=1.0.0',
      tags: ['seo', 'content', 'optimization', 'marketing'],
      screenshots: [],
      features: [
        'Content analysis',
        'Meta optimization',
        'Schema markup',
        'Keyword research'
      ],
      requirements: [],
      status: AppStatus.PUBLISHED,
      featured: false,
      verified: true,
      createdAt: '2026-01-20T10:00:00Z',
      updatedAt: '2026-05-20T10:00:00Z'
    },
    {
      id: 'workflow-hotel-booking',
      name: 'Hotel Booking Workflow',
      description: 'Complete hotel booking workflow with availability, reservation, and payment',
      shortDescription: 'Automated hotel booking flow',
      type: AppType.WORKFLOW,
      category: 'cat-industry',
      icon: '🏨',
      price: 0,
      rating: 4.6,
      reviewCount: 78,
      installCount: 3210,
      author: 'HOJAI AI',
      authorImage: null,
      version: '2.1.0',
      compatibility: '>=1.0.0',
      tags: ['hotel', 'booking', 'reservation', 'hospitality'],
      screenshots: [],
      features: [
        'Availability check',
        'Reservation management',
        'Payment processing',
        'Confirmation emails'
      ],
      requirements: ['corp-id'],
      status: AppStatus.PUBLISHED,
      featured: false,
      verified: true,
      createdAt: '2026-02-01T10:00:00Z',
      updatedAt: '2026-06-15T10:00:00Z'
    }
  ];

  for (const app of sampleApps) {
    apps.set(app.id, app);
  }
}

// Initialize with seed data
seedData();

// ── Apps ──────────────────────────────────────────────────────────────────────

export function createApp(data) {
  const id = data.id || uuidv4();
  const app = {
    id,
    ...data,
    rating: data.rating || 0,
    reviewCount: 0,
    installCount: 0,
    status: AppStatus.DRAFT,
    featured: false,
    verified: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  apps.set(id, app);
  return app;
}

export function getApp(id) {
  return apps.get(id) || null;
}

export function updateApp(id, updates) {
  const app = apps.get(id);
  if (!app) return null;
  const updated = { ...app, ...updates, updatedAt: new Date().toISOString() };
  apps.set(id, updated);
  return updated;
}

export function deleteApp(id) {
  return apps.delete(id);
}

export function listApps({ type, category, status, featured, search, limit = 20, offset = 0 } = {}) {
  let results = Array.from(apps.values());

  // Filters
  if (type) results = results.filter(a => a.type === type);
  if (category) results = results.filter(a => a.category === category);
  if (status) results = results.filter(a => a.status === status);
  if (featured !== undefined) results = results.filter(a => a.featured === featured);
  if (search) {
    const s = search.toLowerCase();
    results = results.filter(a =>
      a.name.toLowerCase().includes(s) ||
      a.description.toLowerCase().includes(s) ||
      a.tags?.some(t => t.includes(s))
    );
  }

  // Sort by rating + installs
  results.sort((a, b) => (b.rating * b.installCount) - (a.rating * a.installCount));

  // Pagination
  return {
    total: results.length,
    apps: results.slice(offset, offset + limit)
  };
}

export function getFeaturedApps() {
  return Array.from(apps.values()).filter(a => a.featured && a.status === AppStatus.PUBLISHED);
}

export function getAppsByCategory(category) {
  return Array.from(apps.values()).filter(a => a.category === category && a.status === AppStatus.PUBLISHED);
}

export function getAppsByAuthor(authorId) {
  return Array.from(apps.values()).filter(a => a.author === authorId || a.authorId === authorId);
}

// ── Installs ─────────────────────────────────────────────────────────────────

export function createInstall({ appId, userId, projectId, config }) {
  const id = uuidv4();
  const install = {
    id,
    appId,
    userId,
    projectId,
    config: config || {},
    status: 'active',
    installedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  installs.set(id, install);

  // Increment install count on app
  const app = apps.get(appId);
  if (app) {
    app.installCount = (app.installCount || 0) + 1;
    apps.set(appId, app);
  }

  return install;
}

export function getInstall(id) {
  return installs.get(id) || null;
}

export function listInstalls({ userId, projectId, appId } = {}) {
  let results = Array.from(installs.values());
  if (userId) results = results.filter(i => i.userId === userId);
  if (projectId) results = results.filter(i => i.projectId === projectId);
  if (appId) results = results.filter(i => i.appId === appId);
  return results;
}

export function deleteInstall(id) {
  return installs.delete(id);
}

export function uninstallApp(appId, userId, projectId) {
  const install = Array.from(installs.values()).find(
    i => i.appId === appId && i.userId === userId && i.projectId === projectId
  );
  if (install) {
    installs.delete(install.id);
    return true;
  }
  return false;
}

// ── Reviews ───────────────────────────────────────────────────────────────────

export function createReview({ appId, userId, rating, title, content }) {
  const id = uuidv4();
  const review = {
    id,
    appId,
    userId,
    rating,
    title,
    content,
    status: 'approved',
    helpful: 0,
    createdAt: new Date().toISOString()
  };
  reviews.set(id, review);

  // Update app rating
  const appReviews = Array.from(reviews.values()).filter(r => r.appId === appId && r.status === 'approved');
  const avgRating = appReviews.reduce((sum, r) => sum + r.rating, 0) / appReviews.length;
  const app = apps.get(appId);
  if (app) {
    app.rating = Math.round(avgRating * 10) / 10;
    app.reviewCount = appReviews.length;
    apps.set(appId, app);
  }

  return review;
}

export function listReviews(appId) {
  return Array.from(reviews.values())
    .filter(r => r.appId === appId && r.status === 'approved')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function markHelpful(reviewId) {
  const review = reviews.get(reviewId);
  if (review) {
    review.helpful++;
    reviews.set(reviewId, review);
  }
}

// ── Categories ────────────────────────────────────────────────────────────────

export function listCategories() {
  return Array.from(categories.values());
}

export function getCategory(id) {
  return categories.get(id) || null;
}

export function createCategory(data) {
  const id = data.id || uuidv4();
  const category = { id, ...data };
  categories.set(id, category);
  return category;
}

// ── Stats ────────────────────────────────────────────────────────────────────

export function getStats() {
  const appList = Array.from(apps.values());
  const installList = Array.from(installs.values());

  return {
    totalApps: appList.length,
    publishedApps: appList.filter(a => a.status === AppStatus.PUBLISHED).length,
    featuredApps: appList.filter(a => a.featured).length,
    totalInstalls: installList.length,
    totalReviews: reviews.size,
    byType: {
      [AppType.SKILL]: appList.filter(a => a.type === AppType.SKILL).length,
      [AppType.AGENT]: appList.filter(a => a.type === AppType.AGENT).length,
      [AppType.WORKFLOW]: appList.filter(a => a.type === AppType.WORKFLOW).length,
      [AppType.TEMPLATE]: appList.filter(a => a.type === AppType.TEMPLATE).length,
      [AppType.INDUSTRY_OS]: appList.filter(a => a.type === AppType.INDUSTRY_OS).length
    }
  };
}
