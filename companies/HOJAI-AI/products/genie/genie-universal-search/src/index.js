/**
 * Genie Universal Search Service
 * Port: 4713
 *
 * Search across everything:
 * - Memories (from Memory Inbox)
 * - Twins (Personal, Health, Financial, Relationship)
 * - Files and documents
 * - People and contacts
 * - Calendar events
 * - Tasks and projects
 */

const express = require('express');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { requireAuth } = require('@rtmn/shared/auth');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const { installReadinessRoutes, autoSeed, normalizeSeedData } = require('@rtmn/shared/lib/genie-readiness');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const MemorySearch = require('./search/memory');
const TwinSearch = require('./search/twin');
const SemanticSearch = require('./search/semantic');
const IndexManager = require('./indexing/manager');

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
const PORT = process.env.GENIE_SEARCH_PORT || 4713;

app.use(helmet());
app.use(cors());
app.use(express.json());

const memorySearch = new MemorySearch();
const twinSearch = new TwinSearch();
const semanticSearch = new SemanticSearch();
const indexManager = new IndexManager();

const searchIndex = new PersistentMap('search-index', { serviceName: 'genie-universal-search' });
const recentSearches = new PersistentMap('recent-searches', { serviceName: 'genie-universal-search' });
const savedSearches = new PersistentMap('saved-searches', { serviceName: 'genie-universal-search' });

// ==================== HEALTH ====================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'genie-universal-search',
    version: '1.0.0',
    port: PORT,
    indexed: searchIndex.size
  });
});

// ==================== MAIN SEARCH ====================

/**
 * GET /api/search - Universal search
 */
app.get('/api/search', async (req, res) => {
  try {
    const { q, type, category, sources, limit = 20, offset = 0 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Query must be at least 2 characters'
      });
    }

    const query = q.trim();
    const sourceList = sources ? sources.split(',') : ['memories', 'twins', 'calendar', 'tasks', 'people'];

    trackSearch(query);
    const results = await executeUniversalSearch(query, {
      sources: sourceList,
      type,
      category,
      limit: Number(limit),
      offset: Number(offset)
    });

    results.sort((a, b) => b.score - a.score);
    const suggestions = generateSuggestions(query);

    res.json({
      success: true,
      query,
      total: results.length,
      returned: Math.min(results.length, Number(limit)),
      results: results.slice(Number(offset), Number(offset) + Number(limit)),
      suggestions
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/search/semantic - AI semantic search
 */
app.get('/api/search/semantic', async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;
    if (!q) return res.status(400).json({ success: false, error: 'Query required' });

    const results = await semanticSearch.search(q, { limit: Number(limit) });
    res.json({ success: true, query: q, type: 'semantic', results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== SOURCE-SPECIFIC SEARCH ====================

/**
 * GET /api/search/memories
 */
app.get('/api/search/memories', async (req, res) => {
  try {
    const { q, type, category, tag, limit = 20 } = req.query;
    if (!q) return res.status(400).json({ success: false, error: 'Query required' });

    const results = await memorySearch.search(q, { type, category, tag, limit: Number(limit) });
    res.json({ success: true, query: q, source: 'memories', results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/search/twins
 */
app.get('/api/search/twins', async (req, res) => {
  try {
    const { q, twinType, limit = 20 } = req.query;
    if (!q) return res.status(400).json({ success: false, error: 'Query required' });

    const results = await twinSearch.search(q, { twinType, limit: Number(limit) });
    res.json({ success: true, query: q, source: 'twins', results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/search/people
 */
app.get('/api/search/people', async (req, res) => {
  try {
    const { q, relationship, limit = 20 } = req.query;
    const results = await twinSearch.searchPeople(q, { relationship, limit: Number(limit) });
    res.json({ success: true, query: q, source: 'people', results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/search/health
 */
app.get('/api/search/health', async (req, res) => {
  try {
    const { q, startDate, endDate, metric, limit = 20 } = req.query;
    const results = await twinSearch.searchHealth(q, { startDate, endDate, metric, limit: Number(limit) });
    res.json({ success: true, query: q, source: 'health', results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/search/finance
 */
app.get('/api/search/finance', async (req, res) => {
  try {
    const { q, type, startDate, endDate, limit = 20 } = req.query;
    const results = await twinSearch.searchFinance(q, { type, startDate, endDate, limit: Number(limit) });
    res.json({ success: true, query: q, source: 'finance', results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/search/calendar
 */
app.get('/api/search/calendar', async (req, res) => {
  try {
    const { q, startDate, endDate, type, limit = 20 } = req.query;
    const results = await searchCalendarEvents(q, { startDate, endDate, type, limit: Number(limit) });
    res.json({ success: true, query: q, source: 'calendar', results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/search/tasks
 */
app.get('/api/search/tasks', async (req, res) => {
  try {
    const { q, status, priority, project, limit = 20 } = req.query;
    const results = await searchTasks(q, { status, priority, project, limit: Number(limit) });
    res.json({ success: true, query: q, source: 'tasks', results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== SAVED SEARCHES ====================

/**
 * POST /api/search/saved - Save a search
 */
app.post('/api/search/saved',requireAuth,  (req, res) => {
  const { userId, name, query, filters } = req.body;
  if (!userId || !name || !query) {
    return res.status(400).json({ success: false, error: 'userId, name, and query required' });
  }

  const saved = { id: uuidv4(), userId, name, query, filters: filters || {}, createdAt: new Date().toISOString() };
  savedSearches.set(saved.id, saved);
  res.status(201).json({ success: true, saved });
});

/**
 * GET /api/search/saved
 */
app.get('/api/search/saved', (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ success: false, error: 'userId required' });

  const userSearches = Array.from(savedSearches.values())
    .filter(s => s.userId === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({ success: true, searches: userSearches });
});

/**
 * DELETE /api/search/saved/:id
 */
app.delete('/api/search/saved/:id',requireAuth,  (req, res) => {
  if (!savedSearches.has(req.params.id)) {
    return res.status(404).json({ success: false, error: 'Not found' });
  }
  savedSearches.delete(req.params.id);
  res.json({ success: true, message: 'Deleted' });
});

// ==================== RECENT SEARCHES ====================

/**
 * GET /api/search/recent
 */
app.get('/api/search/recent', (req, res) => {
  const { userId, limit = 10 } = req.query;
  const recent = Array.from(recentSearches.values())
    .filter(s => !userId || s.userId === userId)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, Number(limit));

  res.json({ success: true, recent });
});

/**
 * DELETE /api/search/recent
 */
app.delete('/api/search/recent',requireAuth,  (req, res) => {
  const { userId } = req.query;
  if (userId) {
    for (const [id, search] of recentSearches) {
      if (search.userId === userId) recentSearches.delete(id);
    }
  } else {
    recentSearches.clear();
  }
  res.json({ success: true, message: 'Cleared' });
});

// ==================== SUGGESTIONS ====================

/**
 * GET /api/search/suggestions
 */
app.get('/api/search/suggestions', (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) return res.json({ success: true, suggestions: [] });
  res.json({ success: true, suggestions: generateSuggestions(q) });
});

/**
 * GET /api/search/trending
 */
app.get('/api/search/trending', (req, res) => {
  const trending = Array.from(recentSearches.values())
    .reduce((acc, search) => {
      const key = search.query.toLowerCase();
      acc[key] = acc[key] || { query: search.query, count: 0 };
      acc[key].count++;
      return acc;
    }, {});

  const topTrending = Object.values(trending)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  res.json({ success: true, trending: topTrending });
});

// ==================== INDEX MANAGEMENT ====================

/**
 * POST /api/index/rebuild
 */
app.post('/api/index/rebuild',requireAuth, async (req, res) => {
  try {
    await indexManager.rebuildIndex(searchIndex);
    res.json({ success: true, message: 'Index rebuilt', indexed: searchIndex.size });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/index/add
 */
app.post('/api/index/add',requireAuth,  (req, res) => {
  const { id, type, title, content, metadata = {} } = req.body;
  if (!id || !type) return res.status(400).json({ success: false, error: 'id and type required' });

  indexManager.addToIndex(searchIndex, { id, type, title, content, metadata });
  res.status(201).json({ success: true, indexed: searchIndex.size });
});

// ==================== HELPERS ====================

async function executeUniversalSearch(query, options) {
  const { sources, type, category, limit } = options;
  const results = [];

  if (sources.includes('memories')) {
    const memories = await memorySearch.search(query, { type, category, limit });
    results.push(...memories.map(r => ({ ...r, source: 'memory' })));
  }

  if (sources.includes('twins')) {
    const twins = await twinSearch.search(query, { limit });
    results.push(...twins.map(r => ({ ...r, source: 'twin' })));
  }

  if (sources.includes('people')) {
    const people = await twinSearch.searchPeople(query, { limit });
    results.push(...people.map(r => ({ ...r, source: 'person' })));
  }

  if (sources.includes('calendar')) {
    const events = await searchCalendarEvents(query, { limit });
    results.push(...events.map(r => ({ ...r, source: 'calendar' })));
  }

  if (sources.includes('tasks')) {
    const tasks = await searchTasks(query, { limit });
    results.push(...tasks.map(r => ({ ...r, source: 'task' })));
  }

  if (sources.includes('knowledge')) {
    const knowledge = await searchKnowledge(query, { limit });
    results.push(...knowledge.map(r => ({ ...r, source: 'knowledge' })));
  }

  return results;
}

function trackSearch(query, userId = 'anonymous') {
  const entry = { id: uuidv4(), query, userId, timestamp: new Date().toISOString() };
  recentSearches.set(entry.id, entry);
  if (recentSearches.size > 100) {
    const oldest = Array.from(recentSearches.entries())
      .sort((a, b) => new Date(a[1].timestamp) - new Date(b[1].timestamp))[0];
    if (oldest) recentSearches.delete(oldest[0]);
  }
}

function generateSuggestions(query) {
  const suggestions = [];
  const q = query.toLowerCase();

  if (q.includes('meeting')) suggestions.push('meeting notes', 'past meetings', 'meeting with');
  if (q.includes('project')) suggestions.push('my projects', 'active projects', 'project status');
  if (q.includes('contact') || q.includes('person')) suggestions.push('people I know', 'recent contacts', 'calls');
  if (q.includes('expense') || q.includes('payment')) suggestions.push('recent expenses', 'payments made', 'transactions');
  if (q.includes('health') || q.includes('medical')) suggestions.push('health records', 'appointments', 'medications');

  suggestions.push(`"${query}" summary`, `all ${query}`, `my ${query}`);
  return suggestions.slice(0, 8);
}

async function searchCalendarEvents(query, options) {
  const events = [
    { id: 'evt-1', title: 'Team Standup', date: '2026-06-18', time: '10:00 AM', type: 'meeting' },
    { id: 'evt-2', title: 'Client Call', date: '2026-06-18', time: '2:00 PM', type: 'meeting' },
    { id: 'evt-3', title: 'Project Review', date: '2026-06-19', time: '11:00 AM', type: 'meeting' }
  ];

  const q = query.toLowerCase();
  return events.filter(e => e.title.toLowerCase().includes(q) || e.type.toLowerCase().includes(q))
    .slice(0, options.limit || 10);
}

async function searchTasks(query, options) {
  const tasks = [
    { id: 'task-1', title: 'Review Q2 report', status: 'pending', priority: 'high' },
    { id: 'task-2', title: 'Send proposal', status: 'in-progress', priority: 'high' },
    { id: 'task-3', title: 'Update docs', status: 'pending', priority: 'medium' }
  ];

  const q = query.toLowerCase();
  return tasks.filter(t => t.title.toLowerCase().includes(q) || t.status.toLowerCase().includes(q))
    .slice(0, options.limit || 10);
}

async function searchKnowledge(query, options) {
  const articles = [
    { id: 'kb-1', title: 'Getting Started Guide', type: 'guide' },
    { id: 'kb-2', title: 'API Documentation', type: 'docs' },
    { id: 'kb-3', title: 'Best Practices', type: 'article' }
  ];

  const q = query.toLowerCase();
  return articles.filter(a => a.title.toLowerCase().includes(q))
    .slice(0, options.limit || 10);
}
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



// Install readiness routes (LLM + DB + combined readiness)
installReadinessRoutes(app, { serviceName: 'genie-universal-search' });

// Seed search index and saved/recent searches on first boot
const searchSeedPlans = [
  {
    store: searchIndex,
    items: normalizeSeedData([
      { id: 'idx-1', type: 'memory', title: 'Q2 Strategy Notes', content: 'Roadmap, hiring, and product launch plans for Q2 2026', metadata: { source: 'memory', tags: ['strategy', 'q2'] } },
      { id: 'idx-2', type: 'memory', title: 'Customer Interview - Acme Corp', content: 'Acme wants invoice automation and payroll integration', metadata: { source: 'memory', tags: ['customer', 'sales'] } },
      { id: 'idx-3', type: 'event', title: 'Team Standup', content: 'Daily 9:00 AM standup on Zoom', metadata: { source: 'calendar', tags: ['meeting'] } },
      { id: 'idx-4', type: 'task', title: 'Review Q2 report', content: 'Pending report review before Friday board meeting', metadata: { source: 'tasks', tags: ['high-priority'] } },
      { id: 'idx-5', type: 'article', title: 'API Documentation', content: 'Complete API docs for v2 endpoints and webhooks', metadata: { source: 'knowledge', tags: ['docs'] } },
      { id: 'idx-6', type: 'contact', title: 'Ali Khan', content: 'Partnership contact at CorpPerks', metadata: { source: 'people', tags: ['contact'] } },
      { id: 'idx-7', type: 'event', title: 'Client Call - Acme', content: 'Demo call scheduled for 2 PM Thursday', metadata: { source: 'calendar', tags: ['meeting', 'sales'] } },
    ]),
  },
  {
    store: savedSearches,
    items: normalizeSeedData([
      { id: 'sv-1', userId: 'demo-user', name: 'Q2 strategy', query: 'Q2 strategy', filters: { type: 'memory' } },
      { id: 'sv-2', userId: 'demo-user', name: 'Acme meetings', query: 'Acme', filters: { type: 'event' } },
      { id: 'sv-3', userId: 'demo-user', name: 'High priority tasks', query: 'review', filters: { type: 'task', priority: 'high' } },
    ]),
  },
  {
    store: recentSearches,
    items: normalizeSeedData([
      { id: 'rs-1', query: 'Q2 strategy', userId: 'demo-user', timestamp: '2026-06-22T08:00:00Z' },
      { id: 'rs-2', query: 'Acme', userId: 'demo-user', timestamp: '2026-06-22T08:15:00Z' },
      { id: 'rs-3', query: 'review', userId: 'demo-user', timestamp: '2026-06-22T08:30:00Z' },
    ]),
  },
];
const searchSeeded = autoSeed(searchSeedPlans, { serviceName: 'genie-universal-search' });
if (searchSeeded) console.log('[genie-universal-search] demo data seeded');

const server = app.listen(PORT, () => {
  console.log('Genie Universal Search started on port ' + PORT);
});
installGracefulShutdown(server);

module.exports = app;
