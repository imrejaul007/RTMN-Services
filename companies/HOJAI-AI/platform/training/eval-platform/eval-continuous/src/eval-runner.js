import { v4 as uuid } from 'uuid';

// Simulate running an eval suite
// In production this would exec('npm test') or curl a test service
export async function runEvalSuite(service, suite) {
  const id = uuid();
  const startedAt = new Date().toISOString();

  // Simulate some work
  await new Promise(r => setTimeout(r, 100));

  const total = Math.floor(Math.random() * 20) + 10;
  const passed = Math.floor(total * (0.7 + Math.random() * 0.3));
  const failed = total - passed;
  const skipped = Math.floor(Math.random() * 3);

  const run = {
    id,
    service,
    suite,
    status: 'completed',
    startedAt,
    completedAt: new Date().toISOString(),
    metrics: {
      tests: { total, passed, failed, skipped },
      latency: {
        p50: parseFloat((Math.random() * 200 + 50).toFixed(2)),
        p95: parseFloat((Math.random() * 400 + 200).toFixed(2)),
        p99: parseFloat((Math.random() * 600 + 400).toFixed(2))
      },
      quality: parseFloat((0.7 + Math.random() * 0.3).toFixed(3)),
      coverage: parseFloat((0.6 + Math.random() * 0.4).toFixed(3))
    },
    verdict: failed > 0 ? 'fail' : 'pass'
  };

  return run;
}

// Simulate a running eval (returns "running" status)
export function createRunningRun(service, suite) {
  return {
    id: uuid(),
    service,
    suite,
    status: 'running',
    startedAt: new Date().toISOString(),
    completedAt: null,
    metrics: null,
    verdict: null
  };
}
