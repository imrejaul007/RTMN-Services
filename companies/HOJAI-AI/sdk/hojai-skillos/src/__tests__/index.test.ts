import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SkillOs, SkillOsClient, HttpError } from '../index.js';
import { request } from '../utils.js';
import type { HojaiConfig } from '../foundation-config.js';

interface FetchCall { url: string; method: string; body?: string; headers: Record<string, string>; }
function withFetchMock(handler: (url: string, init: RequestInit) => Promise<Response>) {
  const original = globalThis.fetch;
  const calls: FetchCall[] = [];
  globalThis.fetch = (async (url: unknown, init: RequestInit | undefined) => {
    calls.push({ url: String(url), method: init?.method ?? 'GET', body: init?.body as string | undefined, headers: (init?.headers ?? {}) as Record<string, string> });
    return handler(String(url), init ?? {});
  }) as typeof fetch;
  return { calls, restore: () => { globalThis.fetch = original; } };
}
function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}
const baseConfig: HojaiConfig = { apiKey: 'test-key', baseUrl: 'http://localhost:4399' };

test('SkillOs client instantiates', () => {
  const s = new SkillOs(baseConfig);
  assert.ok(s.skill instanceof SkillOsClient);
  assert.equal(s.config.apiKey, 'test-key');
});

test('listSkills GETs /api/skills', async () => {
  const m = withFetchMock(async () => jsonResponse(200, {
    success: true,
    data: [
      { id: 'sk-1', name: 'Translate', description: 'Translate text', category: 'translation', tags: ['lang'], version: '1.0.0', status: 'active', inputs: [], outputs: [], pricing: { model: 'free' }, rating: 4.5, executionCount: 100, createdAt: '2026-01-01', updatedAt: '2026-01-01' }
    ]
  }));
  const skills = await new SkillOs(baseConfig).skill.listSkills();
  assert.equal(skills.length, 1);
  assert.equal(skills[0].name, 'Translate');
  m.restore();
});

test('listSkills with category filter', async () => {
  const m = withFetchMock(async (url) => {
    assert.ok(url.includes('category=translation'));
    return jsonResponse(200, { success: true, data: [] });
  });
  await new SkillOs(baseConfig).skill.listSkills({ category: 'translation' });
  m.restore();
});

test('createSkill POSTs to /api/skills', async () => {
  const m = withFetchMock(async () => jsonResponse(200, {
    success: true,
    data: { id: 'sk-1', name: 'NewSkill', version: '1.0.0', status: 'active' }
  }));
  const skill = await new SkillOs(baseConfig).skill.createSkill({
    name: 'NewSkill', description: 'd', category: 'general', tags: [],
    version: '1.0.0', status: 'active', inputs: [], outputs: [],
    pricing: { model: 'free' }
  });
  assert.equal(skill.id, 'sk-1');
  assert.equal(m.calls[0].method, 'POST');
  m.restore();
});

test('discover GETs with q + category', async () => {
  const m = withFetchMock(async (url) => {
    assert.ok(url.includes('q=translate'));
    return jsonResponse(200, { success: true, data: [] });
  });
  await new SkillOs(baseConfig).skill.discover({ q: 'translate' });
  m.restore();
});

test('semanticSearch POSTs q + k', async () => {
  const m = withFetchMock(async (url) => {
    assert.ok(url.includes('q=hello'));
    assert.ok(url.includes('k=5'));
    return jsonResponse(200, { success: true, data: [{ id: 'sk-1', score: 0.95 }] });
  });
  const results = await new SkillOs(baseConfig).skill.semanticSearch('hello', 5);
  assert.equal(results[0].score, 0.95);
  m.restore();
});

test('listCategories returns categories', async () => {
  const m = withFetchMock(async () => jsonResponse(200, {
    success: true,
    data: [{ id: 'translation', name: 'Translation', description: 'Lang skills', skillCount: 12 }]
  }));
  const cats = await new SkillOs(baseConfig).skill.listCategories();
  assert.equal(cats[0].skillCount, 12);
  m.restore();
});

test('default timeout applied', () => {
  const s = new SkillOs({ apiKey: 'k', baseUrl: 'http://x' });
  assert.equal(s.config.timeout, 10000);
});

test('sends Authorization header', async () => {
  const m = withFetchMock(async (url, init) => {
    assert.equal(init.headers?.['Authorization'], 'Bearer test-key');
    return jsonResponse(200, { success: true, data: [] });
  });
  await new SkillOs(baseConfig).skill.listSkills();
  m.restore();
});

test('retry on 5xx then succeeds', async () => {
  let attempts = 0;
  const m = withFetchMock(async () => {
    attempts++;
    if (attempts < 3) return jsonResponse(503, { error: 'down' });
    return jsonResponse(200, { success: true, data: [] });
  });
  const result = await request({ baseUrl: 'http://x', maxRetries: 3, timeout: 5000 }, 'GET', '/x');
  assert.equal(attempts, 3);
  m.restore();
});

test('throws HttpError on 4xx', async () => {
  const m = withFetchMock(async () => jsonResponse(404, { error: 'not found' }));
  await assert.rejects(
    () => request({ baseUrl: 'http://x', maxRetries: 0 }, 'GET', '/x'),
    (err: unknown) => err instanceof HttpError && err.status === 404
  );
  m.restore();
});

test('total public method count is at least 9', () => {
  const s = new SkillOs(baseConfig);
  const count = Object.getOwnPropertyNames(Object.getPrototypeOf(s.skill)).filter(n => n !== 'constructor').length;
  assert.ok(count >= 9, `expected >= 9 methods, got ${count}`);
});