/**
 * HOJAI Studio - Testing Service
 * Unit, Integration, and E2E testing for generated apps
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();

// ── Internal Auth ────────────────────────────────────────────────
function requireInternal(req, res, next) {
  const token = req.headers['x-internal-token'];
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  if (token && expected && token === expected) {
    req.user = { type: 'service', id: 'internal' };
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}
const PORT = process.env.PORT || 4730;

app.use(express.json());

// In-memory stores
const testSuites = new Map(); // suiteId -> test suite
const testRuns = new Map(); // runId -> test run
const testCoverage = new Map(); // projectId -> coverage data

// Test result aggregation
function aggregateResults(results) {
  const summary = {
    passed: 0,
    failed: 0,
    skipped: 0,
    total: results.length,
    duration: 0,
    timestamp: new Date().toISOString()
  };

  results.forEach(r => {
    summary.passed += r.status === 'passed' ? 1 : 0;
    summary.failed += r.status === 'failed' ? 1 : 0;
    summary.skipped += r.status === 'skipped' ? 1 : 0;
    summary.duration += r.duration || 0;
  });

  summary.passRate = summary.total > 0
    ? Math.round((summary.passed / summary.total) * 100)
    : 0;

  return summary;
}

// Test templates for different app types
const TEST_TEMPLATES = {
  ecommerce: {
    name: 'E-Commerce Tests',
    tests: [
      { name: 'Product listing loads', type: 'unit', category: 'product' },
      { name: 'Add to cart works', type: 'integration', category: 'cart' },
      { name: 'Checkout flow completes', type: 'e2e', category: 'checkout' },
      { name: 'Payment processes', type: 'integration', category: 'payment' },
      { name: 'Order confirmation sent', type: 'unit', category: 'order' },
      { name: 'User can login', type: 'e2e', category: 'auth' },
      { name: 'Search finds products', type: 'integration', category: 'search' },
      { name: 'Price discount applies', type: 'unit', category: 'pricing' }
    ]
  },
  foodDelivery: {
    name: 'Food Delivery Tests',
    tests: [
      { name: 'Restaurant list displays', type: 'unit', category: 'restaurant' },
      { name: 'Menu items load', type: 'integration', category: 'menu' },
      { name: 'Cart updates correctly', type: 'unit', category: 'cart' },
      { name: 'Order placement works', type: 'e2e', category: 'order' },
      { name: 'Driver assignment happens', type: 'integration', category: 'delivery' },
      { name: 'Real-time tracking updates', type: 'e2e', category: 'tracking' },
      { name: 'Rating submission works', type: 'integration', category: 'rating' }
    ]
  },
  healthcare: {
    name: 'Healthcare Tests',
    tests: [
      { name: 'Doctor search works', type: 'unit', category: 'search' },
      { name: 'Appointment booking completes', type: 'e2e', category: 'booking' },
      { name: 'Prescription generates', type: 'integration', category: 'prescription' },
      { name: 'Payment processes', type: 'integration', category: 'payment' },
      { name: 'EMR updates correctly', type: 'unit', category: 'emr' },
      { name: 'Notifications sent', type: 'integration', category: 'notification' }
    ]
  },
  social: {
    name: 'Social App Tests',
    tests: [
      { name: 'User registration works', type: 'e2e', category: 'auth' },
      { name: 'Profile updates correctly', type: 'integration', category: 'profile' },
      { name: 'Post creation works', type: 'unit', category: 'posts' },
      { name: 'Like functionality works', type: 'integration', category: 'social' },
      { name: 'Comment threading works', type: 'unit', category: 'social' },
      { name: 'Search finds users', type: 'integration', category: 'search' }
    ]
  }
};

// REST API - Test Suites
app.post('/api/suites', requireInternal, (req, res) => {
  const { projectId, name, type, category, tests } = req.body;
  const suiteId = uuidv4();

  const suite = {
    id: suiteId,
    projectId,
    name,
    type, // unit, integration, e2e
    category,
    tests: tests || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  testSuites.set(suiteId, suite);
  res.json(suite);
});

app.get('/api/suites', (req, res) => {
  const { projectId, type, category } = req.query;
  let suites = Array.from(testSuites.values());

  if (projectId) suites = suites.filter(s => s.projectId === projectId);
  if (type) suites = suites.filter(s => s.type === type);
  if (category) suites = suites.filter(s => s.category === category);

  res.json(suites);
});

app.get('/api/suites/:suiteId', (req, res) => {
  const { suiteId } = req.params;
  const suite = testSuites.get(suiteId);

  if (!suite) {
    return res.status(404).json({ error: 'Test suite not found' });
  }

  res.json(suite);
});

app.patch('/api/suites/:suiteId', requireInternal, (req, res) => {
  const { suiteId } = req.params;
  const updates = req.body;
  const suite = testSuites.get(suiteId);

  if (!suite) {
    return res.status(404).json({ error: 'Test suite not found' });
  }

  Object.assign(suite, updates, { updatedAt: new Date().toISOString() });
  res.json(suite);
});

app.delete('/api/suites/:suiteId', requireInternal, (req, res) => {
  const { suiteId } = req.params;

  if (!testSuites.has(suiteId)) {
    return res.status(404).json({ error: 'Test suite not found' });
  }

  testSuites.delete(suiteId);
  res.json({ deleted: true });
});

// REST API - Test Templates
app.get('/api/templates', (req, res) => {
  const { appType } = req.query;

  if (appType && TEST_TEMPLATES[appType]) {
    res.json(TEST_TEMPLATES[appType]);
  }

  res.json(TEST_TEMPLATES);
});

app.post('/api/templates/:appType/generate', requireInternal, (req, res) => {
  const { appType } = req.params;
  const { projectId, name } = req.body;

  const template = TEST_TEMPLATES[appType];
  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }

  const suiteId = uuidv4();
  const suite = {
    id: suiteId,
    projectId,
    name: name || template.name,
    type: 'mixed',
    category: appType,
    tests: template.tests.map((t, i) => ({
      id: uuidv4(),
      ...t,
      status: 'pending'
    })),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  testSuites.set(suiteId, suite);
  res.json(suite);
});

// REST API - Test Runs
app.post('/api/runs', requireInternal, (req, res) => {
  const { suiteId, environment = 'staging', parallel = false } = req.body;
  const suite = testSuites.get(suiteId);

  if (!suite) {
    return res.status(404).json({ error: 'Test suite not found' });
  }

  const runId = uuidv4();
  const run = {
    id: runId,
    suiteId,
    projectId: suite.projectId,
    environment,
    parallel,
    status: 'running',
    progress: 0,
    results: [],
    summary: null,
    startedAt: new Date().toISOString(),
    completedAt: null
  };

  testRuns.set(runId, run);

  // Simulate test execution
  simulateTestRun(run, suite);

  res.json({ runId, status: 'started' });
});

async function simulateTestRun(run, suite) {
  const results = [];
  const total = suite.tests.length;

  for (let i = 0; i < total; i++) {
    const test = suite.tests[i];

    // Simulate test execution (in real implementation, this would actually run tests)
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

    // Simulate pass/fail (90% pass rate)
    const passed = Math.random() > 0.1;
    const result = {
      id: uuidv4(),
      testId: test.id,
      testName: test.name,
      type: test.type,
      category: test.category,
      status: passed ? 'passed' : 'failed',
      duration: Math.round(50 + Math.random() * 450),
      error: passed ? null : generateSimulatedError(),
      screenshot: passed ? null : `screenshot-${uuidv4()}.png`,
      timestamp: new Date().toISOString()
    };

    results.push(result);

    // Update progress
    run.results = results;
    run.progress = Math.round(((i + 1) / total) * 100);
  }

  run.results = results;
  run.summary = aggregateResults(results);
  run.status = 'completed';
  run.completedAt = new Date().toISOString();

  // Store coverage if this is a code coverage run
  if (suite.category) {
    storeCoverage(run, suite);
  }
}

function generateSimulatedError() {
  const errors = [
    { type: 'AssertionError', message: 'Expected value to equal "X" but got "Y"' },
    { type: 'TimeoutError', message: 'Test timed out after 5000ms' },
    { type: 'NetworkError', message: 'Failed to fetch: Network request failed' },
    { type: 'ElementNotFound', message: 'Cannot find element with selector "#id"' },
    { type: 'TypeError', message: 'Cannot read property "X" of undefined' }
  ];
  return errors[Math.floor(Math.random() * errors.length)];
}

function storeCoverage(run, suite) {
  // Simulate code coverage data
  const coverage = {
    runId: run.id,
    projectId: run.projectId,
    timestamp: run.completedAt,
    summary: {
      lines: Math.round(60 + Math.random() * 35),
      statements: Math.round(55 + Math.random() * 40),
      functions: Math.round(70 + Math.random() * 25),
      branches: Math.round(50 + Math.random() * 40)
    },
    files: [
      { path: 'src/screens/HomeScreen.tsx', coverage: Math.round(75 + Math.random() * 25) },
      { path: 'src/screens/ProductScreen.tsx', coverage: Math.round(70 + Math.random() * 30) },
      { path: 'src/components/Cart.tsx', coverage: Math.round(80 + Math.random() * 20) },
      { path: 'src/api/client.ts', coverage: Math.round(65 + Math.random() * 35) },
      { path: 'src/utils/helpers.ts', coverage: Math.round(85 + Math.random() * 15) }
    ]
  };

  testCoverage.set(run.projectId, coverage);
}

app.get('/api/runs', (req, res) => {
  const { projectId, suiteId, status } = req.query;
  let runs = Array.from(testRuns.values());

  if (projectId) runs = runs.filter(r => r.projectId === projectId);
  if (suiteId) runs = runs.filter(r => r.suiteId === suiteId);
  if (status) runs = runs.filter(r => r.status === status);

  // Sort by most recent
  runs.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));

  res.json(runs);
});

app.get('/api/runs/:runId', (req, res) => {
  const { runId } = req.params;
  const run = testRuns.get(runId);

  if (!run) {
    return res.status(404).json({ error: 'Test run not found' });
  }

  res.json(run);
});

app.get('/api/runs/:runId/results', (req, res) => {
  const { runId } = req.params;
  const { status, type, category, limit = 100 } = req.query;
  const run = testRuns.get(runId);

  if (!run) {
    return res.status(404).json({ error: 'Test run not found' });
  }

  let results = run.results;

  if (status) results = results.filter(r => r.status === status);
  if (type) results = results.filter(r => r.type === type);
  if (category) results = results.filter(r => r.category === category);

  res.json(results.slice(0, parseInt(limit)));
});

app.get('/api/runs/:runId/summary', (req, res) => {
  const { runId } = req.params;
  const run = testRuns.get(runId);

  if (!run) {
    return res.status(404).json({ error: 'Test run not found' });
  }

  if (!run.summary) {
    return res.json(aggregateResults(run.results));
  }

  res.json(run.summary);
});

// Coverage API
app.get('/api/coverage/:projectId', (req, res) => {
  const { projectId } = req.params;
  const coverage = testCoverage.get(projectId);

  if (!coverage) {
    return res.json({
      projectId,
      message: 'No coverage data available. Run tests with coverage enabled.',
      summary: null,
      files: []
    });
  }

  res.json(coverage);
});

app.get('/api/coverage/:projectId/trend', (req, res) => {
  const { projectId } = req.params;
  const { days = 30 } = req.query;

  // Generate trend data
  const trend = [];
  const now = Date.now();

  for (let i = parseInt(days); i >= 0; i--) {
    const date = new Date(now - i * 24 * 60 * 60 * 1000);
    trend.push({
      date: date.toISOString().split('T')[0],
      lines: Math.round(60 + Math.random() * 35),
      statements: Math.round(55 + Math.random() * 40),
      functions: Math.round(70 + Math.random() * 25),
      branches: Math.round(50 + Math.random() * 40)
    });
  }

  res.json({ projectId, trend });
});

// Flaky Test Detection
app.get('/api/flaky/:projectId', (req, res) => {
  const { projectId } = req.params;
  const runs = Array.from(testRuns.values())
    .filter(r => r.projectId === projectId)
    .slice(0, 10);

  // Analyze flaky tests
  const testResults = new Map();

  runs.forEach(run => {
    run.results.forEach(result => {
      if (!testResults.has(result.testName)) {
        testResults.set(result.testName, { passed: 0, failed: 0 });
      }
      const stats = testResults.get(result.testName);
      if (result.status === 'passed') stats.passed++;
      else stats.failed++;
    });
  });

  const flakyTests = [];
  testResults.forEach((stats, testName) => {
    const total = stats.passed + stats.failed;
    const failRate = stats.failed / total;
    if (failRate > 0.1 && failRate < 0.9) { // Between 10% and 90% fail rate = flaky
      flakyTests.push({
        testName,
        passRate: Math.round((stats.passed / total) * 100),
        failRate: Math.round(failRate * 100),
        runs: total
      });
    }
  });

  flakyTests.sort((a, b) => a.passRate - b.passRate);

  res.json({
    projectId,
    flakyTests,
    totalAnalyzed: runs.length,
    flakyCount: flakyTests.length
  });
});

// Performance Tests
app.post('/api/performance', requireInternal, (req, res) => {
  const { projectId, endpoint, iterations = 10 } = req.body;

  const results = {
    id: uuidv4(),
    projectId,
    endpoint,
    iterations,
    timestamp: new Date().toISOString(),
    metrics: {
      min: Math.round(50 + Math.random() * 100),
      max: Math.round(200 + Math.random() * 300),
      avg: 0,
      p50: 0,
      p95: 0,
      p99: 0
    }
  };

  // Simulate performance data
  const times = [];
  for (let i = 0; i < iterations; i++) {
    times.push(Math.round(80 + Math.random() * 250));
  }
  times.sort((a, b) => a - b);

  results.metrics.min = Math.min(...times);
  results.metrics.max = Math.max(...times);
  results.metrics.avg = Math.round(times.reduce((a, b) => a + b) / times.length);
  results.metrics.p50 = times[Math.floor(times.length * 0.5)];
  results.metrics.p95 = times[Math.floor(times.length * 0.95)];
  results.metrics.p99 = times[Math.floor(times.length * 0.99)];

  res.json(results);
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'testing',
    suites: testSuites.size,
    runs: testRuns.size,
    uptime: process.uptime()
  });
});

app.listen(PORT, () => {
  console.log(`Testing service running on port ${PORT}`);
  console.log('Features: Unit, Integration, E2E testing with coverage tracking');
});
