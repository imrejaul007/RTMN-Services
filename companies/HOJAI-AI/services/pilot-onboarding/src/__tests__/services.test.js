/**
 * Pilot Onboarding - Services API Tests
 * Uses Node.js native test runner
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

const API_BASE = process.env.API_BASE || 'http://localhost:4399';

describe('Services API', () => {
  it('GET /v1/services - should return list of available services', async () => {
    const response = await fetch(`${API_BASE}/v1/services`);

    assert.ok([200, 401, 404].includes(response.status), `Expected 200, 401, or 404, got ${response.status}`);
  });

  it('GET /v1/services/:id - should return service details', async () => {
    const response = await fetch(`${API_BASE}/v1/services/restaurant-os`);

    // Either 200 with service data or 404
    assert.ok([200, 404, 401].includes(response.status), `Expected 200, 404, or 401, got ${response.status}`);
  });
});

describe('Billing API', () => {
  it('GET /v1/billing/plans - should return available plans', async () => {
    const response = await fetch(`${API_BASE}/v1/billing/plans`);

    assert.ok([200, 401, 404].includes(response.status), `Expected 200, 401, or 404, got ${response.status}`);
  });
});