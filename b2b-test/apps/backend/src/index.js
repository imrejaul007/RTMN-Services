/**
 * B2B — backend entry point.
 *
 * v0 runs in-memory (no DB) so the 30-min journey boots instantly.
 * Replace the in-memory stores with Mongo/Postgres when you're ready.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promises as fs } from 'node:fs';

import rfqRoutes from './routes/rfq.js';
import quoteRoutes from './routes/quote.js';
import orderRoutes from './routes/order.js';
import adminRoutes from './routes/admin.js';
import webhooksRoutes from './routes/webhooks.js';
import nexhaRoutes from './routes/nexha.js';
import { errorHandler } from './middleware/error.js';
import { listAgents, runAgent } from './agents/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 4001);
const app = express();

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(morgan('tiny'));

app.get('/health', (_q, r) => r.json({ status: 'ok', service: 'b2b-test-backend', port: PORT, agents: listAgents().length }));
app.get('/', async (_q, r) => {
  let manifest = {};
  try { manifest = JSON.parse(await fs.readFile(path.resolve(__dirname, '..', '..', '..', '..', '.hojai', 'manifest.json'), 'utf8')); } catch {}
  r.json({
    service: 'b2b-test-backend',
    project: 'B2b Test',
    template: 'b2b',
    region: manifest.region || 'unknown',
    languages: manifest.languages || ['en'],
    agents: listAgents().map(a => a.name),
    endpoints: ['/health', '/api/rfq', '/api/quote', '/api/order', '/api/admin', '/api/agents', '/api/nexha']
  });
});

app.use('/api/rfq', rfqRoutes);
app.use('/api/quote', quoteRoutes);
app.use('/api/order', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/webhooks', webhooksRoutes);
app.use('/api/nexha', nexhaRoutes);

app.get('/api/agents', (_q, r) => r.json({ agents: listAgents() }));
app.post('/api/agents/:name', express.json(), async (req, r) => {
  try { r.json(await runAgent(req.params.name, req.body || {})); }
  catch (e) { r.status(400).json({ error: e.message }); }
});

app.use(errorHandler);

app.listen(PORT, () => console.log(`[b2b-test-backend] listening on http://localhost:${PORT}`));
