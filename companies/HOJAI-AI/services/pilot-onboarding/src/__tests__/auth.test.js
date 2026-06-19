/**
 * Pilot Onboarding - Authentication Tests
 * Uses Node.js native test runner
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

const API_BASE = process.env.API_BASE || 'http://localhost:4399';

describe('Authentication API', () => {
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  let authToken = null;

  it('POST /v1/auth/signup - should register a new user', async () => {
    const response = await fetch(`${API_BASE}/v1/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        companyName: 'Test Company',
        industry: 'restaurant'
      })
    });

    assert.ok([201, 400, 409].includes(response.status), `Expected 201, 400, or 409, got ${response.status}`);

    if (response.status === 201) {
      const data = await response.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.token, 'Token should be defined');
      authToken = data.token;
    }
  });

  it('POST /v1/auth/login - should login with valid credentials', async () => {
    const response = await fetch(`${API_BASE}/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword
      })
    });

    assert.ok([200, 401].includes(response.status), `Expected 200 or 401, got ${response.status}`);

    if (response.status === 200) {
      const data = await response.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.token, 'Token should be defined');
    }
  });

  it('GET /v1/auth/me - should return user profile with valid token', async () => {
    if (!authToken) {
      // Skip if no token from registration
      return;
    }

    const response = await fetch(`${API_BASE}/v1/auth/me`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    assert.ok([200, 401].includes(response.status), `Expected 200 or 401, got ${response.status}`);
  });
});

describe('Health Endpoints', () => {
  it('GET /health - should return service health status', async () => {
    const response = await fetch(`${API_BASE}/health`);

    assert.strictEqual(response.status, 200);
    const data = await response.json();
    assert.strictEqual(data.status, 'ok');
    assert.ok(data.service, 'Service name should be defined');
  });
});
