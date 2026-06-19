/**
 * Index Manager
 * Manages the search index for fast lookups
 */

class IndexManager {
  constructor() {
    this.index = new Map();
    this.lastIndexed = null;
  }

  /**
   * Add item to index
   */
  addToIndex(index, item) {
    const { id, type, title, content, metadata = {} } = item;

    // Create searchable text
    const searchableText = [
      title,
      content,
      type,
      metadata.category,
      ...(metadata.tags || [])
    ].filter(Boolean).join(' ').toLowerCase();

    // Tokenize
    const tokens = this.tokenize(searchableText);

    // Index each token
    tokens.forEach(token => {
      if (!this.index.has(token)) {
        this.index.set(token, []);
      }
      const entries = this.index.get(token);
      if (!entries.find(e => e.id === id)) {
        entries.push({ id, type, weight: this.getTokenWeight(token, title, content) });
      }
    });

    // Store item metadata
    this.index.set(`__item_${id}`, item);
  }

  /**
   * Rebuild index from data source
   */
  async rebuildIndex(index) {
    // Clear existing index
    this.index.clear();

    // In production, this would:
    // 1. Fetch all memories from Memory Inbox
    // 2. Fetch all twin data
    // 3. Fetch calendar events
    // 4. Index everything

    const items = this.getAllItems();

    items.forEach(item => {
      this.addToIndex(this.index, item);
    });

    this.lastIndexed = new Date().toISOString();

    return { indexed: this.index.size, items: items.length };
  }

  /**
   * Tokenize text for indexing
   */
  tokenize(text) {
    if (!text) return [];

    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length >= 2)
      .filter(token => !this.isStopWord(token));
  }

  /**
   * Check if token is a stop word
   */
  isStopWord(token) {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
      'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
      'should', 'could', 'may', 'might', 'can', 'this', 'that', 'these',
      'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'my', 'your',
      'his', 'her', 'its', 'our', 'their'
    ]);
    return stopWords.has(token);
  }

  /**
   * Get token weight
   */
  getTokenWeight(token, title, content) {
    let weight = 1;

    if (title?.toLowerCase().includes(token)) {
      weight += 3;
    }

    if (content?.toLowerCase().includes(token)) {
      weight += 1;
    }

    // Boost short tokens (more specific)
    if (token.length <= 4) weight += 1;
    if (token.length <= 3) weight += 1;

    return weight;
  }

  /**
   * Search index
   */
  searchIndex(query, limit = 20) {
    const tokens = this.tokenize(query);
    const scores = new Map();

    tokens.forEach(token => {
      // Find matching tokens
      for (const [indexToken, entries] of this.index) {
        if (indexToken.startsWith('__item_')) continue;

        if (indexToken.includes(token) || token.includes(indexToken)) {
          entries.forEach(entry => {
            const currentScore = scores.get(entry.id) || 0;
            scores.set(entry.id, currentScore + entry.weight);
          });
        }
      }
    });

    // Get top results
    return Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id, score]) => ({
        ...this.index.get(`__item_${id}`),
        score
      }));
  }

  /**
   * Get all items (for rebuilding)
   */
  getAllItems() {
    // Placeholder - in production, fetch from services
    return [
      { id: 'mem-1', type: 'text', title: 'Meeting notes', content: 'Discussed project status', category: 'work' },
      { id: 'mem-2', type: 'task', title: 'Review report', content: 'Q2 report review needed', category: 'work' },
      { id: 'mem-3', type: 'expense', title: 'Uber fare', content: 'Airport pickup', category: 'finance' }
    ];
  }

  /**
   * Get index stats
   */
  getStats() {
    let tokenCount = 0;
    let itemCount = 0;

    for (const [key] of this.index) {
      if (key.startsWith('__item_')) {
        itemCount++;
      } else {
        tokenCount++;
      }
    }

    return {
      tokens: tokenCount,
      items: itemCount,
      lastIndexed: this.lastIndexed
    };
  }
}

module.exports = IndexManager;
