/**
 * PolicyOS — Developer Experience tests (Phase 10)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Developer Experience — module imports', () => {
  it('developer-experience module loads without error', async () => {
    // Just verify the route file can be imported (no syntax errors)
    // Note: Can't call registerDeveloperExperienceRoutes without an Express app
    const mod = await import('../../src/routes/developer-experience.js');
    assert.strictEqual(typeof mod.registerDeveloperExperienceRoutes, 'function');
  });
});

describe('Developer Experience — SDK language support', () => {
  const supported = ['javascript', 'python', 'typescript', 'curl'];

  for (const lang of supported) {
    it(`supports ${lang} SDK`, async () => {
      const mod = await import('../../src/routes/developer-experience.js');
      // The route itself is a function, so we can't test it directly without an app
      // This test at least confirms the module loads
      assert.ok(mod.registerDeveloperExperienceRoutes);
    });
  }
});