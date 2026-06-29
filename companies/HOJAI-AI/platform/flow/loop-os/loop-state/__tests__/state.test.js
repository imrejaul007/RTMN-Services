/**
 * Loop State Manager - Vitest Tests
 */

import { describe, it, expect } from 'vitest';

process.env.HOJAI_API_KEY = 'test-key';
process.env.PORT = '4732';

describe('Loop State Manager - Health', () => {
  it('should return healthy status', async () => {
    const res = await fetch('http://localhost:4732/health');
    const data = await res.json();
    expect(data.status).toBe('ok');
    expect(data.service).toBe('loop-state');
  });
});

describe('Loop State Manager - State CRUD', () => {
  const auth = { headers: { Authorization: 'Bearer test-key' } };

  it('should initialize state', async () => {
    const res = await fetch('http://localhost:4732/api/states', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-key' },
      body: JSON.stringify({
        loopId: 'loop-test-001',
        goal: 'Test goal'
      })
    });
    const data = await res.json();
    expect(data.id).toBeDefined();
    expect(data.loopId).toBe('loop-test-001');
  });

  it('should get state', async () => {
    const res = await fetch('http://localhost:4732/api/states/loop-test-001');
    const data = await res.json();
    expect(data.loopId).toBe('loop-test-001');
  });

  it('should update state', async () => {
    const res = await fetch('http://localhost:4732/api/states/loop-test-001', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-key' },
      body: JSON.stringify({ currentStep: 'step-2' })
    });
    const data = await res.json();
    expect(data.currentStep).toBe('step-2');
  });
});

describe('Loop State Manager - Transitions', () => {
  const auth = { headers: { Authorization: 'Bearer test-key' } };

  it('should transition state', async () => {
    const res = await fetch('http://localhost:4732/api/states/loop-test-001/transition', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-key' },
      body: JSON.stringify({ newStatus: 'running' })
    });
    const data = await res.json();
    expect(data.status).toBe('running');
  });

  it('should reject invalid transitions', async () => {
    const res = await fetch('http://localhost:4732/api/states/loop-test-001/transition', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-key' },
      body: JSON.stringify({ newStatus: 'completed' })
    });
    expect(res.status).toBe(400);
  });
});

describe('Loop State Manager - Checkpoints', () => {
  const auth = { headers: { Authorization: 'Bearer test-key' } };

  it('should create checkpoint', async () => {
    const res = await fetch('http://localhost:4732/api/states/loop-test-001/checkpoints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-key' },
      body: JSON.stringify({ reason: 'before major change' })
    });
    const data = await res.json();
    expect(data.id).toBeDefined();
  });
});
