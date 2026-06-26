/**
 * ChatOS Tests - Port 4876
 */
import { describe, it, expect } from 'vitest';
import http from 'http';

const BASE_URL = 'http://localhost:4876';

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

describe('ChatOS Health', () => {
  it('should return healthy', async () => {
    const res = await req('/health');
    expect(res.status).toBe(200);
  });
});

describe('ChatOS Channels', () => {
  it('should list channels', async () => {
    const res = await req('/api/channels');
    expect([200, 201].includes(res.status)).toBe(true);
  });
});

describe('ChatOS Messages', () => {
  it('should send message', async () => {
    const res = await req('/api/messages', 'POST', { senderId: 'user1', content: 'Hello' });
    expect([201, 200, 400].includes(res.status)).toBe(true);
  });
});
