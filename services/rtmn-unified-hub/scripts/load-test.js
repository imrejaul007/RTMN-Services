/**
 * Simple load test for the RTMN Hub.
 * Usage: node load-test.js [url] [concurrency] [total]
 *
 * Example: node load-test.js http://localhost:4399 50 1000
 */

import http from 'http';

const HUB_URL = process.argv[2] || 'http://localhost:4399';
const CONCURRENCY = parseInt(process.argv[3] || '50', 10);
const TOTAL = parseInt(process.argv[4] || '500', 10);
const ENDPOINT = '/health';

const urlObj = new URL(ENDPOINT, HUB_URL);

console.log('═══════════════════════════════════════');
console.log('RTMN Hub Load Test');
console.log('═══════════════════════════════════════');
console.log(`  Target:     ${urlObj}`);
console.log(`  Concurrency: ${CONCURRENCY}`);
console.log(`  Total:       ${TOTAL}`);
console.log('═══════════════════════════════════════');

function httpGet() {
  return new Promise((resolve) => {
    const start = Date.now();
    const req = http.get(urlObj, (res) => {
      const latency = Date.now() - start;
      resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, latency });
    });
    req.on('error', (err) => {
      resolve({ ok: false, status: 0, latency: Date.now() - start, error: err.message });
    });
    req.setTimeout(5000, () => {
      req.destroy();
      resolve({ ok: false, status: 0, latency: 5000, error: 'timeout' });
    });
  });
}

async function run() {
  const results = [];
  const start = Date.now();

  for (let i = 0; i < TOTAL; i += CONCURRENCY) {
    const batchSize = Math.min(CONCURRENCY, TOTAL - i);
    const batch = Array.from({ length: batchSize }, () => httpGet());
    const batchResults = await Promise.all(batch);
    results.push(...batchResults);
  }

  const totalMs = Date.now() - start;

  const ok = results.filter(r => r.ok).length;
  const fail = results.filter(r => !r.ok).length;
  const latencies = results.map(r => r.latency).sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.5)];
  const p95 = latencies[Math.floor(latencies.length * 0.95)];
  const p99 = latencies[Math.floor(latencies.length * 0.99)];
  const avg = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
  const rps = Math.round((TOTAL / totalMs) * 1000);

  console.log('\n═══════════════════════════════════════');
  console.log('Results');
  console.log('═══════════════════════════════════════');
  console.log(`  Total requests:  ${TOTAL}`);
  console.log(`  Duration:        ${totalMs}ms`);
  console.log(`  Throughput:       ${rps} req/s`);
  console.log(`  Success:        ${ok} (${((ok / TOTAL) * 100).toFixed(1)}%)`);
  console.log(`  Failures:       ${fail} (${((fail / TOTAL) * 100).toFixed(1)}%)`);
  console.log(`  Latency (avg):  ${avg}ms`);
  console.log(`  Latency (p50):  ${p50}ms`);
  console.log(`  Latency (p95): ${p95}ms`);
  console.log(`  Latency (p99): ${p99}ms`);
  console.log('═══════════════════════════════════════');

  if (fail > 0) {
    console.error(`ERRORS: ${fail} requests failed!`);
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Load test failed:', err);
  process.exit(1);
});
