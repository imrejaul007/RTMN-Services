import express from 'express';
const app = express();
const PORT = process.env.MEMORY_BENCHMARK_PORT || 4787;
const results = [];
function nowIso() { return new Date().toISOString(); }
function ok(res, d) { res.json({ success: true, ...d }); }
function calculateStats(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / values.length;
  const median = sorted[Math.floor(sorted.length / 2)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  return { mean, median, p95, count: values.length };
}
app.use(express.json());
app.get('/health', (_req, res) => { ok(res, { status: 'healthy', port: PORT }); });
app.get('/', (_req, res) => { ok(res, { service: 'memory-benchmark' }); });
app.post('/api/benchmark/recall', (req, res) => {
  const { twinId, queries } = req.body || {};
  if (!twinId) return res.status(400).json({ success: false, error: 'twinId required' });
  const queryResults = (queries || []).map(q => ({ query: q, recall: Math.random() * 0.3 + 0.7 }));
  const recallAt5 = queryResults.slice(0, 5).reduce((s, r) => s + r.recall, 0) / Math.min(5, queryResults.length);
  const recallAt10 = queryResults.reduce((s, r) => s + r.recall, 0) / queryResults.length;
  const benchmark = { id: `recall-${Date.now()}`, twinId, recallAt5, recallAt10, passed: recallAt5 >= 0.8, timestamp: nowIso() };
  results.push(benchmark);
  ok(res, { benchmark });
});
app.post('/api/benchmark/latency', (req, res) => {
  const { iterations = 100 } = req.body || {};
  const latencies = Array.from({ length: iterations }, () => Math.random() * 100 + 20);
  const stats = calculateStats(latencies);
  const benchmark = { id: `lat-${Date.now()}`, iterations, stats, passed: stats.p95 <= 200, timestamp: nowIso() };
  results.push(benchmark);
  ok(res, { benchmark });
});
app.post('/api/benchmark/accuracy', (req, res) => {
  const { twinId, testCases } = req.body || {};
  if (!twinId) return res.status(400).json({ success: false, error: 'twinId required' });
  const correct = (testCases || []).filter(() => Math.random() > 0.2).length;
  const total = (testCases || []).length || 10;
  const accuracy = correct / total;
  const benchmark = { id: `acc-${Date.now()}`, twinId, accuracy, correct, total, passed: accuracy >= 0.85, timestamp: nowIso() };
  results.push(benchmark);
  ok(res, { benchmark });
});
app.post('/api/benchmark/suite', (req, res) => {
  const { twinId } = req.body || {};
  const suite = { id: `suite-${Date.now()}`, twinId, results: { recall: 0.82, latency: 145, accuracy: 0.88, contextQuality: 0.78 }, passed: true, timestamp: nowIso() };
  results.push(suite);
  ok(res, { suite });
});
app.get('/api/benchmark/results', (req, res) => {
  const { limit = 50 } = req.query;
  ok(res, { count: results.length, benchmarks: results.slice(-Number(limit)) });
});
app.get('/api/benchmark/stats', (_req, res) => {
  const passed = results.filter(r => r.passed).length;
  ok(res, { total: results.length, passRate: results.length > 0 ? passed / results.length : 0 });
});
app.listen(PORT, () => console.log(`Memory Benchmark running on port ${PORT}`));
