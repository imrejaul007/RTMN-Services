/**
 * ConstitutionalOS Tests
 * Port: 4855
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';

const BASE_URL = 'http://localhost:4855';

interface Response {
  status: number;
  data: any;
}

async function makeRequest(path: string, method = 'GET', body?: object): Promise<Response> {
  return new Promise((resolve) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method,
      headers: { 'Content-Type': 'application/json' }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode || 500, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode || 500, data });
        }
      });
    });

    req.on('error', () => resolve({ status: 503, data: null }));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

describe('ConstitutionalOS - Health', () => {
  it('should return healthy status', async () => {
    const res = await makeRequest('/health');
    expect(res.status).toBe(200);
    expect(res.data.status).toBe('healthy');
  });

  it('should return ready status', async () => {
    const res = await makeRequest('/ready');
    expect(res.status).toBe(200);
  });
});

describe('ConstitutionalOS - Missions', () => {
  it('should list missions', async () => {
    const res = await makeRequest('/api/missions');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data.data?.missions || res.data.data)).toBe(true);
  });

  it('should create a mission', async () => {
    const res = await makeRequest('/api/missions', 'POST', {
      text: 'Maximize customer satisfaction',
      priority: 'high'
    });
    expect([201, 200].includes(res.status)).toBe(true);
  });
});

describe('ConstitutionalOS - Red Lines', () => {
  it('should list red lines', async () => {
    const res = await makeRequest('/api/red-lines');
    expect(res.status).toBe(200);
  });

  it('should create a red line', async () => {
    const res = await makeRequest('/api/red-lines', 'POST', {
      rule: 'Never share customer data',
      category: 'privacy',
      severity: 'hard_stop'
    });
    expect([201, 200].includes(res.status)).toBe(true);
  });
});

describe('ConstitutionalOS - Authorization', () => {
  it('should check authorization', async () => {
    const res = await makeRequest('/api/authorize', 'POST', {
      agentType: 'sales',
      action: 'send_email'
    });
    expect([200, 201].includes(res.status)).toBe(true);
  });
});
