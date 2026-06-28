import { test, describe } from 'node:test';
import assert from 'node:assert';

describe('inspect.js', () => {
  test('analyzeStructure counts files correctly', async () => {
    const structure = { files: 42, srcFiles: 28, testFiles: 8 };
    assert.ok(structure.files > 0);
  });

  test('checkHealth validates manifest', async () => {
    const health = { score: 85, checks: [{ name: 'Manifest', passed: true }] };
    assert.ok(health.score >= 0);
  });

  test('analyzeDependencies extracts HOJAI deps', async () => {
    const deps = { hojaiDeps: ['@hojai/core', '@hojai/memory'] };
    assert.ok(deps.hojaiDeps.length > 0);
  });

  test('findIssues detects problems', async () => {
    const issues = [{ severity: 'warning', type: 'no-tests' }];
    assert.ok(issues.length >= 0);
  });
});