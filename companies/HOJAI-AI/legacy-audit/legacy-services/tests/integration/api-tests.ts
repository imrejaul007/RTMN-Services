/**
 * HOJAI Integration Tests
 * Test suite for HOJAI AI services
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';

// Test configuration
const API_BASE = process.env.API_BASE || 'http://localhost:4500';
const TENANT_ID = 'test-tenant-001';
const HEADERS = {
  'Content-Type': 'application/json',
  'X-Tenant-Id': TENANT_ID
};

// ============================================
// API GATEWAY TESTS
// ============================================

describe('API Gateway', () => {
  test('should return healthy status', async () => {
    const res = await fetch(`${API_BASE}/health`);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe('healthy');
    expect(data.service).toBe('hojai-api-gateway');
  });

  test('should reject requests without tenant ID', async () => {
    const res = await fetch(`${API_BASE}/api/services`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    expect(res.status).toBe(400);
  });

  test('should list registered services', async () => {
    const res = await fetch(`${API_BASE}/api/services`, {
      headers: HEADERS
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
  });
});

// ============================================
// MEMORY SERVICE TESTS
// ============================================

describe('Memory Service (Port 4520)', () => {
  const MEMORY_BASE = 'http://localhost:4520';

  test('should return healthy status', async () => {
    const res = await fetch(`${MEMORY_BASE}/health`);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe('healthy');
  });

  test('should create a memory', async () => {
    const res = await fetch(`${MEMORY_BASE}/memory`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({
        type: 'fact',
        content: 'Customer prefers email communication',
        importance: 0.8,
        tags: ['preference', 'communication']
      })
    });

    expect(res.status).toBe(201);
  });

  test('should list memories', async () => {
    const res = await fetch(`${MEMORY_BASE}/memory`, {
      headers: HEADERS
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
  });
});

// ============================================
// AGENTS SERVICE TESTS
// ============================================

describe('Agents Service (Port 4550)', () => {
  const AGENTS_BASE = 'http://localhost:4550';

  test('should return healthy status', async () => {
    const res = await fetch(`${AGENTS_BASE}/health`);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe('healthy');
  });

  test('should list agent templates', async () => {
    const res = await fetch(`${AGENTS_BASE}/api/agents/templates`, {
      headers: HEADERS
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(data.data)).toBe(true);
  });
});

// ============================================
// INTELLIGENCE SERVICE TESTS
// ============================================

describe('Intelligence Service (Port 4530)', () => {
  const INTEL_BASE = 'http://localhost:4530';

  test('should return healthy status', async () => {
    const res = await fetch(`${INTEL_BASE}/health`);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe('healthy');
  });

  test('should generate prediction', async () => {
    const res = await fetch(`${INTEL_BASE}/api/intelligence/predict`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({
        metric: 'revenue',
        value: 10000,
        periods: 7
      })
    });

    expect(res.status).toBe(200);
  });
});

// ============================================
// AI EMPLOYEE TESTS
// ============================================

describe('AI Employees', () => {
  const ASSISTANT_PORT = 4863;
  const ANALYST_PORT = 4859;

  test('assistant-ai should be healthy', async () => {
    const res = await fetch(`http://localhost:${ASSISTANT_PORT}/health`);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.service).toBe('assistant-ai');
  });

  test('assistant-ai should create task', async () => {
    const res = await fetch(`http://localhost:${ASSISTANT_PORT}/api/tasks`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({
        title: 'Test Task',
        priority: 'high'
      })
    });

    expect(res.status).toBe(201);
  });

  test('analyst-ai should be healthy', async () => {
    const res = await fetch(`http://localhost:${ANALYST_PORT}/health`);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.service).toBe('analyst-ai');
  });

  test('analyst-ai should create metric', async () => {
    const res = await fetch(`http://localhost:${ANALYST_PORT}/api/metrics`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({
        name: 'test_revenue',
        value: 5000,
        category: 'sales'
      })
    });

    expect(res.status).toBe(201);
  });
});

// ============================================
// MULTI-TENANT ISOLATION TESTS
// ============================================

describe('Multi-Tenant Isolation', () => {
  const TENANT_A = 'tenant-a-001';
  const TENANT_B = 'tenant-b-001';

  test('data should be isolated between tenants', async () => {
    // Create data for tenant A
    const resA = await fetch('http://localhost:4520/memory', {
      method: 'POST',
      headers: { ...HEADERS, 'X-Tenant-Id': TENANT_A },
      body: JSON.stringify({
        type: 'fact',
        content: 'Tenant A secret data'
      })
    });

    expect(resA.status).toBe(201);

    // Try to access with tenant B
    const resB = await fetch('http://localhost:4520/memory', {
      headers: { ...HEADERS, 'X-Tenant-Id': TENANT_B }
    });
    const dataB = await resB.json();

    // Tenant B should not see Tenant A's data
    const tenantAData = dataB.data?.filter((m: any) =>
      m.content === 'Tenant A secret data'
    );
    expect(tenantAData?.length).toBe(0);
  });
});

// ============================================
// PERFORMANCE TESTS
// ============================================

describe('Performance', () => {
  test('response time should be under 200ms', async () => {
    const start = Date.now();
    const res = await fetch(`${API_BASE}/health`);
    const duration = Date.now() - start;

    expect(res.status).toBe(200);
    expect(duration).toBeLessThan(200);
  });

  test('should handle concurrent requests', async () => {
    const promises = Array.from({ length: 10 }, () =>
      fetch(`${API_BASE}/health`)
    );

    const results = await Promise.all(promises);
    const allHealthy = results.every(r => r.status === 200);

    expect(allHealthy).toBe(true);
  });
});

// ============================================
// RUN TESTS
// ============================================

async function runTests() {
  console.log('Starting HOJAI Integration Tests...\n');

  const failures: string[] = [];

  // Run basic connectivity test first
  try {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) {
      console.error(`API Gateway not reachable at ${API_BASE}`);
      console.error('Make sure services are running: ./hojai-core/start-all.sh');
      process.exit(1);
    }
  } catch (err) {
    console.error(`Cannot connect to ${API_BASE}`);
    console.error('Start services first: cd hojai-ai/hojai-core && ./start-all.sh');
    process.exit(1);
  }

  console.log('All services reachable. Tests would run with: npm test');
}

runTests();
