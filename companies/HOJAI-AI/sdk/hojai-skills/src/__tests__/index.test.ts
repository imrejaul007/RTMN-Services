import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Skills } from '../index.js';

function withFetchMock(handler: (url: any, options: any) => Promise<any>) {
  const original = globalThis.fetch;
  globalThis.fetch = handler as any;
  return () => { globalThis.fetch = original; };
}

test('Skills client instantiates with all 5 sub-clients', () => {
  const s = new Skills({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  assert.ok(s.os); assert.ok(s.marketplace); assert.ok(s.prompts); assert.ok(s.workflows); assert.ok(s.translation);
});

test('SkillOsClient.execute POSTs to :4743/api/skills/:id/execute', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body) };
    return { ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ({ skillId: 'sk-1', status: 'success', output: { result: 'hi' }, durationMs: 12 }) };
  });
  const s = new Skills({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  await s.os.execute('sk-1', { text: 'hello' });
  assert.equal(captured.url, 'http://localhost:4743/api/skills/sk-1/execute');
  restore();
});

test('SkillMarketplaceClient.install POSTs to :4120/.../install', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, _options: any) => {
    captured = { url };
    return { ok: true, status: 201, headers: { get: () => 'application/json' },
      json: async () => ({ installed: true, skillId: 'sk-1', installedAt: 't' }) };
  });
  const s = new Skills({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  await s.marketplace.install('sk-1');
  assert.equal(captured.url, 'http://localhost:4120/api/skills/marketplace/sk-1/install');
  restore();
});

test('PromptManagerClient.publishVersion POSTs to :4771/.../versions', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body) };
    return { ok: true, status: 201, headers: { get: () => 'application/json' },
      json: async () => ({ id: 'v-1', templateId: 't-1', version: 2, content: 'x', variables: ['a'], createdAt: 't' }) };
  });
  const s = new Skills({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  await s.prompts.publishVersion('welcome', { content: 'new', notes: 'v2' });
  assert.equal(captured.url, 'http://localhost:4771/api/templates/welcome/versions');
  assert.equal(captured.body.notes, 'v2');
  restore();
});

test('WorkflowMarketplaceClient.deploy POSTs to :4938/.../deploy', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body) };
    return { ok: true, status: 201, headers: { get: () => 'application/json' },
      json: async () => ({ id: 'd-1', workflowId: 'wf-1', status: 'active', deployedAt: 't', runCount: 0 }) };
  });
  const s = new Skills({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  await s.workflows.deploy('wf-1', { name: 'prod' });
  assert.equal(captured.url, 'http://localhost:4938/api/workflows/wf-1/deploy');
  assert.equal(captured.body.name, 'prod');
  restore();
});

test('TranslationClient.translate POSTs to :4866/api/translate', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body) };
    return { ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ({ text: 'Hola', sourceLang: 'en', targetLang: 'es', provider: 'google' }) };
  });
  const s = new Skills({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  await s.translation.translate({ text: 'Hello', sourceLang: 'en', targetLang: 'es' });
  assert.equal(captured.url, 'http://localhost:4866/api/translate');
  assert.equal(captured.body.targetLang, 'es');
  restore();
});

test('Skills client retries on 5xx', async () => {
  let calls = 0;
  const restore = withFetchMock(async () => {
    calls++;
    if (calls < 3) return { ok: false, status: 503, headers: { get: () => 'text/plain' }, text: async () => 'err' };
    return { ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => [] };
  });
  const s = new Skills({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const items = await s.os.list();
  assert.equal(calls, 3);
  assert.deepEqual(items, []);
  restore();
});

test('Skills client throws on 4xx', async () => {
  const restore = withFetchMock(async () => ({ ok: false, status: 404, headers: { get: () => 'text/plain' }, text: async () => 'Not Found' }));
  const s = new Skills({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  await assert.rejects(() => s.os.get('missing'), /HTTP 404/);
  restore();
});
