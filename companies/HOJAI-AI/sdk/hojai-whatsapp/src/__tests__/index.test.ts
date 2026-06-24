import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WhatsApp } from '../index.js';

function withFetchMock(handler: (url: any, options: any) => Promise<any>) {
  const original = globalThis.fetch;
  globalThis.fetch = handler as any;
  return () => { globalThis.fetch = original; };
}

test('WhatsApp client instantiates with all 4 sub-clients', () => {
  const w = new WhatsApp({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  assert.ok(w.providers); assert.ok(w.templates); assert.ok(w.contacts); assert.ok(w.messages);
});

test('ProvidersClient.list GETs to :4860/api/providers', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, _options: any) => {
    captured = { url };
    return { ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ([{ id: 'p-1', kind: '360dialog', name: 'Main', active: true, createdAt: 't' }]) };
  });
  const w = new WhatsApp({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const providers = await w.providers.list();
  assert.equal(captured.url, 'http://localhost:4860/api/providers');
  assert.equal(providers[0].kind, '360dialog');
  restore();
});

test('ProvidersClient.switch POSTs providerId', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body) };
    return { ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ({ switched: true, current: 'twilio' }) };
  });
  const w = new WhatsApp({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  await w.providers.switch('twilio');
  assert.equal(captured.url, 'http://localhost:4860/api/providers/switch');
  assert.equal(captured.body.providerId, 'twilio');
  restore();
});

test('TemplatesClient.create POSTs template', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body) };
    return { ok: true, status: 201, headers: { get: () => 'application/json' },
      json: async () => ({ id: 'tpl-1', name: 'order', language: 'en', category: 'utility', body: 'Hi {{1}}', variables: ['name'], status: 'approved', createdAt: 't' }) };
  });
  const w = new WhatsApp({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  await w.templates.create({ name: 'order', language: 'en', category: 'utility', body: 'Hi {{1}}', variables: ['name'] });
  assert.equal(captured.url, 'http://localhost:4860/api/templates');
  assert.equal(captured.body.variables[0], 'name');
  restore();
});

test('TemplatesClient.render substitutes {{n}} placeholders by index', () => {
  const w = new WhatsApp({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const tpl = { id: 't', name: 'x', language: 'en', category: 'utility' as const, body: 'Hi {{1}}, your order {{2}} shipped!', variables: ['name', 'orderId'], status: 'approved' as const, createdAt: 't' };
  const { rendered, resolved } = w.templates.render(tpl, { name: 'Maya', orderId: 'ORD-1' });
  assert.equal(rendered, 'Hi Maya, your order ORD-1 shipped!');
  assert.equal(resolved.name, 'Maya');
  assert.equal(resolved.orderId, 'ORD-1');
});

test('TemplatesClient.render substitutes named placeholders too', () => {
  const w = new WhatsApp({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const tpl = { id: 't', name: 'x', language: 'en', category: 'utility' as const, body: 'Hi {{name}}, code {{code}}', variables: ['name', 'code'], status: 'approved' as const, createdAt: 't' };
  const { rendered } = w.templates.render(tpl, { name: 'Maya', code: '1234' });
  assert.equal(rendered, 'Hi Maya, code 1234');
});

test('ContactsClient.create POSTs to :4860/api/contacts', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body) };
    return { ok: true, status: 201, headers: { get: () => 'application/json' },
      json: async () => ({ id: 'c-1', phone: '+91...', name: 'Maya', tags: ['vip'], fields: {}, createdAt: 't' }) };
  });
  const w = new WhatsApp({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  await w.contacts.create({ phone: '+91...', name: 'Maya', tags: ['vip'] });
  assert.equal(captured.url, 'http://localhost:4860/api/contacts');
  restore();
});

test('MessagesClient.send POSTs to :4860/api/messages/send', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body) };
    return { ok: true, status: 202, headers: { get: () => 'application/json' },
      json: async () => ({ id: 'm-1', to: '+91...', body: 'hi', status: 'queued' }) };
  });
  const w = new WhatsApp({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  await w.messages.send({ to: '+91...', body: 'hi' });
  assert.equal(captured.url, 'http://localhost:4860/api/messages/send');
  restore();
});

test('MessagesClient.simulateWebhook POSTs to :4860/api/webhook/simulate', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body) };
    return { ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ({ received: true }) };
  });
  const w = new WhatsApp({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  await w.messages.simulateWebhook({ from: '+91...', body: 'incoming' });
  assert.equal(captured.url, 'http://localhost:4860/api/webhook/simulate');
  restore();
});

test('WhatsApp client retries on 5xx', async () => {
  let calls = 0;
  const restore = withFetchMock(async () => {
    calls++;
    if (calls < 3) return { ok: false, status: 503, headers: { get: () => 'text/plain' }, text: async () => 'err' };
    return { ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => [] };
  });
  const w = new WhatsApp({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const providers = await w.providers.list();
  assert.equal(calls, 3);
  assert.deepEqual(providers, []);
  restore();
});

test('WhatsApp client throws on 4xx', async () => {
  const restore = withFetchMock(async () => ({ ok: false, status: 404, headers: { get: () => 'text/plain' }, text: async () => 'Not Found' }));
  const w = new WhatsApp({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  await assert.rejects(() => w.providers.list(), /HTTP 404/);
  restore();
});
