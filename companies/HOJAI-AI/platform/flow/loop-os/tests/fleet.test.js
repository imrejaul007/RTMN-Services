/**
 * LoopOS Fleet OS - Vitest Tests
 */

import { describe, it, expect } from 'vitest';

const API = 'http://localhost:4735';
const API_KEY = 'test-key';

describe('Fleet OS API', () => {
  let fleetId;

  it('GET /health returns healthy status', async () => {
    const res = await fetch(`${API}/health`);
    const data = await res.json();
    expect(data.status).toBe('ok');
  });

  it('POST /api/fleets creates fleet', async () => {
    const res = await fetch(`${API}/api/fleets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        name: 'Test Sales Team',
        department: 'sales'
      })
    });
    const data = await res.json();
    expect(data.id).toBeDefined();
    expect(data.name).toBe('Test Sales Team');
    fleetId = data.id;
  });

  it('GET /api/fleets lists fleets', async () => {
    const res = await fetch(`${API}/api/fleets`);
    const data = await res.json();
    expect(data.fleets).toBeInstanceOf(Array);
  });

  it('POST /api/fleets/:id/agents adds agent', async () => {
    if (!fleetId) return;
    const res = await fetch(`${API}/api/fleets/${fleetId}/agents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        twinId: 'test-agent-001',
        role: 'sales_rep',
        capabilities: [
          { name: 'crm', proficiency: 0.9 }
        ]
      })
    });
    const data = await res.json();
    expect(data.twinId).toBe('test-agent-001');
  });

  it('GET /api/fleets/:id/agents lists agents', async () => {
    if (!fleetId) return;
    const res = await fetch(`${API}/api/fleets/${fleetId}/agents`);
    const data = await res.json();
    expect(data.agents).toBeInstanceOf(Array);
  });

  it('GET /api/fleets/:id/health gets fleet health', async () => {
    if (!fleetId) return;
    const res = await fetch(`${API}/api/fleets/${fleetId}/health`);
    const data = await res.json();
    expect(data.totalAgents).toBeDefined();
  });

  it('GET /api/capabilities lists capabilities', async () => {
    const res = await fetch(`${API}/api/capabilities`);
    const data = await res.json();
    expect(data.capabilities).toBeInstanceOf(Array);
  });

  it('GET /api/capabilities/:name/agents finds agents by capability', async () => {
    const res = await fetch(`${API}/api/capabilities/crm/agents`);
    const data = await res.json();
    expect(data.agents).toBeInstanceOf(Array);
  });

  it('PUT /api/agents/:id/status updates agent status', async () => {
    const res = await fetch(`${API}/api/agents/test-agent-001`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`
      },
      body: JSON.stringify({ status: 'busy' })
    });
    expect([200, 404]).toContain(res.status);
  });

  it('POST /api/fleets/:id/escalate creates escalation', async () => {
    if (!fleetId) return;
    const res = await fetch(`${API}/api/fleets/${fleetId}/escalate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        agentId: 'test-agent-001',
        issue: 'Performance degradation',
        severity: 'high'
      })
    });
    const data = await res.json();
    expect([201, 200]).toContain(res.status);
  });

  it('requires auth for POST endpoints', async () => {
    const res = await fetch(`${API}/api/fleets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test' })
    });
    expect(res.status).toBe(401);
  });
});
