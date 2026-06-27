import helmet from 'helmet';
import express from 'express';
import { requireEnv } from '@rtmn/shared/lib/env';
import { requireAuth } from '@rtmn/shared/auth';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import { PersistentMap } from '@rtmn/shared/lib/persistent-map';
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


// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
const PORT = 4893;

app.use(express.json());
app.use(helmet());
app.use(requireAuth);

const industries = new Map([
  ['restaurant', { id: 'restaurant', name: 'Restaurant', vertCount: 1, segments: ['fast food', 'casual', 'fine dining'], aiAgents: 15 }],
  ['hotel', { id: 'hotel', name: 'Hotel', vertCount: 1, segments: ['budget', 'mid-scale', 'luxury'], aiAgents: 12 }],
  ['healthcare', { id: 'healthcare', name: 'Healthcare', vertCount: 1, segments: ['hospital', 'clinic', 'pharmacy'], aiAgents: 18 }],
  ['retail', { id: 'retail', name: 'Retail', vertCount: 1, segments: ['ecommerce', 'brick-mortar', 'omni-channel'], aiAgents: 20 }]
]);

app.get('/api/industries', (req, res) => res.json({ industries: Array.from(industries.values()) }));
app.get('/api/industries/:id', (req, res) => {
  const ind = industries.get(req.params.id);
  if (!ind) return res.status(404).json({ error: 'Not found' });
  res.json(ind);
});
app.get('/health', (req, res) => res.json({ status: 'healthy', service: 'industry-twin', port: PORT }));

app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});

export default app;

// Skip auto-listen in test mode
if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, () => console.log('Industry Twin running on ' + PORT));
  installGracefulShutdown(server);
}
