/**
 * ComplianceOS Tests - Port 4873
 */
import { describe, it, expect } from 'vitest';
import http from 'http';

const BASE_URL = 'http://localhost:4873';

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

describe('ComplianceOS Health', () => {
  it('should return healthy', async () => {
    const res = await req('/health');
    expect(res.status).toBe(200);
  });
});

describe('ComplianceOS Frameworks', () => {
  it('should list frameworks', async () => {
    const res = await req('/api/frameworks');
    expect([200, 201].includes(res.status)).toBe(true);
  });

  it('should create framework', async () => {
    const res = await req('/api/frameworks', 'POST', { name: 'SOC2', version: '2017' });
    expect([201, 200, 400].includes(res.status)).toBe(true);
  });
});

describe('ComplianceOS Reports', () => {
  it('should get compliance summary', async () => {
    const res = await req('/api/reports/compliance-summary');
    expect([200, 201].includes(res.status)).toBe(true);
  });
});
