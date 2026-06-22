import { app } from '../src/index.js';
import mongoose from 'mongoose';
const PORT = 8299; let server, token, providerId, listingId;
async function setup() { await new Promise(r => { server = app.listen(PORT, r); }); }
async function teardown() { await mongoose.disconnect(); if (server) server.close(); }
async function req(m, p, b, h = {}) { const r = await fetch(`http://localhost:${PORT}${p}`, { method: m, headers: { 'content-type': 'application/json', ...h }, body: b ? JSON.stringify(b) : undefined }); return { status: r.status, data: await r.json() }; }
let p = 0, f = 0; const a = (n, c) => { c ? (p++, console.log(`  ✓ ${n}`)) : (f++, console.log(`  ✗ ${n}`)); };
async function run() {
  await setup();
  console.log('\nSalar (in HOJAI-AI) tests:');
  a('health', (await req('GET', '/health')).status === 200);
  const email = `prov${Date.now()}@salar.com`;
  const su = await req('POST', '/api/auth/signup', { email, password: 'password1', name: 'AI Dev', company: 'AI Studio' }); a('signup', su.status === 201); token = su.data.data.token; providerId = su.data.data.provider.id;
  const li = await req('POST', '/api/auth/login', { email, password: 'password1' }); a('login', li.status === 200);
  const me = await req('GET', '/api/auth/me', null, { authorization: `Bearer ${token}` }); a('me', me.data.data.name === 'AI Dev');
  const listing = await req('POST', '/api/listings', { title: 'Smart Email Agent', description: 'AI that writes emails', category: 'agent', tags: ['email', 'productivity'], pricing: { model: 'subscription', price: 29.99 } }, { authorization: `Bearer ${token}` }); a('create listing', listing.status === 201); listingId = listing.data.data.listingId;
  const lst = await req('GET', '/api/listings'); a('list listings', lst.data.data.count >= 1);
  const search = await req('GET', '/api/listings?q=email'); a('search', search.data.data.count >= 1);
  const get = await req('GET', `/api/listings/${listingId}`); a('get listing', get.status === 200);
  const cats = await req('GET', '/api/listings/categories'); a('categories', cats.data.data.categories.length >= 1);
  const review = await req('POST', `/api/listings/${listingId}/reviews`, { rating: 5, title: 'Excellent!', comment: 'Best email AI', reviewerName: 'Buyer', reviewerEmail: 'buyer@test.com' }); a('review', review.status === 201);
  const purchase = await req('POST', `/api/listings/${listingId}/purchase`, { buyerName: 'Buyer', buyerEmail: 'buyer@test.com' }); a('purchase', purchase.status === 201);
  const dash = await req('GET', '/api/dashboard', null, { authorization: `Bearer ${token}` }); a('dashboard', dash.data.data.stats.totalPurchases >= 1);
  const stats = await req('GET', '/api/marketplace/stats'); a('stats', stats.data.data.totalListings >= 1);
  await teardown();
  console.log(`\nSalar: ${p} passed, ${f} failed`); process.exit(f > 0 ? 1 : 0);
}
run().catch(e => { console.error(e); process.exit(1); });
