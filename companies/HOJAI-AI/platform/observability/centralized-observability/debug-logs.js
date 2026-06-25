'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'obs-debug-'));
process.env.PORT = '32001';
process.env.DATA_DIR = tmp;
process.env.INTERNAL_TOKEN = 'tok';
process.env.POLL_INTERVAL_MS = '999999';

const { createApp } = require('./src/index.js');
const app = createApp();
const server = app.listen(32001, () => {
  console.log('Server started on 32001');
  console.log('Data dir:', tmp);
  runTests();
});

function req(method, p, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: '127.0.0.1', port: 32001, method, path: p,
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
  console.log('\n--- Register service ---');
  const r1 = await req('POST', '/api/services', { id: 'svc-debug', name: 'Debug Test' }, T);
  console.log('Register:', r1.status, JSON.stringify(r1.body).slice(0, 100));

  console.log('\n--- POST logs ---');
  const r2 = await req('POST', '/api/logs/svc-debug', {
    entries: [
      { level: 'info', message: 'Server started' },
      { level: 'error', message: 'Connection timeout' },
    ],
  }, T);
  console.log('POST logs:', r2.status, JSON.stringify(r2.body));

  console.log('\n--- GET logs ---');
  const r3 = await req('GET', '/api/logs');
  console.log('GET logs:', r3.status, JSON.stringify(r3.body));

  // Check file
  const logFile = path.join(tmp, 'logs.json');
  console.log('\n--- File system ---');
  console.log('Files in data dir:', fs.readdirSync(tmp));
  if (fs.existsSync(logFile)) {
    const content = JSON.parse(fs.readFileSync(logFile, 'utf8'));
    console.log('logs.json entries:', content.entries?.length);
    console.log('logs.json content:', JSON.stringify(content).slice(0, 200));
  } else {
    console.log('logs.json does NOT exist!');
  }

  server.close(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
    process.exit(0);
  });
}
