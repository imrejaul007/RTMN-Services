/**
 * Tests for the @hojai/genie SDK
 *
 * Uses Node's built-in test runner (no extra deps).
 * Run with: npm test (after build)
 *
 * 1 instantiation test + 1 happy-path test per sub-client (10 clients) +
 * 1 retry test + 1 throw test = 13 tests.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Genie } from '../index.js';

/**
 * Mock fetch helper — replaces globalThis.fetch and restores after the test.
 */
function withFetchMock(handler: (url: any, options: any) => Promise<any>) {
  const original = globalThis.fetch;
  globalThis.fetch = handler as any;
  return () => { globalThis.fetch = original; };
}

test('Genie client instantiates with all 10 sub-clients', () => {
  const genie = new Genie({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  assert.ok(genie.gateway, 'gateway client present');
  assert.ok(genie.memory, 'memory client present');
  assert.ok(genie.briefing, 'briefing client present');
  assert.ok(genie.calendar, 'calendar client present');
  assert.ok(genie.search, 'search client present');
  assert.ok(genie.voice, 'voice client present');
  assert.ok(genie.companion, 'companion client present');
  assert.ok(genie.assistant, 'assistant client present');
  assert.ok(genie.lifestyle, 'lifestyle client present');
  assert.ok(genie.serendipity, 'serendipity client present');
});

test('GatewayClient.query POSTs to /api/query', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body) };
    return {
      ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ({
        response: { type: 'calendar', message: 'You have 2 meetings today' },
        requestId: 'r-1', timestamp: 't',
      }),
    };
  });
  const genie = new Genie({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const { response } = await genie.gateway.query({ userId: 'u-1', query: "What's on my calendar?" });
  assert.equal(captured.url, 'http://localhost:9999/api/query');
  assert.equal(captured.body.userId, 'u-1');
  assert.equal(response.type, 'calendar');
  restore();
});

test('MemoryClient.capture POSTs a new memory', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body) };
    return {
      ok: true, status: 201, headers: { get: () => 'application/json' },
      json: async () => ({
        id: 'm-1', userId: 'u-1', type: 'note', content: 'Met Sarah at HOJAI',
        tags: [], capturedAt: 't',
      }),
    };
  });
  const genie = new Genie({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const mem = await genie.memory.capture({ userId: 'u-1', type: 'note', content: 'Met Sarah at HOJAI' });
  assert.equal(captured.url, 'http://localhost:9999/api/memory');
  assert.equal(captured.body.type, 'note');
  assert.equal(mem.id, 'm-1');
  restore();
});

test('BriefingClient.today GETs user briefing', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, method: options.method };
    return {
      ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ({
        userId: 'u-1', type: 'morning', generatedAt: 't',
        greeting: 'Good morning!', message: 'Here is your day',
        sections: { tasks: { count: 3 }, calendar: { count: 2 } },
      }),
    };
  });
  const genie = new Genie({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const b = await genie.briefing.today('u-1', 'morning');
  assert.equal(captured.url, 'http://localhost:9999/api/briefing/u-1?type=morning');
  assert.equal(b.greeting, 'Good morning!');
  restore();
});

test('CalendarClient.today GETs today events', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url };
    return {
      ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ([
        { id: 'e-1', userId: 'u-1', title: 'Standup', startAt: 't', endAt: 't' },
        { id: 'e-2', userId: 'u-1', title: 'Review', startAt: 't', endAt: 't' },
      ]),
    };
  });
  const genie = new Genie({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const events = await genie.calendar.today('u-1');
  assert.equal(captured.url, 'http://localhost:9999/api/events/today?userId=u-1');
  assert.equal(events.length, 2);
  restore();
});

test('SearchClient.universal GETs cross-source hits', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url };
    return {
      ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ({ hits: [{ id: 'h-1', source: 'memories', title: 'HOJAI meetup', score: 0.9 }], total: 1, query: 'meetup' }),
    };
  });
  const genie = new Genie({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const res = await genie.search.universal({ q: 'meetup', userId: 'u-1' });
  assert.equal(captured.url, 'http://localhost:9999/api/search?q=meetup&userId=u-1');
  assert.equal(res.hits[0].source, 'memories');
  restore();
});

test('VoiceClient.registerDevice POSTs a new device', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body) };
    return {
      ok: true, status: 201, headers: { get: () => 'application/json' },
      json: async () => ({
        id: 'd-1', userId: 'u-1', type: 'phone', name: 'My iPhone',
        hardwareId: 'UDID-12345', active: true, registeredAt: 't',
      }),
    };
  });
  const genie = new Genie({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const dev = await genie.voice.registerDevice({ userId: 'u-1', type: 'phone', name: 'My iPhone', hardwareId: 'UDID-12345' });
  assert.equal(captured.url, 'http://localhost:9999/api/devices');
  assert.equal(captured.body.type, 'phone');
  assert.equal(dev.id, 'd-1');
  restore();
});

test('CompanionClient.chat POSTs a message and gets reply', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body) };
    return {
      ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ({
        id: 'msg-1', userId: 'u-1', role: 'companion', content: 'How can I help?', createdAt: 't',
      }),
    };
  });
  const genie = new Genie({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const reply = await genie.companion.chat({ userId: 'u-1', message: 'Hi Genie' });
  assert.equal(captured.url, 'http://localhost:9999/api/companion/chat');
  assert.equal(captured.body.message, 'Hi Genie');
  assert.equal(reply.role, 'companion');
  restore();
});

test('AssistantClient.shopping POSTs a product search', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body) };
    return {
      ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ([
        { id: 'p-1', title: 'Organic cotton tee', price: { amount: 18, currency: 'USD' }, rating: 4.7, url: 'http://example.com/p-1', source: 'amazon', inStock: true },
      ]),
    };
  });
  const genie = new Genie({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const products = await genie.assistant.shopping({ userId: 'u-1', query: 'organic cotton t-shirts under $20' });
  assert.equal(captured.url, 'http://localhost:9999/api/shopping/search');
  assert.equal(products[0].title, 'Organic cotton tee');
  restore();
});

test('LifestyleClient.logWellness POSTs a wellness entry', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body) };
    return {
      ok: true, status: 201, headers: { get: () => 'application/json' },
      json: async () => ({
        id: 'w-1', userId: 'u-1', kind: 'mood', value: 8, unit: '1-10', capturedAt: 't',
      }),
    };
  });
  const genie = new Genie({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const e = await genie.lifestyle.logWellness({ userId: 'u-1', kind: 'mood', value: 8, unit: '1-10' });
  assert.equal(captured.url, 'http://localhost:9999/api/wellness/entries');
  assert.equal(e.kind, 'mood');
  restore();
});

test('SerendipityClient.daily GETs a random resurfaced memory', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url };
    return {
      ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ({
        memoryId: 'm-42', type: 'note', content: 'That conference in 2024',
        capturedAt: '2024-09-12', reason: 'anniversary', score: 0.88,
      }),
    };
  });
  const genie = new Genie({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const hit = await genie.serendipity.daily('u-1');
  assert.equal(captured.url, 'http://localhost:9999/api/serendipity/daily?userId=u-1');
  assert.equal(hit.reason, 'anniversary');
  restore();
});

test('Genie client retries on 5xx errors', async () => {
  let calls = 0;
  const restore = withFetchMock(async () => {
    calls++;
    if (calls < 3) {
      return { ok: false, status: 503, headers: { get: () => 'text/plain' }, text: async () => 'Service Unavailable' };
    }
    return {
      ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ({ preferences: { theme: 'dark' } }),
    };
  });
  const genie = new Genie({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const { preferences } = await genie.gateway.getPreferences('u-1');
  assert.equal(calls, 3);
  assert.equal(preferences.theme, 'dark');
  restore();
});

test('Genie client throws on 4xx errors', async () => {
  const restore = withFetchMock(async () => {
    return { ok: false, status: 404, headers: { get: () => 'text/plain' }, text: async () => 'Not Found' };
  });
  const genie = new Genie({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  await assert.rejects(
    () => genie.memory.get('missing'),
    /HTTP 404/
  );
  restore();
});
