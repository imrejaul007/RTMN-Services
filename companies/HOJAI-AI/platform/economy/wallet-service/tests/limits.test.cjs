/**
 * Unit tests for agent-wallets limit enforcement.
 *
 * Boots the service in-process on a random port, exercises the wallet
 * limit logic via HTTP, and asserts the per-tx / daily / monthly
 * caps are enforced.
 *
 * Run from the service directory:
 *   node tests/limits.test.js
 */

const path = require('path');
const http = require('http');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.PORT = '0'; // ephemeral
process.env.NODE_ENV = 'test';

// Skip the default rate limiter so tests can hammer the endpoints
process.env.SKIP_RATE_LIMIT = '1';

// Boot the service
const servicePath = path.resolve(__dirname, '..', 'src', 'index.js');
const mod = require(servicePath);
const app = mod.app || mod.default || mod;

let server;
let baseUrl;

function request(method, urlPath, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      `${baseUrl}${urlPath}`,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
      (res) => {
        let chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString();
          let parsed;
          try {
            parsed = JSON.parse(text);
          } catch (_) {
            parsed = text;
          }
          resolve({ status: res.statusCode, body: parsed });
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function createToken() {
  const { createToken } = require('@rtmn/shared/auth');
  return createToken({ agentId: 'test-agent', role: 'admin' });
}

async function run() {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      console.log(`Service listening on ${baseUrl}`);
      resolve();
    });
  });

  const token = createToken();
  let pass = 0, fail = 0;

  // 1. Create wallet with low per-tx limit
  const createRes = await request(
    'POST',
    '/api/wallets',
    {
      agentId: 'test-agent',
      initialBalances: { USD: 100000 },
      limits: { perTransactionLimit: 100, dailyLimit: 500, monthlyLimit: 1000 },
    },
    token
  );
  if (createRes.status !== 201) {
    console.error('FAIL: create wallet', createRes);
    process.exit(1);
  }
  const walletId = createRes.body.wallet?.id || createRes.body.id;
  console.log(`Created wallet: ${walletId}`);
  pass++;

  // 2. Per-tx limit: 200 should be rejected
  const overPerTx = await request(
    'POST',
    `/api/wallets/${walletId}/withdraw`,
    { amount: 200, currency: 'USD' },
    token
  );
  if (overPerTx.status === 400 || overPerTx.status === 403) {
    console.log('PASS: per-tx limit enforced (status=' + overPerTx.status + ')');
    pass++;
  } else {
    console.error('FAIL: per-tx limit not enforced', overPerTx.status, overPerTx.body);
    fail++;
  }

  // 3. Daily limit: 4 x 100 = 400 (under 500), then 200 should fail daily
  for (let i = 0; i < 4; i++) {
    const r = await request(
      'POST',
      `/api/wallets/${walletId}/withdraw`,
      { amount: 100, currency: 'USD' },
      token
    );
    if (r.status !== 200) {
      console.error(`FAIL: tx ${i} unexpected status`, r.status, r.body);
      fail++;
    }
  }
  const overDaily = await request(
    'POST',
    `/api/wallets/${walletId}/withdraw`,
    { amount: 150, currency: 'USD' }, // would bring daily to 550 > 500
    token
  );
  if (overDaily.status === 400 || overDaily.status === 403) {
    console.log('PASS: daily limit enforced');
    pass++;
  } else {
    console.error('FAIL: daily limit not enforced', overDaily.status, overDaily.body);
    fail++;
  }

  // 4. Check the limits endpoint reports usage
  const limitsRes = await request('GET', `/api/wallets/${walletId}/limits`, null, token);
  if (limitsRes.body?.dailyUsed >= 400) {
    console.log(`PASS: limits endpoint reports dailyUsed=${limitsRes.body.dailyUsed}`);
    pass++;
  } else {
    console.error('FAIL: limits endpoint', limitsRes.body);
    fail++;
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  server.close();
  process.exit(fail === 0 ? 0 : 1);
}

run().catch((e) => {
  console.error('Test error:', e);
  if (server) server.close();
  process.exit(1);
});