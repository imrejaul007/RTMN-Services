/**
 * Fleet OS - Vitest Tests
 */

import { describe, it, expect } from 'vitest';

process.env.HOJAI_API_KEY = 'test-key';
process.env.PORT = '4735';

describe('Fleet OS - Health', () => {
  it('should return healthy status', async () => {
    const res = await fetch('http://localhost:4735/health');
    const data = await res.json();
    expect(data.status).toBe('ok');
    expect(data.service).toBe('fleet-os');
  });
});

describe('Fleet OS - Fleet CRUD', () => {
  const auth = { headers: { Authorization: 'Bearer test-key', 'Content-Type': 'application/json' } };

  it('should create fleet', async () => {
    const res = await fetch('http://localhost:4735/api/fleets', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        name: 'Test Sales Team',
        department: 'sales'
      })
    });
    const data = await res.json();
    expect(data.id).toBeDefined();
    expect(data.name).toBe('Test Sales Team');
  });

  it('should list fleets', async () => {
    const res = await fetch('http://localhost:4735/api/fleets');
    const data = await res.json();
    expect(data.fleets).toBeInstanceOf(Array);
  });
});

describe('Fleet OS - Agent Management', () => {
  const auth = { headers: { Authorization: 'Bearer test-key', 'Content-Type': 'application/json' } };

  it('should add agent to fleet', async () => {
    // First create fleet
    const fleet = await fetch('http://localhost:4735/api/fleets', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ name: 'Test Fleet', department: 'sales' })
    });
    const fleetData = await fleet.json();

    const res = await fetch(`http://localhost:4735/api/fleets/${fleetData.id}/agents`, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        twinId: 'agent-test-001',
        role: 'sales_rep',
        capabilities: [{ name: 'crm', proficiency: 0.9 }]
      })
    });
    const data = await res.json();
    expect(data.twinId).toBe('agent-test-001');
  });

  it('should get fleet health', async () => {
    const fleet = await fetch('http://localhost:4735/api/fleets');
    const data = await fleet.json();
    if (data.fleets.length > 0) {
      const health = await fetch(`http://localhost:4735/api/fleets/${data.fleets[0].id}/health`);
      const healthData = await health.json();
      expect(healthData.totalAgents).toBeDefined();
    }
  });
});

describe('Fleet OS - Capabilities', () => {
  it('should list all capabilities', async () => {
    const res = await fetch('http://localhost:4735/api/capabilities');
    const data = await res.json();
    expect(data.capabilities).toBeInstanceOf(Array);
  });
});
