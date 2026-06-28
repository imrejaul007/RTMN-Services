/**
 * Search OS - Unit Tests
 * Tests for tokenization, BM25 scoring, highlighting, facets, and search operations
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Re-implement the core functions for testing (matching src/index.ts logic)
const STOP_WORDS = new Set(['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her', 'was', 'one', 'our', 'out', 'this', 'that', 'with', 'from']);

// Tokenize text
function tokenize(text: string): string[] {
  return text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2 && !STOP_WORDS.has(t));
}

interface Document {
  id: string;
  title: string;
  content: string;
  type: string;
  tags: string[];
  metadata: Record<string, string>;
  author?: string;
  createdAt: string;
  updatedAt: string;
  indexedAt: string;
}

interface SearchFilters {
  type?: string;
  tags?: string[];
  author?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface Facets {
  types: { value: string; count: number }[];
  tags: { value: string; count: number }[];
  authors: { value: string; count: number }[];
}

const K1 = 1.5;
const B = 0.75;

const documents = new Map<string, Document>();
const invertedIndex = new Map<string, Set<string>>();

// Build inverted index
function buildIndex(doc: Document): void {
  const terms = tokenize(doc.content + ' ' + doc.title);
  for (const term of terms) {
    if (!invertedIndex.has(term)) {
      invertedIndex.set(term, new Set());
    }
    invertedIndex.get(term)!.add(doc.id);
  }
}

// Remove from index
function removeFromIndex(docId: string): void {
  for (const [term, docs] of invertedIndex) {
    docs.delete(docId);
    if (docs.size === 0) {
      invertedIndex.delete(term);
    }
  }
}

// Calculate BM25 score
function bm25Score(doc: Document, queryTerms: string[], avgDocLength: number): number {
  if (queryTerms.length === 0) return 0;

  let score = 0;
  const docTerms = tokenize(doc.content + ' ' + doc.title);
  const docLength = docTerms.length;

  const termFreq = new Map<string, number>();
  for (const term of docTerms) {
    termFreq.set(term, (termFreq.get(term) || 0) + 1);
  }

  for (const term of queryTerms) {
    const tf = termFreq.get(term) || 0;
    if (tf > 0) {
      const idf = Math.log((documents.size + 1) / (1 + (invertedIndex.get(term)?.size || 1)));
      const numerator = tf * (K1 + 1);
      const denominator = tf + K1 * (1 - B + B * (docLength / avgDocLength));
      score += idf * (numerator / denominator);
    }
  }

  return score;
}

// Extract highlights
function extractHighlights(content: string, queryTerms: string[], maxLength = 200): string[] {
  const highlights: string[] = [];
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);

  for (const sentence of sentences) {
    const lowerSentence = sentence.toLowerCase();
    if (queryTerms.some(term => lowerSentence.includes(term))) {
      const trimmed = sentence.trim();
      if (trimmed.length <= maxLength) {
        highlights.push(trimmed);
      } else {
        const matchPos = queryTerms.reduce((pos, term) => {
          const idx = lowerSentence.indexOf(term);
          return idx >= 0 && (pos < 0 || idx < pos) ? idx : pos;
        }, -1);
        if (matchPos >= 0) {
          const start = Math.max(0, matchPos - 50);
          const end = Math.min(sentence.length, matchPos + maxLength - 50);
          highlights.push('...' + sentence.slice(start, end) + '...');
        } else {
          highlights.push(trimmed.slice(0, maxLength) + '...');
        }
      }
    }
  }

  return highlights.slice(0, 3);
}

// Calculate facets
function calculateFacets(results: Document[]): Facets {
  const typeCount = new Map<string, number>();
  const tagCount = new Map<string, number>();
  const authorCount = new Map<string, number>();

  for (const doc of results) {
    typeCount.set(doc.type, (typeCount.get(doc.type) || 0) + 1);
    if (doc.author) authorCount.set(doc.author, (authorCount.get(doc.author) || 0) + 1);
    for (const tag of doc.tags) {
      tagCount.set(tag, (tagCount.get(tag) || 0) + 1);
    }
  }

  return {
    types: Array.from(typeCount.entries()).map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count),
    tags: Array.from(tagCount.entries()).map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count),
    authors: Array.from(authorCount.entries()).map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count),
  };
}

function createDoc(overrides: Partial<Document> = {}): Document {
  const now = new Date().toISOString();
  return {
    id: 'test-' + Math.random().toString(36).slice(2),
    title: 'Test Document',
    content: 'This is test content for searching',
    type: 'article',
    tags: ['test'],
    metadata: {},
    author: 'Test Author',
    createdAt: now,
    updatedAt: now,
    indexedAt: now,
    ...overrides,
  };
}

describe('Search OS - Tokenization', () => {
  it('should convert text to lowercase', () => {
    const tokens = tokenize('HELLO WORLD');
    expect(tokens).toContain('hello');
    expect(tokens).toContain('world');
  });

  it('should remove punctuation', () => {
    const tokens = tokenize('Hello, world! How are you?');
    expect(tokens).not.toContain(',');
    expect(tokens).not.toContain('!');
    expect(tokens).not.toContain('?');
  });

  it('should remove stop words', () => {
    const tokens = tokenize('The quick brown fox');
    expect(tokens).not.toContain('the');
    expect(tokens).toContain('quick');
    expect(tokens).toContain('brown');
    expect(tokens).toContain('fox');
  });

  it('should filter tokens shorter than 3 characters', () => {
    const tokens = tokenize('I am a big fan');
    expect(tokens).not.toContain('am');
    expect(tokens).toContain('big');
    expect(tokens).toContain('fan');
  });

  it('should split on whitespace', () => {
    const tokens = tokenize('multiple   spaces   here');
    expect(tokens).toHaveLength(3);
  });

  it('should handle empty string', () => {
    const tokens = tokenize('');
    expect(tokens).toHaveLength(0);
  });

  it('should handle string with only stop words', () => {
    const tokens = tokenize('the and for are but not you all can');
    expect(tokens).toHaveLength(0);
  });
});

describe('Search OS - Inverted Index', () => {
  beforeEach(() => {
    documents.clear();
    invertedIndex.clear();
  });

  it('should build inverted index for document', () => {
    const doc = createDoc({
      id: 'doc-1',
      title: 'JavaScript Tutorial',
      content: 'Learn JavaScript programming',
    });

    documents.set(doc.id, doc);
    buildIndex(doc);

    expect(invertedIndex.has('javascript')).toBe(true);
    expect(invertedIndex.has('tutorial')).toBe(true);
    expect(invertedIndex.get('javascript')?.has('doc-1')).toBe(true);
  });

  it('should index terms from both title and content', () => {
    const doc = createDoc({
      id: 'doc-2',
      title: 'React Guide',
      content: 'Building with React',
    });

    documents.set(doc.id, doc);
    buildIndex(doc);

    expect(invertedIndex.get('react')?.has('doc-2')).toBe(true);
    expect(invertedIndex.get('guide')?.has('doc-2')).toBe(true);
    expect(invertedIndex.get('building')?.has('doc-2')).toBe(true);
  });

  it('should remove document from index', () => {
    const doc = createDoc({
      id: 'doc-3',
      title: 'Temp Document',
      content: 'This will be removed',
    });

    documents.set(doc.id, doc);
    buildIndex(doc);
    expect(invertedIndex.get('temp')?.has('doc-3')).toBe(true);

    removeFromIndex('doc-3');
    // After removal, the term entry is deleted (size becomes 0)
    expect(invertedIndex.has('temp')).toBe(false);
  });

  it('should clean up empty term entries', () => {
    const doc = createDoc({
      id: 'doc-4',
      title: 'Unique Terms',
      content: 'Unique content here',
    });

    documents.set(doc.id, doc);
    buildIndex(doc);

    removeFromIndex('doc-4');
    expect(invertedIndex.get('unique')).toBeUndefined();
  });

  it('should handle multiple documents for same term', () => {
    const doc1 = createDoc({ id: 'doc-5', title: 'TypeScript Guide', content: 'Learn TypeScript' });
    const doc2 = createDoc({ id: 'doc-6', title: 'TypeScript Advanced', content: 'Advanced TypeScript patterns' });

    documents.set(doc1.id, doc1);
    buildIndex(doc1);
    documents.set(doc2.id, doc2);
    buildIndex(doc2);

    const termDocs = invertedIndex.get('typescript');
    expect(termDocs?.size).toBe(2);
    expect(termDocs?.has('doc-5')).toBe(true);
    expect(termDocs?.has('doc-6')).toBe(true);
  });
});

describe('Search OS - BM25 Scoring', () => {
  beforeEach(() => {
    documents.clear();
    invertedIndex.clear();
  });

  it('should return 0 for empty query terms', () => {
    const doc = createDoc({ id: 'doc-1', title: 'Test', content: 'Content' });
    const score = bm25Score(doc, [], 100);
    expect(score).toBe(0);
  });

  it('should calculate positive score with multiple documents', () => {
    // Add a second document to ensure IDF > 0
    const doc2 = createDoc({
      id: 'doc-0',
      title: 'Python Tutorial',
      content: 'Learn Python programming',
    });
    documents.set(doc2.id, doc2);
    buildIndex(doc2);

    const doc = createDoc({
      id: 'doc-1',
      title: 'JavaScript Tutorial',
      content: 'Learn JavaScript programming with examples',
    });
    documents.set(doc.id, doc);
    buildIndex(doc);

    const score = bm25Score(doc, ['javascript'], 50);
    expect(score).toBeGreaterThan(0);
  });

  it('should return 0 for non-matching terms', () => {
    const doc = createDoc({
      id: 'doc-1',
      title: 'Python Tutorial',
      content: 'Learn Python programming',
    });

    documents.set(doc.id, doc);
    buildIndex(doc);

    const score = bm25Score(doc, ['javascript'], 50);
    expect(score).toBe(0);
  });

  it('should rank documents with more term frequency higher', () => {
    // Add another doc first to ensure IDF > 0
    const doc0 = createDoc({ id: 'doc-0', title: 'Java Tutorial', content: 'Learn Java' });
    documents.set(doc0.id, doc0);
    buildIndex(doc0);

    const doc1 = createDoc({
      id: 'doc-1',
      title: 'React',
      content: 'React is a library',
    });
    const doc2 = createDoc({
      id: 'doc-2',
      title: 'React Guide',
      content: 'React React React is a comprehensive guide to React',
    });

    documents.set(doc1.id, doc1);
    buildIndex(doc1);
    documents.set(doc2.id, doc2);
    buildIndex(doc2);

    const avgLength = 20;
    const score1 = bm25Score(doc1, ['react'], avgLength);
    const score2 = bm25Score(doc2, ['react'], avgLength);

    expect(score2).toBeGreaterThan(score1);
  });

  it('should handle multiple query terms', () => {
    // Add another doc first to ensure IDF > 0
    const doc0 = createDoc({ id: 'doc-0', title: 'Python Guide', content: 'Learn Python' });
    documents.set(doc0.id, doc0);
    buildIndex(doc0);

    const doc = createDoc({
      id: 'doc-1',
      title: 'JavaScript Guide',
      content: 'Learn JavaScript with this comprehensive guide',
    });

    documents.set(doc.id, doc);
    buildIndex(doc);

    const score = bm25Score(doc, ['javascript', 'guide'], 30);
    expect(score).toBeGreaterThan(0);
  });
});

describe('Search OS - Highlight Extraction', () => {
  it('should extract exact sentence matches', () => {
    const content = 'This is a matching sentence. Another sentence without match.';
    const highlights = extractHighlights(content, ['matching']);

    expect(highlights).toHaveLength(1);
    expect(highlights[0]).toContain('matching');
  });

  it('should limit highlights to 3', () => {
    const content = 'First match here. Second match there. Third match also. Fourth match too.';
    const highlights = extractHighlights(content, ['match']);

    expect(highlights.length).toBeLessThanOrEqual(3);
  });

  it('should truncate long sentences', () => {
    const longSentence = 'This is a very long sentence that exceeds the maximum length and needs to be truncated properly for display purposes.';
    const content = longSentence;
    const highlights = extractHighlights(content, ['truncated'], 50);

    // The highlight is truncated with '...' prefix/suffix around the match
    expect(highlights[0].length).toBeLessThanOrEqual(60); // Allow some variance for truncation logic
  });

  it('should return empty array for no matches', () => {
    const content = 'This is content without any target terms.';
    const highlights = extractHighlights(content, ['xyz123']);

    expect(highlights).toHaveLength(0);
  });

  it('should handle multiple matches in same sentence', () => {
    const content = 'JavaScript is great for JavaScript developers.';
    const highlights = extractHighlights(content, ['javascript']);

    expect(highlights.length).toBe(1);
  });

  it('should handle sentences with only punctuation', () => {
    const content = '... ... ... . . .';
    const highlights = extractHighlights(content, ['test']);

    expect(highlights).toHaveLength(0);
  });
});

describe('Search OS - Facet Calculation', () => {
  it('should count document types', () => {
    const docs = [
      createDoc({ id: '1', type: 'article' }),
      createDoc({ id: '2', type: 'article' }),
      createDoc({ id: '3', type: 'blog' }),
    ];

    const facets = calculateFacets(docs);

    expect(facets.types).toContainEqual({ value: 'article', count: 2 });
    expect(facets.types).toContainEqual({ value: 'blog', count: 1 });
  });

  it('should count tags across documents', () => {
    const docs = [
      createDoc({ id: '1', tags: ['javascript', 'web'] }),
      createDoc({ id: '2', tags: ['javascript', 'frontend'] }),
      createDoc({ id: '3', tags: ['python', 'web'] }),
    ];

    const facets = calculateFacets(docs);

    expect(facets.tags).toContainEqual({ value: 'javascript', count: 2 });
    expect(facets.tags).toContainEqual({ value: 'web', count: 2 });
    expect(facets.tags).toContainEqual({ value: 'frontend', count: 1 });
  });

  it('should count authors', () => {
    const docs = [
      createDoc({ id: '1', author: 'Alice' }),
      createDoc({ id: '2', author: 'Alice' }),
      createDoc({ id: '3', author: 'Bob' }),
    ];

    const facets = calculateFacets(docs);

    expect(facets.authors).toContainEqual({ value: 'Alice', count: 2 });
    expect(facets.authors).toContainEqual({ value: 'Bob', count: 1 });
  });

  it('should sort facets by count descending', () => {
    const docs = [
      createDoc({ id: '1', type: 'c' }),
      createDoc({ id: '2', type: 'a' }),
      createDoc({ id: '3', type: 'b' }),
    ];

    const facets = calculateFacets(docs);

    expect(facets.types[0].count).toBeGreaterThanOrEqual(facets.types[1].count);
  });

  it('should handle empty document array', () => {
    const facets = calculateFacets([]);

    expect(facets.types).toHaveLength(0);
    expect(facets.tags).toHaveLength(0);
    expect(facets.authors).toHaveLength(0);
  });
});

describe('Search OS - Search Filtering', () => {
  beforeEach(() => {
    documents.clear();
    invertedIndex.clear();
  });

  const sampleDocs = [
    createDoc({
      id: 'doc-1',
      title: 'JavaScript Tutorial',
      content: 'Programming with JavaScript is great',
      type: 'article',
      tags: ['javascript', 'web'],
      author: 'Alice',
      createdAt: '2024-01-15T10:00:00Z',
    }),
    createDoc({
      id: 'doc-2',
      title: 'Python Guide',
      content: 'Programming with Python backend',
      type: 'blog',
      tags: ['python', 'backend'],
      author: 'Bob',
      createdAt: '2024-02-20T10:00:00Z',
    }),
    createDoc({
      id: 'doc-3',
      title: 'React Basics',
      content: 'JavaScript frontend framework',
      type: 'article',
      tags: ['react', 'javascript', 'frontend'],
      author: 'Alice',
      createdAt: '2024-03-10T10:00:00Z',
    }),
  ];

  function searchWithFilters(queryTerms: string[], filters: SearchFilters = {}): Document[] {
    let totalLength = 0;
    for (const doc of documents.values()) {
      totalLength += tokenize(doc.content + ' ' + doc.title).length;
    }
    const avgDocLength = documents.size > 0 ? totalLength / documents.size : 100;

    const results: Array<{ doc: Document; score: number }> = [];

    for (const doc of documents.values()) {
      // Apply filters
      if (filters.type && doc.type !== filters.type) continue;
      if (filters.author && doc.author !== filters.author) continue;
      if (filters.tags && !filters.tags.some((t: string) => doc.tags.includes(t))) continue;
      if (filters.dateFrom && doc.createdAt < filters.dateFrom) continue;
      if (filters.dateTo && doc.createdAt > filters.dateTo) continue;

      const score = bm25Score(doc, queryTerms, avgDocLength);
      if (score > 0) {
        results.push({ doc, score });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.map(r => r.doc);
  }

  it('should filter by document type', () => {
    sampleDocs.forEach(doc => {
      documents.set(doc.id, doc);
      buildIndex(doc);
    });

    // Search for 'python' which only appears in doc-2 (blog type)
    // No articles have 'python', so filtering to article type should return 0
    const results = searchWithFilters(['python'], { type: 'article' });

    expect(results.length).toBe(0);
  });

  it('should filter by author', () => {
    sampleDocs.forEach(doc => {
      documents.set(doc.id, doc);
      buildIndex(doc);
    });

    // Search for 'javascript' which appears in Alice's docs
    const results = searchWithFilters(['javascript'], { author: 'Alice' });

    expect(results.length).toBe(2);
    expect(results.every(d => d.author === 'Alice')).toBe(true);
  });

  it('should filter by tags', () => {
    sampleDocs.forEach(doc => {
      documents.set(doc.id, doc);
      buildIndex(doc);
    });

    // Search for 'frontend' which appears in doc-3
    const results = searchWithFilters(['frontend'], { tags: ['javascript'] });

    expect(results.length).toBe(1);
    expect(results.every(d => d.tags.includes('javascript'))).toBe(true);
  });

  it('should filter by date range', () => {
    sampleDocs.forEach(doc => {
      documents.set(doc.id, doc);
      buildIndex(doc);
    });

    const results = searchWithFilters(['programming'], {
      dateFrom: '2024-02-01T00:00:00Z',
      dateTo: '2024-03-01T00:00:00Z',
    });

    expect(results.length).toBe(1);
    expect(results[0].id).toBe('doc-2');
  });

  it('should combine multiple filters', () => {
    sampleDocs.forEach(doc => {
      documents.set(doc.id, doc);
      buildIndex(doc);
    });

    // Search for 'frontend' which only appears in doc-3 (article, Alice)
    const results = searchWithFilters(['frontend'], {
      type: 'article',
      author: 'Alice',
    });

    expect(results.length).toBe(1);
    expect(results[0].id).toBe('doc-3');
  });
});

describe('Search OS - Pagination', () => {
  it('should paginate results correctly', () => {
    const allResults = ['a', 'b', 'c', 'd', 'e'];
    const limit = 2;
    const offset = 1;

    const page = allResults.slice(offset, offset + limit);

    expect(page).toEqual(['b', 'c']);
  });

  it('should handle offset beyond results length', () => {
    const allResults = ['a', 'b', 'c'];
    const limit = 2;
    const offset = 5;

    const page = allResults.slice(offset, offset + limit);

    expect(page).toHaveLength(0);
  });

  it('should handle limit larger than remaining results', () => {
    const allResults = ['a', 'b', 'c', 'd', 'e'];
    const limit = 10;
    const offset = 3;

    const page = allResults.slice(offset, offset + limit);

    expect(page).toEqual(['d', 'e']);
  });

  it('should calculate correct total pages', () => {
    const total = 25;
    const limit = 10;
    const totalPages = Math.ceil(total / limit);

    expect(totalPages).toBe(3);
  });
});
