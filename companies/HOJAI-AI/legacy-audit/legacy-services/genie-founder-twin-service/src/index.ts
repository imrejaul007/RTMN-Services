/**
 * GENIE Founder Twin Service
 * Port: 4732 (moved from 4709 to avoid collision with genie-calendar-service)
 * Purpose: Digital twin for founders - companies, investments, decisions
 *
 * Tagline: "Your Founder Journey, Tracked"
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';

const PORT = parseInt(process.env.PORT || '4732', 10);
const SERVICE_NAME = 'genie-founder-twin-service';

const app = express();

app.use(helmet());
app.use(cors({ origin: '*', credentials: true }));
app.use(rateLimit({ windowMs: 60000, max: 100, message: { success: false, error: { code: 'RATE_LIMIT' } } }));
app.use(express.json({ limit: '10mb' }));
app.use(compression());

const founderTwins = new Map<string, any>();

interface FounderTwin {
  id: string;
  userId: string;
  companies: { id: string; name: string; role: string; equity?: number; stage?: string }[];
  investments: { id: string; name: string; amount: number; type: 'angel' | 'vc' | 'real_estate' | 'crypto' | 'other'; date: string }[];
  decisions: { id: string; title: string; outcome: 'positive' | 'negative' | 'neutral'; date: string; learnings: string }[];
  metrics: { totalCompanies: number; totalInvested: number; totalDecisions: number; netWorth: number };
  createdAt: string;
  updatedAt: string;
}

function createDefaultFounderTwin(userId: string): FounderTwin {
  return {
    id: uuidv4(),
    userId,
    companies: [],
    investments: [],
    decisions: [],
    metrics: { totalCompanies: 0, totalInvested: 0, totalDecisions: 0, netWorth: 0 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function updateMetrics(t: FounderTwin) {
  t.metrics.totalCompanies = t.companies.length;
  t.metrics.totalInvested = t.investments.reduce((s, i) => s + i.amount, 0);
  t.metrics.totalDecisions = t.decisions.length;
}

app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = `req_${Date.now()}`;
  res.setHeader('X-Request-Id', requestId);
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), service: SERVICE_NAME, message: 'request', requestId, method: req.method, path: req.path }));
  next();
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'healthy', service: SERVICE_NAME, version: '1.0.0', port: PORT, twins: founderTwins.size, timestamp: new Date().toISOString() });
});
app.get('/health/live', (_req: Request, res: Response) => res.json({ status: 'ok' }));
app.get('/health/ready', (_req: Request, res: Response) => res.json({ status: 'ready' }));

app.get('/api/founder/:userId', (req: Request, res: Response) => {
  const { userId } = req.params;
  let twin = founderTwins.get(userId);
  if (!twin) {
    twin = createDefaultFounderTwin(userId);
    founderTwins.set(userId, twin);
  }
  res.json({ success: true, data: twin });
});

app.post('/api/founder/:userId/company', (req: Request, res: Response) => {
  const { userId } = req.params;
  const { name, role, equity, stage } = req.body;
  if (!name || !role) return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT' } });
  let twin = founderTwins.get(userId) || createDefaultFounderTwin(userId);
  twin.companies.push({ id: uuidv4(), name, role, equity, stage });
  updateMetrics(twin);
  twin.updatedAt = new Date().toISOString();
  founderTwins.set(userId, twin);
  res.json({ success: true, data: twin });
});

app.post('/api/founder/:userId/investment', (req: Request, res: Response) => {
  const { userId } = req.params;
  const { name, amount, type } = req.body;
  if (!name || typeof amount !== 'number' || !type) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT' } });
  }
  let twin = founderTwins.get(userId) || createDefaultFounderTwin(userId);
  twin.investments.push({ id: uuidv4(), name, amount, type, date: new Date().toISOString() });
  updateMetrics(twin);
  twin.updatedAt = new Date().toISOString();
  founderTwins.set(userId, twin);
  res.json({ success: true, data: twin });
});

app.post('/api/founder/:userId/decision', (req: Request, res: Response) => {
  const { userId } = req.params;
  const { title, outcome, learnings } = req.body;
  if (!title || !outcome) return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT' } });
  let twin = founderTwins.get(userId) || createDefaultFounderTwin(userId);
  twin.decisions.push({ id: uuidv4(), title, outcome, date: new Date().toISOString(), learnings: learnings || '' });
  updateMetrics(twin);
  twin.updatedAt = new Date().toISOString();
  founderTwins.set(userId, twin);
  res.json({ success: true, data: twin });
});

app.get('/api/founder/:userId/summary', (req: Request, res: Response) => {
  const { userId } = req.params;
  const twin = founderTwins.get(userId) || createDefaultFounderTwin(userId);
  res.json({ success: true, data: { companies: twin.companies, investments: twin.investments, total_companies: twin.metrics.totalCompanies, total_investments: twin.metrics.totalInvested, totalDecisions: twin.metrics.totalDecisions } });
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
});

app.use((err: Error, _req: Request, res: Response) => {
  console.error(JSON.stringify({ service: SERVICE_NAME, error: err.message }));
  res.status(500).json({ success: false, error: { code: 'ERROR', message: err.message } });
});

app.listen(PORT, () => {
  console.log(`\n╔════════════════════════════════════════════════════════════╗`);
  console.log(`║  GENIE FOUNDER TWIN v1.0.0                                ║`);
  console.log(`║  Port: ${PORT}                                               ║`);
  console.log(`║  Status: RUNNING                                            ║`);
  console.log(`╚════════════════════════════════════════════════════════════╝\n`);
});

export default app;
