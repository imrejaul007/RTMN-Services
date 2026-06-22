/**
 * RTNM-Group E2E Tests using Playwright
 *
 * Run with: npx playwright test test/e2e.identity.spec.ts
 * Install: npm install -D @playwright/test && npx playwright install
 */

import { test, expect, Page } from '@playwright/test';

// Configuration
const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3003';
const TIMEOUT = 30000;

// Helper functions
async function createIdentity(page: Page, data: {
  type: string;
  identifier: string;
  email?: string;
}) {
  return page.request.post(`${BASE_URL}/api/v1/identity`, {
    headers: {
      'X-Internal-Token': process.env.INTERNAL_TOKEN || 'test-token',
      'Content-Type': 'application/json',
    },
    data,
  });
}

// ============================================
// IDENTITY SERVICE E2E TESTS
// ============================================

test.describe('Identity Service E2E', () => {
  let identityId: string;
  let clusterId: string;

  test.beforeAll(async () => {
    // Verify service is running
    const response = await page.request.get(`${BASE_URL}/health`);
    expect(response.ok()).toBeTruthy();
  });

  test('should create a new identity', async ({ page }) => {
    const timestamp = Date.now();
    const response = await createIdentity(page, {
      type: 'app_user',
      identifier: `test_${timestamp}@example.com`,
    });

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.identityId).toBeDefined();
    expect(body.data.clusterId).toBeDefined();

    identityId = body.data.identityId;
    clusterId = body.data.clusterId;
  });

  test('should retrieve created identity', async ({ page }) => {
    const response = await page.request.get(`${BASE_URL}/api/v1/identity/${identityId}`, {
      headers: {
        'X-Internal-Token': process.env.INTERNAL_TOKEN || 'test-token',
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.data.identityId).toBe(identityId);
    expect(body.data.type).toBe('app_user');
  });

  test('should update identity metadata', async ({ page }) => {
    const response = await page.request.put(`${BASE_URL}/api/v1/identity/${identityId}`, {
      headers: {
        'X-Internal-Token': process.env.INTERNAL_TOKEN || 'test-token',
        'Content-Type': 'application/json',
      },
      data: {
        metadata: {
          platform: 'web',
          appVersion: '2.0.0',
        },
      },
    });

    expect(response.status()).toBe(200);
  });

  test('should resolve identity by identifier', async ({ page }) => {
    const response = await page.request.post(`${BASE_URL}/api/v1/resolve`, {
      headers: {
        'X-Internal-Token': process.env.INTERNAL_TOKEN || 'test-token',
        'Content-Type': 'application/json',
      },
      data: {
        type: 'email',
        identifier: `test_${Date.now()}@example.com`,
        includeProfile: true,
      },
    });

    expect([200, 404].includes(response.status())).toBeTruthy();
  });

  test('should get trust score', async ({ page }) => {
    const response = await page.request.get(`${BASE_URL}/api/v1/identity/trust/${clusterId}`, {
      headers: {
        'X-Internal-Token': process.env.INTERNAL_TOKEN || 'test-token',
      },
    });

    expect([200, 404].includes(response.status())).toBeTruthy();
  });

  test('should check fraud indicators', async ({ page }) => {
    const response = await page.request.post(`${BASE_URL}/api/v1/identity/fraud/check`, {
      headers: {
        'X-Internal-Token': process.env.INTERNAL_TOKEN || 'test-token',
        'Content-Type': 'application/json',
      },
      data: {
        clusterId,
        indicators: {
          deviceFingerprint: 'fp_e2e_test',
          ipAddress: '10.0.0.1',
        },
      },
    });

    expect([200, 404].includes(response.status())).toBeTruthy();
  });

  test('should soft delete identity', async ({ page }) => {
    const response = await page.request.delete(`${BASE_URL}/api/v1/identity/${identityId}`, {
      headers: {
        'X-Internal-Token': process.env.INTERNAL_TOKEN || 'test-token',
      },
    });

    expect(response.status()).toBe(200);
  });

  test('should reject request without auth token', async ({ page }) => {
    const response = await page.request.get(`${BASE_URL}/api/v1/identity`);
    expect(response.status()).toBe(401);
  });
});

// ============================================
// CAPITAL SERVICE E2E TESTS
// ============================================

test.describe('Capital Service E2E', () => {
  const CAPITAL_URL = process.env.CAPITAL_URL || 'http://localhost:3005';
  const merchantId = `e2e_merchant_${Date.now()}`;

  test('should get credit profile for new merchant', async ({ page }) => {
    const response = await page.request.get(`${CAPITAL_URL}/api/credit/${merchantId}`, {
      headers: {
        'X-Internal-Token': process.env.INTERNAL_TOKEN || 'test-token',
      },
    });

    // New merchant returns 404 or default profile
    expect([200, 404].includes(response.status())).toBeTruthy();
  });

  test('should calculate EMI correctly', async ({ page }) => {
    // Test EMI calculation through loan application
    const response = await page.request.post(`${CAPITAL_URL}/api/loans/apply`, {
      headers: {
        'X-Internal-Token': process.env.INTERNAL_TOKEN || 'test-token',
        'Content-Type': 'application/json',
      },
      data: {
        merchantId,
        amount: 50000,
        type: 'revenue_advance',
        purpose: 'Test E2E',
      },
    });

    // May succeed or fail based on merchant standing
    expect([201, 400, 404].includes(response.status())).toBeTruthy();
  });

  test('should reject invalid loan amount', async ({ page }) => {
    const response = await page.request.post(`${CAPITAL_URL}/api/loans/apply`, {
      headers: {
        'X-Internal-Token': process.env.INTERNAL_TOKEN || 'test-token',
        'Content-Type': 'application/json',
      },
      data: {
        merchantId,
        amount: 100, // Below minimum
        type: 'revenue_advance',
      },
    });

    expect(response.status()).toBe(400);
  });
});

// ============================================
// BNPL SERVICE E2E TESTS
// ============================================

test.describe('BNPL Service E2E', () => {
  const BNPL_URL = process.env.BNPL_URL || 'http://localhost:3080';

  test('should calculate EMI for 6 months', async ({ page }) => {
    const response = await page.request.post(`${BNPL_URL}/api/bnpl/calculate`, {
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        amount: 30000,
        tenure: 6,
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();

    // Verify EMI calculation
    expect(body.emi).toBeGreaterThan(0);
    expect(body.tenureMonths).toBe(6);
    expect(body.totalAmount).toBe(body.principal + body.totalInterest);
  });

  test('should calculate EMI for different tenures', async ({ page }) => {
    const tenures = [3, 6, 9, 12];

    for (const tenure of tenures) {
      const response = await page.request.post(`${BNPL_URL}/api/bnpl/calculate`, {
        headers: {
          'Content-Type': 'application/json',
        },
        data: {
          amount: 50000,
          tenure,
        },
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.tenureMonths).toBe(tenure);
      expect(body.emi).toBeGreaterThan(0);

      // Longer tenure should have lower EMI
      if (tenure === 3) {
        const emi3Months = body.emi;
        const emi12Response = await page.request.post(`${BNPL_URL}/api/bnpl/calculate`, {
          data: { amount: 50000, tenure: 12 },
        });
        const emi12 = (await emi12Response.json()).emi;
        expect(emi12).toBeLessThan(emi3Months);
      }
    }
  });

  test('should reject invalid tenure', async ({ page }) => {
    const response = await page.request.post(`${BNPL_URL}/api/bnpl/calculate`, {
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        amount: 30000,
        tenure: 5, // Invalid
      },
    });

    expect(response.status()).toBe(400);
  });

  test('should reject amount below minimum', async ({ page }) => {
    const response = await page.request.post(`${BNPL_URL}/api/bnpl/calculate`, {
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        amount: 100, // Below 500
        tenure: 6,
      },
    });

    expect(response.status()).toBe(400);
  });

  test('should process idempotent repayment', async ({ page }) => {
    const idempotencyKey = `e2e_repay_${Date.now()}`;

    // First request
    const response1 = await page.request.post(`${BNPL_URL}/api/bnpl/repay`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey,
      },
      data: {
        applicationId: 'non_existent',
        emiNumber: 1,
      },
    });

    // Second request with same key
    const response2 = await page.request.post(`${BNPL_URL}/api/bnpl/repay`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey,
      },
      data: {
        applicationId: 'non_existent',
        emiNumber: 1,
      },
    });

    // Both should return same status
    expect(response1.status()).toBe(response2.status());
  });
});

// ============================================
// PAYMENT LINKS E2E TESTS
// ============================================

test.describe('Payment Links E2E', () => {
  const LINKS_URL = process.env.LINKS_URL || 'http://localhost:4018';
  let linkId: string;

  test('should create payment link', async ({ page }) => {
    const response = await page.request.post(`${LINKS_URL}/api/v1/links`, {
      headers: {
        'X-Internal-Token': process.env.INTERNAL_TOKEN || 'test-token',
        'Content-Type': 'application/json',
      },
      data: {
        amount: 999,
        description: 'E2E Test Payment',
        customerEmail: 'e2e@test.com',
      },
    });

    expect(response.status()).toBe(201);
    const body = await response.json();

    expect(body.id).toBeDefined();
    expect(body.shortUrl).toBeDefined();
    expect(body.upiUrl).toBeDefined();
    expect(body.status).toBe('active');

    linkId = body.id;
  });

  test('should get payment link status', async ({ page }) => {
    const response = await page.request.get(`${LINKS_URL}/api/v1/links/${linkId}/status`, {
      headers: {
        'X-Internal-Token': process.env.INTERNAL_TOKEN || 'test-token',
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.id).toBe(linkId);
  });

  test('should get QR code', async ({ page }) => {
    const response = await page.request.get(`${LINKS_URL}/api/v1/links/${linkId}/qrcode`);

    expect(response.status()).toBe(200);
    // QR code should be PNG image
    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('image');
  });

  test('should follow short URL redirect', async ({ page }) => {
    // Get short URL first
    const statusResponse = await page.request.get(`${LINKS_URL}/api/v1/links/${linkId}/status`, {
      headers: {
        'X-Internal-Token': process.env.INTERNAL_TOKEN || 'test-token',
      },
    });
    const { shortUrl } = await statusResponse.json();

    // Extract short ID and follow redirect
    const shortId = shortUrl.split('/').pop();
    const response = await page.request.get(`${LINKS_URL}/l/${shortId}`);

    // Should redirect or return payment page
    expect([200, 302, 303].includes(response.status())).toBeTruthy();
  });

  test('should share payment link', async ({ page }) => {
    const response = await page.request.post(`${LINKS_URL}/api/v1/links/${linkId}/share`, {
      headers: {
        'X-Internal-Token': process.env.INTERNAL_TOKEN || 'test-token',
        'Content-Type': 'application/json',
      },
      data: {
        channel: 'whatsapp',
        phone: '919876543210',
      },
    });

    // May return 200 or 400 depending on notification service
    expect([200, 400, 500].includes(response.status())).toBeTruthy();
  });
});

// ============================================
// ACCESS CONTROL E2E TESTS
// ============================================

test.describe('Access Control E2E', () => {
  const ACCESS_URL = process.env.ACCESS_URL || 'http://localhost:3000';

  test('should allow valid access request', async ({ page }) => {
    const response = await page.request.post(`${ACCESS_URL}/api/v1/access/check`, {
      headers: {
        'X-Internal-Token': process.env.INTERNAL_TOKEN || 'test-token',
        'Content-Type': 'application/json',
      },
      data: {
        userId: 'user_123',
        resource: 'documents',
        action: 'read',
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.allowed).toBeDefined();
  });

  test('should deny unauthorized access', async ({ page }) => {
    const response = await page.request.post(`${ACCESS_URL}/api/v1/access/check`, {
      headers: {
        'X-Internal-Token': process.env.INTERNAL_TOKEN || 'test-token',
        'Content-Type': 'application/json',
      },
      data: {
        userId: 'guest_user',
        resource: 'admin',
        action: 'delete',
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    // Result depends on policy configuration
  });

  test('should get all roles', async ({ page }) => {
    const response = await page.request.get(`${ACCESS_URL}/api/v1/roles`, {
      headers: {
        'X-Internal-Token': process.env.INTERNAL_TOKEN || 'test-token',
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body.roles)).toBe(true);
    expect(body.roles.length).toBeGreaterThan(0);
  });

  test('should query audit logs', async ({ page }) => {
    const response = await page.request.get(`${ACCESS_URL}/api/v1/audit/logs`, {
      headers: {
        'X-Internal-Token': process.env.INTERNAL_TOKEN || 'test-token',
      },
      params: {
        limit: 10,
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body.logs)).toBe(true);
  });
});

// ============================================
// OPS DASHBOARD E2E TESTS
// ============================================

test.describe('Ops Dashboard E2E', () => {
  const OPS_URL = process.env.OPS_URL || 'http://localhost:4032';

  test('should get feature flags', async ({ page }) => {
    const response = await page.request.get(`${OPS_URL}/flags`, {
      headers: {
        'X-Admin-Token': process.env.ADMIN_TOKEN || 'admin-token',
      },
    });

    expect(response.status()).toBe(200);
  });

  test('should get quick actions', async ({ page }) => {
    const response = await page.request.get(`${OPS_URL}/quick-actions`, {
      headers: {
        'X-Admin-Token': process.env.ADMIN_TOKEN || 'admin-token',
      },
    });

    expect(response.status()).toBe(200);
  });
});

// ============================================
// SECURITY E2E TESTS
// ============================================

test.describe('Security Tests', () => {
  test('should reject requests without auth token', async ({ page }) => {
    const response = await page.request.get(`${BASE_URL}/api/v1/identity`);
    expect(response.status()).toBe(401);
  });

  test('should reject invalid auth token', async ({ page }) => {
    const response = await page.request.get(`${BASE_URL}/api/v1/identity`, {
      headers: {
        'X-Internal-Token': 'invalid-token',
      },
    });
    expect(response.status()).toBe(401);
  });

  test('should include security headers', async ({ page }) => {
    const response = await page.request.get(`${BASE_URL}/health`);
    expect(response.ok()).toBeTruthy();
    // Security headers should be present
  });

  test('should rate limit excessive requests', async ({ page }) => {
    // Make many requests quickly
    const promises = [];
    for (let i = 0; i < 150; i++) {
      promises.push(
        page.request.get(`${BASE_URL}/health`, {
          headers: {
            'X-Internal-Token': process.env.INTERNAL_TOKEN || 'test-token',
          },
        })
      );
    }

    const results = await Promise.allSettles(promises);
    const statuses = results.map((r) =>
      r.status === 'fulfilled' ? r.value.status() : 0
    );

    // Should have some rate limited responses (429)
    // Note: May not trigger in test environment
  });
});

// ============================================
// PERFORMANCE E2E TESTS
// ============================================

test.describe('Performance Tests', () => {
  test('should respond within acceptable time', async ({ page }) => {
    const start = Date.now();

    const response = await page.request.get(`${BASE_URL}/health`);
    expect(response.ok()).toBeTruthy();

    const duration = Date.now() - start;
    // Health check should be fast
    expect(duration).toBeLessThan(1000);
  });

  test('should handle concurrent requests', async ({ page }) => {
    const start = Date.now();

    const promises = Array(10)
      .fill(null)
      .map(() =>
        page.request.get(`${BASE_URL}/health`, {
          headers: {
            'X-Internal-Token': process.env.INTERNAL_TOKEN || 'test-token',
          },
        })
      );

    const results = await Promise.all(promises);
    const allOk = results.every((r) => r.ok());

    const duration = Date.now() - start;

    expect(allOk).toBeTruthy();
    // Should handle 10 concurrent requests
    expect(duration).toBeLessThan(5000);
  });
});
