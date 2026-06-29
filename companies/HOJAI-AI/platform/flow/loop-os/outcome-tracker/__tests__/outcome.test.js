/**
 * Outcome Tracker - Vitest Tests
 */

import { describe, it, expect } from 'vitest';

process.env.HOJAI_API_KEY = 'test-key';
process.env.PORT = '4737';

describe('Outcome Tracker - Health', () => {
  it('should return healthy status', async () => {
    const res = await fetch('http://localhost:4737/health');
    const data = await res.json();
    expect(data.status).toBe('ok');
    expect(data.service).toBe('outcome-tracker');
  });
});

describe('Outcome Tracker - Outcomes', () => {
  const auth = { headers: { Authorization: 'Bearer test-key', 'Content-Type': 'application/json' } };

  it('should record outcome', async () => {
    const res = await fetch('http://localhost:4737/api/outcomes', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        twinId: 'agent-outcome-001',
        taskId: 'task-001',
        taskType: 'negotiation',
        status: 'success',
        score: 0.9
      })
    });
    const data = await res.json();
    expect(data.id).toBeDefined();
    expect(data.success).toBe(true);
  });

  it('should list outcomes', async () => {
    const res = await fetch('http://localhost:4737/api/outcomes?twinId=agent-outcome-001');
    const data = await res.json();
    expect(data.outcomes).toBeInstanceOf(Array);
  });

  it('should get skill profile', async () => {
    const res = await fetch('http://localhost:4737/api/skills/agent-outcome-001');
    const data = await res.json();
    expect(data.twinId).toBe('agent-outcome-001');
  });
});

describe('Outcome Tracker - Analytics', () => {
  it('should get analytics', async () => {
    const res = await fetch('http://localhost:4737/api/analytics?period=7d');
    const data = await res.json();
    expect(data.period).toBe('7d');
    expect(data.successRate).toBeDefined();
  });
});
