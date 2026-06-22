/**
 * Search Routes
 *
 * Universal search across all memories
 */

const express = require('express');

module.exports = function(memories, tags, categories) {
  const router = express.Router();

  /**
   * GET /api/search
   * Universal search
   */
  router.get('/', (req, res) => {
    const { q, type, category, tag, date, limit = 20 } = req.query;

    if (!q) {
      return res.status(400).json({ success: false, error: 'Query required' });
    }

    const query = q.toLowerCase().trim();
    let results = Array.from(memories.values());

    // Text search
    if (query) {
      results = results.filter(m =>
        m.title?.toLowerCase().includes(query) ||
        m.content?.toLowerCase().includes(query) ||
        m.tags?.some(t => t.toLowerCase().includes(query)) ||
        m.url?.toLowerCase().includes(query) ||
        m.ocrText?.toLowerCase().includes(query)
      );
    }

    // Filters
    if (type) {
      results = results.filter(m => m.type === type);
    }
    if (category) {
      results = results.filter(m => m.category === category);
    }
    if (tag) {
      results = results.filter(m => m.tags?.includes(tag));
    }
    if (date) {
      results = results.filter(m => m.createdAt.startsWith(date));
    }

    // Score results
    const scored = results.map(memory => ({
      ...memory,
      score: calculateScore(memory, query)
    }));

    // Sort by score
    scored.sort((a, b) => b.score - a.score);

    // Limit
    const top = scored.slice(0, Number(limit));

    // Get suggestions
    const suggestions = generateSuggestions(query);

    res.json({
      success: true,
      query: q,
      total: scored.length,
      returned: top.length,
      results: top,
      suggestions
    });
  });

  /**
   * GET /api/search/semantic
   * AI-powered semantic search (simulated)
   */
  router.get('/semantic', (req, res) => {
    const { q, limit = 20 } = req.query;

    if (!q) {
      return res.status(400).json({ success: false, error: 'Query required' });
    }

    const query = q.toLowerCase();
    const results = Array.from(memories.values());

    // Semantic scoring based on:
    // 1. Exact match (100 points)
    // 2. Related keywords (50 points)
    // 3. Category match (30 points)
    // 4. Recent (20 points)

    const relatedTerms = getRelatedTerms(query);

    const scored = results.map(memory => {
      let score = 0;
      const titleLower = memory.title?.toLowerCase() || '';
      const contentLower = memory.content?.toLowerCase() || '';

      // Exact match in title
      if (titleLower.includes(query)) {
        score += 100;
        if (titleLower.startsWith(query)) score += 50;
      }

      // Exact match in content
      if (contentLower.includes(query)) {
        score += 50;
      }

      // Related terms
      for (const term of relatedTerms) {
        if (titleLower.includes(term) || contentLower.includes(term)) {
          score += 25;
        }
      }

      // Category match
      if (memory.category?.toLowerCase().includes(query)) {
        score += 30;
      }

      // Tag match
      if (memory.tags?.some(t => t.toLowerCase().includes(query))) {
        score += 40;
      }

      // Recency boost
      const age = Date.now() - new Date(memory.createdAt).getTime();
      const days = age / (1000 * 60 * 60 * 24);
      if (days < 7) score += 20;
      else if (days < 30) score += 10;

      return { ...memory, score };
    });

    // Sort and limit
    scored.sort((a, b) => b.score - a.score);
    const top = scored.filter(r => r.score > 0).slice(0, Number(limit));

    res.json({
      success: true,
      query: q,
      type: 'semantic',
      total: scored.filter(r => r.score > 0).length,
      returned: top.length,
      results: top
    });
  });

  /**
   * GET /api/search/people
   * Search for memories about people
   */
  router.get('/people', (req, res) => {
    const { q, limit = 20 } = req.query;

    const results = Array.from(memories.values())
      .filter(m => {
        // Look for relationship-related content
        if (m.classification?.twinType === 'relationship') return true;
        if (m.tags?.some(t => ['family', 'friend', 'personal'].includes(t))) return true;
        return false;
      });

    // If query provided, filter
    if (q) {
      const query = q.toLowerCase();
      return res.json({
        success: true,
        query: q,
        results: results.filter(m =>
          m.title?.toLowerCase().includes(query) ||
          m.content?.toLowerCase().includes(query)
        ).slice(0, Number(limit))
      });
    }

    res.json({
      success: true,
      results: results.slice(0, Number(limit))
    });
  });

  /**
   * GET /api/search/health
   * Search health-related memories
   */
  router.get('/health', (req, res) => {
    const { q, limit = 20 } = req.query;

    const results = Array.from(memories.values())
      .filter(m => {
        if (m.classification?.twinType === 'health') return true;
        if (m.category === 'health') return true;
        if (m.tags?.includes('health')) return true;
        return false;
      });

    if (q) {
      const query = q.toLowerCase();
      return res.json({
        success: true,
        query: q,
        results: results.filter(m =>
          m.title?.toLowerCase().includes(query) ||
          m.content?.toLowerCase().includes(query)
        ).slice(0, Number(limit))
      });
    }

    res.json({
      success: true,
      results: results.slice(0, Number(limit))
    });
  });

  /**
   * GET /api/search/finance
   * Search finance-related memories
   */
  router.get('/finance', (req, res) => {
    const { q, limit = 20 } = req.query;

    const results = Array.from(memories.values())
      .filter(m => {
        if (m.classification?.twinType === 'financial') return true;
        if (m.category === 'finance') return true;
        if (m.type === 'expense') return true;
        return false;
      });

    if (q) {
      const query = q.toLowerCase();
      return res.json({
        success: true,
        query: q,
        results: results.filter(m =>
          m.title?.toLowerCase().includes(query) ||
          m.content?.toLowerCase().includes(query) ||
          m.expenseData?.merchant?.toLowerCase().includes(query)
        ).slice(0, Number(limit))
      });
    }

    res.json({
      success: true,
      results: results.slice(0, Number(limit))
    });
  });

  /**
   * GET /api/search/related
   * Find related memories
   */
  router.get('/related/:id', (req, res) => {
    const memory = memories.get(req.params.id);

    if (!memory) {
      return res.status(404).json({ success: false, error: 'Memory not found' });
    }

    const allMemories = Array.from(memories.values())
      .filter(m => m.id !== memory.id);

    // Score related memories
    const scored = allMemories.map(m => {
      let score = 0;

      // Shared tags
      if (memory.tags && m.tags) {
        const sharedTags = memory.tags.filter(t => m.tags.includes(t));
        score += sharedTags.length * 30;
      }

      // Same category
      if (memory.category === m.category) score += 20;

      // Same type
      if (memory.type === m.type) score += 15;

      // Content similarity (simple word overlap)
      const words1 = (memory.content || '').toLowerCase().split(/\s+/);
      const words2 = (m.content || '').toLowerCase().split(/\s+/);
      const overlap = words1.filter(w => words2.includes(w) && w.length > 3);
      score += overlap.length * 5;

      return { ...m, relatedScore: score };
    });

    // Sort and return
    scored.sort((a, b) => b.relatedScore - a.relatedScore);

    res.json({
      success: true,
      memory: memory,
      related: scored.filter(r => r.relatedScore > 0).slice(0, 10)
    });
  });

  // Helper: Calculate relevance score
  function calculateScore(memory, query) {
    let score = 0;
    const titleLower = memory.title?.toLowerCase() || '';
    const contentLower = memory.content?.toLowerCase() || '';

    // Title match (highest)
    if (titleLower.includes(query)) {
      score += 100;
      if (titleLower.startsWith(query)) score += 50;
    }

    // Content match
    if (contentLower.includes(query)) {
      score += 50;
    }

    // Tag match
    if (memory.tags?.some(t => t.toLowerCase().includes(query))) {
      score += 40;
    }

    // Recency
    const age = Date.now() - new Date(memory.createdAt).getTime();
    if (age < 7 * 24 * 60 * 60 * 1000) score += 20;

    return score;
  }

  // Helper: Get related terms for semantic search
  function getRelatedTerms(query) {
    const termMap = {
      'meeting': ['call', 'conference', 'discussion', 'agenda', 'minutes'],
      'health': ['doctor', 'medicine', 'hospital', 'checkup', 'fitness', 'gym'],
      'finance': ['money', 'payment', 'expense', 'income', 'budget', 'bank'],
      'travel': ['flight', 'hotel', 'trip', 'vacation', 'booking'],
      'project': ['task', 'deadline', 'deliverable', 'milestone'],
      'contact': ['person', 'phone', 'email', 'address', 'call'],
      'restaurant': ['food', 'order', 'delivery', 'menu'],
      'hotel': ['room', 'booking', 'checkin', 'checkout', 'stay']
    };

    // Find related terms
    for (const [key, related] of Object.entries(termMap)) {
      if (query.includes(key)) {
        return related;
      }
    }

    return [];
  }

  // Helper: Generate search suggestions
  function generateSuggestions(query) {
    const suggestions = [];

    // Suggest common patterns
    if (query.length > 2) {
      suggestions.push(`${query} summary`);
      suggestions.push(`my ${query}`);
      suggestions.push(`${query} from last week`);
      suggestions.push(`all ${query}`);
    }

    // Suggest category searches
    const categories = ['personal', 'work', 'health', 'finance'];
    categories.forEach(cat => {
      if (query.includes(cat)) {
        suggestions.push(`${cat} memories`);
      }
    });

    return suggestions.slice(0, 5);
  }

  return router;
};
