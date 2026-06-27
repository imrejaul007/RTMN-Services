/**
 * Memory Marketplace Service (Port 4781)
 *
 * Enterprise memory marketplace that enables:
 * - Publishing memory templates and patterns
 * - Discovering and subscribing to memories
 * - Rating and reviewing memory providers
 * - Subscription management
 *
 * NOT a duplicate of any existing service.
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';

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

app.use(express.json());

// In-memory stores
const memoryTemplates = new Map();
const subscriptions = new Map();
const reviews = new Map();
const categories = new Map();

const createId = (prefix) => `${prefix}_${Date.now()}_${uuidv4().slice(0, 8)}`;

// ============================================
// CATEGORIES
// ============================================

app.post('/api/v1/marketplace/categories', requireInternal, async (req, res) => {
  try {
    const { name, description, parentId, tags } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    const category = {
      id: createId('cat'),
      name,
      description: description || '',
      parentId: parentId || null,
      tags: tags || [],
      templateCount: 0,
      createdAt: new Date().toISOString(),
    };

    categories.set(category.id, category);
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/v1/marketplace/categories', async (req, res) => {
  try {
    const { parentId } = req.query;
    let result = [...categories.values()];

    if (parentId) {
      result = result.filter(c => c.parentId === parentId);
    } else if (parentId === null || parentId === 'null') {
      result = result.filter(c => !c.parentId);
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// MEMORY TEMPLATES
// ============================================

app.post('/api/v1/marketplace/templates', requireInternal, async (req, res) => {
  try {
    const { name, description, providerId, categoryId, memoryType, price, features, compatibility, tags } = req.body;

    if (!name || !providerId) {
      return res.status(400).json({ error: 'name and providerId are required' });
    }

    const template = {
      id: createId('tpl'),
      name,
      description: description || '',
      providerId,
      categoryId: categoryId || null,
      memoryType: memoryType || 'generic',
      price: price || { amount: 0, currency: 'USD', type: 'free' },
      features: features || [],
      compatibility: compatibility || [],
      tags: tags || [],
      status: 'draft',
      rating: { average: 0, count: 0 },
      downloadCount: 0,
      subscriberCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      publishedAt: null,
    };

    memoryTemplates.set(template.id, template);
    res.status(201).json(template);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/v1/marketplace/templates', async (req, res) => {
  try {
    const { categoryId, memoryType, providerId, status, tags, search, limit } = req.query;
    let result = [...memoryTemplates.values()];

    // Filter by status (default to published)
    if (status) {
      result = result.filter(t => t.status === status);
    } else {
      result = result.filter(t => t.status === 'published');
    }

    if (categoryId) result = result.filter(t => t.categoryId === categoryId);
    if (memoryType) result = result.filter(t => t.memoryType === memoryType);
    if (providerId) result = result.filter(t => t.providerId === providerId);

    if (tags) {
      const tagList = tags.split(',').map(t => t.trim());
      result = result.filter(t => t.tags.some(tag => tagList.includes(tag)));
    }

    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(t =>
        t.name.toLowerCase().includes(searchLower) ||
        t.description.toLowerCase().includes(searchLower)
      );
    }

    // Sort by rating
    result.sort((a, b) => b.rating.average - a.rating.average);
    result = result.slice(0, parseInt(limit) || 50);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/v1/marketplace/templates/:templateId', async (req, res) => {
  try {
    const template = memoryTemplates.get(req.params.templateId);
    if (!template) return res.status(404).json({ error: 'Template not found' });
    res.json(template);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/v1/marketplace/templates/:templateId', requireInternal, async (req, res) => {
  try {
    const template = memoryTemplates.get(req.params.templateId);
    if (!template) return res.status(404).json({ error: 'Template not found' });

    const { name, description, categoryId, memoryType, price, features, tags } = req.body;

    if (name) template.name = name;
    if (description !== undefined) template.description = description;
    if (categoryId !== undefined) template.categoryId = categoryId;
    if (memoryType) template.memoryType = memoryType;
    if (price) template.price = price;
    if (features) template.features = features;
    if (tags) template.tags = tags;
    template.updatedAt = new Date().toISOString();

    memoryTemplates.set(template.id, template);
    res.json(template);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/v1/marketplace/templates/:templateId/publish', requireInternal, async (req, res) => {
  try {
    const template = memoryTemplates.get(req.params.templateId);
    if (!template) return res.status(404).json({ error: 'Template not found' });

    if (template.status === 'published') {
      return res.status(400).json({ error: 'Template already published' });
    }

    template.status = 'published';
    template.publishedAt = new Date().toISOString();
    template.updatedAt = new Date().toISOString();
    memoryTemplates.set(template.id, template);

    res.json({ message: 'Template published', template });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/v1/marketplace/templates/:templateId', requireInternal, async (req, res) => {
  try {
    const template = memoryTemplates.get(req.params.templateId);
    if (!template) return res.status(404).json({ error: 'Template not found' });

    template.status = 'deleted';
    template.updatedAt = new Date().toISOString();
    memoryTemplates.set(template.id, template);

    res.json({ message: 'Template deleted', id: template.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// SUBSCRIPTIONS
// ============================================

app.post('/api/v1/marketplace/subscriptions', requireInternal, async (req, res) => {
  try {
    const { templateId, subscriberId, plan, duration } = req.body;

    if (!templateId || !subscriberId) {
      return res.status(400).json({ error: 'templateId and subscriberId are required' });
    }

    const template = memoryTemplates.get(templateId);
    if (!template) return res.status(404).json({ error: 'Template not found' });

    // Check for existing active subscription
    const existing = [...subscriptions.values()].find(
      s => s.templateId === templateId && s.subscriberId === subscriberId && s.status === 'active'
    );
    if (existing) {
      return res.status(409).json({ error: 'Already subscribed', subscriptionId: existing.id });
    }

    const subscription = {
      id: createId('sub'),
      templateId,
      subscriberId,
      plan: plan || template.price.type,
      duration: duration || 'monthly',
      status: 'active',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      autoRenew: true,
      createdAt: new Date().toISOString(),
    };

    subscriptions.set(subscription.id, subscription);

    // Update template subscriber count
    template.subscriberCount++;
    memoryTemplates.set(template.id, template);

    res.status(201).json(subscription);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/v1/marketplace/subscriptions', async (req, res) => {
  try {
    const { subscriberId, templateId, status } = req.query;
    let result = [...subscriptions.values()];

    if (subscriberId) result = result.filter(s => s.subscriberId === subscriberId);
    if (templateId) result = result.filter(s => s.templateId === templateId);
    if (status) result = result.filter(s => s.status === status);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/v1/marketplace/subscriptions/:subscriptionId/cancel', requireInternal, async (req, res) => {
  try {
    const subscription = subscriptions.get(req.params.subscriptionId);
    if (!subscription) return res.status(404).json({ error: 'Subscription not found' });

    subscription.status = 'cancelled';
    subscription.cancelledAt = new Date().toISOString();
    subscriptions.set(subscription.id, subscription);

    res.json({ message: 'Subscription cancelled', subscription });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// REVIEWS
// ============================================

app.post('/api/v1/marketplace/reviews', requireInternal, async (req, res) => {
  try {
    const { templateId, reviewerId, rating, comment } = req.body;

    if (!templateId || !reviewerId || rating === undefined) {
      return res.status(400).json({ error: 'templateId, reviewerId, and rating are required' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const template = memoryTemplates.get(templateId);
    if (!template) return res.status(404).json({ error: 'Template not found' });

    // Check for existing review
    const existing = [...reviews.values()].find(
      r => r.templateId === templateId && r.reviewerId === reviewerId
    );
    if (existing) {
      return res.status(409).json({ error: 'Already reviewed', reviewId: existing.id });
    }

    const review = {
      id: createId('rev'),
      templateId,
      reviewerId,
      rating,
      comment: comment || '',
      status: 'published',
      helpfulCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    reviews.set(review.id, review);

    // Update template rating
    const templateReviews = [...reviews.values()].filter(r => r.templateId === templateId);
    const avgRating = templateReviews.reduce((sum, r) => sum + r.rating, 0) / templateReviews.length;
    template.rating = { average: Math.round(avgRating * 10) / 10, count: templateReviews.length };
    memoryTemplates.set(template.id, template);

    res.status(201).json(review);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/v1/marketplace/reviews', async (req, res) => {
  try {
    const { templateId, minRating } = req.query;
    let result = [...reviews.values()].filter(r => r.status === 'published');

    if (templateId) result = result.filter(r => r.templateId === templateId);
    if (minRating) result = result.filter(r => r.rating >= parseInt(minRating));

    result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// STATISTICS
// ============================================

app.get('/api/v1/marketplace/stats', async (req, res) => {
  try {
    const templates = [...memoryTemplates.values()].filter(t => t.status !== 'deleted');

    const stats = {
      templates: {
        total: templates.length,
        published: templates.filter(t => t.status === 'published').length,
        draft: templates.filter(t => t.status === 'draft').length,
        byType: templates.reduce((acc, t) => {
          acc[t.memoryType] = (acc[t.memoryType] || 0) + 1;
          return acc;
        }, {}),
      },
      subscriptions: {
        total: subscriptions.size,
        active: [...subscriptions.values()].filter(s => s.status === 'active').length,
        totalSubscribers: new Set([...subscriptions.values()].map(s => s.subscriberId)).size,
      },
      reviews: {
        total: reviews.size,
        averageRating: templates.length > 0
          ? (templates.reduce((sum, t) => sum + t.rating.average, 0) / templates.length).toFixed(1)
          : 0,
      },
      categories: {
        total: categories.size,
      },
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health & Info
app.get('/health', (req, res) => {
  res.json({ service: 'memory-marketplace', version: '1.0.0', port: 4781, status: 'healthy' });
});

app.get('/api/v1/info', (req, res) => {
  res.json({
    service: 'memory-marketplace',
    description: 'Enterprise memory marketplace',
    version: '1.0.0',
    capabilities: ['templates', 'subscriptions', 'reviews', 'ratings', 'categories'],
  });
});

const PORT = process.env.PORT || 4781;
const server = app.listen(PORT, () => {
  console.log(`[Memory Marketplace Service] Running on port ${PORT}`);
});

export { app, server };
export default app;
