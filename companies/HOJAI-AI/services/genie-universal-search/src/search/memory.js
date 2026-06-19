/**
 * Memory Search Module
 * Search memories from Memory Inbox
 */

class MemorySearch {
  constructor() {
    // In-memory memories (in production, fetch from Memory Inbox service)
    this.memories = new Map([
      ['mem-1', { id: 'mem-1', type: 'text', title: 'Meeting notes with Rahul', content: 'Discussed partnership opportunity', category: 'work', tags: ['meeting', 'rahul', 'partnership'], createdAt: '2026-06-15T10:00:00Z' }],
      ['mem-2', { id: 'mem-2', type: 'voice', title: 'Voice note about project', content: 'Need to review Q2 report', category: 'work', tags: ['project', 'review'], createdAt: '2026-06-16T14:00:00Z' }],
      ['mem-3', { id: 'mem-3', type: 'image', title: 'Screenshot of dashboard', content: 'Sales metrics look good', category: 'finance', tags: ['sales', 'metrics'], createdAt: '2026-06-17T09:00:00Z' }],
      ['mem-4', { id: 'mem-4', type: 'link', title: 'Article on AI trends', content: 'Interesting insights on LLMs', category: 'personal', tags: ['ai', 'technology'], createdAt: '2026-06-17T16:00:00Z' }],
      ['mem-5', { id: 'mem-5', type: 'expense', title: 'Uber ride', content: 'Airport pickup', category: 'finance', tags: ['travel', 'transport'], createdAt: '2026-06-18T08:00:00Z' }],
      ['mem-6', { id: 'mem-6', type: 'text', title: 'Doctor appointment', content: 'Dr. Sharma clinic at 11 AM tomorrow', category: 'health', tags: ['health', 'appointment'], createdAt: '2026-06-18T07:00:00Z' }],
      ['mem-7', { id: 'mem-7', type: 'meeting', title: 'Strategy meeting notes', content: 'Q3 planning session outcomes', category: 'work', tags: ['strategy', 'planning', 'q3'], createdAt: '2026-06-18T11:00:00Z' }],
      ['mem-8', { id: 'mem-8', type: 'whatsapp', title: 'Message from Priya', content: 'Can we reschedule our call?', category: 'personal', tags: ['priya', 'call'], createdAt: '2026-06-18T12:00:00Z' }]
    ]);
  }

  /**
   * Search memories
   */
  async search(query, options = {}) {
    const { type, category, tag, limit = 20 } = options;
    const q = query.toLowerCase();

    let results = Array.from(this.memories.values());

    // Filter by type
    if (type) {
      results = results.filter(m => m.type === type);
    }

    // Filter by category
    if (category) {
      results = results.filter(m => m.category === category);
    }

    // Filter by tag
    if (tag) {
      results = results.filter(m => m.tags?.includes(tag));
    }

    // Text search
    if (q) {
      results = results.filter(m =>
        m.title?.toLowerCase().includes(q) ||
        m.content?.toLowerCase().includes(q) ||
        m.tags?.some(t => t.toLowerCase().includes(q))
      );
    }

    // Score results
    const scored = results.map(memory => ({
      ...memory,
      score: this.calculateScore(memory, q)
    }));

    // Sort by score
    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, limit);
  }

  /**
   * Calculate relevance score
   */
  calculateScore(memory, query) {
    let score = 0;
    const titleLower = memory.title?.toLowerCase() || '';
    const contentLower = memory.content?.toLowerCase() || '';

    // Title match (highest weight)
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

    // Category match
    if (memory.category?.toLowerCase().includes(query)) {
      score += 30;
    }

    // Recency boost
    const age = Date.now() - new Date(memory.createdAt).getTime();
    const days = age / (1000 * 60 * 60 * 24);
    if (days < 1) score += 30;
    else if (days < 7) score += 20;
    else if (days < 30) score += 10;

    return score;
  }

  /**
   * Get memories by type
   */
  getByType(type, limit = 20) {
    return Array.from(this.memories.values())
      .filter(m => m.type === type)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);
  }

  /**
   * Get recent memories
   */
  getRecent(limit = 10) {
    return Array.from(this.memories.values())
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);
  }

  /**
   * Add memory
   */
  add(memory) {
    this.memories.set(memory.id, memory);
    return memory;
  }
}

module.exports = MemorySearch;
