/**
 * Commerce Studio Smoke Tests
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = readFileSync(
  join(import.meta.dirname, '..', 'src', 'index.ts'),
  'utf-8',
);

describe('Commerce Studio source', () => {
  it('has /health endpoint', () => {
    expect(SRC).toContain("app.get('/health'");
  });
  it('has /api/studio route', () => {
    expect(SRC).toContain("app.get('/api/studio'");
  });
  it('mounts templatesRouter', () => {
    expect(SRC).toContain('templatesRouter');
    expect(SRC).toContain("app.use('/api/studio/templates'");
  });
  it('mounts builderRouter', () => {
    expect(SRC).toContain('builderRouter');
  });
  it('mounts deployRouter', () => {
    expect(SRC).toContain('deployRouter');
  });
  it('mounts dashboardRouter', () => {
    expect(SRC).toContain('dashboardRouter');
  });
  it('mounts wizardsRouter', () => {
    expect(SRC).toContain('wizardsRouter');
  });
  it('uses helmet, cors, compression', () => {
    expect(SRC).toContain('helmet()');
    expect(SRC).toContain('cors()');
    expect(SRC).toContain('compression()');
  });
});
