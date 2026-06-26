/**
 * SafetyOS Tests - Port 4862
 */
import { describe, it, expect } from 'vitest';
import http from 'http';

const BASE_URL = 'http://localhost:4862';

async function req(path: string, method = 'GET', body?: object) {
  return new Promise<{ status: number; data: any }>((resolve) => {
    const url = new URL(path, BASE_URL);
    const options = { hostname: url.hostname, port: url.port, path: url.pathname, method, headers: { 'Content-Type': 'application/json' } };
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

describe('SafetyOS Health', () => {
  it('should return healthy', async () => {
    const res = await req('/health');
    expect(res.status).toBe(200);
  });
});

describe('SafetyOS Kill Switches', () => {
  it('should list kill switches', async () => {
    const res = await req('/api/killswitches');
    expect([200, 201].includes(res.status)).toBe(true);
  });

  it('should create kill switch', async () => {
    const res = await req('/api/killswitches', 'POST', { name: 'Test', scope: 'agent' });
    expect([201, 200].includes(res.status)).toBe(true);
  });
});

describe('SafetyOS Emergency', () => {
  it('should stop all agents', async () => {
    const res = await req('/api/emergency/stop', 'POST', { reason: 'test' });
    expect([200, 201].includes(res.status)).toBe(true);
  });
});
