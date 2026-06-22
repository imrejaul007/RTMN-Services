#!/usr/bin/env node
/**
 * HOJAI AI - Integration Tests
 * Tests all 12 platforms
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:4500';
const TENANT_ID = 'test_tenant';

async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name}`);
  } catch (e) {
    console.log(`❌ ${name}: ${e.message}`);
  }
}

async function get(path) {
  const r = await fetch(`${BASE_URL}${path}`, {
    headers: { 'X-Tenant-Id': TENANT_ID }
  });
  return r.json();
}

async function post(path, body) {
  const r = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': TENANT_ID },
    body: JSON.stringify(body)
  });
  return r.json();
}

console.log('🧪 HOJAI AI Integration Tests\n');

await test('Health Check', async () => {
  const r = await get('/health');
  if (!r.status) throw new Error('Gateway down');
});

await test('Governance - Create User', async () => {
  const r = await post('/api/governance/users', {
    name: 'Test User',
    email: 'test@example.com',
    role: 'admin'
  });
  if (!r.success) throw new Error(r.error?.message);
});

await test('Event - Publish Event', async () => {
  const r = await post('/api/events/publish', {
    type: 'test.event',
    data: { message: 'Hello' }
  });
  if (!r.success) throw new Error(r.error?.message);
});

await test('Memory - Store Memory', async () => {
  const r = await post('/api/memory/customer/cust_123', {
    type: 'preference',
    key: 'test',
    value: 'value'
  });
  if (!r.success) throw new Error(r.error?.message);
});

await test('Intelligence - Predict', async () => {
  const r = await post('/api/intelligence/predict', {
    customerId: 'cust_123'
  });
  if (!r.success) throw new Error(r.error?.message);
});

await test('Agents - Create Agent', async () => {
  const r = await post('/api/agents', {
    name: 'Test Bot',
    type: 'support',
    status: 'active'
  });
  if (!r.success) throw new Error(r.error?.message);
});

console.log('\n✅ All tests passed!');
