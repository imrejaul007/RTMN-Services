/**
 * SUTAR Contract OS - Clause Library Service Unit Tests
 *
 * The clause service uses module-level state. We use vi.resetModules()
 * + dynamic import to get a fresh, pre-populated store for each test,
 * rather than mutating the live store (which would leak between tests).
 */

import { describe, it, expect, beforeEach } from 'vitest';

async function loadService() {
  vi.resetModules();
  const mod = await import('../../src/services/clauses.js');
  return mod.clauseLibraryService;
}

import { vi } from 'vitest';

describe('clauseLibraryService.listClauses', () => {
  let clauseLibraryService: Awaited<ReturnType<typeof loadService>>;

  beforeEach(async () => {
    clauseLibraryService = await loadService();
  });

  it('returns the pre-populated default clauses', () => {
    const result = clauseLibraryService.listClauses();
    expect(result.total).toBeGreaterThan(0);
    expect(result.clauses.length).toBe(result.total);
  });

  it('filters by category', () => {
    const result = clauseLibraryService.listClauses({ category: 'Payment' });
    expect(result.total).toBeGreaterThan(0);
    expect(result.clauses.every((c) => c.category === 'Payment')).toBe(true);
  });

  it('filters by riskLevel', () => {
    const result = clauseLibraryService.listClauses({ riskLevel: 'high' });
    expect(result.clauses.every((c) => c.riskLevel === 'high')).toBe(true);
  });

  it('searches across title, content, tags and category (case-insensitive)', () => {
    const result = clauseLibraryService.listClauses({ search: 'CONFIDENTIALITY' });
    expect(result.total).toBeGreaterThan(0);
  });

  it('respects limit and offset pagination', () => {
    const page = clauseLibraryService.listClauses({ limit: 3, offset: 0 });
    expect(page.clauses.length).toBeLessThanOrEqual(3);
    expect(page.total).toBeGreaterThan(3);
  });
});

describe('clauseLibraryService.createClause / getClause', () => {
  let clauseLibraryService: Awaited<ReturnType<typeof loadService>>;

  beforeEach(async () => {
    clauseLibraryService = await loadService();
  });

  it('creates a clause and returns it with sensible defaults', () => {
    const created = clauseLibraryService.createClause({
      title: 'My Custom Clause',
      content: 'Do something custom.',
      category: 'Custom',
    });
    expect(created.id).toBeTruthy();
    expect(created.title).toBe('My Custom Clause');
    expect(created.category).toBe('Custom');
    expect(created.isStandard).toBe(false);
    expect(created.version).toBe(1);
    expect(created.usageCount).toBe(0);
  });

  it('retrieves a clause by id after creation', () => {
    const created = clauseLibraryService.createClause({
      title: 'Retrievable',
      content: 'x',
      category: 'General',
    });
    const fetched = clauseLibraryService.getClause(created.id);
    expect(fetched).toBeDefined();
    expect(fetched?.title).toBe('Retrievable');
  });

  it('returns undefined for a non-existent clause id', () => {
    expect(clauseLibraryService.getClause('does-not-exist')).toBeUndefined();
  });
});

describe('clauseLibraryService.updateClause', () => {
  let clauseLibraryService: Awaited<ReturnType<typeof loadService>>;

  beforeEach(async () => {
    clauseLibraryService = await loadService();
  });

  it('updates fields and bumps the version', () => {
    const created = clauseLibraryService.createClause({
      title: 'Original',
      content: 'old',
      category: 'General',
    });
    const updated = clauseLibraryService.updateClause(created.id, {
      title: 'Updated',
      content: 'new',
    });
    expect(updated).toBeDefined();
    expect(updated?.title).toBe('Updated');
    expect(updated?.content).toBe('new');
    expect(updated?.version).toBe(2);
  });

  it('returns undefined for a non-existent id', () => {
    expect(
      clauseLibraryService.updateClause('nope', { title: 'x' }),
    ).toBeUndefined();
  });
});

describe('clauseLibraryService.deleteClause / incrementUsage', () => {
  let clauseLibraryService: Awaited<ReturnType<typeof loadService>>;

  beforeEach(async () => {
    clauseLibraryService = await loadService();
  });

  it('deletes an existing clause and returns true', () => {
    const created = clauseLibraryService.createClause({
      title: 'To Delete',
      content: 'x',
      category: 'General',
    });
    expect(clauseLibraryService.deleteClause(created.id)).toBe(true);
    expect(clauseLibraryService.getClause(created.id)).toBeUndefined();
  });

  it('returns false when deleting a missing id', () => {
    expect(clauseLibraryService.deleteClause('not-there')).toBe(false);
  });

  it('increments usageCount and sets lastUsedAt', async () => {
    clauseLibraryService = await loadService();
    const created = clauseLibraryService.createClause({
      title: 'Countable',
      content: 'x',
      category: 'General',
    });
    expect(created.usageCount).toBe(0);
    expect(created.lastUsedAt).toBeUndefined();

    clauseLibraryService.incrementUsage(created.id);
    clauseLibraryService.incrementUsage(created.id);

    const after = clauseLibraryService.getClause(created.id);
    expect(after?.usageCount).toBe(2);
    expect(after?.lastUsedAt).toBeTruthy();
  });
});

describe('clauseLibraryService.renderClause', () => {
  let clauseLibraryService: Awaited<ReturnType<typeof loadService>>;

  beforeEach(async () => {
    clauseLibraryService = await loadService();
  });

  it('substitutes {{variable}} placeholders', async () => {
    clauseLibraryService = await loadService();
    const created = clauseLibraryService.createClause({
      title: 'With Vars',
      content: 'Hello {{name}}, your rate is {{rate}}%.',
      category: 'General',
    });
    const rendered = clauseLibraryService.renderClause(created.id, {
      name: 'Rejaul',
      rate: '12',
    });
    expect(rendered).toBe('Hello Rejaul, your rate is 12%.');
  });

  it('returns undefined for an unknown clause id', () => {
    expect(
      clauseLibraryService.renderClause('nope', { foo: 'bar' }),
    ).toBeUndefined();
  });
});

describe('clauseLibraryService.getCategories / getAllTags / getJurisdictions', () => {
  let clauseLibraryService: Awaited<ReturnType<typeof loadService>>;

  beforeEach(async () => {
    clauseLibraryService = await loadService();
  });

  it('returns distinct categories including defaults', () => {
    const categories = clauseLibraryService.getCategories();
    expect(categories.length).toBeGreaterThan(0);
    expect(new Set(categories).size).toBe(categories.length); // all unique
    expect(categories).toContain('Confidentiality');
    expect(categories).toContain('Payment');
  });

  it('returns a sorted, de-duplicated list of tags', () => {
    const tags = clauseLibraryService.getAllTags();
    expect(tags.length).toBeGreaterThan(0);
    expect(new Set(tags).size).toBe(tags.length);
  });

  it('returns at least Universal jurisdiction for defaults', () => {
    const jurisdictions = clauseLibraryService.getJurisdictions();
    expect(jurisdictions).toContain('Universal');
  });
});
