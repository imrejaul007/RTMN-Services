/**
 * Tests for the widget backend's intent engine and routing.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { classifyLocal, INTENTS } = require('../intent-engine');
const { route, REPLY_BUILDERS } = require('../sutar-router');

// ─── Intent engine tests ───────────────────────────────────────────────

test('INTENTS contains all expected intents', () => {
  const expected = [
    'product_search', 'place_order', 'book_appointment', 'track_order',
    'get_support', 'ask_question', 'negotiate_price', 'request_quote',
    'subscribe', 'greeting'
  ];
  for (const i of expected) {
    assert.ok(INTENTS[i], `${i} should be defined`);
    assert.ok(INTENTS[i].agent, `${i} should have an agent`);
  }
});

test('classifyLocal: greeting', () => {
  const r = classifyLocal('hi there');
  assert.equal(r.intent, 'greeting');
  assert.ok(r.confidence > 0.5);
  assert.equal(r.source, 'local-keyword');
});

test('classifyLocal: product_search', () => {
  const r = classifyLocal('show me black hoodies under 2500');
  assert.equal(r.intent, 'product_search');
});

test('classifyLocal: place_order', () => {
  const r = classifyLocal('order 2 margherita pizzas');
  assert.equal(r.intent, 'place_order');
});

test('classifyLocal: book_appointment', () => {
  const r = classifyLocal('book a table for 2 tomorrow');
  assert.equal(r.intent, 'book_appointment');
});

test('classifyLocal: track_order', () => {
  const r = classifyLocal('where is my order?');
  assert.equal(r.intent, 'track_order');
});

test('classifyLocal: get_support', () => {
  const r = classifyLocal('I want a refund');
  assert.equal(r.intent, 'get_support');
});

test('classifyLocal: ask_question (fallback)', () => {
  const r = classifyLocal('xyzzy nothing matches');
  assert.equal(r.intent, 'ask_question');
});

test('classifyLocal: subscribe', () => {
  const r = classifyLocal('upgrade my plan');
  assert.equal(r.intent, 'subscribe');
});

test('classifyLocal: request_quote', () => {
  const r = classifyLocal('quote for 500 units');
  assert.equal(r.intent, 'request_quote');
});

test('classifyLocal: negotiate_price', () => {
  const r = classifyLocal('can you do 10% off?');
  assert.equal(r.intent, 'negotiate_price');
});

// ─── SUTAR router tests ─────────────────────────────────────────────────

test('route: greeting returns greeting reply', async () => {
  const r = await route({
    agentRole: 'assistant',
    intent: 'greeting',
    companyId: 'maya',
    visitorId: 'v1',
    message: 'hi',
    context: {},
    user: null
  });
  assert.ok(r.reply);
  assert.ok(r.reply.length > 0);
  assert.equal(r.source, 'local-builder');
});

test('route: greeting personalizes when user.name is known', async () => {
  const r = await route({
    agentRole: 'assistant',
    intent: 'greeting',
    companyId: 'maya',
    visitorId: 'v1',
    message: 'hi',
    context: {},
    user: { name: 'Alice' }
  });
  assert.ok(r.reply.includes('Alice'));
});

test('route: product_search with no enriched products asks for more', async () => {
  const r = await route({
    agentRole: 'sales',
    intent: 'product_search',
    companyId: 'maya',
    visitorId: 'v1',
    message: 'show me hoodies',
    context: {},
    user: null
  });
  assert.ok(r.reply);
  assert.equal(r.rich, null);
});

test('route: product_search with enriched products returns rich payload', async () => {
  const r = await route({
    agentRole: 'sales',
    intent: 'product_search',
    companyId: 'maya',
    visitorId: 'v1',
    message: 'show me hoodies',
    context: {
      enriched: {
        products: [
          { id: 'p1', name: 'Black Hoodie', price: 1999 },
          { id: 'p2', name: 'Gray Hoodie', price: 2499 }
        ]
      }
    },
    user: null
  });
  assert.ok(r.reply.includes('2'));
  assert.ok(r.rich);
  assert.equal(r.rich.type, 'products');
  assert.equal(r.rich.items.length, 2);
});

test('route: book_appointment returns time_slots rich when slots enriched', async () => {
  const r = await route({
    agentRole: 'booking',
    intent: 'book_appointment',
    companyId: 'maya',
    visitorId: 'v1',
    message: 'book a table',
    context: {
      enriched: {
        slots: [
          { time: '7pm', available: true },
          { time: '8pm', available: true }
        ]
      }
    },
    user: null
  });
  assert.equal(r.rich.type, 'time_slots');
  assert.equal(r.rich.slots.length, 2);
});

test('route: get_support offers human escalation', async () => {
  const r = await route({
    agentRole: 'support',
    intent: 'get_support',
    companyId: 'maya',
    visitorId: 'v1',
    message: 'my order is broken',
    context: {},
    user: null
  });
  assert.ok(r.reply.includes('human') || r.reply.includes('sorry'));
});

test('route: unknown intent falls back to ask_question builder', async () => {
  const r = await route({
    agentRole: 'unknown',
    intent: 'unknown_intent',
    companyId: 'maya',
    visitorId: 'v1',
    message: '???',
    context: {},
    user: null
  });
  assert.ok(r.reply);
  // Should fall through to ask_question builder
});

test('REPLY_BUILDERS covers all intents', () => {
  for (const intent of Object.keys(INTENTS)) {
    assert.ok(REPLY_BUILDERS[intent], `${intent} should have a reply builder`);
  }
});
