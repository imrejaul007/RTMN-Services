/**
 * Tests for the @hojai/nexha SDK
 *
 * Uses Node's built-in test runner (no extra deps).
 * Run with: npm test (after build)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Nexha } from '../index.js';
/**
 * Mock fetch helper
 */
function withFetchMock(handler) {
    const original = globalThis.fetch;
    globalThis.fetch = handler;
    return () => { globalThis.fetch = original; };
}
test('Nexha client instantiates with all 13 sub-clients', () => {
    const nexha = new Nexha({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
    assert.ok(nexha.directory);
    assert.ok(nexha.supplier);
    assert.ok(nexha.distribution);
    assert.ok(nexha.warehouse);
    assert.ok(nexha.pricing);
    assert.ok(nexha.tradeFinance);
    assert.ok(nexha.commerce);
    assert.ok(nexha.mission);
    assert.ok(nexha.partner);
    assert.ok(nexha.acp);
    assert.ok(nexha.hooks);
    assert.ok(nexha.provisioning);
    assert.ok(nexha.tenant);
});
test('DirectoryClient.registerCompany posts to /api/v1/companies', async () => {
    let captured;
    const restore = withFetchMock(async (url, options) => {
        captured = { url, body: JSON.parse(options.body) };
        return {
            ok: true, status: 200, headers: { get: () => 'application/json' },
            json: async () => ({ id: 'c-1', tenantId: 't-1', name: 'Maya', capabilities: [], industries: [], createdAt: 't', updatedAt: 't' })
        };
    });
    const nexha = new Nexha({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
    await nexha.directory.registerCompany({ name: 'Maya' });
    assert.equal(captured.url, 'http://localhost:9999/api/v1/companies');
    assert.equal(captured.body.name, 'Maya');
    restore();
});
test('SupplierClient.search builds query string', async () => {
    let captured;
    const restore = withFetchMock(async (url) => {
        captured = { url };
        return { ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => [] };
    });
    const nexha = new Nexha({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
    await nexha.supplier.search({ category: 'textiles', country: 'IN' });
    assert.match(captured.url, /category=textiles/);
    assert.match(captured.url, /country=IN/);
    restore();
});
test('DistributionClient.quote posts shipment request', async () => {
    let captured;
    const restore = withFetchMock(async (url, options) => {
        captured = { url, body: JSON.parse(options.body) };
        return {
            ok: true, status: 200, headers: { get: () => 'application/json' },
            json: async () => ([{ carrier: 'DHL', serviceLevel: 'express', price: { amount: 50, currency: 'USD' }, estimatedDays: 3, estimatedDeliveryAt: 't' }])
        };
    });
    const nexha = new Nexha({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
    await nexha.distribution.quote({
        origin: { country: 'IN' }, destination: { country: 'US' }, weightKg: 10
    });
    assert.equal(captured.url, 'http://localhost:9999/api/v1/quote');
    assert.equal(captured.body.weightKg, 10);
    restore();
});
test('WarehouseClient.createBooking posts booking', async () => {
    let captured;
    const restore = withFetchMock(async (url, options) => {
        captured = { url, body: JSON.parse(options.body) };
        return {
            ok: true, status: 200, headers: { get: () => 'application/json' },
            json: async () => ({ id: 'b-1', warehouseId: 'wh-1', slotId: 's-1', customerId: 'c-1', weightKg: 100, status: 'confirmed', startsAt: 't', endsAt: 't', totalPrice: { amount: 100, currency: 'USD' } })
        };
    });
    const nexha = new Nexha({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
    await nexha.warehouse.createBooking({ warehouseId: 'wh-1', slotId: 's-1', customerId: 'c-1', weightKg: 100 });
    assert.equal(captured.url, 'http://localhost:9999/api/v1/bookings');
    restore();
});
test('PricingClient.compare posts SKU', async () => {
    let captured;
    const restore = withFetchMock(async (url, options) => {
        captured = { url, body: JSON.parse(options.body) };
        return {
            ok: true, status: 200, headers: { get: () => 'application/json' },
            json: async () => ({ sku: 'X', lowest: {}, highest: {}, average: 10, median: 10, observations: 5 })
        };
    });
    const nexha = new Nexha({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
    await nexha.pricing.compare('X');
    assert.equal(captured.url, 'http://localhost:9999/api/v1/compare');
    assert.equal(captured.body.sku, 'X');
    restore();
});
test('TradeFinanceClient.createLoan posts loan request', async () => {
    let captured;
    const restore = withFetchMock(async (url, options) => {
        captured = { url, body: JSON.parse(options.body) };
        return {
            ok: true, status: 200, headers: { get: () => 'application/json' },
            json: async () => ({ id: 'l-1', entityId: 'e-1', offerId: 'o-1', amount: { amount: 1000, currency: 'USD' }, interestRate: 5, termMonths: 12, status: 'pending' })
        };
    });
    const nexha = new Nexha({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
    await nexha.tradeFinance.createLoan({ entityId: 'e-1', offerId: 'o-1', amount: { amount: 1000, currency: 'USD' } });
    assert.equal(captured.url, 'http://localhost:9999/api/v1/loans');
    restore();
});
test('CommerceClient.createOrder posts order', async () => {
    let captured;
    const restore = withFetchMock(async (url, options) => {
        captured = { url, body: JSON.parse(options.body) };
        return {
            ok: true, status: 200, headers: { get: () => 'application/json' },
            json: async () => ({ id: 'o-1', tenantId: 't-1', customerId: 'c-1', items: [], subtotal: { amount: 100, currency: 'USD' }, total: { amount: 100, currency: 'USD' }, status: 'draft', createdAt: 't', updatedAt: 't' })
        };
    });
    const nexha = new Nexha({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
    await nexha.commerce.createOrder({ customerId: 'c-1', items: [] });
    assert.equal(captured.url, 'http://localhost:9999/api/orders');
    restore();
});
test('CommerceClient.orderLifecycle methods hit state transitions', async () => {
    const calls = [];
    const restore = withFetchMock(async (url, options) => {
        calls.push({ url, method: options.method });
        return {
            ok: true, status: 200, headers: { get: () => 'application/json' },
            json: async () => ({ id: 'o-1', status: 'completed', createdAt: 't', updatedAt: 't' })
        };
    });
    const nexha = new Nexha({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
    await nexha.commerce.placeOrder('o-1');
    await nexha.commerce.cancelOrder('o-1');
    await nexha.commerce.fulfillOrder('o-1');
    await nexha.commerce.shipOrder('o-1', { trackingNumber: 'T1', carrier: 'DHL' });
    await nexha.commerce.deliverOrder('o-1');
    await nexha.commerce.completeOrder('o-1');
    await nexha.commerce.refundOrder('o-1', { reason: 'defect' });
    assert.equal(calls.length, 7);
    assert.equal(calls[0].method, 'POST');
    assert.match(calls[0].url, /\/api\/orders\/o-1\/place$/);
    assert.match(calls[6].url, /\/api\/orders\/o-1\/refund$/);
    restore();
});
test('MissionClient.createMission posts mission', async () => {
    let captured;
    const restore = withFetchMock(async (url, options) => {
        captured = { url, body: JSON.parse(options.body) };
        return {
            ok: true, status: 200, headers: { get: () => 'application/json' },
            json: async () => ({ id: 'm-1', tenantId: 't-1', title: 'Onboard', status: 'planned', subtasks: [], createdAt: 't' })
        };
    });
    const nexha = new Nexha({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
    await nexha.mission.createMission({ title: 'Onboard', subtasks: [] });
    assert.equal(captured.url, 'http://localhost:9999/api/missions');
    restore();
});
test('PartnerClient.recommend posts requirements', async () => {
    let captured;
    const restore = withFetchMock(async (url, options) => {
        captured = { url, body: JSON.parse(options.body) };
        return {
            ok: true, status: 200, headers: { get: () => 'application/json' },
            json: async () => ([{ partnerRef: 'p-1', name: 'P1', matchScore: 0.9, reasons: ['capability match'] }])
        };
    });
    const nexha = new Nexha({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
    await nexha.partner.recommend({ tenantId: 't-1', requiredCapabilities: ['cotton'] });
    assert.equal(captured.url, 'http://localhost:9999/api/recommend');
    restore();
});
test('AcpClient.createNegotiation posts parties + offer', async () => {
    let captured;
    const restore = withFetchMock(async (url, options) => {
        captured = { url, body: JSON.parse(options.body) };
        return {
            ok: true, status: 200, headers: { get: () => 'application/json' },
            json: async () => ({ id: 'n-1', tenantId: 't-1', parties: [], topic: 'price', status: 'open', rounds: 0, createdAt: 't', updatedAt: 't' })
        };
    });
    const nexha = new Nexha({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
    await nexha.acp.createNegotiation({ parties: [], topic: 'price', initialOffer: { p: 100 } });
    assert.equal(captured.url, 'http://localhost:9999/api/negotiations');
    restore();
});
test('HooksClient.createSubscription posts subscription', async () => {
    let captured;
    const restore = withFetchMock(async (url, options) => {
        captured = { url, body: JSON.parse(options.body) };
        return {
            ok: true, status: 200, headers: { get: () => 'application/json' },
            json: async () => ({ id: 's-1', tenantId: 't-1', url: 'https://x', events: [], secret: 'sec', status: 'active', createdAt: 't', updatedAt: 't', failureCount: 0 })
        };
    });
    const nexha = new Nexha({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
    await nexha.hooks.createSubscription({ url: 'https://x', events: ['order.created'] });
    assert.equal(captured.url, 'http://localhost:9999/api/subscriptions');
    restore();
});
test('ProvisioningClient.apply posts to plan apply endpoint', async () => {
    let captured;
    const restore = withFetchMock(async (url, options) => {
        captured = { url, method: options.method };
        return {
            ok: true, status: 200, headers: { get: () => 'application/json' },
            json: async () => ({ id: 'p-1', tenantId: 't-1', name: 'Plan', status: 'applied', resources: [], outputs: {}, createdAt: 't', updatedAt: 't' })
        };
    });
    const nexha = new Nexha({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
    await nexha.provisioning.apply('p-1');
    assert.equal(captured.url, 'http://localhost:9999/api/plans/p-1/apply');
    assert.equal(captured.method, 'POST');
    restore();
});
test('TenantClient.getSummary fetches tenant aggregate', async () => {
    let captured;
    const restore = withFetchMock(async (url) => {
        captured = { url };
        return {
            ok: true, status: 200, headers: { get: () => 'application/json' },
            json: async () => ({ tenantId: 't-1', sections: {}, generatedAt: 't' })
        };
    });
    const nexha = new Nexha({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
    await nexha.tenant.getSummary('t-1');
    assert.equal(captured.url, 'http://localhost:9999/api/tenants/t-1/summary');
    restore();
});
test('Nexha retries on 5xx errors', async () => {
    let calls = 0;
    const restore = withFetchMock(async () => {
        calls++;
        if (calls < 3) {
            return { ok: false, status: 503, headers: { get: () => 'text/plain' }, text: async () => 'Service Unavailable' };
        }
        return {
            ok: true, status: 200, headers: { get: () => 'application/json' },
            json: async () => ({ id: 'c-1', tenantId: 't-1', name: 'X', capabilities: [], industries: [], createdAt: 't', updatedAt: 't' })
        };
    });
    const nexha = new Nexha({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
    await nexha.directory.getCompany('c-1');
    assert.equal(calls, 3);
    restore();
});
test('Nexha throws on 4xx errors', async () => {
    const restore = withFetchMock(async () => {
        return { ok: false, status: 404, headers: { get: () => 'text/plain' }, text: async () => 'Not Found' };
    });
    const nexha = new Nexha({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
    await assert.rejects(() => nexha.directory.getCompany('missing'), /HTTP 404/);
    restore();
});
//# sourceMappingURL=index.test.js.map