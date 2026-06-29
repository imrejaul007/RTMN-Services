/**
 * Verification Engine - Vitest Tests
 */

import { describe, it, expect } from 'vitest';

process.env.HOJAI_API_KEY = 'test-key';
process.env.PORT = '4733';

describe('Verification Engine - Health', () => {
  it('should return healthy status', async () => {
    const res = await fetch('http://localhost:4733/health');
    const data = await res.json();
    expect(data.status).toBe('ok');
    expect(data.service).toBe('verification-engine');
  });
});

describe('Verification Engine - Verification', () => {
  const auth = { headers: { Authorization: 'Bearer test-key', 'Content-Type': 'application/json' } };

  it('should submit for verification', async () => {
    const res = await fetch('http://localhost:4733/api/verify', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        makerAgentId: 'test-agent',
        content: 'Test proposal',
        riskLevel: 'low'
      })
    });
    const data = await res.json();
    expect(data.id).toBeDefined();
    expect(data.status).toBeDefined();
  });

  it('should require makerAgentId', async () => {
    const res = await fetch('http://localhost:4733/api/verify', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ content: 'Test' })
    });
    expect(res.status).toBe(400);
  });
});

describe('Verification Engine - Policies', () => {
  const auth = { headers: { Authorization: 'Bearer test-key', 'Content-Type': 'application/json' } };

  it('should create verification policy', async () => {
    const res = await fetch('http://localhost:4733/api/policies', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        name: 'Test Policy',
        level: 'maker_checker_guardian',
        guardians: ['compliance', 'security']
      })
    });
    const data = await res.json();
    expect(data.id).toBeDefined();
    expect(data.name).toBe('Test Policy');
  });

  it('should list policies', async () => {
    const res = await fetch('http://localhost:4733/api/policies');
    const data = await res.json();
    expect(data.policies).toBeInstanceOf(Array);
  });
});

describe('Verification Engine - Human Approval', () => {
  const auth = { headers: { Authorization: 'Bearer test-key', 'Content-Type': 'application/json' } };

  it('should list pending approvals', async () => {
    const res = await fetch('http://localhost:4733/api/approvals');
    const data = await res.json();
    expect(data.approvals).toBeInstanceOf(Array);
  });
});
