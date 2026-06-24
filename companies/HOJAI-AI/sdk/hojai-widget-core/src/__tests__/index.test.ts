/**
 * Tests for HojaiWidget.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HojaiWidget } from '../index.js';

(globalThis as any).window = (globalThis as any).window || {};
(globalThis as any).document = (globalThis as any).document || {
  createElement: () => ({
    setAttribute: () => {},
    classList: { add: () => {}, remove: () => {}, contains: () => false },
    style: {},
    appendChild: () => {},
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {},
    removeEventListener: () => {},
    set innerHTML(_: string) {},
    get innerHTML() { return ''; }
  }),
  body: { appendChild: () => {} },
  head: { appendChild: () => {} },
  querySelector: () => null,
  addEventListener: () => {},
  getElementsByTagName: () => []
};

test('constructor requires apiKey', () => {
  assert.throws(
    () => new HojaiWidget({ apiKey: '', companyId: 'x' } as any),
    /apiKey is required/
  );
});

test('constructor requires companyId', () => {
  assert.throws(
    () => new HojaiWidget({ apiKey: 'pk_live_x', companyId: '' } as any),
    /companyId is required/
  );
});

test('constructor applies defaults', () => {
  const w = new HojaiWidget({ apiKey: 'pk_live_x', companyId: 'maya' });
  const any = w as any;
  assert.equal(any.config.color, '#3B82F6');
  assert.equal(any.config.position, 'bottom-right');
  assert.equal(any.config.language, 'en');
  assert.equal(any.baseUrl, 'https://api.hojai.ai');
});

test('constructor applies overrides', () => {
  const w = new HojaiWidget({
    apiKey: 'pk_live_x',
    companyId: 'maya',
    baseUrl: 'https://staging.hojai.ai',
    config: {
      name: 'Maya Assistant',
      color: '#FF0000',
      position: 'bottom-left',
      language: 'hi',
      greeting: 'नमस्ते!'
    }
  });
  const any = w as any;
  assert.equal(any.baseUrl, 'https://staging.hojai.ai');
  assert.equal(any.config.name, 'Maya Assistant');
  assert.equal(any.config.color, '#FF0000');
  assert.equal(any.config.position, 'bottom-left');
  assert.equal(any.config.language, 'hi');
  assert.equal(any.config.greeting, 'नमस्ते!');
});

test('identify merges user data', () => {
  const w = new HojaiWidget({ apiKey: 'pk_live_x', companyId: 'maya' });
  w.identify({ id: 'u1', email: 'a@b.com' });
  assert.deepEqual((w as any).user, { id: 'u1', email: 'a@b.com' });
  w.identify({ name: 'Alice' });
  assert.deepEqual((w as any).user, { id: 'u1', email: 'a@b.com', name: 'Alice' });
});

test('on() registers listener; returned function unsubscribes', () => {
  const w = new HojaiWidget({ apiKey: 'pk_live_x', companyId: 'maya' });
  let count = 0;
  const off = w.on('open', () => count++);
  (w as any)._emit('open');
  (w as any)._emit('open');
  assert.equal(count, 2);
  off();
  (w as any)._emit('open');
  assert.equal(count, 2);
});

test('getHistory returns copy', () => {
  const w = new HojaiWidget({ apiKey: 'pk_live_x', companyId: 'maya' });
  (w as any)._appendMessage({ id: 'm1', role: 'user', content: 'hi', timestamp: 1 });
  const h = w.getHistory();
  assert.equal(h.length, 1);
  assert.equal(h[0].content, 'hi');
  h.pop();
  assert.equal((w as any).history.length, 1);
});

test('send() with failed backend returns fallback assistant message', async () => {
  const originalFetch = (globalThis as any).fetch;
  (globalThis as any).fetch = async () => ({ ok: false, status: 500, json: async () => ({}) });

  const w = new HojaiWidget({ apiKey: 'pk_live_x', companyId: 'maya', baseUrl: 'https://x' });
  (w as any).render = () => {};
  (w as any)._showTyping = () => {};
  (w as any)._renderMessage = () => {};

  const msg = await w.send('hi');
  assert.equal(msg.role, 'assistant');
  assert.ok(msg.content.includes('trouble'));

  (globalThis as any).fetch = originalFetch;
});

test('send() with successful backend returns assistant message from data', async () => {
  const originalFetch = (globalThis as any).fetch;
  (globalThis as any).fetch = async () => ({
    ok: true, status: 200,
    json: async () => ({ success: true, data: { messageId: 'm42', reply: 'Hello!', rich: null } })
  });

  const w = new HojaiWidget({ apiKey: 'pk_live_x', companyId: 'maya', baseUrl: 'https://x' });
  (w as any).render = () => {};
  (w as any)._showTyping = () => {};
  (w as any)._renderMessage = () => {};

  const msg = await w.send('hi');
  assert.equal(msg.role, 'assistant');
  assert.equal(msg.id, 'm42');
  assert.equal(msg.content, 'Hello!');

  (globalThis as any).fetch = originalFetch;
});

test('send() emits message + response events', async () => {
  const originalFetch = (globalThis as any).fetch;
  (globalThis as any).fetch = async () => ({
    ok: true, status: 200,
    json: async () => ({ success: true, data: { reply: 'yo' } })
  });

  const w = new HojaiWidget({ apiKey: 'pk_live_x', companyId: 'maya', baseUrl: 'https://x' });
  (w as any).render = () => {};
  (w as any)._showTyping = () => {};
  (w as any)._renderMessage = () => {};

  let userCount = 0;
  let assistantCount = 0;
  w.on('message', () => userCount++);
  w.on('response', () => assistantCount++);

  await w.send('hi');

  assert.equal(userCount, 1);
  assert.equal(assistantCount, 1);

  (globalThis as any).fetch = originalFetch;
});

test('destroy clears listeners', () => {
  const w = new HojaiWidget({ apiKey: 'pk_live_x', companyId: 'maya' });
  let count = 0;
  w.on('open', () => count++);
  (w as any)._emit('open');
  assert.equal(count, 1);
  w.destroy();
  assert.equal((w as any).listeners.size, 0);
});
