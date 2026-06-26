/**
 * RuntimeOS Tests - Port 4860
 */
import { describe, it, expect } from 'vitest';
import http from 'http';

const BASE_URL = 'http://localhost:4860';

async function req(path: string, method = 'GET', body?: object) {
  return new Promise<{ status: number; data: any }>((resolve) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    const r = http.request(options, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve({ status: res.statusCode || 500, data: JSON.parse(d) }); } catch { resolve({ status: res.statusCode || 500, data: {} }); } });
    });
    r.on('error', () => resolve({ status: 503, data: {} }));
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

describe('RuntimeOS Health', () => {
  it('should return healthy', async () => {
    const res = await req('/health');
    expect(res.status).toBe(200);
  });
});

describe('RuntimeOS Agents', () => {
  it('should list agents', async () => {
    const res = await req('/api/agents');
    expect([200, 201].includes(res.status)).toBe(true);
  });

  it('should create agent', async () => {
    const res = await req('/api/agents', 'POST', { name: 'TestAgent', type: 'sales' });
    expect([201, 200].includes(res.status)).toBe(true);
  });
});

describe('RuntimeOS Schedule', () => {
  it('should list schedules', async () => {
    const res = await req('/api/schedule');
    expect([200, 201].includes(res.status)).toBe(true);
  });
});
