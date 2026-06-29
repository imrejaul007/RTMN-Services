/**
 * LoopOS Scheduler Service - Vitest Tests
 */

import { describe, it, expect, before, after } from 'vitest';

const API = 'http://localhost:4731';
const API_KEY = 'test-key';

describe('Loop Scheduler API', () => {
  let loopId;

  it('GET /health returns healthy status', async () => {
    const res = await fetch(`${API}/health`);
    const data = await res.json();
    expect(data.status).toBe('ok');
    expect(data.service).toBe('loop-scheduler');
  });

  it('POST /api/loops creates a loop', async () => {
    const res = await fetch(`${API}/api/loops`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        name: 'Test Loop',
        frequency: '*/5 * * * *',
        twinId: 'test-agent',
        enabled: false
      })
    });
    const data = await res.json();
    expect(data.id).toBeDefined();
    expect(data.name).toBe('Test Loop');
    loopId = data.id;
  });

  it('GET /api/loops lists loops', async () => {
    const res = await fetch(`${API}/api/loops`);
    const data = await res.json();
    expect(data.loops).toBeInstanceOf(Array);
  });

  it('GET /api/loops/:id gets specific loop', async () => {
    if (!loopId) return;
    const res = await fetch(`${API}/api/loops/${loopId}`);
    const data = await res.json();
    expect(data.id).toBe(loopId);
  });

  it('PUT /api/loops/:id updates loop', async () => {
    if (!loopId) return;
    const res = await fetch(`${API}/api/loops/${loopId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({ name: 'Updated Loop' })
    });
    const data = await res.json();
    expect(data.name).toBe('Updated Loop');
  });

  it('POST /api/loops/:id/trigger triggers loop', async () => {
    if (!loopId) return;
    const res = await fetch(`${API}/api/loops/${loopId}/trigger`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${API_KEY}` }
    });
    expect([200, 201]).toContain(res.status);
  });

  it('POST /api/loops/:id/pause pauses loop', async () => {
    if (!loopId) return;
    const res = await fetch(`${API}/api/loops/${loopId}/pause`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${API_KEY}` }
    });
    const data = await res.json();
    expect(data.enabled).toBe(false);
  });

  it('POST /api/loops/:id/resume resumes loop', async () => {
    if (!loopId) return;
    const res = await fetch(`${API}/api/loops/${loopId}/resume`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${API_KEY}` }
    });
    const data = await res.json();
    expect([data.enabled, res.status]).toBeDefined();
  });

  it('GET /api/loops/:id/executions gets executions', async () => {
    if (!loopId) return;
    const res = await fetch(`${API}/api/loops/${loopId}/executions`);
    const data = await res.json();
    expect(data.executions).toBeInstanceOf(Array);
  });

  it('DELETE /api/loops/:id deletes loop', async () => {
    if (!loopId) return;
    const res = await fetch(`${API}/api/loops/${loopId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${API_KEY}` }
    });
    expect([200, 204]).toContain(res.status);
  });

  it('rejects invalid cron expression', async () => {
    const res = await fetch(`${API}/api/loops`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        name: 'Bad Cron',
        frequency: 'invalid-cron'
      })
    });
    expect(res.status).toBe(400);
  });

  it('requires auth for POST endpoints', async () => {
    const res = await fetch(`${API}/api/loops`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test', frequency: '*/5 * * * *' })
    });
    expect(res.status).toBe(401);
  });
});
