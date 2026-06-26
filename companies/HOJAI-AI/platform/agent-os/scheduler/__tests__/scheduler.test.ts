/**
 * Scheduler Tests - Port 4808
 */
import { describe, it, expect } from 'vitest';
import http from 'http';

const BASE_URL = 'http://localhost:4808';

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

describe('Scheduler Health', () => {
  it('should return healthy', async () => {
    const res = await req('/health');
    expect(res.status).toBe(200);
  });
});

describe('Scheduler Jobs', () => {
  it('should list jobs', async () => {
    const res = await req('/api/jobs');
    expect([200, 201].includes(res.status)).toBe(true);
  });
});
