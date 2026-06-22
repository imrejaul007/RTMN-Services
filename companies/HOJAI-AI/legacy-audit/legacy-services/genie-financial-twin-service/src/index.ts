/**
 * GENIE Financial Twin Service
 * Port: 4731
 * Purpose: Digital twin for personal finances - tracks income, expenses, savings, investments
 *
 * Tagline: "Your Money, Mirrored"
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';

const PORT = parseInt(process.env.PORT || '4731', 10);
const SERVICE_NAME = 'genie-financial-twin-service';

const app = express();

// Security
app.use(helmet());
app.use(cors({ origin: '*', credentials: true }));
app.use(rateLimit({ windowMs: 60000, max: 100, message: { success: false, error: { code: 'RATE_LIMIT' } } }));
app.use(express.json({ limit: '10mb' }));
app.use(compression());

// In-memory store (replace with DB in production)
const financialTwins = new Map<string, any>();

interface FinancialTwin {
  id: string;
  userId: string;
  income: { monthly: number; sources: { name: string; amount: number }[] };
  expenses: { monthly: number; categories: { name: string; amount: number }[] };
  savings: { total: number; goals: { name: string; target: number; current: number }[] };
  investments: { total: number; portfolio: { symbol: string; shares: number; value: number }[] };
  budget: { month: string; limit: number; spent: number };
  health: { score: number; trend: 'up' | 'down' | 'stable'; lastUpdated: string };
  createdAt: string;
  updatedAt: string;
}

function createDefaultFinancialTwin(userId: string): FinancialTwin {
  return {
    id: uuidv4(),
    userId,
    income: { monthly: 0, sources: [] },
    expenses: { monthly: 0, categories: [] },
    savings: { total: 0, goals: [] },
    investments: { total: 0, portfolio: [] },
    budget: { month: new Date().toISOString().slice(0, 7), limit: 0, spent: 0 },
    health: { score: 50, trend: 'stable', lastUpdated: new Date().toISOString() },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = `req_${Date.now()}`;
  res.setHeader('X-Request-Id', requestId);
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), service: SERVICE_NAME, message: 'request', requestId, method: req.method, path: req.path }));
  next();
});

// Health
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'healthy', service: SERVICE_NAME, version: '1.0.0', port: PORT, twins: financialTwins.size, timestamp: new Date().toISOString() });
});
app.get('/health/live', (_req: Request, res: Response) => res.json({ status: 'ok' }));
app.get('/health/ready', (_req: Request, res: Response) => res.json({ status: 'ready' }));

// Get or create financial twin
app.get('/api/financial/:userId', (req: Request, res: Response) => {
  const { userId } = req.params;
  let twin = financialTwins.get(userId);
  if (!twin) {
    twin = createDefaultFinancialTwin(userId);
    financialTwins.set(userId, twin);
  }
  res.json({ success: true, data: twin });
});

// Add income source
app.post('/api/financial/:userId/income', (req: Request, res: Response) => {
  const { userId } = req.params;
  const { name, amount } = req.body;
  if (!name || typeof amount !== 'number') {
    return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT' } });
  }
  let twin = financialTwins.get(userId) || createDefaultFinancialTwin(userId);
  twin.income.sources.push({ name, amount });
  twin.income.monthly = twin.income.sources.reduce((s: number, x: any) => s + x.amount, 0);
  twin.updatedAt = new Date().toISOString();
  financialTwins.set(userId, twin);
  res.json({ success: true, data: twin });
});

// Add expense
app.post('/api/financial/:userId/expense', (req: Request, res: Response) => {
  const { userId } = req.params;
  const { category, amount } = req.body;
  if (!category || typeof amount !== 'number') {
    return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT' } });
  }
  let twin = financialTwins.get(userId) || createDefaultFinancialTwin(userId);
  const existing = twin.expenses.categories.find((c: any) => c.name === category);
  if (existing) existing.amount += amount;
  else twin.expenses.categories.push({ name: category, amount });
  twin.expenses.monthly = twin.expenses.categories.reduce((s: number, x: any) => s + x.amount, 0);
  twin.budget.spent = twin.expenses.monthly;
  twin.updatedAt = new Date().toISOString();
  financialTwins.set(userId, twin);
  res.json({ success: true, data: twin });
});

// Add savings goal
app.post('/api/financial/:userId/savings-goal', (req: Request, res: Response) => {
  const { userId } = req.params;
  const { name, target, current = 0 } = req.body;
  if (!name || typeof target !== 'number') {
    return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT' } });
  }
  let twin = financialTwins.get(userId) || createDefaultFinancialTwin(userId);
  twin.savings.goals.push({ name, target, current });
  twin.savings.total = twin.savings.goals.reduce((s: number, g: any) => s + g.current, 0);
  twin.updatedAt = new Date().toISOString();
  financialTwins.set(userId, twin);
  res.json({ success: true, data: twin });
});

// Update budget
app.put('/api/financial/:userId/budget', (req: Request, res: Response) => {
  const { userId } = req.params;
  const { limit } = req.body;
  if (typeof limit !== 'number') {
    return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT' } });
  }
  let twin = financialTwins.get(userId) || createDefaultFinancialTwin(userId);
  twin.budget = { month: new Date().toISOString().slice(0, 7), limit, spent: twin.expenses.monthly };
  twin.updatedAt = new Date().toISOString();
  financialTwins.set(userId, twin);
  res.json({ success: true, data: twin });
});

// Add investment
app.post('/api/financial/:userId/investment', (req: Request, res: Response) => {
  const { userId } = req.params;
  const { symbol, shares, value } = req.body;
  if (!symbol || typeof shares !== 'number' || typeof value !== 'number') {
    return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT' } });
  }
  let twin = financialTwins.get(userId) || createDefaultFinancialTwin(userId);
  twin.investments.portfolio.push({ symbol, shares, value });
  twin.investments.total = twin.investments.portfolio.reduce((s: number, x: any) => s + x.value, 0);
  twin.updatedAt = new Date().toISOString();
  financialTwins.set(userId, twin);
  res.json({ success: true, data: twin });
});

// Get financial summary
app.get('/api/financial/:userId/summary', (req: Request, res: Response) => {
  const { userId } = req.params;
  const twin = financialTwins.get(userId) || createDefaultFinancialTwin(userId);
  res.json({ success: true, data: { income: twin.income.monthly, expenses: twin.expenses.monthly, savings: twin.savings.total, investments: twin.investments.total, health: twin.health, budget: twin.budget } });
});

// 404
app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
});

// Error
app.use((err: Error, _req: Request, res: Response) => {
  console.error(JSON.stringify({ service: SERVICE_NAME, error: err.message }));
  res.status(500).json({ success: false, error: { code: 'ERROR', message: err.message } });
});

// Start
app.listen(PORT, () => {
  console.log(`\n╔════════════════════════════════════════════════════════════╗`);
  console.log(`║  GENIE FINANCIAL TWIN v1.0.0                              ║`);
  console.log(`║  Port: ${PORT}                                               ║`);
  console.log(`║  Status: RUNNING                                            ║`);
  console.log(`╚════════════════════════════════════════════════════════════╝\n`);
});

export default app;
