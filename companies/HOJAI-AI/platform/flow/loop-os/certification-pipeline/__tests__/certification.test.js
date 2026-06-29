/**
 * Certification Pipeline - Vitest Tests
 */

import { describe, it, expect } from 'vitest';

process.env.HOJAI_API_KEY = 'test-key';
process.env.PORT = '4739';

describe('Certification Pipeline - Health', () => {
  it('should return healthy status', async () => {
    const res = await fetch('http://localhost:4739/health');
    const data = await res.json();
    expect(data.status).toBe('ok');
    expect(data.service).toBe('certification-pipeline');
  });
});

describe('Certification Pipeline - Test Suites', () => {
  const auth = { headers: { Authorization: 'Bearer test-key', 'Content-Type': 'application/json' } };

  it('should create test suite', async () => {
    const res = await fetch('http://localhost:4739/api/test-suites', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        name: 'Sales Agent Tests',
        category: 'sales',
        tests: [
          { name: 'Basic negotiation', description: 'Test basic negotiation skills' }
        ]
      })
    });
    const data = await res.json();
    expect(data.id).toBeDefined();
    expect(data.name).toBe('Sales Agent Tests');
  });

  it('should list test suites', async () => {
    const res = await fetch('http://localhost:4739/api/test-suites');
    const data = await res.json();
    expect(data.suites).toBeInstanceOf(Array);
  });
});

describe('Certification Pipeline - Badges', () => {
  const auth = { headers: { Authorization: 'Bearer test-key', 'Content-Type': 'application/json' } };

  it('should create badge', async () => {
    const res = await fetch('http://localhost:4739/api/badges', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        name: 'Sales Expert',
        icon: '🏆'
      })
    });
    const data = await res.json();
    expect(data.id).toBeDefined();
  });

  it('should list badges', async () => {
    const res = await fetch('http://localhost:4739/api/badges');
    const data = await res.json();
    expect(data.badges).toBeInstanceOf(Array);
  });
});

describe('Certification Pipeline - Manual Certification', () => {
  const auth = { headers: { Authorization: 'Bearer test-key', 'Content-Type': 'application/json' } };

  it('should grant certification manually', async () => {
    const res = await fetch('http://localhost:4739/api/certification/cert-agent-001/grant', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        certType: 'sales_expert',
        issuer: 'manager',
        reason: 'Passed all evaluations'
      })
    });
    const data = await res.json();
    expect(data.id).toBeDefined();
    expect(data.status).toBe('certified');
  });

  it('should get certification status', async () => {
    const res = await fetch('http://localhost:4739/api/certification/cert-agent-001/status');
    const data = await res.json();
    expect(data.twinId).toBe('cert-agent-001');
    expect(data.certifications).toBeDefined();
  });
});
