/**
 * SUTAR Contract OS - Template Service Unit Tests
 *
 * The template service uses module-level state pre-populated with 8 default
 * contract templates (Service, NDA, Partnership, Employment, Licensing,
 * Vendor, Customer, Consulting). We use vi.resetModules() + dynamic import
 * to get a fresh store for each test.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { vi } from 'vitest';

async function loadService() {
  vi.resetModules();
  const mod = await import('../../src/services/templates.js');
  return mod.templateService;
}

describe('templateService.listTemplates', () => {
  let templateService: Awaited<ReturnType<typeof loadService>>;

  beforeEach(async () => {
    templateService = await loadService();
  });

  it('returns the pre-populated default templates', () => {
    const result = templateService.listTemplates();
    expect(result.total).toBeGreaterThanOrEqual(8);
    expect(result.templates.length).toBe(result.total);
  });

  it('filters by type', () => {
    const result = templateService.listTemplates({ type: 'nda' });
    expect(result.templates.every((t) => t.type === 'nda')).toBe(true);
    expect(result.total).toBeGreaterThanOrEqual(1);
  });

  it('filters by category', () => {
    const result = templateService.listTemplates({ category: 'Human Resources' });
    expect(result.templates.every((t) => t.category === 'Human Resources')).toBe(true);
  });

  it('filters by tags (any-match)', () => {
    const result = templateService.listTemplates({ tags: ['saas'] });
    expect(result.templates.some((t) => t.tags.includes('saas'))).toBe(true);
    expect(result.templates.every((t) =>
      ['saas'].some((tag) => t.tags.includes(tag))
    )).toBe(true);
  });

  it('search matches name, description, and tags', () => {
    const result = templateService.listTemplates({ search: 'nda' });
    expect(result.total).toBeGreaterThan(0);
  });

  it('respects pagination', () => {
    const page = templateService.listTemplates({ limit: 2, offset: 0 });
    expect(page.templates.length).toBe(2);
    expect(page.total).toBeGreaterThan(2);
  });

  it('excludes inactive templates', () => {
    const created = templateService.createTemplate({ name: 'Soon Inactive' });
    // Manually toggle to inactive via update
    templateService.updateTemplate(created.id, { isActive: false });
    const result = templateService.listTemplates();
    expect(result.templates.some((t) => t.id === created.id)).toBe(false);
  });
});

describe('templateService.getTemplate / createTemplate', () => {
  let templateService: Awaited<ReturnType<typeof loadService>>;

  beforeEach(async () => {
    templateService = await loadService();
  });

  it('retrieves an existing template', () => {
    const created = templateService.createTemplate({ name: 'Findable' });
    const fetched = templateService.getTemplate(created.id);
    expect(fetched).toBeDefined();
    expect(fetched?.name).toBe('Findable');
  });

  it('returns undefined for a non-existent template', () => {
    expect(templateService.getTemplate('missing')).toBeUndefined();
  });

  it('creates a template with sensible defaults', () => {
    const t = templateService.createTemplate({ name: 'Minimal' });
    expect(t.id).toBeTruthy();
    expect(t.name).toBe('Minimal');
    expect(t.type).toBe('service'); // default
    expect(t.category).toBe('General'); // default
    expect(t.isActive).toBe(true);
    expect(t.usageCount).toBe(0);
    expect(t.clauses).toEqual([]);
    expect(t.variables).toEqual([]);
  });
});

describe('templateService.cloneTemplate', () => {
  let templateService: Awaited<ReturnType<typeof loadService>>;

  beforeEach(async () => {
    templateService = await loadService();
  });

  it('clones a template with a new id and "(Copy)" suffix', async () => {
    templateService = await loadService();
    const created = templateService.createTemplate({ name: 'Original' });
    const clone = templateService.cloneTemplate(created.id);
    expect(clone).toBeDefined();
    expect(clone?.id).not.toBe(created.id);
    expect(clone?.name).toBe('Original (Copy)');
    expect(clone?.usageCount).toBe(0);
  });

  it('uses the provided newName when cloning', () => {
    const created = templateService.createTemplate({ name: 'Original' });
    const clone = templateService.cloneTemplate(created.id, 'My Clone');
    expect(clone?.name).toBe('My Clone');
  });

  it('returns undefined when cloning a missing template', () => {
    expect(templateService.cloneTemplate('missing')).toBeUndefined();
  });
});

describe('templateService.incrementUsage / deleteTemplate', () => {
  let templateService: Awaited<ReturnType<typeof loadService>>;

  beforeEach(async () => {
    templateService = await loadService();
  });

  it('increments usage count', () => {
    const t = templateService.createTemplate({ name: 'Trackable' });
    templateService.incrementUsage(t.id);
    templateService.incrementUsage(t.id);
    templateService.incrementUsage(t.id);
    const after = templateService.getTemplate(t.id);
    expect(after?.usageCount).toBe(3);
  });

  it('soft-deletes a template (marks isActive=false)', () => {
    const t = templateService.createTemplate({ name: 'Disposable' });
    expect(templateService.deleteTemplate(t.id)).toBe(true);
    const after = templateService.getTemplate(t.id);
    expect(after?.isActive).toBe(false);
  });

  it('returns false when deleting a missing template', () => {
    expect(templateService.deleteTemplate('missing')).toBe(false);
  });
});

describe('templateService.getCategories / getAllTags / getPopularTemplates', () => {
  let templateService: Awaited<ReturnType<typeof loadService>>;

  beforeEach(async () => {
    templateService = await loadService();
  });

  it('returns unique categories', () => {
    const cats = templateService.getCategories();
    expect(cats.length).toBeGreaterThan(0);
    expect(new Set(cats).size).toBe(cats.length);
  });

  it('returns unique tags', () => {
    const tags = templateService.getAllTags();
    expect(tags.length).toBeGreaterThan(0);
    expect(new Set(tags).size).toBe(tags.length);
  });

  it('returns popular templates sorted by usageCount', () => {
    const a = templateService.createTemplate({ name: 'A' });
    const b = templateService.createTemplate({ name: 'B' });
    templateService.incrementUsage(b.id);
    templateService.incrementUsage(b.id);
    templateService.incrementUsage(b.id);
    templateService.incrementUsage(a.id);

    const popular = templateService.getPopularTemplates(2);
    expect(popular[0].id).toBe(b.id);
    expect(popular[1].id).toBe(a.id);
  });
});

describe('templateService.addClauseToTemplate / removeClauseFromTemplate', () => {
  let templateService: Awaited<ReturnType<typeof loadService>>;

  beforeEach(async () => {
    templateService = await loadService();
  });

  it('adds a clause to a template', () => {
    const t = templateService.createTemplate({ name: 'With Clauses' });
    const clause = templateService.addClauseToTemplate(t.id, {
      title: 'Custom Clause',
      content: 'C',
    });
    expect(clause).toBeDefined();
    expect(clause?.id).toBeTruthy();
    const refreshed = templateService.getTemplate(t.id);
    expect(refreshed?.clauses.length).toBe(1);
  });

  it('removes an existing clause from a template', () => {
    const t = templateService.createTemplate({ name: 'Removable' });
    const clause = templateService.addClauseToTemplate(t.id, {
      title: 'Doomed Clause',
      content: 'C',
    });
    expect(clause).toBeDefined();
    expect(templateService.removeClauseFromTemplate(t.id, clause!.id)).toBe(true);
    const refreshed = templateService.getTemplate(t.id);
    expect(refreshed?.clauses.length).toBe(0);
  });

  it('returns false when removing a non-existent clause', () => {
    const t = templateService.createTemplate({ name: 'Empty Clauses' });
    expect(templateService.removeClauseFromTemplate(t.id, 'missing')).toBe(false);
  });
});

describe('templateService.renderTemplate', () => {
  let templateService: Awaited<ReturnType<typeof loadService>>;

  beforeEach(async () => {
    templateService = await loadService();
  });

  it('substitutes variables in terms and clause content', () => {
    const t = templateService.createTemplate({
      name: 'Renderer',
      terms: 'Hello {{who}}, welcome to {{place}}.',
      clauses: [
        { id: 'c1', title: 'A', content: 'See {{place}} for details.', required: false, category: 'general', order: 1 },
      ],
      variables: [
        { name: 'who', label: 'Who', type: 'string', required: true },
        { name: 'place', label: 'Place', type: 'string', required: true, defaultValue: 'Earth' },
      ],
    });

    const rendered = templateService.renderTemplate(t.id, { who: 'Rejaul', place: 'Mumbai' });
    expect(rendered).toBeDefined();
    expect(rendered!.terms).toBe('Hello Rejaul, welcome to Mumbai.');
    expect(rendered!.clauses[0].content).toBe('See Mumbai for details.');
  });

  it('returns undefined for a missing template', () => {
    expect(templateService.renderTemplate('nope', {})).toBeUndefined();
  });
});
