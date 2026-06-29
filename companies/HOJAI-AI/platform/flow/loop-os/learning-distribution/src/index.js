/**
 * LoopOS Learning Distribution Engine
 * Share learnings across agents and organizations
 * Port: 4748
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { randomUUID } from 'node:crypto';
import winston from 'winston';

const app = express();
const PORT = process.env.PORT || 4748;
const API_KEY = process.env.HOJAI_API_KEY || 'dev-key';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()]
});

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

function requireAuth(req, res, next) {
  const key = req.headers.authorization?.replace('Bearer ', '');
  if (key !== API_KEY) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// Learning visibility levels
const VISIBILITY = {
  PRIVATE: 'private',
  TEAM: 'team',
  DEPARTMENT: 'department',
  ORGANIZATION: 'organization',
  NETWORK: 'network',  // Nexha network
  PUBLIC: 'public'
};

// Learning types
const TYPES = {
  SUCCESS: 'success',
  FAILURE: 'failure',
  BEST_PRACTICE: 'best_practice',
  LESSON: 'lesson',
  PATTERN: 'pattern',
  INSIGHT: 'insight'
};

// In-memory stores
const learnings = new Map();      // learningId -> Learning
const policies = new Map();       // policyId -> DistributionPolicy
const subscriptions = new Map();   // agentId -> Set<topic>
const learningIndex = new Map();  // topic -> Set<learningId>
const orgLearnings = new Map();   // orgId -> Set<learningId>

// ── Health ──────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({
  status: 'ok',
  service: 'loopos-learning-distribution',
  version: '1.0.0',
  port: PORT,
  learnings: learnings.size,
  policies: policies.size
}));

app.get('/ready', (_req, res) => res.json({ ready: true, timestamp: new Date().toISOString() }));

// ── Learning Management ──────────────────────────────────

/**
 * Record a learning
 * POST /api/learnings
 */
app.post('/api/learnings', requireAuth, (req, res) => {
  const {
    agentId,
    organizationId,
    type = TYPES.INSIGHT,
    title,
    content,
    context = {},
    outcome,
    visibility = VISIBILITY.ORGANIZATION,
    tags = [],
    source = 'agent'
  } = req.body || {};

  if (!title && !content) {
    return res.status(400).json({ error: 'title or content is required' });
  }

  const id = `learning-${randomUUID().slice(0, 8)}`;

  const learning = {
    id,
    agentId,
    organizationId,
    type,
    title: title || content.slice(0, 100),
    content,
    context,
    outcome,
    visibility,
    tags,
    source,
    ratings: [],
    applications: [],
    status: 'active',
    versions: [{ version: 1, content, createdAt: new Date().toISOString() }],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  learnings.set(id, learning);

  // Index by tags
  for (const tag of tags) {
    if (!learningIndex.has(tag)) {
      learningIndex.set(tag, new Set());
    }
    learningIndex.get(tag).add(id);
  }

  // Index by organization
  if (organizationId) {
    if (!orgLearnings.has(organizationId)) {
      orgLearnings.set(organizationId, new Set());
    }
    orgLearnings.get(organizationId).add(id);
  }

  logger.info(`Learning recorded: ${id} (${type}) by ${agentId}`);
  res.status(201).json(learning);
});

/**
 * Get learning
 * GET /api/learnings/:id
 */
app.get('/api/learnings/:id', (req, res) => {
  const learning = learnings.get(req.params.id);
  if (!learning) return res.status(404).json({ error: 'learning not found' });
  res.json(learning);
});

/**
 * List learnings
 * GET /api/learnings
 */
app.get('/api/learnings', (req, res) => {
  const { type, visibility, tag, agentId, organizationId, q, limit = 50 } = req.query;
  let items = [...learnings.values()];

  if (type) items = items.filter(l => l.type === type);
  if (visibility) items = items.filter(l => l.visibility === visibility);
  if (agentId) items = items.filter(l => l.agentId === agentId);
  if (organizationId) items = items.filter(l => l.organizationId === organizationId);
  if (tag) items = items.filter(l => l.tags.includes(tag));
  if (q) {
    const term = q.toLowerCase();
    items = items.filter(l =>
      l.title.toLowerCase().includes(term) ||
      l.content?.toLowerCase().includes(term)
    );
  }

  items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  items = items.slice(0, Number(limit));

  res.json({ count: items.length, learnings: items });
});

/**
 * Update learning
 * PUT /api/learnings/:id
 */
app.put('/api/learnings/:id', requireAuth, (req, res) => {
  const learning = learnings.get(req.params.id);
  if (!learning) return res.status(404).json({ error: 'learning not found' });

  const { content, tags, visibility, status } = req.body || {};

  if (content && content !== learning.content) {
    learning.versions.push({
      version: learning.versions.length + 1,
      content,
      createdAt: new Date().toISOString()
    });
    learning.content = content;
  }

  if (tags) learning.tags = tags;
  if (visibility) learning.visibility = visibility;
  if (status) learning.status = status;
  learning.updatedAt = new Date().toISOString();

  res.json(learning);
});

/**
 * Delete learning
 * DELETE /api/learnings/:id
 */
app.delete('/api/learnings/:id', requireAuth, (req, res) => {
  if (!learnings.has(req.params.id)) return res.status(404).json({ error: 'learning not found' });
  learnings.delete(req.params.id);
  res.json({ deleted: true });
});

// ── Rating & Feedback ──────────────────────────────────

/**
 * Rate a learning
 * POST /api/learnings/:id/rate
 */
app.post('/api/learnings/:id/rate', requireAuth, (req, res) => {
  const learning = learnings.get(req.params.id);
  if (!learning) return res.status(404).json({ error: 'learning not found' });

  const { agentId, rating, feedback } = req.body || {};

  // Check if already rated
  const existingRating = learning.ratings.find(r => r.agentId === agentId);

  if (existingRating) {
    existingRating.rating = rating;
    existingRating.feedback = feedback;
    existingRating.updatedAt = new Date().toISOString();
  } else {
    learning.ratings.push({
      agentId,
      rating,
      feedback,
      createdAt: new Date().toISOString()
    });
  }

  res.json(learning);
});

/**
 * Mark learning as applied
 * POST /api/learnings/:id/apply
 */
app.post('/api/learnings/:id/apply', requireAuth, (req, res) => {
  const learning = learnings.get(req.params.id);
  if (!learning) return res.status(404).json({ error: 'learning not found' });

  const { agentId, context = {}, result } = req.body || {};

  learning.applications.push({
    agentId,
    context,
    result,
    appliedAt: new Date().toISOString()
  });

  res.json(learning);
});

// ── Distribution Policies ────────────────────────────────

/**
 * Create distribution policy
 * POST /api/policies
 */
app.post('/api/policies', requireAuth, (req, res) => {
  const {
    name,
    organizationId,
    scope = 'organization',
    rules = [],
    autoShare = false,
    filters = {}
  } = req.body || {};

  if (!name) return res.status(400).json({ error: 'name is required' });

  const id = `policy-${randomUUID().slice(0, 8)}`;

  const policy = {
    id,
    name,
    organizationId,
    scope,
    rules,
    autoShare,
    filters,
    stats: { shared: 0, applied: 0 },
    createdAt: new Date().toISOString()
  };

  policies.set(id, policy);
  logger.info(`Distribution policy created: ${id} (${name})`);
  res.status(201).json(policy);
});

/**
 * List policies
 * GET /api/policies
 */
app.get('/api/policies', (req, res) => {
  const { organizationId, scope } = req.query;
  let items = [...policies.values()];

  if (organizationId) items = items.filter(p => p.organizationId === organizationId);
  if (scope) items = items.filter(p => p.scope === scope);

  res.json({ count: items.length, policies: items });
});

/**
 * Update policy
 * PUT /api/policies/:id
 */
app.put('/api/policies/:id', requireAuth, (req, res) => {
  const policy = policies.get(req.params.id);
  if (!policy) return res.status(404).json({ error: 'policy not found' });

  const { rules, autoShare, filters, status } = req.body || {};

  if (rules) policy.rules = rules;
  if (autoShare !== undefined) policy.autoShare = autoShare;
  if (filters) policy.filters = filters;

  res.json(policy);
});

// ── Topic Subscriptions ────────────────────────────────

/**
 * Subscribe to topic
 * POST /api/subscriptions
 */
app.post('/api/subscriptions', requireAuth, (req, res) => {
  const { agentId, topics = [] } = req.body || {};

  if (!agentId) return res.status(400).json({ error: 'agentId is required' });

  if (!subscriptions.has(agentId)) {
    subscriptions.set(agentId, new Set());
  }

  for (const topic of topics) {
    subscriptions.get(agentId).add(topic);
  }

  res.json({ subscribed: true, topics });
});

/**
 * Get subscriptions for agent
 * GET /api/subscriptions/:agentId
 */
app.get('/api/subscriptions/:agentId', (req, res) => {
  const subs = subscriptions.get(req.params.agentId) || new Set();
  res.json({ agentId: req.params.agentId, topics: [...subs] });
});

/**
 * Get relevant learnings for agent
 * GET /api/learnings/relevant/:agentId
 */
app.get('/api/learnings/relevant/:agentId', (req, res) => {
  const { limit = 20, minRating } = req.query;
  const subs = subscriptions.get(req.params.agentId) || new Set();

  let relevant = [...learnings.values()].filter(l => {
    // Filter by visibility and relevance
    if (l.visibility === VISIBILITY.PRIVATE && l.agentId !== req.params.agentId) return false;
    return l.tags.some(tag => subs.has(tag));
  });

  // Also get highly-rated learnings
  const highlyRated = [...learnings.values()]
    .filter(l => {
      if (l.visibility === VISIBILITY.PRIVATE) return false;
      const avgRating = calculateAverageRating(l.ratings);
      return avgRating >= (Number(minRating) || 4);
    })
    .sort((a, b) => calculateAverageRating(b.ratings) - calculateAverageRating(a.ratings))
    .slice(0, 10);

  relevant = [...relevant, ...highlyRated];

  // Remove duplicates and sort
  const seen = new Set();
  relevant = relevant.filter(l => {
    if (seen.has(l.id)) return false;
    seen.add(l.id);
    return true;
  });

  relevant.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  relevant = relevant.slice(0, Number(limit));

  res.json({ count: relevant.length, learnings: relevant });
});

// ── Organization Learning ────────────────────────────────

/**
 * Get organization learnings
 * GET /api/organizations/:orgId/learnings
 */
app.get('/api/organizations/:orgId/learnings', (req, res) => {
  const { type, tag, limit = 50 } = req.query;
  let items = [...learnings.values()].filter(l =>
    l.organizationId === req.params.orgId &&
    (l.visibility === VISIBILITY.ORGANIZATION ||
     l.visibility === VISIBILITY.DEPARTMENT ||
     l.visibility === VISIBILITY.TEAM)
  );

  if (type) items = items.filter(l => l.type === type);
  if (tag) items = items.filter(l => l.tags.includes(tag));

  items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  items = items.slice(0, Number(limit));

  // Calculate stats
  const stats = {
    total: items.length,
    byType: {},
    avgRating: 0,
    totalApplications: 0
  };

  for (const l of items) {
    stats.byType[l.type] = (stats.byType[l.type] || 0) + 1;
    stats.totalApplications += l.applications.length;
  }

  const rated = items.filter(l => l.ratings.length > 0);
  if (rated.length > 0) {
    stats.avgRating = rated.reduce((sum, l) => sum + calculateAverageRating(l.ratings), 0) / rated.length;
  }

  res.json({ organizationId: req.params.orgId, stats, learnings: items });
});

/**
 * Share learning to network (Nexha)
 * POST /api/learnings/:id/share
 */
app.post('/api/learnings/:id/share', requireAuth, (req, res) => {
  const learning = learnings.get(req.params.id);
  if (!learning) return res.status(404).json({ error: 'learning not found' });

  const { target, visibility = VISIBILITY.NETWORK } = req.body || {};

  if (!['network', 'public'].includes(visibility)) {
    return res.status(400).json({ error: 'Invalid visibility for sharing' });
  }

  learning.visibility = visibility;
  learning.sharedTo = target || 'nexha_network';
  learning.sharedAt = new Date().toISOString();

  logger.info(`Learning ${learning.id} shared to ${target || 'Nexha network'}`);

  res.json(learning);
});

// ── Search & Discovery ──────────────────────────────────

/**
 * Search learnings
 * GET /api/search
 */
app.get('/api/search', (req, res) => {
  const { q, type, tags, minRating, limit = 20 } = req.query;

  if (!q) return res.status(400).json({ error: 'query (q) is required' });

  const term = q.toLowerCase();
  let results = [...learnings.values()].filter(l =>
    l.title.toLowerCase().includes(term) ||
    l.content?.toLowerCase().includes(term) ||
    l.tags.some(t => t.toLowerCase().includes(term))
  );

  if (type) results = results.filter(l => l.type === type);
  if (tags) {
    const tagList = tags.split(',');
    results = results.filter(l => tagList.some(t => l.tags.includes(t)));
  }
  if (minRating) {
    results = results.filter(l => calculateAverageRating(l.ratings) >= Number(minRating));
  }

  // Sort by relevance and rating
  results.sort((a, b) => {
    const ratingDiff = calculateAverageRating(b.ratings) - calculateAverageRating(a.ratings);
    if (ratingDiff !== 0) return ratingDiff;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  results = results.slice(0, Number(limit));

  res.json({ count: results.length, learnings: results });
});

/**
 * Get trending learnings
 * GET /api/trending
 */
app.get('/api/trending', (req, res) => {
  const { period = '7d', limit = 10 } = req.query;

  const now = new Date();
  const periodMs = {
    '1d': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000
  }[period] || 7 * 24 * 60 * 60 * 1000;

  const recent = [...learnings.values()].filter(l =>
    new Date(l.createdAt).getTime() > now.getTime() - periodMs
  );

  // Score by engagement (ratings + applications)
  const scored = recent.map(l => ({
    ...l,
    engagementScore: l.ratings.length * 2 + l.applications.length
  }));

  scored.sort((a, b) => b.engagementScore - a.engagementScore);

  res.json({
    period,
    count: scored.length,
    learnings: scored.slice(0, Number(limit))
  });
});

/**
 * Get learning analytics
 * GET /api/analytics
 */
app.get('/api/analytics', (req, res) => {
  const { organizationId, period } = req.query;

  let items = [...learnings.values()];

  if (organizationId) {
    items = items.filter(l => l.organizationId === organizationId);
  }

  const totalLearnings = items.length;
  const totalRatings = items.reduce((sum, l) => sum + l.ratings.length, 0);
  const totalApplications = items.reduce((sum, l) => sum + l.applications.length, 0);

  const byType = {};
  const byVisibility = {};
  const byTag = {};

  for (const l of items) {
    byType[l.type] = (byType[l.type] || 0) + 1;
    byVisibility[l.visibility] = (byVisibility[l.visibility] || 0) + 1;
    for (const tag of l.tags) {
      byTag[tag] = (byTag[tag] || 0) + 1;
    }
  }

  const topTags = Object.entries(byTag)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag, count]) => ({ tag, count }));

  res.json({
    totalLearnings,
    totalRatings,
    totalApplications,
    avgRating: totalRatings / (items.filter(l => l.ratings.length > 0).length || 0,
    byType,
    byVisibility,
    topTags,
    timestamp: new Date().toISOString()
  });
});

// ── Helper Functions ───────────────────────────────────

function calculateAverageRating(ratings) {
  if (!ratings || ratings.length === 0) return 0;
  return ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
}

// ── Start Server ────────────────────────────────────────
const server = app.listen(PORT, () => {
  logger.info(`LoopOS Learning Distribution Engine listening on port ${PORT}`);
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => server.close(() => process.exit(0)));

export default app;
