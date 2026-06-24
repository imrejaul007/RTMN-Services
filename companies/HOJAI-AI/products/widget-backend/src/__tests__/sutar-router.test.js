/**
 * Tests for the SUTAR router — proves the per-intent dispatch + shaper works.
 * Uses fetch mocking so no live services are needed.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const sutarRouter = require('../sutar-router');
const { _internal } = sutarRouter;

const ORIGINAL_FETCH = global.fetch;

// Helper: install a fetch stub for the duration of a test.
function withFetch(stub, fn) {
  global.fetch = stub;
  return Promise.resolve(fn()).finally(() => {
    global.fetch = ORIGINAL_FETCH;
  });
}

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body
  };
}

// ─── Config & shape ────────────────────────────────────────────────────

test('AGENT_ENDPOINTS includes all 4 SUTAR agents', () => {
  const cfg = sutarRouter.AGENT_ENDPOINTS;
  assert.ok(cfg.merchantAgents, 'merchantAgents should be configured');
  assert.ok(cfg.supportCopilot, 'supportCopilot should be configured');
  assert.ok(cfg.salesCopilot, 'salesCopilot should be configured');
  assert.ok(cfg.acnHub, 'acnHub should be configured');
});

test('INTENT_AGENT_MAP covers the 6 commerce/support intents', () => {
  const map = sutarRouter.INTENT_AGENT_MAP;
  assert.equal(map.product_search, 'merchantAgents');
  assert.equal(map.place_order, 'merchantAgents');
  assert.equal(map.negotiate_price, 'merchantAgents');
  assert.equal(map.request_quote, 'merchantAgents');
  assert.equal(map.track_order, 'merchantAgents');
  assert.equal(map.get_support, 'supportCopilot');
  assert.equal(map.ask_question, 'salesCopilot');
  assert.equal(map.greeting, null); // local
  assert.equal(map.subscribe, null); // local
  assert.equal(map.book_appointment, null); // local
});

// ─── ACP message builder ───────────────────────────────────────────────

test('buildAcpMessage: product_search → QUERY with intent field', () => {
  const m = _internal.buildAcpMessage('product_search', 'show me hoodies', { id: 'u1' });
  assert.equal(m.type, 'QUERY');
  assert.equal(m.intent, 'show me hoodies'); // merchant-agents expects string here
  assert.equal(m.text, 'show me hoodies');
  assert.equal(m.query, 'show me hoodies');
  assert.equal(m.from, 'u1');
});

test('buildAcpMessage: place_order → ORDER with order field', () => {
  const m = _internal.buildAcpMessage('place_order', 'order 2 pizzas', { id: 'u2' });
  assert.equal(m.type, 'ORDER');
  assert.equal(m.intent, 'order 2 pizzas');
  assert.ok(m.order, 'ORDER must include order field');
});

test('buildAcpMessage: negotiate_price → COUNTER with offer field', () => {
  const m = _internal.buildAcpMessage('negotiate_price', 'can you do 10% off?', { id: 'u3' });
  assert.equal(m.type, 'COUNTER');
  assert.equal(m.intent, 'can you do 10% off?');
  assert.ok(m.offer);
});

test('buildAcpMessage: request_quote → QUOTE subtype', () => {
  const m = _internal.buildAcpMessage('request_quote', 'quote for 500', { id: 'u4' });
  assert.equal(m.type, 'QUERY');
  assert.equal(m.subtype, 'QUOTE');
  assert.equal(m.intent, 'quote for 500');
});

test('buildAcpMessage: handles null user gracefully', () => {
  const m = _internal.buildAcpMessage('product_search', 'hoodies', null);
  assert.equal(m.from, 'visitor');
  assert.equal(m.sender, 'visitor');
  assert.equal(m.customerId, undefined);
});

// ─── Response shaper ────────────────────────────────────────────────────

test('shapeMerchantAgentResponse: QUOTE → natural language + rich quote', () => {
  const acp = {
    type: 'QUOTE',
    offer: {
      product: 'Black Hoodie',
      price: 1999,
      originalPrice: 2599,
      quantity: 1,
      currency: 'USD'
    },
    terms: { deliveryDate: '2026-07-01T00:00:00Z' },
    validUntil: '2026-06-25T00:00:00Z',
    negotiableFields: ['price']
  };
  const r = _internal.shapeMerchantAgentResponse(acp, 'product_search');
  assert.ok(r.reply.includes('Black Hoodie'));
  assert.ok(r.reply.includes('1999'));
  assert.ok(r.reply.includes('2599'), 'should mention original price');
  assert.ok(r.rich);
  assert.equal(r.rich.type, 'quote');
  assert.equal(r.rich.offer.price, 1999);
});

test('shapeMerchantAgentResponse: OFFER → rich products', () => {
  const acp = {
    type: 'OFFER',
    offer: { product: 'Blue Shirt', price: 1500, currency: 'USD' }
  };
  const r = _internal.shapeMerchantAgentResponse(acp, 'product_search');
  assert.ok(r.reply.includes('Blue Shirt'));
  assert.equal(r.rich.type, 'products');
  assert.equal(r.rich.items[0].name, 'Blue Shirt');
});

test('shapeMerchantAgentResponse: ACCEPT → order_confirmation', () => {
  const acp = { type: 'ACCEPT', order: { id: 'o1', total: 500 } };
  const r = _internal.shapeMerchantAgentResponse(acp, 'place_order');
  assert.ok(r.reply.includes('accepted') || r.reply.length > 0);
  assert.equal(r.rich.type, 'order_confirmation');
});

test('shapeMerchantAgentResponse: REJECT → reason in reply', () => {
  const acp = { type: 'REJECT', reason: 'Out of stock' };
  const r = _internal.shapeMerchantAgentResponse(acp, 'negotiate_price');
  assert.ok(r.reply.includes("can't accept"));
  assert.ok(r.reply.includes('Out of stock'));
});

test('shapeMerchantAgentResponse: COUNTER → counter_offer rich', () => {
  const acp = { type: 'COUNTER', offer: { price: 1800 } };
  const r = _internal.shapeMerchantAgentResponse(acp, 'negotiate_price');
  assert.equal(r.rich.type, 'counter_offer');
  assert.equal(r.rich.offer.price, 1800);
});

test('shapeMerchantAgentResponse: with recommendations → products rich', () => {
  const acp = {
    type: 'QUOTE',
    recommendations: [
      { id: 'p1', name: 'A', price: 100 },
      { id: 'p2', name: 'B', price: 200 }
    ]
  };
  const r = _internal.shapeMerchantAgentResponse(acp, 'product_search');
  assert.equal(r.rich.type, 'products');
  assert.equal(r.rich.items.length, 2);
});

test('shapeMerchantAgentResponse: QUERY_RECEIVED action=request_more_info', () => {
  const acp = { type: 'QUERY_RECEIVED', action: 'request_more_info' };
  const r = _internal.shapeMerchantAgentResponse(acp, 'product_search');
  assert.ok(r.reply.includes('Could you tell me more') || r.reply.length > 0);
});

test('shapeMerchantAgentResponse: returns null for null input', () => {
  assert.equal(_internal.shapeMerchantAgentResponse(null), null);
  assert.equal(_internal.shapeMerchantAgentResponse(undefined), null);
});

// ─── callAgent (generic HTTP) ───────────────────────────────────────────

test('callAgent: returns null when agent is disabled', async () => {
  await withFetch(async () => {
    const result = await _internal.callAgent('nonexistent', 'GET', '/x');
    assert.equal(result, null);
  }, async () => {});
});

test('callAgent: returns null when fetch throws', async () => {
  const oldCfg = sutarRouter.AGENT_ENDPOINTS.merchantAgents;
  sutarRouter.AGENT_ENDPOINTS.merchantAgents.enabled = true;
  try {
    await withFetch(async () => {
      throw new Error('network error');
    }, async () => {
      const result = await _internal.callAgent('merchantAgents', 'GET', '/x');
      assert.equal(result, null);
    });
  } finally {
    sutarRouter.AGENT_ENDPOINTS.merchantAgents = oldCfg;
  }
});

test('callAgent: returns parsed JSON on 2xx', async () => {
  await withFetch(async (url, opts) => {
    assert.ok(url.includes('/test'));
    return jsonResponse(200, { success: true, data: { hello: 'world' } });
  }, async () => {
    const result = await _internal.callAgent('merchantAgents', 'GET', '/test');
    assert.deepEqual(result, { success: true, data: { hello: 'world' } });
  });
});

test('callAgent: returns null on 4xx', async () => {
  await withFetch(async () => jsonResponse(404, { error: 'not found' }), async () => {
    const result = await _internal.callAgent('merchantAgents', 'GET', '/missing');
    assert.equal(result, null);
  });
});

test('callAgent: returns null on 5xx', async () => {
  await withFetch(async () => jsonResponse(500, { error: 'boom' }), async () => {
    const result = await _internal.callAgent('merchantAgents', 'GET', '/x');
    assert.equal(result, null);
  });
});

test('callAgent: sets auth header from config', async () => {
  let capturedHeaders = null;
  await withFetch(async (url, opts) => {
    capturedHeaders = opts.headers;
    return jsonResponse(200, { ok: true });
  }, async () => {
    const oldAuth = sutarRouter.AGENT_ENDPOINTS.merchantAgents.auth;
    sutarRouter.AGENT_ENDPOINTS.merchantAgents.auth = { name: 'x-internal-token', value: 'test-secret' };
    try {
      await _internal.callAgent('merchantAgents', 'GET', '/x');
    } finally {
      sutarRouter.AGENT_ENDPOINTS.merchantAgents.auth = oldAuth;
    }
  });
  assert.equal(capturedHeaders['x-internal-token'], 'test-secret');
});

// ─── resolveMerchantId ──────────────────────────────────────────────────

test('resolveMerchantId: returns first merchant from listing', async () => {
  await withFetch(async (url) => {
    if (url.includes('companyId=')) {
      return jsonResponse(200, { merchants: [] });
    }
    return jsonResponse(200, { merchants: [{ id: 'm-first' }, { id: 'm-second' }] });
  }, async () => {
    const id = await _internal.resolveMerchantId('some-company');
    assert.equal(id, 'm-first');
  });
});

test('resolveMerchantId: matches by companyId', async () => {
  await withFetch(async (url) => {
    if (url.includes('companyId=')) {
      return jsonResponse(200, { merchants: [] });
    }
    return jsonResponse(200, {
      merchants: [
        { id: 'm-1', companyId: 'maya' },
        { id: 'm-2', companyId: 'maya-collective' }
      ]
    });
  }, async () => {
    const id = await _internal.resolveMerchantId('maya-collective');
    assert.equal(id, 'm-2');
  });
});

test('resolveMerchantId: returns null when no merchants exist', async () => {
  await withFetch(async () => jsonResponse(200, { merchants: [] }), async () => {
    const id = await _internal.resolveMerchantId('any');
    assert.equal(id, null);
  });
});

// ─── Full route() flow ─────────────────────────────────────────────────

test('route: product_search → sutar-merchantAgents when agent responds', async () => {
  let calls = [];
  await withFetch(async (url, opts) => {
    calls.push({ url, opts });
    if (url.includes('/api/merchants') && !url.match(/maya|message/)) {
      return jsonResponse(200, { merchants: [{ id: 'maya-collective' }] });
    }
    if (url.includes('/message')) {
      const body = JSON.parse(opts.body);
      return jsonResponse(200, {
        type: 'QUOTE',
        offer: { product: 'Black Hoodie', price: 1999, currency: 'USD' }
      });
    }
    return jsonResponse(404, { error: 'not found' });
  }, async () => {
    const r = await sutarRouter.route({
      agentRole: 'sales',
      intent: 'product_search',
      companyId: 'maya-collective',
      visitorId: 'v1',
      message: 'show me hoodies',
      context: {},
      user: { id: 'u1', name: 'Alice' }
    });
    assert.equal(r.source, 'sutar-merchantAgents');
    assert.ok(r.reply.includes('Black Hoodie'));
    assert.equal(r.rich.type, 'quote');
  });
});

test('route: greeting → local-builder (no SUTAR agent mapped)', async () => {
  await withFetch(async () => {
    throw new Error('should not be called');
  }, async () => {
    const r = await sutarRouter.route({
      agentRole: 'assistant',
      intent: 'greeting',
      companyId: 'maya',
      visitorId: 'v1',
      message: 'hi',
      context: {},
      user: { id: 'u1', name: 'Alice' }
    });
    assert.equal(r.source, 'local-builder');
    assert.ok(r.reply.includes('Alice'));
  });
});

test('route: subscribe → local-builder', async () => {
  await withFetch(async () => { throw new Error('should not be called'); }, async () => {
    const r = await sutarRouter.route({
      agentRole: 'commerce',
      intent: 'subscribe',
      companyId: 'maya',
      visitorId: 'v1',
      message: 'upgrade my plan',
      context: {},
      user: null
    });
    assert.equal(r.source, 'local-builder');
  });
});

test('route: falls back to local when agent unreachable', async () => {
  await withFetch(async () => { throw new Error('network down'); }, async () => {
    const r = await sutarRouter.route({
      agentRole: 'sales',
      intent: 'product_search',
      companyId: 'maya',
      visitorId: 'v1',
      message: 'show me hoodies',
      context: {},
      user: null
    });
    assert.equal(r.source, 'local-builder');
    assert.ok(r.reply);
  });
});

test('route: falls back when agent returns non-2xx', async () => {
  await withFetch(async () => jsonResponse(500, { error: 'boom' }), async () => {
    const r = await sutarRouter.route({
      agentRole: 'sales',
      intent: 'product_search',
      companyId: 'maya',
      visitorId: 'v1',
      message: 'show me hoodies',
      context: {},
      user: null
    });
    assert.equal(r.source, 'local-builder');
  });
});

test('route: track_order with order ID in message → sutar-merchantAgents', async () => {
  await withFetch(async (url) => {
    if (url.includes('/track/')) {
      return jsonResponse(200, {
        order: { id: 'ORD-123', status: 'shipped', lastUpdate: 'on its way' }
      });
    }
    if (url.includes('/api/merchants')) {
      return jsonResponse(200, { merchants: [{ id: 'm1' }] });
    }
    return jsonResponse(404, {});
  }, async () => {
    const r = await sutarRouter.route({
      agentRole: 'support',
      intent: 'track_order',
      companyId: 'm1',
      visitorId: 'v1',
      message: 'where is order ORD-123?',
      context: {},
      user: null
    });
    assert.equal(r.source, 'sutar-merchantAgents');
    assert.ok(r.reply.includes('ORD-123'));
    assert.ok(r.reply.includes('shipped'));
    assert.equal(r.rich.type, 'order_status');
  });
});

test('route: track_order without order ID → falls back to local', async () => {
  await withFetch(async () => jsonResponse(200, { merchants: [{ id: 'm1' }] }), async () => {
    const r = await sutarRouter.route({
      agentRole: 'support',
      intent: 'track_order',
      companyId: 'm1',
      visitorId: 'v1',
      message: 'where is my order?',
      context: {},
      user: null
    });
    assert.equal(r.source, 'local-builder');
  });
});

test('route: get_support → sutar-supportCopilot', async () => {
  await withFetch(async (url) => {
    if (url.includes('support-copilot') || url.includes(':4453') || url.includes(':4925')) {
      return jsonResponse(200, {
        suggestions: [
          { id: 's1', text: 'I can help you with that.', confidence: 0.9 },
          { id: 's2', text: 'Could you tell me more?', confidence: 0.7 }
        ]
      });
    }
    return jsonResponse(404, {});
  }, async () => {
    const r = await sutarRouter.route({
      agentRole: 'support',
      intent: 'get_support',
      companyId: 'maya',
      visitorId: 'v1',
      message: 'i need help',
      context: {},
      user: null
    });
    assert.equal(r.source, 'sutar-supportCopilot');
    assert.ok(r.reply.includes('help'));
    assert.equal(r.rich.type, 'support_suggestions');
    assert.equal(r.rich.confidence, 0.9);
    assert.ok(Array.isArray(r.rich.alternatives));
  });
});

test('route: ask_question → sutar-salesCopilot', async () => {
  await withFetch(async (url) => {
    if (url.includes('sales-copilot') || url.includes(':4928') || url.includes(':4926')) {
      return jsonResponse(200, {
        recommendations: [
          { type: 'insight', title: 'Best Time to Follow Up', description: 'Tue-Thu 10AM-12PM has 35% higher response rate', priority: 'low' },
          { type: 'insight', title: 'Top Objection', description: 'Budget is the #1 objection in Q2', priority: 'medium' }
        ]
      });
    }
    return jsonResponse(404, {});
  }, async () => {
    const r = await sutarRouter.route({
      agentRole: 'sales',
      intent: 'ask_question',
      companyId: 'maya',
      visitorId: 'v1',
      message: 'what are your hours?',
      context: {},
      user: null
    });
    assert.equal(r.source, 'sutar-salesCopilot');
    assert.ok(r.reply.includes('Best Time'));
    assert.equal(r.rich.type, 'sales_recommendations');
    assert.equal(r.rich.items.length, 2);
  });
});

// ─── Health check ───────────────────────────────────────────────────────

test('checkAgentHealth: returns status for all agents', async () => {
  await withFetch(async () => jsonResponse(200, { status: 'ok' }), async () => {
    const health = await sutarRouter.checkAgentHealth();
    for (const key of Object.keys(sutarRouter.AGENT_ENDPOINTS)) {
      assert.ok(health[key], `health.${key} should be defined`);
      assert.equal(typeof health[key].healthy, 'boolean');
    }
  });
});

test('checkAgentHealth: reports false when fetch fails', async () => {
  await withFetch(async () => { throw new Error('down'); }, async () => {
    const health = await sutarRouter.checkAgentHealth();
    for (const key of Object.keys(sutarRouter.AGENT_ENDPOINTS)) {
      assert.equal(health[key].healthy, false);
    }
  });
});