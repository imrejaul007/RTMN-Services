/**
 * risk-intelligence - vitest unit tests
 */
'use strict';

process.env.RISK_INTELLIGENCE_NO_LISTEN = '1';
process.env.RISK_INTELLIGENCE_REQUIRE_AUTH = 'false';
process.env.NODE_ENV = 'test';

const http = require('http');
const { app } = require('../../src/index');

let server;
let baseUrl;

beforeAll(async () => {
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, () => resolve()));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(baseUrl + path);
    const opts = { method, hostname: url.hostname, port: url.port, path: url.pathname + url.search, headers: { 'Content-Type': 'application/json' } };
    const r = http.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        let parsed;
        try { parsed = data ? JSON.parse(data) : null; } catch { parsed = data; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    r.on('error', reject);
    if (body !== undefined) r.write(JSON.stringify(body));
    r.end();
  });
}

describe('Health', () => {
  test('GET /health returns ok', async () => {
    const res = await req('GET', '/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBeDefined();
  });
});

describe('Fraud', () => {
  test('POST /api/fraud/score returns risk score', async () => {
    const res = await req('POST', '/api/fraud/score', {
      transaction: { amount: 100, merchantCategory: 'grocery', country: 'US' },
      context: { deviceFingerprint: 'abc', ipRiskScore: 0.1, velocityLast1h: 0, velocityLast24h: 0, accountAge: 365, priorFraudFlags: 0 }
    });
    expect(res.status).toBe(200);
    expect(typeof res.body.score).toBe('number');
    expect(res.body.level).toBeDefined();
  });
  test('rejects missing transaction (400)', async () => {
    const res = await req('POST', '/api/fraud/score', {});
    expect(res.status).toBe(400);
  });
  test('POST /api/fraud/score/batch scores multiple', async () => {
    const res = await req('POST', '/api/fraud/score/batch', {
      items: [
        { transaction: { amount: 50 } },
        { transaction: { amount: 5000 } }
      ]
    });
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);
  });
  test('GET /api/fraud/rules returns rules', async () => {
    const res = await req('GET', '/api/fraud/rules');
    expect(res.status).toBe(200);
  });
  test('PATCH /api/fraud/rules updates weights', async () => {
    const res = await req('PATCH', '/api/fraud/rules', { weights: { amount: 0.5 } });
    expect(res.status).toBe(200);
  });
});

describe('Churn', () => {
  test('POST /api/churn/score returns churn probability', async () => {
    const res = await req('POST', '/api/churn/score', {
      customerId: 'c-1',
      features: { recencyDays: 30, frequency30d: 5, monetary30d: 100, tenureMonths: 12, supportTickets: 0, nps: 9 }
    });
    expect(res.status).toBe(200);
    expect(typeof res.body.churnProbability).toBe('number');
  });
  test('POST /api/churn/cohort analyzes cohort', async () => {
    const res = await req('POST', '/api/churn/cohort', {
      customerIds: ['c1', 'c2'],
      featuresByCustomer: {
        c1: { tenure: 6, lastLoginDays: 60, npsScore: 5 },
        c2: { tenure: 12, lastLoginDays: 5, npsScore: 9 }
      }
    });
    expect(res.status).toBe(200);
    expect(res.body.cohortSize).toBe(2);
  });
});

describe('Credit', () => {
  test('POST /api/credit/score returns credit score', async () => {
    const res = await req('POST', '/api/credit/score', {
      applicant: { age: 30, income: 50000, debtToIncome: 0.2, creditHistoryYears: 5, recentInquiries: 1 }
    });
    expect(res.status).toBe(200);
    expect(res.body.creditScore).toBeDefined();
    expect(typeof res.body.creditScore).toBe('number');
    expect(res.body.decision).toBeDefined();
  });
  test('POST /api/credit/simulate runs scenarios', async () => {
    const res = await req('POST', '/api/credit/simulate', {
      applicant: { age: 30, income: 50000 },
      scenarios: [{ name: 'a', debtToIncome: 0.1 }, { name: 'b', debtToIncome: 0.5 }]
    });
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);
  });
});

describe('Composite + thresholds', () => {
  test('POST /api/risk/composite returns composite risk', async () => {
    const res = await req('POST', '/api/risk/composite', {
      fraud: 30,
      churn: 0.2,
      credit: 720
    });
    expect(res.status).toBe(200);
    expect(typeof res.body.score).toBe('number');
    expect(res.body.level).toBeDefined();
  });
  test('PATCH /api/risk/thresholds updates thresholds', async () => {
    const res = await req('PATCH', '/api/risk/thresholds', { thresholds: { fraud: { medium: 50 } } });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/updated/i);
  });
});

describe('Audit', () => {
  test('GET /api/audit returns audit log', async () => {
    const res = await req('GET', '/api/audit');
    expect(res.status).toBe(200);
    expect(typeof res.body.count).toBe('number');
  });
});