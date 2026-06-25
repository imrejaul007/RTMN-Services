/**
 * nexha-package-registry — Package registry service unit tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import packageRegistryService from '../../src/services/packageRegistryService.js';

const DEMO_PUBLISHER = {
  nexhaId: 'nexha-test',
  corpId: 'corp-test',
  name: 'Test Publisher'
};

const DEMO_PKG: Parameters<typeof packageRegistryService.publish>[3] = {
  name: '@test/demo-package',
  version: '1.0.0',
  displayName: 'Demo Package',
  tagline: 'A demo package for testing',
  description: 'This is a test package for the Nexha package registry.',
  kind: 'industry-pack',
  industries: ['restaurant'],
  tags: ['demo', 'test'],
  dist: { tarball: 'https://example.com/demo-1.0.0.tgz', size: 1000000, checksum: 'sha256:abc123' },
  readme: '# Demo Package\n\nTest package.'
};

describe('Package Registry — seeding', () => {
  beforeEach(() => { packageRegistryService.clear(); });

  it('seeds demo packages on first seed call', () => {
    const count = packageRegistryService.seedDemoPackages();
    expect(count).toBeGreaterThan(0);
    expect(packageRegistryService.total()).toBe(count);
  });

  it('seeds do not duplicate on re-construction', () => {
    const first = packageRegistryService.seedDemoPackages();
    const second = packageRegistryService.seedDemoPackages();
    expect(first).toBe(second);
  });
});

describe('Package Registry — publish', () => {
  beforeEach(() => { packageRegistryService.clear(); });

  it('publishes a new package with generated id', () => {
    const pkg = packageRegistryService.publish(DEMO_PUBLISHER.nexhaId, DEMO_PUBLISHER.corpId, DEMO_PUBLISHER.name, DEMO_PKG);
    expect(pkg.id).toMatch(/^pkg-/);
    expect(pkg.scopeName).toBe('@test/demo-package');
    expect(pkg.version).toBe('1.0.0');
    expect(pkg.publisherNexhaId).toBe('nexha-test');
    expect(pkg.status).toBe('published');
    expect(pkg.downloads).toBe(0);
    expect(pkg.stars).toBe(0);
    expect(pkg.publishedAt).toBeTruthy();
  });

  it('allows multiple versions of the same package', () => {
    const v1 = packageRegistryService.publish(DEMO_PUBLISHER.nexhaId, DEMO_PUBLISHER.corpId, DEMO_PUBLISHER.name, DEMO_PKG);
    const v2 = packageRegistryService.publish(DEMO_PUBLISHER.nexhaId, DEMO_PUBLISHER.corpId, DEMO_PUBLISHER.name, { ...DEMO_PKG, version: '2.0.0' });
    expect(v1.id).not.toBe(v2.id);
    expect(v1.version).toBe('1.0.0');
    expect(v2.version).toBe('2.0.0');
  });

  it('defaults scopeName from name', () => {
    const pkg = packageRegistryService.publish(DEMO_PUBLISHER.nexhaId, DEMO_PUBLISHER.corpId, DEMO_PUBLISHER.name, { ...DEMO_PKG, name: 'bare-name' });
    expect(pkg.scopeName).toBe('@nexha/bare-name');
  });
});

describe('Package Registry — get', () => {
  beforeEach(() => { packageRegistryService.clear(); });

  it('gets a package by ID', () => {
    const published = packageRegistryService.publish(DEMO_PUBLISHER.nexhaId, DEMO_PUBLISHER.corpId, DEMO_PUBLISHER.name, DEMO_PKG);
    const found = packageRegistryService.get(published.id);
    expect(found?.id).toBe(published.id);
  });

  it('gets null for unknown ID', () => {
    expect(packageRegistryService.get('pkg-nonexistent')).toBeNull();
  });

  it('gets by scopeName + version', () => {
    packageRegistryService.publish(DEMO_PUBLISHER.nexhaId, DEMO_PUBLISHER.corpId, DEMO_PUBLISHER.name, DEMO_PKG);
    packageRegistryService.publish(DEMO_PUBLISHER.nexhaId, DEMO_PUBLISHER.corpId, DEMO_PUBLISHER.name, { ...DEMO_PKG, version: '2.0.0' });
    const latest = packageRegistryService.getByScope('@test/demo-package');
    expect(latest?.version).toBe('2.0.0'); // latest = highest semver
    const v1 = packageRegistryService.getByScope('@test/demo-package', '1.0.0');
    expect(v1?.version).toBe('1.0.0');
  });

  it('returns null for unknown scope', () => {
    expect(packageRegistryService.getByScope('@nonexistent/package')).toBeNull();
  });
});

describe('Package Registry — semver resolution', () => {
  beforeEach(() => { packageRegistryService.clear(); });

  it('resolves latest tag to highest version', () => {
    packageRegistryService.publish(DEMO_PUBLISHER.nexhaId, DEMO_PUBLISHER.corpId, DEMO_PUBLISHER.name, { ...DEMO_PKG, version: '1.0.0' });
    packageRegistryService.publish(DEMO_PUBLISHER.nexhaId, DEMO_PUBLISHER.corpId, DEMO_PUBLISHER.name, { ...DEMO_PKG, version: '2.0.0' });
    const resolved = packageRegistryService.resolve('@test/demo-package', 'latest');
    expect(resolved?.version).toBe('2.0.0');
  });

  it('resolves exact version', () => {
    packageRegistryService.publish(DEMO_PUBLISHER.nexhaId, DEMO_PUBLISHER.corpId, DEMO_PUBLISHER.name, DEMO_PKG);
    const resolved = packageRegistryService.resolve('@test/demo-package', '1.0.0');
    expect(resolved?.version).toBe('1.0.0');
    expect(resolved?.resolvedFrom).toBe('1.0.0');
  });

  it('resolves caret range ^1.2.3', () => {
    packageRegistryService.publish(DEMO_PUBLISHER.nexhaId, DEMO_PUBLISHER.corpId, DEMO_PUBLISHER.name, { ...DEMO_PKG, version: '1.2.3' });
    packageRegistryService.publish(DEMO_PUBLISHER.nexhaId, DEMO_PUBLISHER.corpId, DEMO_PUBLISHER.name, { ...DEMO_PKG, version: '1.2.5' });
    packageRegistryService.publish(DEMO_PUBLISHER.nexhaId, DEMO_PUBLISHER.corpId, DEMO_PUBLISHER.name, { ...DEMO_PKG, version: '2.0.0' });
    const resolved = packageRegistryService.resolve('@test/demo-package', '^1.2.3');
    expect(resolved?.version).toBe('1.2.5'); // highest in range
  });

  it('returns null for unsatisfiable range', () => {
    packageRegistryService.publish(DEMO_PUBLISHER.nexhaId, DEMO_PUBLISHER.corpId, DEMO_PUBLISHER.name, DEMO_PKG);
    expect(packageRegistryService.resolve('@test/demo-package', '^5.0.0')).toBeNull();
    expect(packageRegistryService.resolve('@test/nonexistent', 'latest')).toBeNull();
  });
});

describe('Package Registry — list & search', () => {
  beforeEach(() => { packageRegistryService.clear(); packageRegistryService.seedDemoPackages(); });

  it('lists all packages with pagination', () => {
    const result = packageRegistryService.list({});
    expect(result.total).toBeGreaterThan(0);
    expect(result.packages.length).toBeLessThanOrEqual(result.perPage);
    expect(result.page).toBe(1);
  });

  it('filters by kind', () => {
    const result = packageRegistryService.list({ kind: 'agent-template' });
    for (const p of result.packages) {
      expect(p.kind).toBe('agent-template');
    }
  });

  it('filters by industry', () => {
    const result = packageRegistryService.list({ industry: 'restaurant' });
    for (const p of result.packages) {
      expect(p.industries).toContain('restaurant');
    }
  });

  it('filters by publisher', () => {
    const all = packageRegistryService.list({});
    const publisher = all.packages[0]?.publisherNexhaId;
    if (publisher) {
      const result = packageRegistryService.list({ publisherNexhaId: publisher });
      for (const p of result.packages) {
        expect(p.publisherNexhaId).toBe(publisher);
      }
    }
  });

  it('filters by tags (must match all)', () => {
    const result = packageRegistryService.list({ tags: ['procurement', 'restaurant'] });
    for (const p of result.packages) {
      expect(p.tags).toContain('procurement');
      expect(p.tags).toContain('restaurant');
    }
  });

  it('filters by query (free-text)', () => {
    const result = packageRegistryService.list({ query: 'delivery' });
    expect(result.packages.length).toBeGreaterThan(0);
    for (const p of result.packages) {
      const found = p.name.includes('delivery') || p.displayName.toLowerCase().includes('delivery') || p.description.includes('delivery');
      expect(found).toBe(true);
    }
  });

  it('sorts by downloads desc', () => {
    const result = packageRegistryService.list({ sort: 'downloads' });
    for (let i = 1; i < result.packages.length; i++) {
      expect(result.packages[i - 1].downloads).toBeGreaterThanOrEqual(result.packages[i].downloads);
    }
  });

  it('sorts by stars desc', () => {
    const result = packageRegistryService.list({ sort: 'stars' });
    for (let i = 1; i < result.packages.length; i++) {
      expect(result.packages[i - 1].stars).toBeGreaterThanOrEqual(result.packages[i].stars);
    }
  });

  it('search returns top downloads by default', () => {
    const results = packageRegistryService.search('agent');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].downloads).toBeGreaterThanOrEqual(results[results.length - 1].downloads);
  });
});

describe('Package Registry — stars', () => {
  beforeEach(() => { packageRegistryService.clear(); });

  it('adds a star', () => {
    const pkg = packageRegistryService.publish(DEMO_PUBLISHER.nexhaId, DEMO_PUBLISHER.corpId, DEMO_PUBLISHER.name, DEMO_PKG);
    expect(pkg.stars).toBe(0);
    const newCount = packageRegistryService.toggleStar(pkg.id, 'nexha-a');
    expect(newCount).toBe(1);
    const after = packageRegistryService.get(pkg.id)!;
    expect(after.stars).toBe(1);
    expect(after.starredBy).toContain('nexha-a');
  });

  it('removes star on second toggle', () => {
    const pkg = packageRegistryService.publish(DEMO_PUBLISHER.nexhaId, DEMO_PUBLISHER.corpId, DEMO_PUBLISHER.name, DEMO_PKG);
    packageRegistryService.toggleStar(pkg.id, 'nexha-a');
    const newCount = packageRegistryService.toggleStar(pkg.id, 'nexha-a');
    expect(newCount).toBe(0);
  });

  it('multiple nexhas can star independently', () => {
    const pkg = packageRegistryService.publish(DEMO_PUBLISHER.nexhaId, DEMO_PUBLISHER.corpId, DEMO_PUBLISHER.name, DEMO_PKG);
    packageRegistryService.toggleStar(pkg.id, 'nexha-a');
    packageRegistryService.toggleStar(pkg.id, 'nexha-b');
    packageRegistryService.toggleStar(pkg.id, 'nexha-c');
    const after = packageRegistryService.get(pkg.id)!;
    expect(after.stars).toBe(3);
  });
});

describe('Package Registry — versions', () => {
  beforeEach(() => { packageRegistryService.clear(); });

  it('lists all versions sorted by semver desc', () => {
    packageRegistryService.publish(DEMO_PUBLISHER.nexhaId, DEMO_PUBLISHER.corpId, DEMO_PUBLISHER.name, { ...DEMO_PKG, version: '1.0.0' });
    packageRegistryService.publish(DEMO_PUBLISHER.nexhaId, DEMO_PUBLISHER.corpId, DEMO_PUBLISHER.name, { ...DEMO_PKG, version: '1.2.0' });
    packageRegistryService.publish(DEMO_PUBLISHER.nexhaId, DEMO_PUBLISHER.corpId, DEMO_PUBLISHER.name, { ...DEMO_PKG, version: '2.0.0' });
    packageRegistryService.publish(DEMO_PUBLISHER.nexhaId, DEMO_PUBLISHER.corpId, DEMO_PUBLISHER.name, { ...DEMO_PKG, version: '2.1.3' });
    const versions = packageRegistryService.listVersions('@test/demo-package');
    expect(versions.length).toBe(4);
    expect(versions[0].version).toBe('2.1.3'); // latest first
    expect(versions[3].version).toBe('1.0.0'); // oldest last
  });

  it('returns empty for unknown scope', () => {
    expect(packageRegistryService.listVersions('@unknown/pkg')).toEqual([]);
  });
});

describe('Package Registry — deprecate & remove', () => {
  beforeEach(() => { packageRegistryService.clear(); });

  it('deprecates a package', () => {
    const pkg = packageRegistryService.publish(DEMO_PUBLISHER.nexhaId, DEMO_PUBLISHER.corpId, DEMO_PUBLISHER.name, DEMO_PKG);
    const deprecated = packageRegistryService.deprecate(pkg.id, 'superseded');
    expect(deprecated?.status).toBe('deprecated');
    // Deprecated packages still show in list (filtered out from removed)
    const found = packageRegistryService.get(pkg.id);
    expect(found?.status).toBe('deprecated');
  });

  it('soft-removes a package (marks removed)', () => {
    const pkg = packageRegistryService.publish(DEMO_PUBLISHER.nexhaId, DEMO_PUBLISHER.corpId, DEMO_PUBLISHER.name, DEMO_PKG);
    expect(packageRegistryService.remove(pkg.id)).toBe(true);
    const found = packageRegistryService.get(pkg.id);
    expect(found?.status).toBe('removed');
    // Removed packages don't appear in list
    const listed = packageRegistryService.list({});
    const foundInList = listed.packages.some((p) => p.id === pkg.id);
    expect(foundInList).toBe(false);
  });

  it('returns false for removing unknown package', () => {
    expect(packageRegistryService.remove('pkg-nonexistent')).toBe(false);
  });
});

describe('Package Registry — stats', () => {
  beforeEach(() => { packageRegistryService.clear(); packageRegistryService.seedDemoPackages(); });

  it('returns meaningful stats', () => {
    const stats = packageRegistryService.stats();
    expect(stats.totalPackages).toBeGreaterThan(0);
    expect(stats.totalPublishers).toBeGreaterThan(0);
    const kindSum = Object.values(stats.byKind).reduce((a, b) => a + b, 0);
    expect(kindSum).toBe(stats.totalPackages);
  });
});
