/**
 * Semantic Search Module
 * AI-powered semantic search using related terms and concept matching
 */

class SemanticSearch {
  constructor() {
    // Related terms map for semantic understanding
    this.relatedTerms = {
      meeting: ['call', 'conference', 'discussion', 'agenda', 'minutes', 'standup', 'sync'],
      health: ['doctor', 'medicine', 'hospital', 'checkup', 'fitness', 'gym', 'workout', 'medical', 'clinic', 'appointment'],
      finance: ['money', 'payment', 'expense', 'income', 'budget', 'bank', 'transaction', 'salary', 'investment', 'emi'],
      travel: ['flight', 'hotel', 'trip', 'vacation', 'booking', 'airport', 'boarding', 'itinerary'],
      project: ['task', 'deadline', 'deliverable', 'milestone', 'sprint', 'kanban', 'backlog'],
      contact: ['person', 'phone', 'email', 'address', 'call', 'message', 'whatsapp'],
      food: ['restaurant', 'order', 'delivery', 'menu', 'pizza', 'zomato', 'swiggy', 'meal'],
      hotel: ['room', 'booking', 'checkin', 'checkout', 'stay', 'accommodation', 'reservation'],
      sales: ['deal', 'pipeline', 'lead', 'customer', 'revenue', 'quota', 'commission'],
      marketing: ['campaign', 'ads', 'social', 'content', 'seo', 'email', 'newsletter'],
      team: ['colleague', 'manager', 'hr', 'hiring', 'onboarding', 'meeting'],
      document: ['pdf', 'doc', 'file', 'report', 'presentation', 'spreadsheet']
    };

    // Concept synonyms
    this.synonyms = {
      'call': ['phone', 'ring', 'dial', 'contact'],
      'money': ['cash', 'funds', '₹', 'rupees', 'amount'],
      'buy': ['purchase', 'order', 'get', 'acquire'],
      'meeting': ['call', 'discussion', 'standup', 'sync'],
      'send': ['share', 'forward', 'dispatch', 'email'],
      'important': ['urgent', 'priority', 'critical', 'asap'],
      'later': ['someday', 'eventually', 'postpone', 'defer']
    };
  }

  /**
   * Semantic search
   */
  async search(query, options = {}) {
    const { limit = 20 } = options;
    const q = query.toLowerCase();

    // Expand query with related terms and synonyms
    const expandedQuery = this.expandQuery(q);

    // Get all searchable content
    const content = this.getSearchableContent();

    // Score each item
    const scored = content.map(item => ({
      ...item,
      score: this.calculateSemanticScore(item, q, expandedQuery)
    }));

    // Filter items with score > 0 and sort
    const results = scored
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return {
      results,
      expandedQuery,
      interpretation: this.interpretQuery(q)
    };
  }

  /**
   * Expand query with related terms and synonyms
   */
  expandQuery(query) {
    const terms = new Set([query]);
    const words = query.split(/\s+/);

    for (const word of words) {
      // Add related terms
      for (const [key, related] of Object.entries(this.relatedTerms)) {
        if (key.includes(word) || word.includes(key)) {
          related.forEach(r => terms.add(r));
        }
      }

      // Add synonyms
      for (const [key, syns] of Object.entries(this.synonyms)) {
        if (key.includes(word) || word.includes(key)) {
          syns.forEach(s => terms.add(s));
        }
      }

      // Also check if word is a value in relatedTerms
      for (const related of Object.values(this.relatedTerms)) {
        if (related.includes(word)) {
          terms.add(word);
          // Add the key too
          const keyEntry = Object.entries(this.relatedTerms).find(([, v]) => v.includes(word));
          if (keyEntry) terms.add(keyEntry[0]);
        }
      }
    }

    return Array.from(terms);
  }

  /**
   * Interpret what the user is looking for
   */
  interpretQuery(query) {
    const interpretations = [];

    // Check for action intent
    if (/remind|todo|task|do/i.test(query)) {
      interpretations.push({ intent: 'action', label: 'Looking for tasks or reminders' });
    }

    // Check for person search
    if (/who|person|contact|call|text/i.test(query)) {
      interpretations.push({ intent: 'person', label: 'Looking for a person' });
    }

    // Check for date/time
    if (/when|date|time|schedule|calendar/i.test(query)) {
      interpretations.push({ intent: 'schedule', label: 'Looking for scheduled items' });
    }

    // Check for money
    if (/how much|cost|price|pay|expense/i.test(query)) {
      interpretations.push({ intent: 'finance', label: 'Looking for financial information' });
    }

    // Check for location
    if (/where|location|address|map/i.test(query)) {
      interpretations.push({ intent: 'location', label: 'Looking for a location' });
    }

    // Check for status
    if (/status|progress|update|how is/i.test(query)) {
      interpretations.push({ intent: 'status', label: 'Looking for status updates' });
    }

    return interpretations;
  }

  /**
   * Calculate semantic score for an item
   */
  calculateSemanticScore(item, originalQuery, expandedQuery) {
    let score = 0;
    const searchable = [
      item.title,
      item.content,
      item.type,
      item.category,
      ...(item.tags || [])
    ].filter(Boolean).join(' ').toLowerCase();

    // Exact match in original query
    if (searchable.includes(originalQuery)) {
      score += 100;
    }

    // Match in expanded terms
    for (const term of expandedQuery) {
      if (term === originalQuery) continue; // Already counted

      if (searchable.includes(term)) {
        score += 30;
      }

      // Partial match
      const partialMatches = searchable.split(/\s+/).filter(word =>
        word.includes(term) || term.includes(word)
      );
      score += partialMatches.length * 15;
    }

    // Boost for type match
    const queryWords = originalQuery.split(/\s+/);
    for (const word of queryWords) {
      if (item.type?.toLowerCase().includes(word)) score += 20;
      if (item.category?.toLowerCase().includes(word)) score += 15;
    }

    // Recency boost
    if (item.createdAt) {
      const age = Date.now() - new Date(item.createdAt).getTime();
      const days = age / (1000 * 60 * 60 * 24);
      if (days < 1) score += 25;
      else if (days < 7) score += 15;
      else if (days < 30) score += 5;
    }

    return score;
  }

  /**
   * Get all searchable content
   */
  getSearchableContent() {
    // In production, this would fetch from Memory Inbox, Twins, etc.
    return [
      { id: 'mem-1', type: 'text', title: 'Meeting notes with Rahul', content: 'Discussed partnership opportunity', category: 'work', tags: ['meeting', 'rahul'] },
      { id: 'mem-2', type: 'task', title: 'Review Q2 report', content: 'Need to review Q2 report before deadline', category: 'work', tags: ['report', 'deadline'] },
      { id: 'mem-3', type: 'expense', title: 'Uber ride', content: 'Airport pickup cost', category: 'finance', tags: ['travel', 'uber'] },
      { id: 'mem-4', type: 'meeting', title: 'Strategy meeting', content: 'Q3 planning session', category: 'work', tags: ['strategy', 'planning'] },
      { id: 'mem-5', type: 'health', title: 'Doctor appointment', content: 'Annual checkup with Dr. Sharma', category: 'health', tags: ['doctor', 'appointment'] },
      { id: 'mem-6', type: 'contact', title: 'Priya contact', content: 'Friend from college', category: 'personal', tags: ['priya', 'friend'] }
    ];
  }
}

module.exports = SemanticSearch;
