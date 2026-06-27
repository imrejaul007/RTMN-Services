const express = require('express');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { requireAuth } = require('@rtmn/shared/auth');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

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


// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
const PORT = 4940;

app.use(helmet());
app.use(cors());
app.use(express.json());

// In-memory storage
const articles = new PersistentMap('articles', { serviceName: 'knowledge-base' });
const categories = new PersistentMap('categories', { serviceName: 'knowledge-base' });
const tags = new PersistentMap('tags', { serviceName: 'knowledge-base' });
const searchIndex = new PersistentMap('search-index', { serviceName: 'knowledge-base' });

// Initialize with sample categories
const initCategories = [
  { id: 'cat-1', name: 'Getting Started', description: 'Onboarding guides and basics', icon: 'rocket', articleCount: 0 },
  { id: 'cat-2', name: 'Sales', description: 'Sales processes and best practices', icon: 'trending-up', articleCount: 0 },
  { id: 'cat-3', name: 'Marketing', description: 'Marketing strategies and campaigns', icon: 'megaphone', articleCount: 0 },
  { id: 'cat-4', name: 'Customer Success', description: 'Customer support and retention', icon: 'heart', articleCount: 0 },
  { id: 'cat-5', name: 'Operations', description: 'Operational procedures and workflows', icon: 'settings', articleCount: 0 },
  { id: 'cat-6', name: 'Finance', description: 'Financial processes and policies', icon: 'dollar-sign', articleCount: 0 },
  { id: 'cat-7', name: 'HR & People', description: 'Human resources and company culture', icon: 'users', articleCount: 0 },
  { id: 'cat-8', name: 'Product', description: 'Product documentation and guides', icon: 'box', articleCount: 0 }
];

initCategories.forEach(cat => categories.set(cat.id, cat));

// Initialize with sample articles
const sampleArticles = [
  {
    id: 'art-1',
    title: 'Welcome to RTMN Platform',
    slug: 'welcome-to-rtmn',
    content: `# Welcome to RTMN Platform

RTMN is a unified ecosystem connecting 50+ services across 24 industry verticals.

## Quick Start
1. Access the Unified Hub at port 4399
2. Navigate to your Industry OS
3. Configure your preferences

## Key Features
- **AI Agents**: 100+ intelligent agents
- **Digital Twins**: 150+ virtual representations
- **Unified Hub**: Single gateway to all services

## Support
Contact support@hojai.ai for assistance.`,
    summary: 'Introduction to the RTMN Platform and its key features',
    categoryId: 'cat-1',
    author: 'System Admin',
    authorId: 'user-1',
    tags: ['welcome', 'introduction', 'platform'],
    status: 'published',
    visibility: 'public',
    views: 1542,
    helpful: 89,
    notHelpful: 5,
    createdAt: new Date('2025-01-15').toISOString(),
    updatedAt: new Date('2025-06-10').toISOString(),
    publishedAt: new Date('2025-01-15').toISOString()
  },
  {
    id: 'art-2',
    title: 'Sales Pipeline Management Guide',
    slug: 'sales-pipeline-management',
    content: `# Sales Pipeline Management

Learn how to effectively manage your sales pipeline in RTMN.

## Pipeline Stages
1. **Lead Capture** - Initial contact
2. **Qualification** - Assess fit
3. **Proposal** - Present solution
4. **Negotiation** - Close the deal
5. **Won/Lost** - Final outcome

## Best Practices
- Update pipeline daily
- Score leads consistently
- Focus on high-priority deals
- Track activities at each stage

## AI Assistance
Use the Sales Copilot to get real-time recommendations.`,
    summary: 'Complete guide to managing sales pipelines effectively',
    categoryId: 'cat-2',
    author: 'Sales Team',
    authorId: 'user-2',
    tags: ['sales', 'pipeline', 'crm', 'deals'],
    status: 'published',
    visibility: 'public',
    views: 892,
    helpful: 67,
    notHelpful: 3,
    createdAt: new Date('2025-02-20').toISOString(),
    updatedAt: new Date('2025-05-28').toISOString(),
    publishedAt: new Date('2025-02-20').toISOString()
  },
  {
    id: 'art-3',
    title: 'Campaign Creation Best Practices',
    slug: 'campaign-creation-best-practices',
    content: `# Campaign Creation Best Practices

Create effective marketing campaigns with these proven strategies.

## Campaign Planning
- Define clear objectives
- Identify target audience
- Set realistic KPIs
- Allocate budget wisely

## Channel Selection
- Email marketing
- Social media
- Paid advertising
- Content marketing

## Measurement
Track opens, clicks, conversions, and ROI.`,
    summary: 'Strategic guide to creating high-converting marketing campaigns',
    categoryId: 'cat-3',
    author: 'Marketing Team',
    authorId: 'user-3',
    tags: ['marketing', 'campaigns', 'strategy', 'advertising'],
    status: 'published',
    visibility: 'public',
    views: 654,
    helpful: 45,
    notHelpful: 2,
    createdAt: new Date('2025-03-10').toISOString(),
    updatedAt: new Date('2025-06-05').toISOString(),
    publishedAt: new Date('2025-03-10').toISOString()
  }
];

sampleArticles.forEach(art => articles.set(art.id, art));

// ==================== ARTICLES API ====================

// Get all articles
app.get('/api/articles', (req, res) => {
  const { status, category, tag, search, limit = 50, offset = 0 } = req.query;

  let result = Array.from(articles.values());

  if (status) {
    result = result.filter(a => a.status === status);
  }
  if (category) {
    result = result.filter(a => a.categoryId === category);
  }
  if (tag) {
    result = result.filter(a => a.tags.includes(tag));
  }
  if (search) {
    const searchLower = search.toLowerCase();
    result = result.filter(a =>
      a.title.toLowerCase().includes(searchLower) ||
      a.content.toLowerCase().includes(searchLower) ||
      a.summary.toLowerCase().includes(searchLower)
    );
  }

  // Sort by views (most popular first)
  result.sort((a, b) => b.views - a.views);

  const total = result.length;
  result = result.slice(Number(offset), Number(offset) + Number(limit));

  res.json({ articles: result, total, limit: Number(limit), offset: Number(offset) });
});

// Get single article
app.get('/api/articles/:id', (req, res) => {
  const article = articles.get(req.params.id) ||
    Array.from(articles.values()).find(a => a.slug === req.params.id);

  if (!article) {
    return res.status(404).json({ error: 'Article not found' });
  }

  // Increment view count
  article.views++;

  res.json(article);
});

// Create article
app.post('/api/articles',requireAuth,  (req, res) => {
  const { title, content, summary, categoryId, author, authorId, tags, visibility } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required' });
  }

  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const id = `art-${uuidv4().slice(0, 8)}`;

  const article = {
    id,
    title,
    slug,
    content,
    summary: summary || content.slice(0, 200) + '...',
    categoryId: categoryId || 'cat-1',
    author: author || 'Anonymous',
    authorId: authorId || 'unknown',
    tags: tags || [],
    status: 'draft',
    visibility: visibility || 'public',
    views: 0,
    helpful: 0,
    notHelpful: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    publishedAt: null
  };

  articles.set(id, article);

  // Update category count
  const category = categories.get(article.categoryId);
  if (category) {
    category.articleCount++;
  }

  res.status(201).json(article);
});

// Update article
app.put('/api/articles/:id',requireAuth,  (req, res) => {
  const article = articles.get(req.params.id);

  if (!article) {
    return res.status(404).json({ error: 'Article not found' });
  }

  const { title, content, summary, categoryId, tags, status, visibility } = req.body;

  if (title) article.title = title;
  if (content) article.content = content;
  if (summary) article.summary = summary;
  if (categoryId) {
    // Decrement old category count
    const oldCategory = categories.get(article.categoryId);
    if (oldCategory) oldCategory.articleCount--;

    article.categoryId = categoryId;

    // Increment new category count
    const newCategory = categories.get(categoryId);
    if (newCategory) newCategory.articleCount++;
  }
  if (tags) article.tags = tags;
  if (status) {
    article.status = status;
    if (status === 'published' && !article.publishedAt) {
      article.publishedAt = new Date().toISOString();
    }
  }
  if (visibility) article.visibility = visibility;

  article.updatedAt = new Date().toISOString();

  res.json(article);
});

// Delete article
app.delete('/api/articles/:id',requireAuth,  (req, res) => {
  const article = articles.get(req.params.id);

  if (!article) {
    return res.status(404).json({ error: 'Article not found' });
  }

  // Decrement category count
  const category = categories.get(article.categoryId);
  if (category) category.articleCount--;

  articles.delete(req.params.id);

  res.json({ message: 'Article deleted successfully' });
});

// Publish article
app.post('/api/articles/:id/publish',requireAuth,  (req, res) => {
  const article = articles.get(req.params.id);

  if (!article) {
    return res.status(404).json({ error: 'Article not found' });
  }

  article.status = 'published';
  article.publishedAt = new Date().toISOString();
  article.updatedAt = new Date().toISOString();

  res.json(article);
});

// Rate article
app.post('/api/articles/:id/rate',requireAuth,  (req, res) => {
  const { helpful } = req.body;
  const article = articles.get(req.params.id);

  if (!article) {
    return res.status(404).json({ error: 'Article not found' });
  }

  if (helpful) {
    article.helpful++;
  } else {
    article.notHelpful++;
  }

  res.json({
    articleId: article.id,
    helpful: article.helpful,
    notHelpful: article.notHelpful,
    rating: article.helpful / (article.helpful + article.notHelpful) * 100
  });
});

// ==================== CATEGORIES API ====================

// Get all categories
app.get('/api/categories', (req, res) => {
  const result = Array.from(categories.values());
  res.json({ categories: result, total: result.length });
});

// Create category
app.post('/api/categories',requireAuth,  (req, res) => {
  const { name, description, icon } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Category name is required' });
  }

  const id = `cat-${uuidv4().slice(0, 8)}`;
  const category = {
    id,
    name,
    description: description || '',
    icon: icon || 'folder',
    articleCount: 0
  };

  categories.set(id, category);

  res.status(201).json(category);
});

// Update category
app.put('/api/categories/:id',requireAuth,  (req, res) => {
  const category = categories.get(req.params.id);

  if (!category) {
    return res.status(404).json({ error: 'Category not found' });
  }

  const { name, description, icon } = req.body;

  if (name) category.name = name;
  if (description) category.description = description;
  if (icon) category.icon = icon;

  res.json(category);
});

// Delete category
app.delete('/api/categories/:id',requireAuth,  (req, res) => {
  if (!categories.has(req.params.id)) {
    return res.status(404).json({ error: 'Category not found' });
  }

  categories.delete(req.params.id);

  res.json({ message: 'Category deleted successfully' });
});

// ==================== SEARCH API ====================

// AI-powered search
app.get('/api/search', (req, res) => {
  const { q, category, tags, limit = 20 } = req.query;

  if (!q) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  const query = q.toLowerCase();
  let results = Array.from(articles.values()).filter(a =>
    a.status === 'published' && a.visibility === 'public'
  );

  // Filter by category
  if (category) {
    results = results.filter(a => a.categoryId === category);
  }

  // Filter by tags
  if (tags) {
    const tagList = tags.split(',').map(t => t.trim());
    results = results.filter(a => tagList.some(t => a.tags.includes(t)));
  }

  // Score results based on relevance
  const scored = results.map(article => {
    let score = 0;
    const titleLower = article.title.toLowerCase();
    const contentLower = article.content.toLowerCase();

    // Title match (highest weight)
    if (titleLower.includes(query)) {
      score += 100;
      if (titleLower.startsWith(query)) score += 50;
    }

    // Content match
    if (contentLower.includes(query)) {
      score += 50;
      // Count occurrences
      const occurrences = (contentLower.match(new RegExp(query, 'g')) || []).length;
      score += Math.min(occurrences * 5, 30);
    }

    // Tag match
    if (article.tags.some(t => t.toLowerCase().includes(query))) {
      score += 30;
    }

    // Summary match
    if (article.summary.toLowerCase().includes(query)) {
      score += 20;
    }

    // Boost by views
    score += Math.log10(article.views + 1) * 5;

    // Boost by helpful rating
    const totalRatings = article.helpful + article.notHelpful;
    if (totalRatings > 0) {
      const rating = article.helpful / totalRatings;
      score += rating * 10;
    }

    return { article, score };
  });

  // Sort by score and take top results
  scored.sort((a, b) => b.score - a.score);
  const topResults = scored.slice(0, Number(limit)).map(s => ({
    ...s.article,
    relevanceScore: Math.round(s.score * 100) / 100
  }));

  // Generate search summary
  const summary = {
    query: q,
    totalFound: scored.length,
    returned: topResults.length,
    suggestions: generateSuggestions(q)
  };

  res.json({ results: topResults, ...summary });
});

// Generate search suggestions
function generateSuggestions(query) {
  const suggestions = [];
  const words = query.toLowerCase().split(' ');

  // Suggest related searches
  if (words.length > 0) {
    suggestions.push(`${query} guide`);
    suggestions.push(`how to ${query}`);
    suggestions.push(`${query} best practices`);
  }

  return suggestions;
}

// Related articles
app.get('/api/articles/:id/related', (req, res) => {
  const article = articles.get(req.params.id);

  if (!article) {
    return res.status(404).json({ error: 'Article not found' });
  }

  const related = Array.from(articles.values())
    .filter(a => a.id !== article.id && a.status === 'published')
    .map(a => {
      let score = 0;

      // Same category
      if (a.categoryId === article.categoryId) score += 30;

      // Shared tags
      const sharedTags = a.tags.filter(t => article.tags.includes(t));
      score += sharedTags.length * 20;

      // Similar title words
      const titleWords = article.title.toLowerCase().split(' ');
      const otherTitleWords = a.title.toLowerCase().split(' ');
      const commonWords = titleWords.filter(w => otherTitleWords.includes(w));
      score += commonWords.length * 15;

      return { ...a, score };
    })
    .filter(a => a.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  res.json({ related });
});

// ==================== STATISTICS API ====================

app.get('/api/statistics', (req, res) => {
  const allArticles = Array.from(articles.values());

  const stats = {
    total: allArticles.length,
    published: allArticles.filter(a => a.status === 'published').length,
    draft: allArticles.filter(a => a.status === 'draft').length,
    archived: allArticles.filter(a => a.status === 'archived').length,
    totalViews: allArticles.reduce((sum, a) => sum + a.views, 0),
    totalHelpful: allArticles.reduce((sum, a) => sum + a.helpful, 0),
    categories: categories.size,
    topArticles: allArticles
      .sort((a, b) => b.views - a.views)
      .slice(0, 5)
      .map(a => ({ id: a.id, title: a.title, views: a.views }))
  };

  res.json(stats);
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'knowledge-base',
    port: PORT,
    articles: articles.size,
    categories: categories.size
  });
});
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



const server = app.listen(PORT, () => {
  console.log(`📚 Knowledge Base Service running on port ${PORT}`);
  console.log(`   Articles: ${articles.size}`);
  console.log(`   Categories: ${categories.size}`);
});
installGracefulShutdown(server);
