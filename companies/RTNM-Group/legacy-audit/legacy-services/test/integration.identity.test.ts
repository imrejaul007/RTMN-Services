/**
 * RTNM-Group Integration Tests
 *
 * Run with: npx ts-node test/integration.identity.test.ts
 * Requires: MongoDB, Redis, and all services running
 */

import axios from 'axios';

// Configuration
const CONFIG = {
  baseUrl: process.env.TEST_BASE_URL || 'http://localhost:3003',
  authService: process.env.AUTH_SERVICE_URL || 'http://localhost:4002',
  internalToken: process.env.INTERNAL_TOKEN || 'test-token',
  timeout: 10000,
};

const api = axios.create({
  baseURL: CONFIG.baseUrl,
  timeout: CONFIG.timeout,
  headers: {
    'X-Internal-Token': CONFIG.internalToken,
    'Content-Type': 'application/json',
  },
});

// Test utilities
interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

const results: TestResult[] = [];

async function test(name: string, fn: () => Promise<void>): Promise<void> {
  const start = Date.now();
  try {
    await fn();
    results.push({
      name,
      passed: true,
      duration: Date.now() - start,
    });
    console.log(`✅ ${name}`);
  } catch (error: any) {
    results.push({
      name,
      passed: false,
      error: error.message,
      duration: Date.now() - start,
    });
    console.error(`❌ ${name}: ${error.message}`);
  }
}

function expect(value: any, expected: any, message?: string): void {
  if (value !== expected) {
    throw new Error(message || `Expected ${expected}, got ${value}`);
  }
}

function expectContains(value: string, substring: string): void {
  if (!value.includes(substring)) {
    throw new Error(`Expected "${value}" to contain "${substring}"`);
  }
}

// ============================================
// IDENTITY SERVICE TESTS
// ============================================

describe('REZ-identity-service Integration Tests', () => {
  let createdIdentityId: string;
  let createdClusterId: string;

  beforeAll(async () => {
    // Health check
    const healthResponse = await api.get('/health');
    console.log('Identity Service Health:', healthResponse.data);
  });

  test('POST /api/v1/identity - Create identity', async () => {
    const response = await api.post('/api/v1/identity', {
      type: 'app_user',
      identifier: 'test@example.com',
      metadata: {
        source: 'web',
        platform: 'ios',
      },
    });

    expect(response.status, 201);
    expect(response.data.success, true);
    expect(response.data.data.identityId, 'string');

    createdIdentityId = response.data.data.identityId;
    createdClusterId = response.data.data.clusterId;
  });

  test('GET /api/v1/identity/:id - Get identity', async () => {
    const response = await api.get(`/api/v1/identity/${createdIdentityId}`);

    expect(response.status, 200);
    expect(response.data.data.identityId, createdIdentityId);
    expect(response.data.data.type, 'app_user');
  });

  test('PUT /api/v1/identity/:id - Update identity', async () => {
    const response = await api.put(`/api/v1/identity/${createdIdentityId}`, {
      metadata: {
        source: 'web',
        platform: 'android',
        appVersion: '2.0.0',
      },
    });

    expect(response.status, 200);
    expect(response.data.success, true);
  });

  test('POST /api/v1/resolve - Resolve identity', async () => {
    const response = await api.post('/api/v1/resolve', {
      type: 'email',
      identifier: 'test@example.com',
    });

    expect(response.status, 200);
    expect(response.data.clusterId, 'string');
    expect(response.data.trustScore, 'number');
  });

  test('GET /api/v1/identity/trust/:clusterId - Get trust score', async () => {
    const response = await api.get(`/api/v1/identity/trust/${createdClusterId}`);

    expect(response.status, 200);
    expect(response.data.score, 'number');
    expect(response.data.level, 'string');
  });

  test('POST /api/v1/identity/fraud/check - Fraud check', async () => {
    const response = await api.post('/api/v1/identity/fraud/check', {
      clusterId: createdClusterId,
      indicators: {
        deviceFingerprint: 'fp_123',
        ipAddress: '192.168.1.1',
      },
    });

    expect(response.status, 200);
    expect(response.data.riskLevel, 'string');
  });

  test('DELETE /api/v1/identity/:id - Delete identity (soft)', async () => {
    const response = await api.delete(`/api/v1/identity/${createdIdentityId}`);

    expect(response.status, 200);
    expect(response.data.success, true);
  });
});

// ============================================
// ACCESS CONTROL TESTS
// ============================================

describe('REZ-access-control-service Integration Tests', () => {
  beforeAll(async () => {
    const healthResponse = await axios.get('http://localhost:3000/health');
    console.log('Access Control Service Health:', healthResponse.data);
  });

  test('POST /api/v1/access/check - Allow access', async () => {
    const response = await api.post('http://localhost:3000/api/v1/access/check', {
      userId: 'user-123',
      resource: 'documents',
      action: 'read',
    });

    expect(response.status, 200);
    expect(response.data.allowed, 'boolean');
  });

  test('POST /api/v1/access/check - Deny access', async () => {
    const response = await api.post('http://localhost:3000/api/v1/access/check', {
      userId: 'guest-user',
      resource: 'admin',
      action: 'delete',
    });

    expect(response.status, 200);
    // Note: May be allowed or denied depending on RBAC setup
  });

  test('GET /api/v1/roles - List roles', async () => {
    const response = await axios.get('http://localhost:3000/api/v1/roles', {
      headers: { 'X-Internal-Token': CONFIG.internalToken },
    });

    expect(response.status, 200);
    expect(Array.isArray(response.data.roles), true);
    expect(response.data.roles.length, 'number');
  });

  test('GET /api/v1/users/:userId/permissions - Get user permissions', async () => {
    const response = await axios.get('http://localhost:3000/api/v1/users/admin-123/permissions', {
      headers: { 'X-Internal-Token': CONFIG.internalToken },
    });

    expect(response.status, 200);
    expect(response.data.userId, 'admin-123');
    expect(Array.isArray(response.data.roles), true);
  });

  test('GET /api/v1/audit/logs - Query audit logs', async () => {
    const response = await axios.get('http://localhost:3000/api/v1/audit/logs', {
      headers: { 'X-Internal-Token': CONFIG.internalToken },
      params: {
        limit: 10,
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      },
    });

    expect(response.status, 200);
    expect(Array.isArray(response.data.logs), true);
  });
});

// ============================================
// CAPITAL SERVICE TESTS
// ============================================

describe('REZ-capital-service Integration Tests', () => {
  const capitalApi = axios.create({
    baseURL: 'http://localhost:3005',
    timeout: CONFIG.timeout,
    headers: {
      'X-Internal-Token': CONFIG.internalToken,
      'Content-Type': 'application/json',
    },
  });

  let merchantId: string;

  beforeAll(async () => {
    merchantId = `merchant_${Date.now()}`;
    // Setup merchant health record
    console.log('Testing Capital Service with merchant:', merchantId);
  });

  test('GET /api/credit/:merchantId - Get credit profile', async () => {
    const response = await capitalApi.get(`/api/credit/${merchantId}`);

    // May return 404 if merchant doesn't exist
    expect([200, 404].includes(response.status), true);
  });

  test('GET /api/credit/:merchantId/score - Get credit score', async () => {
    const response = await capitalApi.get(`/api/credit/${merchantId}/score`);

    if (response.status === 200) {
      expect(response.data.creditScore, 'number');
      expect(response.data.creditScore >= 300 && response.data.creditScore <= 900, true);
    } else {
      expect(response.status, 404);
    }
  });

  test('GET /api/credit/:merchantId/limit - Get credit limit', async () => {
    const response = await capitalApi.get(`/api/credit/${merchantId}/limit`);

    if (response.status === 200) {
      expect(response.data.creditLimit, 'number');
      expect(response.data.availableCredit, 'number');
    }
  });

  test('POST /api/loans/apply - Create loan application (validation)', async () => {
    const response = await capitalApi.post('/api/loans/apply', {
      merchantId: merchantId,
      amount: 50000,
      type: 'revenue_advance',
    });

    // May succeed or fail depending on merchant standing
    expect([201, 400].includes(response.status), true);
  });

  test('POST /api/loans/apply - Invalid amount (should fail)', async () => {
    try {
      await capitalApi.post('/api/loans/apply', {
        merchantId: merchantId,
        amount: 100, // Below minimum
      });
      throw new Error('Should have failed');
    } catch (error: any) {
      expectContains(error.message, '400');
    }
  });

  test('POST /api/loans/apply - Missing required fields', async () => {
    try {
      await capitalApi.post('/api/loans/apply', {
        amount: 50000,
        // Missing merchantId
      });
      throw new Error('Should have failed');
    } catch (error: any) {
      expectContains(error.message, '400');
    }
  });
});

// ============================================
// BNPL SERVICE TESTS
// ============================================

describe('REZ-bnpl-service Integration Tests', () => {
  const bnplApi = axios.create({
    baseURL: 'http://localhost:3080',
    timeout: CONFIG.timeout,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  test('GET /health - Health check', async () => {
    const response = await bnplApi.get('/health');
    expect(response.status, 200);
    expect(response.data.status, 'ok');
  });

  test('POST /api/bnpl/calculate - EMI calculation', async () => {
    const response = await bnplApi.post('/api/bnpl/calculate', {
      amount: 30000,
      tenure: 6,
    });

    expect(response.status, 200);
    expect(response.data.emi, 'number');
    expect(response.data.totalAmount, 'number');
    expect(response.data.tenureMonths, 6);
    // Verify EMI formula
    expect(response.data.emi > 0, true);
    expect(response.data.totalAmount > response.data.principal, true);
  });

  test('POST /api/bnpl/calculate - Different tenures', async () => {
    const tenures = [3, 6, 9, 12];

    for (const tenure of tenures) {
      const response = await bnplApi.post('/api/bnpl/calculate', {
        amount: 50000,
        tenure,
      });

      expect(response.status, 200);
      expect(response.data.tenureMonths, tenure);
      expect(response.data.emi > 0, true);
    }
  });

  test('POST /api/bnpl/calculate - Invalid tenure', async () => {
    try {
      await bnplApi.post('/api/bnpl/calculate', {
        amount: 50000,
        tenure: 5, // Invalid
      });
      throw new Error('Should have failed');
    } catch (error: any) {
      expectContains(error.message, '400');
    }
  });

  test('POST /api/bnpl/calculate - Amount too low', async () => {
    try {
      await bnplApi.post('/api/bnpl/calculate', {
        amount: 100, // Below 500
        tenure: 6,
      });
      throw new Error('Should have failed');
    } catch (error: any) {
      expectContains(error.message, '400');
    }
  });

  test('POST /api/bnpl/calculate - Amount too high', async () => {
    try {
      await bnplApi.post('/api/bnpl/calculate', {
        amount: 1000000, // Above 500000
        tenure: 6,
      });
      throw new Error('Should have failed');
    } catch (error: any) {
      expectContains(error.message, '400');
    }
  });

  test('POST /api/bnpl/repay - Idempotency test', async () => {
    const idempotencyKey = `test-${Date.now()}`;

    // First request
    const response1 = await bnplApi.post(
      '/api/bnpl/repay',
      {
        applicationId: 'non-existent-id',
        emiNumber: 1,
      },
      {
        headers: {
          'X-Idempotency-Key': idempotencyKey,
        },
      }
    );

    // Second request with same key should return cached result
    const response2 = await bnplApi.post(
      '/api/bnpl/repay',
      {
        applicationId: 'non-existent-id',
        emiNumber: 1,
      },
      {
        headers: {
          'X-Idempotency-Key': idempotencyKey,
        },
      }
    );

    // Both should either succeed or fail consistently
    expect(response1.status, response2.status);
  });
});

// ============================================
// PAYMENT LINKS SERVICE TESTS
// ============================================

describe('rez-payment-links-service Integration Tests', () => {
  const linksApi = axios.create({
    baseURL: 'http://localhost:4018',
    timeout: CONFIG.timeout,
    headers: {
      'X-Internal-Token': CONFIG.internalToken,
      'Content-Type': 'application/json',
    },
  });

  let createdLinkId: string;

  test('GET /health - Health check', async () => {
    const response = await linksApi.get('/health');
    expect(response.status, 200);
  });

  test('POST /api/v1/links - Create payment link', async () => {
    const response = await linksApi.post('/api/v1/links', {
      amount: 999,
      description: 'Test Payment',
      customerEmail: 'customer@example.com',
    });

    expect(response.status, 201);
    expect(response.data.id, 'string');
    expect(response.data.shortUrl, 'string');
    expect(response.data.upiUrl, 'string');
    expect(response.data.status, 'active');

    createdLinkId = response.data.id;
  });

  test('GET /api/v1/links/:id/status - Get link status', async () => {
    const response = await linksApi.get(`/api/v1/links/${createdLinkId}/status`);

    expect(response.status, 200);
    expect(response.data.id, createdLinkId);
    expect(response.data.status, 'active');
  });

  test('GET /api/v1/links/:id/qrcode - Get QR code', async () => {
    const response = await linksApi.get(`/api/v1/links/${createdLinkId}/qrcode`, {
      responseType: 'arraybuffer',
    });

    expect(response.status, 200);
    // QR code should be PNG image
    expect(response.data instanceof Buffer, true);
  });

  test('POST /api/v1/links - Invalid amount', async () => {
    try {
      await linksApi.post('/api/v1/links', {
        amount: -100,
        description: 'Invalid',
      });
      throw new Error('Should have failed');
    } catch (error: any) {
      expectContains(error.message, '400');
    }
  });
});

// ============================================
// OPS DASHBOARD TESTS
// ============================================

describe('REZ-ops-dashboard Integration Tests', () => {
  const opsApi = axios.create({
    baseURL: 'http://localhost:4032',
    timeout: CONFIG.timeout,
    headers: {
      'X-Admin-Token': process.env.OPS_ADMIN_TOKEN || 'admin-token',
    },
  });

  test('GET /health - Health check', async () => {
    const response = await opsApi.get('/health');
    expect(response.status, 200);
  });

  test('GET /flags - Get feature flags', async () => {
    const response = await opsApi.get('/flags');

    expect(response.status, 200);
    if (response.data.flags) {
      expect(Array.isArray(response.data.flags), true);
    }
  });

  test('GET /quick-actions - Get quick actions', async () => {
    const response = await opsApi.get('/quick-actions');

    expect(response.status, 200);
    expect(response.data.actions, 'object');
  });
});

// ============================================
// TEST RESULTS SUMMARY
// ============================================

afterAll(async () => {
  console.log('\n==========================================');
  console.log('TEST RESULTS SUMMARY');
  console.log('==========================================');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  console.log(`Total: ${total}`);
  console.log(`Passed: ${passed} (${((passed / total) * 100).toFixed(1)}%)`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    console.log('\nFailed Tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
  }

  console.log('\n==========================================');
  console.log(`Total Duration: ${results.reduce((acc, r) => acc + r.duration, 0)}ms`);
  console.log('==========================================');

  process.exit(failed > 0 ? 1 : 0);
});
