/**
 * Trust Profile - Vitest Tests
 */

import { describe, it, expect } from 'vitest';

process.env.HOJAI_API_KEY = 'test-key';
process.env.PORT = '4736';

describe('Trust Profile - Health', () => {
  it('should return healthy status', async () => {
    const res = await fetch('http://localhost:4736/health');
    const data = await res.json();
    expect(data.status).toBe('ok');
    expect(data.service).toBe('trust-profile');
  });
});

describe('Trust Profile - Profile CRUD', () => {
  const auth = { headers: { Authorization: 'Bearer test-key', 'Content-Type': 'application/json' } };

  it('should create trust profile', async () => {
    const res = await fetch('http://localhost:4736/api/profiles', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        twinId: 'agent-trust-001',
        initialScore: 50
      })
    });
    const data = await res.json();
    expect(data.twinId).toBe('agent-trust-001');
    expect(data.autonomyLevel).toBe(1); // Score 50 = Level 1
  });

  it('should get autonomy level', async () => {
    const res = await fetch('http://localhost:4736/api/profiles/agent-trust-001/autonomy');
    const data = await res.json();
    expect(data.level).toBeDefined();
    expect(data.name).toBeDefined();
  });
});

describe('Trust Profile - Violations', () => {
  const auth = { headers: { Authorization: 'Bearer test-key', 'Content-Type': 'application/json' } };

  it('should record violation', async () => {
    const res = await fetch('http://localhost:4736/api/profiles/agent-trust-001/violations', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        type: 'policy_breach',
        severity: 'high'
      })
    });
    const data = await res.json();
    expect(data.id).toBeDefined();
    expect(data.severity).toBe('high');
  });
});

describe('Trust Profile - Certifications', () => {
  const auth = { headers: { Authorization: 'Bearer test-key', 'Content-Type': 'application/json' } };

  it('should add certification', async () => {
    const res = await fetch('http://localhost:4736/api/profiles/agent-trust-001/certify', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        certType: 'sales_expert',
        issuer: 'sales_manager'
      })
    });
    const data = await res.json();
    expect(data.id).toBeDefined();
    expect(data.type).toBe('sales_expert');
  });
});

describe('Trust Profile - Trust Summary', () => {
  it('should get trust summary', async () => {
    const res = await fetch('http://localhost:4736/api/trust/summary');
    const data = await res.json();
    expect(data.totalProfiles).toBeDefined();
    expect(data.avgTrustScore).toBeDefined();
  });
});
