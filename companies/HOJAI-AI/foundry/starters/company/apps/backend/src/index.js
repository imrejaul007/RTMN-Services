/**
 * company-starter — backend entry point.
 *
 * A full autonomous company: 6 department APIs + 7 SUTAR agents,
 * all on one Express server on port 4001. v0 runs in-memory so the
 * 30-min journey boots with zero infrastructure.
 *
 * Replace each service with the matching @hojai/department.* SDK call
 * to wire up real Department OSes. Replace the agent run functions
 * with real @hojai/sutar BaseAgent calls to bring LLMs online.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import hrRoutes from './routes/hr.js';
import salesRoutes from './routes/sales.js';
import crmRoutes from './routes/crm.js';
import marketingRoutes from './routes/marketing.js';
import financeRoutes from './routes/finance.js';
import operationsRoutes from './routes/operations.js';
import cxoRoutes from './routes/cxo.js';
import nexhaRoutes from './routes/nexha.js';
import { errorHandler } from './middleware/error.js';
import { listAgents, runAgent } from './agents/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 4001);

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

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(morgan('tiny'));

// ─── Health + project info ──────────────────────────────────────────

app.get('/health', (_q, r) => r.json({
  status: 'ok',
  service: 'company-starter-backend',
  port: PORT,
  agents: listAgents().length,
  endpoints: [
    '/health', '/api/hr', '/api/sales', '/api/crm', '/api/marketing',
    '/api/finance', '/api/operations', '/api/cxo', '/api/agents', '/api/nexha'
  ]
}));

app.get('/', async (_q, r) => {
  let manifest = {};
  try {
    manifest = JSON.parse(await fs.readFile(path.resolve(__dirname, '..', '..', '..', '..', '.hojai', 'manifest.json'), 'utf-8'));
  } catch { /* optional */ }
  r.json({
    service: 'company-starter-backend',
    project: manifest.name || 'company-starter',
    type: 'company',
    region: manifest.region || 'unknown',
    languages: manifest.languages || ['en'],
    agents: listAgents().map(a => ({ name: a.name, department: a.department })),
    endpoints: ['/health', '/api/hr', '/api/sales', '/api/crm', '/api/marketing', '/api/finance', '/api/operations', '/api/cxo', '/api/agents', '/api/nexha']
  });
});

// ─── Department routes ─────────────────────────────────────────────

app.use('/api/hr',         hrRoutes);
app.use('/api/sales',      salesRoutes);
app.use('/api/crm',        crmRoutes);
app.use('/api/marketing',  marketingRoutes);
app.use('/api/finance',    financeRoutes);
app.use('/api/operations', operationsRoutes);
app.use('/api/cxo',        cxoRoutes);
app.use('/api/nexha',      nexhaRoutes);

// ─── SUTAR agents ────────────────────────────────────────────────────

app.get('/api/agents', (_q, r) => r.json({ agents: listAgents() }));

app.post('/api/agents/:name', requireInternal, async (req, r) => {
  try {
    r.json(await runAgent(req.params.name, req.body || {}));
  } catch (e) {
    r.status(400).json({ error: { code: 'BAD_REQUEST', message: e.message } });
  }
});

// ─── Errors ──────────────────────────────────────────────────────────

app.use(errorHandler);

app.listen(PORT, () => console.log(`[company-starter] backend listening on http://localhost:${PORT}`));
