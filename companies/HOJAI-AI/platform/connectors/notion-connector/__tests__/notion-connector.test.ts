/**
 * Notion Connector Tests - Port 4794
 */
import { describe, it, expect } from 'vitest';

// Constants
const PAGE_TYPES = ['page', 'database'];
const BLOCK_TYPES = ['paragraph', 'heading', 'list', 'code', 'image', 'callout'];

describe('Notion Connector - Constants', () => {
  describe('Page Types', () => {
    it('should have all page types', () => {
      expect(PAGE_TYPES).toContain('page');
      expect(PAGE_TYPES).toContain('database');
    });
  });

  describe('Block Types', () => {
    it('should have all block types', () => {
      expect(BLOCK_TYPES).toContain('paragraph');
      expect(BLOCK_TYPES).toContain('heading');
      expect(BLOCK_TYPES).toContain('list');
      expect(BLOCK_TYPES).toContain('code');
      expect(BLOCK_TYPES).toContain('image');
      expect(BLOCK_TYPES).toContain('callout');
    });
  });
});

describe('Notion Connector - Page Validation', () => {
  const validatePage = (page: {
    title?: string;
    content?: string;
    parent?: string;
    type?: string;
    tags?: string[];
  }): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!page.title) errors.push('title is required');
    if (page.title && page.title.length > 200) errors.push('title too long');
    if (page.type && !PAGE_TYPES.includes(page.type)) {
      errors.push(`Invalid type: ${page.type}`);
    }
    if (page.tags && page.tags.length > 20) errors.push('too many tags');

    return { valid: errors.length === 0, errors };
  };

  it('should validate correct page', () => {
    const result = validatePage({
      title: 'Project Notes',
      content: 'Important project documentation',
      type: 'page',
      tags: ['project', 'docs']
    });
    expect(result.valid).toBe(true);
  });

  it('should require title', () => {
    const result = validatePage({ content: 'No title' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('title is required');
  });

  it('should reject long titles', () => {
    const result = validatePage({ title: 'x'.repeat(201) });
    expect(result.valid).toBe(false);
  });
});

describe('Notion Connector - Search', () => {
  const searchPages = (
    pages: Array<{ title: string; content: string; tags: string[] }>,
    query: string
  ): Array<{ page: any; score: number }> => {
    const q = query.toLowerCase();
    return pages
      .map(page => {
        let score = 0;
        if (page.title.toLowerCase().includes(q)) score += 10;
        if (page.content.toLowerCase().includes(q)) score += 5;
        if (page.tags.some(t => t.toLowerCase().includes(q))) score += 3;
        return { page, score };
      })
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score);
  };

  it('should prioritize title matches', () => {
    const pages = [
      { title: 'Meeting Notes', content: 'Discussed the project', tags: ['meeting'] },
      { title: 'Project Plan', content: 'Meeting schedule', tags: ['project'] }
    ];
    const results = searchPages(pages, 'meeting');
    expect(results[0].page.title).toBe('Meeting Notes');
  });

  it('should search content', () => {
    const pages = [
      { title: 'Doc A', content: 'TypeScript code', tags: [] },
      { title: 'Doc B', content: 'Python code', tags: [] }
    ];
    const results = searchPages(pages, 'code');
    expect(results).toHaveLength(2);
  });

  it('should search tags', () => {
    const pages = [
      { title: 'Doc A', content: 'Content', tags: ['urgent'] },
      { title: 'Doc B', content: 'Content', tags: ['normal'] }
    ];
    const results = searchPages(pages, 'urgent');
    expect(results).toHaveLength(1);
    expect(results[0].page.title).toBe('Doc A');
  });
});

describe('Notion Connector - Knowledge Graph', () => {
  const buildKnowledgeGraph = (
    pages: Array<{ id: string; title: string; tags: string[]; links: string[] }>
  ): { nodes: string[]; edges: Array<[string, string]>; clusters: string[][] } => {
    const nodes = pages.map(p => p.id);
    const edges: Array<[string, string]> = [];
    const tagGroups = new Map<string, string[]>();

    pages.forEach(page => {
      page.links.forEach(link => edges.push([page.id, link]));
      page.tags.forEach(tag => {
        if (!tagGroups.has(tag)) tagGroups.set(tag, []);
        tagGroups.get(tag)!.push(page.id);
      });
    });

    const clusters = Array.from(tagGroups.values()).filter(g => g.length > 1);

    return { nodes, edges, clusters };
  };

  it('should build nodes from pages', () => {
    const pages = [
      { id: 'p1', title: 'Doc 1', tags: ['ai'], links: [] },
      { id: 'p2', title: 'Doc 2', tags: [], links: ['p1'] }
    ];
    const graph = buildKnowledgeGraph(pages);
    expect(graph.nodes).toHaveLength(2);
  });

  it('should build edges from links', () => {
    const pages = [
      { id: 'p1', title: 'Doc 1', tags: [], links: [] },
      { id: 'p2', title: 'Doc 2', tags: [], links: ['p1'] }
    ];
    const graph = buildKnowledgeGraph(pages);
    expect(graph.edges).toHaveLength(1);
    expect(graph.edges[0]).toEqual(['p2', 'p1']);
  });

  it('should identify clusters by tags', () => {
    const pages = [
      { id: 'p1', title: 'Doc 1', tags: ['ml'], links: [] },
      { id: 'p2', title: 'Doc 2', tags: ['ml'], links: [] },
      { id: 'p3', title: 'Doc 3', tags: ['web'], links: [] }
    ];
    const graph = buildKnowledgeGraph(pages);
    expect(graph.clusters).toHaveLength(1);
    expect(graph.clusters[0]).toContain('p1');
    expect(graph.clusters[0]).toContain('p2');
  });
});

describe('Notion Connector - Document Intelligence', () => {
  const extractEntities = (content: string): { people: string[]; dates: string[]; topics: string[] } => {
    const people: string[] = [];
    const dateRegex = /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g;
    const dates = content.match(dateRegex) || [];
    const topicWords = ['meeting', 'project', 'deadline', 'review', 'planning'];
    const topics = topicWords.filter(t => content.toLowerCase().includes(t));

    return { people, dates, topics };
  };

  it('should extract dates', () => {
    const result = extractEntities('Meeting on 12/25/2024 for project review');
    expect(result.dates).toContain('12/25/2024');
  });

  it('should extract topics', () => {
    const result = extractEntities('Weekly project meeting and deadline discussion');
    expect(result.topics).toContain('meeting');
    expect(result.topics).toContain('project');
    expect(result.topics).toContain('deadline');
  });
});

describe('Notion Connector - Version History', () => {
  const buildVersionHistory = (
    versions: Array<{ timestamp: string; author: string; changes: string }>
  ): { totalChanges: number; byAuthor: Record<string, number>; timeline: string[] } => {
    const byAuthor: Record<string, number> = {};
    versions.forEach(v => {
      byAuthor[v.author] = (byAuthor[v.author] || 0) + 1;
    });

    const timeline = versions.map(v => v.timestamp).sort();

    return { totalChanges: versions.length, byAuthor, timeline };
  };

  it('should count total changes', () => {
    const versions = [
      { timestamp: '2026-01-01', author: 'alice', changes: 'Added content' },
      { timestamp: '2026-01-02', author: 'bob', changes: 'Fixed typo' }
    ];
    const result = buildVersionHistory(versions);
    expect(result.totalChanges).toBe(2);
  });

  it('should track author contributions', () => {
    const versions = [
      { timestamp: '2026-01-01', author: 'alice', changes: 'Change 1' },
      { timestamp: '2026-01-02', author: 'alice', changes: 'Change 2' },
      { timestamp: '2026-01-03', author: 'bob', changes: 'Change 3' }
    ];
    const result = buildVersionHistory(versions);
    expect(result.byAuthor['alice']).toBe(2);
    expect(result.byAuthor['bob']).toBe(1);
  });
});
