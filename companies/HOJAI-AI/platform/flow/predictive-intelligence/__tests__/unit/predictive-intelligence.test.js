/**
 * predictive-intelligence - vitest unit tests
 */
'use strict';

process.env.PREDICTIVE_INTELLIGENCE_NO_LISTEN = '1';
process.env.PREDICTIVE_INTELLIGENCE_REQUIRE_AUTH = 'false';
process.env.NODE_ENV = 'test';

const http = require('http');
const { app, seedData } = require('../../src/index');

let server;
let baseUrl;

beforeAll(async () => {
  seedData();
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
    const opts = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { 'Content-Type': 'application/json' }
    };
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

describe('config exports', () => {
  test('app is a function', () => {
    expect(typeof app).toBe('function');
  });
  test('seedData is a function', () => {
    expect(typeof seedData).toBe('function');
  });
});

describe('GET /api/health', () => {
  test('returns 200 with status', async () => {
    const res = await req('GET', '/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.service).toBe('predictive-intelligence');
  });
});

describe('GET /api/methods', () => {
  test('returns the list of forecast methods', async () => {
    const res = await req('GET', '/api/methods');
    expect(res.status).toBe(200);
    expect(res.body.count).toBeGreaterThan(0);
    expect(Array.isArray(res.body.methods)).toBe(true);
  });
});

describe('POST /api/forecast', () => {
  test('creates a forecast with moving-average method', async () => {
    const series = [];
    for (let i = 0; i < 20; i++) {
      series.push({ t: `2026-01-${String(i + 1).padStart(2, '0')}`, v: 100 + i });
    }
    const res = await req('POST', '/api/forecast', { series, method: 'moving-average', horizon: 5 });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.method).toBe('moving-average');
  });
  test('rejects missing series (400)', async () => {
    const res = await req('POST', '/api/forecast', { method: 'moving-average', horizon: 5 });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/forecast/batch', () => {
  test('forecasts multiple series at once', async () => {
    const series1 = [];
    const series2 = [];
    for (let i = 0; i < 15; i++) {
      series1.push({ t: `2026-01-${String(i + 1).padStart(2, '0')}`, v: 50 + i });
      series2.push({ t: `2026-01-${String(i + 1).padStart(2, '0')}`, v: 200 + i });
    }
    const res = await req('POST', '/api/forecast/batch', {
      series: [
        { name: 'A', series: series1, method: 'moving-average', horizon: 3 },
        { name: 'B', series: series2, method: 'moving-average', horizon: 3 }
      ]
    });
    expect(res.status).toBe(201);
    expect(res.body.count).toBe(2);
  });
});

describe('GET /api/forecasts and /api/forecast/:id', () => {
  test('lists forecasts (seed has 1)', async () => {
    const res = await req('GET', '/api/forecasts');
    expect(res.status).toBe(200);
    expect(res.body.count).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(res.body.forecasts)).toBe(true);
  });
  test('retrieves seeded forecast by id', async () => {
    const list = await req('GET', '/api/forecasts');
    const id = list.body.forecasts[0].id;
    const res = await req('GET', `/api/forecast/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.forecast.id).toBe(id);
  });
  test('returns 404 for unknown id', async () => {
    const res = await req('GET', '/api/forecast/does-not-exist');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/anomaly/detect', () => {
  test('detects an obvious anomaly', async () => {
    const series = [];
    for (let i = 0; i < 30; i++) {
      series.push({ t: `2026-01-${String(i + 1).padStart(2, '0')}`, v: 100 + (Math.random() - 0.5) * 2 });
    }
    series[20].v = 10000; // Inject anomaly
    const res = await req('POST', '/api/anomaly/detect', { series, threshold: 3 });
    expect(res.status).toBe(200);
    expect(typeof res.body.anomalies).toBe('number');
    expect(res.body.anomalies).toBeGreaterThan(0);
    expect(Array.isArray(res.body.points)).toBe(true);
  });
});

describe('POST /api/anomaly/score', () => {
  test('scores a point against history', async () => {
    const history = [];
    for (let i = 0; i < 30; i++) {
      history.push({ t: `2026-01-${String(i + 1).padStart(2, '0')}`, v: 100 + (Math.random() - 0.5) * 2 });
    }
    const res = await req('POST', '/api/anomaly/score', { history, point: { v: 10000 }, threshold: 3 });
    expect(res.status).toBe(200);
    expect(typeof res.body.score).toBe('number');
    expect(res.body.isAnomaly).toBe(true);
  });
});

describe('POST /api/trend and /api/trend/decompose', () => {
  test('computes trend direction', async () => {
    const series = [];
    for (let i = 0; i < 20; i++) {
      series.push({ t: `2026-01-${String(i + 1).padStart(2, '0')}`, v: 100 + i * 2 });
    }
    const res = await req('POST', '/api/trend', { series });
    expect(res.status).toBe(200);
    expect(res.body.direction).toBeDefined();
  });
  test('decomposes series into trend/seasonal/residual', async () => {
    const series = [];
    for (let i = 0; i < 30; i++) {
      series.push({ t: `2026-01-${String(i + 1).padStart(2, '0')}`, v: 100 + 5 * Math.sin(i / 3) + i * 0.5 });
    }
    const res = await req('POST', '/api/trend/decompose', { series, seasonality: 'daily' });
    expect(res.status).toBe(200);
    expect(res.body.components).toBeDefined();
  });
});

describe('POST /api/demand/predict', () => {
  test('predicts demand for a product', async () => {
    const historicalDemand = [];
    for (let i = 0; i < 30; i++) {
      historicalDemand.push({ t: `2026-01-${String(i + 1).padStart(2, '0')}`, v: 50 + Math.sin(i / 2) * 10 });
    }
    const res = await req('POST', '/api/demand/predict', {
      historicalDemand,
      leadTimeDays: 7,
      currentStock: 100,
      serviceLevel: 0.95
    });
    expect(res.status).toBe(200);
    expect(res.body.expectedDemand).toBeDefined();
    expect(res.body.reorderPoint).toBeDefined();
  });
});

describe('POST /api/evaluate', () => {
  test('evaluates forecast accuracy on a series', async () => {
    const series = [];
    for (let i = 0; i < 20; i++) {
      series.push({ t: `2026-01-${String(i + 1).padStart(2, '0')}`, v: 100 + i + Math.random() * 2 });
    }
    const res = await req('POST', '/api/evaluate', { series, method: 'moving-average', testSplit: 0.2 });
    expect(res.status).toBe(200);
    expect(res.body.metrics).toBeDefined();
  });
});

describe('GET /api/stats and /api/audit', () => {
  test('GET /api/stats returns counts', async () => {
    const res = await req('GET', '/api/stats');
    expect(res.status).toBe(200);
    expect(res.body).toBeDefined();
  });
  test('GET /api/audit returns recent operations', async () => {
    const res = await req('GET', '/api/audit');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.entries || res.body.audit)).toBe(true);
  });
});

describe('404 handling', () => {
  test('unknown route returns 404', async () => {
    const res = await req('GET', '/api/no-such-route');
    expect(res.status).toBe(404);
  });
});
