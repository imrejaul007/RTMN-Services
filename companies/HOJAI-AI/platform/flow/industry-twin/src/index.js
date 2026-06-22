import helmet from 'helmet';
import { requireAuth } from '@rtmn/shared/auth';
const express = require('express');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const { v4: uuidv4 } = require('uuid');
const app = express();

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
const PORT = 4893;
app.use(express.json());


app.use(helmet());

app.use(requireAuth);const industries = new Map([
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
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});


const server = app.listen(PORT, () => console.log('Industry Twin running on ' + PORT));
installGracefulShutdown(server);
