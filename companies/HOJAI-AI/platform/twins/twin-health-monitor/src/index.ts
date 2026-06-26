/**
 * Twin Health Monitor - Port: 4773
 * System health monitoring
 */

import express from 'express';
const app = express();
const PORT = parseInt(process.env.PORT || '4773', 10);
app.use(express.json());

const SERVICES = {
  'communication-twin': 'http://localhost:4743',
  'workflow-twin': 'http://localhost:4741',
  'decision-twin': 'http://localhost:4742',
  'relationship-twin': 'http://localhost:4744',
  'behavioral-twin': 'http://localhost:4746',
  'knowledge-twin': 'http://localhost:4739',
  'reputation-twin': 'http://localhost:4745',
  'twin-observer': 'http://localhost:4747',
  'skill-wallet': 'http://localhost:4750',
  'browser-agent': 'http://localhost:4751',
  'autonomy-controller': 'http://localhost:4760',
  'execution-engine': 'http://localhost:4761'
};

app.get('/health', (_r, res) => res.json({ status: 'healthy', service: 'twin-health-monitor' }));
app.get('/ready', (_r, res) => res.json({ ready: true }));

app.get('/api/health/services', async (_req, res) => {
  const results = {};
  for (const [name, url] of Object.entries(SERVICES)) {
    try {
      const response = await fetch(`${url}/health`);
      results[name] = { status: response.ok ? 'healthy' : 'unhealthy', url };
    } catch {
      results[name] = { status: 'unreachable', url };
    }
  }
  const healthy = Object.values(results).filter(r => r.status === 'healthy').length;
  res.json({ success: true, data: { services: results, healthy, total: Object.keys(results).length } });
});

const server = app.listen(PORT, () => console.log(`Twin Health Monitor - Port ${PORT}`));
process.on('SIGTERM', () => server.close());
export default app;
