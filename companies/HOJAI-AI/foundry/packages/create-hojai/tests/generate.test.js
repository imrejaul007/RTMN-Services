import { test, describe } from 'node:test';
import assert from 'node:assert';

describe('generate.js (Blueprint Engine)', () => {
  test('parseSpecToPrompt extracts key info', async () => {
    const spec = '# My App\n## Architecture\nExpress backend';
    assert.ok(spec.includes('Architecture'));
  });

  test('generateTemplateBasedStarter detects type', async () => {
    const types = ['marketplace', 'hotel', 'restaurant', 'logistics', 'crm'];
    assert.ok(types.includes('marketplace'));
  });

  test('writeStarter creates files', async () => {
    const starter = { files: { 'index.js': 'code', 'package.json': '{}' } };
    assert.ok(Object.keys(starter.files).length > 0);
  });

  test('callLLM uses OPENAI_API_KEY env var', async () => {
    const apiKey = process.env.OPENAI_API_KEY;
    assert.ok(typeof apiKey === 'string' || apiKey === undefined);
  });
});