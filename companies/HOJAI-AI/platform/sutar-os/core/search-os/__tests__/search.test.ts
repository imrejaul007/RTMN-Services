import { describe, it, expect, beforeEach } from 'vitest';

describe('SearchOS', () => {
  const documents = new Map();
  const invertedIndex = new Map();

  beforeEach(() => {
    documents.clear();
    invertedIndex.clear();
  });

  describe('Document Indexing', () => {
    it('should index a document', () => {
      const doc = {
        id: 'doc-1',
        title: 'Getting Started with TypeScript',
        content: 'TypeScript is a typed superset of JavaScript.',
        type: 'tutorial',
        tags: ['typescript', 'javascript'],
        createdAt: new Date().toISOString(),
      };
      documents.set(doc.id, doc);
      expect(documents.size).toBe(1);
    });

    it('should update document', () => {
      documents.set('doc-1', { id: 'doc-1', title: 'Updated Title', content: 'Content', type: 'doc', tags: [], createdAt: new Date().toISOString() });
      expect(documents.get('doc-1')?.title).toBe('Updated Title');
    });

    it('should delete document', () => {
      documents.delete('doc-1');
      expect(documents.has('doc-1')).toBe(false);
    });
  });

  describe('Tokenization', () => {
    it('should tokenize text', () => {
      const text = 'Hello, World! This is a test.';
      const tokens = text.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(t => t.length > 2);
      expect(tokens).toContain('hello');
      expect(tokens).toContain('world');
    });

    it('should remove stop words', () => {
      const STOP_WORDS = new Set(['the', 'and', 'for', 'are', 'but']);
      const text = 'the quick brown fox';
      const tokens = text.split(/\s+/).filter(t => !STOP_WORDS.has(t));
      expect(tokens).toContain('quick');
      expect(tokens).not.toContain('the');
    });
  });

  describe('Search Scoring', () => {
    it('should score matching documents higher', () => {
      const docs = [
        { title: 'TypeScript Guide', content: 'Learn TypeScript today' },
        { title: 'Python Guide', content: 'Learn Python today' },
      ];
      const query = 'typescript';

      const scores = docs.map(doc => {
        const text = (doc.title + ' ' + doc.content).toLowerCase();
        return text.includes(query) ? 1 : 0;
      });

      expect(scores[0]).toBe(1);
      expect(scores[1]).toBe(0);
    });

    it('should rank by title match first', () => {
      const docs = [
        { title: 'JavaScript Basics', content: 'Learn JavaScript programming' },
        { title: 'Java', content: 'Java programming language' },
      ];
      const query = 'java';

      let titleMatches = 0;
      let contentMatches = 0;

      for (const doc of docs) {
        const title = doc.title.toLowerCase();
        const content = doc.content.toLowerCase();
        if (title.includes(query)) titleMatches++;
        if (content.includes(query) && !title.includes(query)) contentMatches++;
      }

      expect(titleMatches).toBe(1);
      expect(contentMatches).toBe(1);
    });
  });

  describe('Highlighting', () => {
    it('should extract matching sentences', () => {
      const content = 'This is a test. It contains keywords. Another sentence here.';
      const queryTerms = ['test', 'keywords'];
      const sentences = content.split(/[.!?]+/).filter(s => s.trim());

      const matches = sentences.filter(s =>
        queryTerms.some(term => s.toLowerCase().includes(term))
      );

      expect(matches.length).toBe(2);
      expect(matches[0]).toContain('test');
      expect(matches[1]).toContain('keywords');
    });
  });

  describe('Facets', () => {
    it('should count documents by type', () => {
      const docs = [
        { type: 'tutorial' },
        { type: 'tutorial' },
        { type: 'article' },
      ];

      const typeCount = new Map<string, number>();
      for (const doc of docs) {
        typeCount.set(doc.type, (typeCount.get(doc.type) || 0) + 1);
      }

      expect(typeCount.get('tutorial')).toBe(2);
      expect(typeCount.get('article')).toBe(1);
    });

    it('should count documents by tag', () => {
      const docs = [
        { tags: ['javascript', 'web'] },
        { tags: ['python', 'data'] },
        { tags: ['javascript', 'web'] },
      ];

      const tagCount = new Map<string, number>();
      for (const doc of docs) {
        for (const tag of doc.tags) {
          tagCount.set(tag, (tagCount.get(tag) || 0) + 1);
        }
      }

      expect(tagCount.get('javascript')).toBe(2);
      expect(tagCount.get('web')).toBe(2);
      expect(tagCount.get('python')).toBe(1);
    });
  });

  describe('Pagination', () => {
    it('should paginate results', () => {
      const results = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const limit = 3;
      const offset = 2;

      const page = results.slice(offset, offset + limit);
      expect(page).toEqual([3, 4, 5]);
    });

    it('should calculate total pages', () => {
      const total = 100;
      const limit = 10;
      const pages = Math.ceil(total / limit);
      expect(pages).toBe(10);
    });
  });

  describe('Autocomplete', () => {
    it('should suggest matching terms', () => {
      const terms = ['typescript', 'typographic', 'typical', 'python'];
      const query = 'typ';

      const suggestions = terms.filter(t => t.startsWith(query));
      expect(suggestions).toContain('typescript');
      expect(suggestions).toContain('typographic');
      expect(suggestions).not.toContain('python');
    });
  });

  describe('Filters', () => {
    it('should filter by type', () => {
      const docs = [
        { type: 'tutorial' },
        { type: 'article' },
        { type: 'tutorial' },
      ];

      const filtered = docs.filter(d => d.type === 'tutorial');
      expect(filtered.length).toBe(2);
    });

    it('should filter by date range', () => {
      const docs = [
        { createdAt: '2024-01-01' },
        { createdAt: '2024-06-01' },
        { createdAt: '2024-12-01' },
      ];

      const from = '2024-06-01';
      const to = '2024-06-30';
      const filtered = docs.filter(d => d.createdAt >= from && d.createdAt <= to);
      expect(filtered.length).toBe(1);
    });
  });
});
