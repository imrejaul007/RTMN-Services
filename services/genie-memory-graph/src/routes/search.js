/**
 * Search Routes - Unified search across all graphs
 */

import express from 'express';

const router = express.Router();

/**
 * GET /search/:userId
 * Universal search across all graphs
 */
router.get('/search/:userId', async (req, res) => {
  const { userId } = req.params;
  const { q, type, graph } = req.query;
  const storage = req.app.locals.graphStorage;

  if (!q) {
    return res.status(400).json({
      success: false,
      error: 'Query is required'
    });
  }

  const query = q.toLowerCase();
  const results = {
    identities: [],
    knowledge: [],
    relationships: [],
    goals: [],
    events: [],
    preferences: []
  };

  // Search identities
  const identity = storage.identities.get(userId);
  if (identity) {
    if (identity.name?.toLowerCase().includes(query) ||
        identity.bio?.toLowerCase().includes(query)) {
      results.identities.push(identity);
    }
  }

  // Search knowledge
  const knowledge = storage.knowledgeTriples.get(userId) || [];
  results.knowledge = knowledge.filter(t =>
    t.subject.toLowerCase().includes(query) ||
    t.predicate.toLowerCase().includes(query) ||
    t.object.toLowerCase().includes(query)
  ).slice(0, 20);

  // Search relationships
  const relationships = storage.relationships.get(userId) || [];
  results.relationships = relationships.filter(r =>
    r.name.toLowerCase().includes(query) ||
    r.notes?.toLowerCase().includes(query)
  );

  // Search goals
  const goals = storage.goals.get(userId) || [];
  results.goals = goals.filter(g =>
    g.title.toLowerCase().includes(query) ||
    g.description?.toLowerCase().includes(query)
  );

  // Search events
  const events = storage.events.get(userId) || [];
  results.events = events.filter(e =>
    e.title.toLowerCase().includes(query) ||
    e.description?.toLowerCase().includes(query) ||
    e.people?.some(p => p.toLowerCase().includes(query))
  );

  // Search preferences
  const preferences = storage.preferences.get(userId) || {};
  Object.keys(preferences).forEach(category => {
    Object.keys(preferences[category]).forEach(key => {
      const pref = preferences[category][key];
      if (key.toLowerCase().includes(query) ||
          pref.value?.toLowerCase().includes(query)) {
        results.preferences.push({
          category,
          key,
          ...pref
        });
      }
    });
  });

  // Filter by graph type if specified
  if (graph) {
    return res.json({
      success: true,
      query: q,
      results: results[graph] || [],
      total: results[graph]?.length || 0
    });
  }

  // Calculate total
  const total = Object.values(results).reduce((sum, arr) => sum + arr.length, 0);

  res.json({
    success: true,
    query: q,
    results,
    total,
    breakdown: {
      identities: results.identities.length,
      knowledge: results.knowledge.length,
      relationships: results.relationships.length,
      goals: results.goals.length,
      events: results.events.length,
      preferences: results.preferences.length
    }
  });
});

/**
 * GET /search/:userId/suggest
 * Get search suggestions
 */
router.get('/search/:userId/suggest', async (req, res) => {
  const { userId } = req.params;
  const { q } = req.query;
  const storage = req.app.locals.graphStorage;

  const query = (q || '').toLowerCase();
  const suggestions = [];

  // Get from relationships
  const relationships = storage.relationships.get(userId) || [];
  relationships.forEach(r => {
    if (r.name.toLowerCase().includes(query)) {
      suggestions.push({
        type: 'person',
        text: r.name,
        category: r.category
      });
    }
  });

  // Get from goals
  const goals = storage.goals.get(userId) || [];
  goals.filter(g => g.status === 'active').forEach(g => {
    if (g.title.toLowerCase().includes(query)) {
      suggestions.push({
        type: 'goal',
        text: g.title,
        category: g.type
      });
    }
  });

  // Get from knowledge
  const knowledge = storage.knowledgeTriples.get(userId) || [];
  const subjects = [...new Set(knowledge.map(k => k.subject))];
  subjects.forEach(s => {
    if (s.toLowerCase().includes(query)) {
      suggestions.push({
        type: 'knowledge',
        text: s,
        category: 'concept'
      });
    }
  });

  // Dedupe and limit
  const unique = suggestions.filter((s, i, arr) =>
    arr.findIndex(t => t.text === s.text) === i
  );

  res.json({
    success: true,
    suggestions: unique.slice(0, 10)
  });
});

/**
 * GET /search/:userId/recall
 * Recall memories related to query
 */
router.get('/search/:userId/recall', async (req, res) => {
  const { userId } = req.params;
  const { q, limit } = req.query;
  const storage = req.app.locals.graphStorage;

  if (!q) {
    return res.status(400).json({
      success: false,
      error: 'Query is required'
    });
  }

  const query = q.toLowerCase();
  const maxResults = parseInt(limit) || 10;
  const memories = [];

  // Find events matching query
  const events = storage.events.get(userId) || [];
  events.forEach(e => {
    if (e.title.toLowerCase().includes(query) ||
        e.description?.toLowerCase().includes(query)) {
      memories.push({
        type: 'event',
        title: e.title,
        date: e.date,
        description: e.description,
        relevance: calculateRelevance(query, e.title + ' ' + (e.description || ''))
      });
    }
  });

  // Find knowledge matching query
  const knowledge = storage.knowledgeTriples.get(userId) || [];
  knowledge.forEach(k => {
    if (k.subject.toLowerCase().includes(query) ||
        k.object.toLowerCase().includes(query)) {
      memories.push({
        type: 'knowledge',
        subject: k.subject,
        predicate: k.predicate,
        object: k.object,
        date: k.createdAt,
        relevance: calculateRelevance(query, k.subject + ' ' + k.object)
      });
    }
  });

  // Find relationship interactions
  const relationships = storage.relationships.get(userId) || [];
  relationships.forEach(r => {
    if (r.name.toLowerCase().includes(query)) {
      memories.push({
        type: 'relationship',
        person: r.name,
        lastInteraction: r.lastInteraction,
        relevance: 1
      });
    }
  });

  // Sort by relevance
  memories.sort((a, b) => b.relevance - a.relevance);

  res.json({
    success: true,
    query: q,
    memories: memories.slice(0, maxResults),
    count: memories.length
  });
});

// Helper function
function calculateRelevance(query, text) {
  const q = query.toLowerCase();
  const t = text.toLowerCase();

  let score = 0;

  // Exact match
  if (t.includes(q)) score += 1;

  // Word matches
  const queryWords = q.split(' ');
  const textWords = t.split(' ');
  queryWords.forEach(w => {
    if (textWords.includes(w)) score += 0.5;
  });

  return score;
}

export default router;
