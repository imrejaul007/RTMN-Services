'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');

// Reproduce the test harness flow exactly
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'obs-test-'));
console.log('TEMP DIR:', tmp);
console.log('FILES AT START:', fs.readdirSync(tmp));

// Set env like test harness
process.env.PORT = '32100';
process.env.DATA_DIR = tmp;
process.env.INTERNAL_TOKEN = 'tok';
process.env.POLL_INTERVAL_MS = '999999';

console.log('FILES AFTER ENV SET:', fs.readdirSync(tmp));

// Delete module cache
delete require.cache[require.resolve('./src/index.js')];
console.log('FILES AFTER CACHE DELETE:', fs.readdirSync(tmp));

// Require
const { createApp } = require('./src/index.js');
console.log('FILES AFTER REQUIRE:', fs.readdirSync(tmp));

// createApp
const app = createApp();
console.log('FILES AFTER createApp():', fs.readdirSync(tmp));

// Start server
const server = app.listen(32100, () => {
  console.log('FILES AFTER LISTEN:', fs.readdirSync(tmp));
  console.log('Server listening on 32100');
  runTests();
});

function req(method, p, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: '127.0.0.1', port: 32100, method, path: p,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        ...(token ? { 'X-Internal-Token': token } : {}),
      },
    }, (res) => {
      let chunks = '';
      res.on('data', c => chunks += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(chunks) }); }
        catch (_) { resolve({ status: res.statusCode, body: chunks }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runTests() {
  const T = 'tok';

  // Register service
  const reg = await req('POST', '/api/services', { id: 'svc-x', name: 'Test' }, T);
  console.log('Register:', reg.status, JSON.stringify(reg.body).slice(0,80));
  console.log('FILES AFTER REGISTER:', fs.readdirSync(tmp));

  // POST logs
  const post = await req('POST', '/api/logs/svc-x', {
    entries: [{ level: 'info', message: 'test' }],
  }, T);
  console.log('POST logs:', post.status, JSON.stringify(post.body));
  console.log('FILES AFTER POST:', fs.readdirSync(tmp));

  // GET logs
  const get = await req('GET', '/api/logs');
  console.log('GET logs:', get.status, JSON.stringify(get.body));

  // Check file
  const lf = path.join(tmp, 'logs.json');
  if (fs.existsSync(lf)) {
    console.log('logs.json:', JSON.stringify(JSON.parse(fs.readFileSync(lf, 'utf8'))).slice(0,200));
  } else {
    console.log('logs.json NOT FOUND');
  }

  // Cleanup like test harness
  server.closeAllConnections();
  server.close(() => {
    delete require.cache[require.resolve('./src/index.js')];
    fs.rmSync(tmp, { recursive: true, force: true });
    console.log('Done');
    process.exit(0);
  });
}
