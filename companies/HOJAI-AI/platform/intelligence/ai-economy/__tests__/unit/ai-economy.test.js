// AI Economy OS unit tests
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';

function httpReq(method, path, body) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: 'localhost', port: 4894, path, method, headers: {} };
    if (body) {
      const json = JSON.stringify(body);
      opts.headers['Content-Type'] = 'application/json';
      opts.headers['Content-Length'] = Buffer.byteLength(json);
    }
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

let server;
describe('AI Economy OS HTTP API', () => {
  beforeAll(async () => {
    const mod = await import('../../src/index.js');
    server = mod.default;
    await new Promise(r => setTimeout(r, 200));
  });
  afterAll(() => { if (server) server.close(); });

  // Health
  it('GET /health', async () => {
    const res = await httpReq('GET', '/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
  });

  it('GET /ready', async () => {
    const res = await httpReq('GET', '/ready');
    expect(res.status).toBe(200);
    expect(res.body.ready).toBe(true);
  });

  // Analytics (empty state)
  it('GET /api/analytics/marketplace', async () => {
    const res = await httpReq('GET', '/api/analytics/marketplace');
    expect(res.status).toBe(200);
    expect(res.body.totalListings).toBe(0);
    expect(res.body.totalTransactions).toBe(0);
  });

  // Listings CRUD
  it('POST /api/listings should create listing', async () => {
    const res = await httpReq('POST', '/api/listings', { name: 'Test AI Agent', description: 'A test agent', category: 'agents', price: 9.99, providerId: 'prov-1' });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeTruthy();
    expect(res.body.name).toBe('Test AI Agent');
    expect(res.body.price).toBe(9.99);
    expect(res.body.status).toBe('active');
    expect(res.body.purchases).toBe(0);
  });

  it('POST /api/listings should return 400 without name', async () => {
    const res = await httpReq('POST', '/api/listings', { price: 5 });
    expect(res.status).toBe(400);
  });

  it('GET /api/listings should list listings', async () => {
    const res = await httpReq('GET', '/api/listings');
    expect(res.status).toBe(200);
    expect(res.body.listings.length).toBeGreaterThan(0);
  });

  it('GET /api/listings?category=agents should filter', async () => {
    const res = await httpReq('GET', '/api/listings?category=agents');
    expect(res.status).toBe(200);
    expect(res.body.listings.every(l => l.category === 'agents')).toBe(true);
  });

  it('GET /api/listings/:id should get listing', async () => {
    const create = await httpReq('POST', '/api/listings', { name: 'Get Test', price: 10 });
    const res = await httpReq('GET', `/api/listings/${create.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Get Test');
  });

  it('DELETE /api/listings/:id should delete', async () => {
    const create = await httpReq('POST', '/api/listings', { name: 'Delete Test', price: 5 });
    const res = await httpReq('DELETE', `/api/listings/${create.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.deleted).toBe(true);
  });

  // Pricing
  it('GET /api/pricing/estimate should estimate', async () => {
    const create = await httpReq('POST', '/api/listings', { name: 'Price Test', price: 100 });
    const res = await httpReq('GET', `/api/pricing/estimate?listingId=${create.body.id}&quantity=2&duration=3`);
    expect(res.status).toBe(200);
    expect(res.body.subtotal).toBe(600);
    expect(res.body.platformFee).toBe(30);
    expect(res.body.total).toBe(630);
  });

  it('POST /api/pricing/quote should create quote', async () => {
    const create = await httpReq('POST', '/api/listings', { name: 'Quote Test', price: 50 });
    const res = await httpReq('POST', '/api/pricing/quote', { listingId: create.body.id, buyerId: 'buyer-1' });
    expect(res.status).toBe(200);
    expect(res.body.id).toBeTruthy();
    expect(res.body.basePrice).toBe(50);
    expect(res.body.validUntil).toBeTruthy();
  });

  // Transactions
  it('POST /api/transactions should create transaction', async () => {
    const create = await httpReq('POST', '/api/listings', { name: 'TX Test', price: 25 });
    const res = await httpReq('POST', '/api/transactions', { listingId: create.body.id, buyerId: 'buyer-x', sellerId: 'seller-y', amount: 25 });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeTruthy();
    expect(res.body.status).toBe('pending');
    expect(res.body.escrow).toBe(true);
  });

  it('POST /api/transactions should return 400 without required fields', async () => {
    const res = await httpReq('POST', '/api/transactions', { buyerId: 'b' });
    expect(res.status).toBe(400);
  });

  it('POST /api/transactions/:id/complete should complete', async () => {
    const create = await httpReq('POST', '/api/listings', { name: 'Complete Test', price: 10 });
    const tx = await httpReq('POST', '/api/transactions', { listingId: create.body.id, buyerId: 'b', amount: 10 });
    const res = await httpReq('POST', `/api/transactions/${tx.body.id}/complete`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('completed');
    expect(res.body.escrow).toBe(false);
  });

  // Wallets
  it('GET /api/wallets/:ownerId should get or create wallet', async () => {
    const res = await httpReq('GET', '/api/wallets/new-owner');
    expect(res.status).toBe(200);
    expect(res.body.ownerId).toBe('new-owner');
    expect(res.body.balance).toBe(0);
  });

  it('POST /api/wallets/:ownerId/topup should add credits', async () => {
    const res = await httpReq('POST', '/api/wallets/topup-owner/topup', { amount: 500 });
    expect(res.status).toBe(200);
    expect(res.body.balance).toBe(500);
  });

  it('POST /api/wallets/:ownerId/topup should return 400 for invalid amount', async () => {
    const res = await httpReq('POST', '/api/wallets/x/topup', { amount: -10 });
    expect(res.status).toBe(400);
  });

  it('GET /api/analytics/marketplace should reflect data', async () => {
    const res = await httpReq('GET', '/api/analytics/marketplace');
    expect(res.status).toBe(200);
    expect(res.body.totalListings).toBeGreaterThan(0);
    expect(res.body.totalTransactions).toBeGreaterThan(0);
  });
});