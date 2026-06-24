import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Razor } from '../index.js';

function withFetchMock(handler: (url: any, options: any) => Promise<any>) {
  const original = globalThis.fetch;
  globalThis.fetch = handler as any;
  return () => { globalThis.fetch = original; };
}

test('Razor client instantiates with all 4 sub-clients', () => {
  const r = new Razor({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  assert.ok(r.intents); assert.ok(r.messages); assert.ok(r.channels); assert.ok(r.sessions);
});

test('IntentRouterClient.detect POSTs to :4299/api/intents/detect', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body) };
    return { ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ({
        id: 'i-1', name: 'order_food', domain: 'restaurant', confidence: 0.92,
        entities: [{ type: 'food', value: 'pizza', confidence: 0.95 }],
        rawText: 'Order a pizza', detectedAt: 't'
      }) };
  });
  const r = new Razor({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const intent = await r.intents.detect({ text: 'Order a pizza' });
  assert.equal(captured.url, 'http://localhost:4299/api/intents/detect');
  assert.equal(captured.body.text, 'Order a pizza');
  assert.equal(intent.name, 'order_food');
  assert.equal(intent.domain, 'restaurant');
  restore();
});

test('MessagesClient.send POSTs to :4299/api/messages/send', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body) };
    return { ok: true, status: 201, headers: { get: () => 'application/json' },
      json: async () => ({ id: 'm-1', channelId: 'ch-1', to: '+91...', body: 'Hi', status: 'queued' }) };
  });
  const r = new Razor({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  await r.messages.send({ channelId: 'ch-1', to: '+91...', body: 'Hi' });
  assert.equal(captured.url, 'http://localhost:4299/api/messages/send');
  assert.equal(captured.body.to, '+91...');
  restore();
});

test('MessagesClient.broadcast POSTs with recipients array', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body) };
    return { ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ({ broadcastId: 'b-1', totalRecipients: 3, queued: 3, failed: 0 }) };
  });
  const r = new Razor({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const res = await r.messages.broadcast({ channelId: 'ch-1', to: ['a', 'b', 'c'], body: 'Hi all' });
  assert.equal(captured.url, 'http://localhost:4299/api/messages/broadcast');
  assert.deepEqual(captured.body.to, ['a', 'b', 'c']);
  assert.equal(res.queued, 3);
  restore();
});

test('ChannelsClient.list GETs to :4299/api/channels', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, _options: any) => {
    captured = { url };
    return { ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ([
        { id: 'ch-1', kind: 'whatsapp', name: 'Main', active: true, createdAt: 't' },
        { id: 'ch-2', kind: 'telegram', name: 'Bot', active: true, createdAt: 't' }
      ]) };
  });
  const r = new Razor({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const channels = await r.channels.list();
  assert.equal(captured.url, 'http://localhost:4299/api/channels');
  assert.equal(channels.length, 2);
  assert.equal(channels[0].kind, 'whatsapp');
  restore();
});

test('ChannelsClient.sendWhatsApp POSTs to :4299/api/channels/whatsapp', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body) };
    return { ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ({ id: 'm-1', channelId: 'ch-1', to: '+91...', body: 'hi', status: 'sent' }) };
  });
  const r = new Razor({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  await r.channels.sendWhatsApp('ch-1', '+91...', 'hi');
  assert.equal(captured.url, 'http://localhost:4299/api/channels/whatsapp');
  restore();
});

test('SessionsClient.create POSTs to :4299/api/sessions', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body) };
    return { ok: true, status: 201, headers: { get: () => 'application/json' },
      json: async () => ({ id: 's-1', userId: 'u-1', channelId: 'ch-1', status: 'active', context: { entities: [], recentIntents: [] }, startedAt: 't' }) };
  });
  const r = new Razor({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const session = await r.sessions.create({ userId: 'u-1', channelId: 'ch-1' });
  assert.equal(captured.url, 'http://localhost:4299/api/sessions');
  assert.equal(session.userId, 'u-1');
  restore();
});

test('SessionsClient.sendMessage POSTs to /sessions/:id/message', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body) };
    return { ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ({ id: 's-1', userId: 'u-1', channelId: 'ch-1', status: 'active', context: { entities: [], recentIntents: [] }, startedAt: 't' }) };
  });
  const r = new Razor({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  await r.sessions.sendMessage('s-1', { body: 'Hello' });
  assert.equal(captured.url, 'http://localhost:4299/api/sessions/s-1/message');
  assert.equal(captured.body.body, 'Hello');
  restore();
});

test('Intents.handleText: low confidence is skipped', async () => {
  let callCount = 0;
  const restore = withFetchMock(async () => {
    callCount++;
    return { ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ({ id: 'i-1', name: 'unknown', domain: 'genie', confidence: 0.2, entities: [], rawText: 'huh', detectedAt: 't' }) };
  });
  const r = new Razor({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const result = await r.intents.handleText('huh');
  assert.equal(result.skipped, 'low confidence (0.2)');
  // Should NOT have called parse/validate/execute
  assert.equal(callCount, 1);
  restore();
});

test('Intents.handleText: high confidence runs full pipeline', async () => {
  let callCount = 0;
  const restore = withFetchMock(async (url: any, _options: any) => {
    callCount++;
    if (url.endsWith('/detect')) {
      return { ok: true, status: 200, headers: { get: () => 'application/json' },
        json: async () => ({ id: 'i-1', name: 'order_food', domain: 'restaurant', confidence: 0.92, entities: [], rawText: 'order', detectedAt: 't' }) };
    }
    if (url.endsWith('/parse')) {
      return { ok: true, status: 200, headers: { get: () => 'application/json' },
        json: async () => ({ id: 'i-1', name: 'order_food', domain: 'restaurant', confidence: 0.92, entities: [], rawText: 'order', detectedAt: 't', parameters: { food: 'pizza' } }) };
    }
    if (url.endsWith('/validate')) {
      return { ok: true, status: 200, headers: { get: () => 'application/json' },
        json: async () => ({ valid: true, errors: [] }) };
    }
    if (url.endsWith('/execute')) {
      return { ok: true, status: 200, headers: { get: () => 'application/json' },
        json: async () => ({ executionId: 'e-1', result: { ok: true }, status: 'completed' }) };
    }
    return { ok: false, status: 404, headers: { get: () => 'text/plain' }, text: async () => 'Not Found' };
  });
  const r = new Razor({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const result = await r.intents.handleText('order pizza');
  assert.equal(callCount, 4, 'should call detect+parse+validate+execute');
  assert.equal(result.executed?.status, 'completed');
  restore();
});

test('Razor client retries on 5xx', async () => {
  let calls = 0;
  const restore = withFetchMock(async () => {
    calls++;
    if (calls < 3) return { ok: false, status: 503, headers: { get: () => 'text/plain' }, text: async () => 'err' };
    return { ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ({ id: 'i-1', name: 'foo', domain: 'genie', confidence: 0.9, entities: [], rawText: 'x', detectedAt: 't' }) };
  });
  const r = new Razor({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const intent = await r.intents.detect({ text: 'x' });
  assert.equal(calls, 3);
  assert.equal(intent.name, 'foo');
  restore();
});

test('Razor client throws on 4xx', async () => {
  const restore = withFetchMock(async () => ({ ok: false, status: 404, headers: { get: () => 'text/plain' }, text: async () => 'Not Found' }));
  const r = new Razor({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  await assert.rejects(() => r.intents.detect({ text: 'x' }), /HTTP 404/);
  restore();
});
