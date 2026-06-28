/**
 * Benchmark Database
 * Port: 5475
 * Industry benchmarks for comparison
 */
const express = require('express');
const { requireAuth } = require('@rtmn/shared/auth');
const app = express();
const PORT = process.env.BENCHMARK_PORT || 5475;

app.use(express.json());

const BENCHMARKS = {
  ecommerce: {
    conversion: { avg: 2.8, range: [2.1, 3.8], currency: 'INR' },
    cartAbandonment: { avg: 70, range: [65, 75] },
    checkoutAbandonment: { avg: 35, range: [30, 40] },
    emailOpenRate: { avg: 20, range: [15, 25] },
    roas: { avg: 4.0, range: [3.0, 5.0] }
  },
  restaurant: {
    avgOrderValue: { avg: 450, range: [350, 550] },
    repeatRate: { avg: 40, range: [35, 45] },
    deliveryTime: { avg: 40, range: [35, 45] }
  },
  hotel: {
    occupancyRate: { avg: 65, range: [55, 75] },
    revpar: { avg: 3500, range: [3000, 4000] },
    cancellationRate: { avg: 15, range: [10, 20] }
  },
  healthcare: {
    showRate: { avg: 80, range: [75, 85] },
    avgWaitTime: { avg: 25, range: [20, 30] }
  },
  realestate: {
    inquiryToVisit: { avg: 20, range: [15, 25] },
    visitToClose: { avg: 45, range: [30, 60] }
  }
};

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'benchmark-database', industries: Object.keys(BENCHMARKS), port: PORT });
});

// GET /api/benchmark/:industry - Get benchmarks for industry
app.get('/api/benchmark/:industry', (req, res) => {
  const benchmarks = BENCHMARKS[req.params.industry] || BENCHMARKS.ecommerce;
  res.json({ success: true, data: benchmarks });
});

// POST /api/benchmark/compare - Compare your metrics vs industry
app.post('/api/benchmark/compare',requireAuth,  (req, res) => {
  try {
    const { industry, metrics } = req.body;
    const benchmarks = BENCHMARKS[industry] || BENCHMARKS.ecommerce;
    const comparisons = [];

    for (const [metric, value] of Object.entries(metrics)) {
      const bench = benchmarks[metric];
      if (bench) {
        const gap = bench.avg - parseFloat(value);
        comparisons.push({
          metric,
          yourValue: value,
          industryAvg: bench.avg,
          gap: Math.round(gap),
          gapPercent: Math.round((gap / bench.avg) * 100),
          opportunity: gap > 0 ? `You are ${Math.round(gap)}% below industry average` : `You are ${Math.round(-gap)}% above industry average`
        });
      }
    }

    res.json({ success: true, data: { comparisons } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



app.listen(PORT, () => console.log(`Benchmark Database running on port ${PORT}`));
module.exports = app;
