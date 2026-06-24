/**
 * rez-coin — port 4050
 *
 * REZ Coin (REZ) — utility token + loyalty points hybrid.
 * 1 REZ = 1 INR of merchant-funded value. Elastic supply.
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { z } from 'zod';
import rezCoinService from './services/rezCoinService.js';
import type { RezTxKind, WalletStatus, HealthResponse } from './types/index.js';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4050;
const START_TIME = Date.now();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const apiResponse = <T>(success: boolean, data?: T, error?: string) => ({
  success, data, error, timestamp: new Date().toISOString()
});

const asyncRoute = (h: (req: Request, res: Response) => Promise<unknown>) => async (req: any, res: any) => {
  try { await h(req, res); } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[rez-coin] error:', msg);
    if (!res.headersSent) res.status(500).json(apiResponse(false, undefined, msg));
  }
};

const seedStats = rezCoinService.seedDemo();
console.log(`[rez-coin] seeded ${seedStats.wallets} wallets, ${seedStats.txs} txs, ${seedStats.supply} REZ supply`);

const TxKindEnum = z.enum(['mint', 'burn', 'transfer', 'reward', 'cashback', 'stake', 'unstake', 'fee', 'expire']);
const OwnerTypeEnum = z.enum(['nexha', 'customer', 'merchant', 'agent', 'system']);
const StatusEnum = z.enum(['active', 'frozen', 'pending-kyc', 'closed']);

const CreateWalletSchema = z.object({
  ownerId: z.string().min(1),
  ownerType: OwnerTypeEnum,
  displayName: z.string().min(1),
  status: StatusEnum.optional().default('active')
});

const MintSchema = z.object({
  toWalletId: z.string().min(1),
  amount: z.number().positive(),
  memo: z.string().optional(),
  reference: z.string().optional()
});

const BurnSchema = z.object({
  fromWalletId: z.string().min(1),
  amount: z.number().positive(),
  memo: z.string().optional(),
  reference: z.string().optional()
});

const TransferSchema = z.object({
  fromWalletId: z.string().min(1),
  toWalletId: z.string().min(1),
  amount: z.number().positive(),
  memo: z.string().optional()
});

const handleZodError = (err: z.ZodError): string =>
  err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');

// ─── Health ────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  const stats = rezCoinService.getSupplyStats();
  const response: HealthResponse = {
    status: 'healthy', service: 'rez-coin', version: '1.0.0', port: PORT,
    uptime: Math.floor((Date.now() - START_TIME) / 1000),
    totalSupply: stats.totalSupply, totalWallets: stats.totalWallets,
    timestamp: new Date().toISOString()
  };
  res.json(response);
});

app.get('/ready', (_req, res) => res.json({ ready: true, timestamp: new Date().toISOString() }));

app.get('/api/v1/info', (_req, res) => {
  res.json(apiResponse(true, {
    name: 'rez-coin', version: '1.0.0', port: PORT,
    description: 'REZ Coin (REZ) — utility token + loyalty points hybrid',
    type: 'Utility token + loyalty points hybrid',
    backing: '1 REZ = 1 INR of merchant-funded value',
    supply: 'Elastic (minted on commission, burned on spend)',
    annualDecayRate: '2% for inactive wallets',
    endpoints: { health: '/health', createWallet: 'POST /api/v1/wallets', mint: 'POST /api/v1/mint', burn: 'POST /api/v1/burn', transfer: 'POST /api/v1/transfer', supply: 'GET /api/v1/supply', history: 'GET /api/v1/history', wallets: 'GET /api/v1/wallets' }
  }));
});

// ─── Wallets ──────────────────────────────────────────────
app.post('/api/v1/wallets', asyncRoute(async (req: any, res: any) => {
  const v = CreateWalletSchema.safeParse(req.body);
  if (!v.success) { res.status(400).json(apiResponse(false, undefined, `Validation error: ${handleZodError(v.error)}`)); return; }
  const w = rezCoinService.createWallet(v.data as any);
  res.status(201).json(apiResponse(true, w));
}));

app.get('/api/v1/wallets/:id', asyncRoute(async (req: any, res: any) => {
  const w = rezCoinService.getWallet(req.params.id);
  if (!w) { res.status(404).json(apiResponse(false, undefined, 'Wallet not found')); return; }
  res.json(apiResponse(true, w));
}));

app.get('/api/v1/wallets', asyncRoute(async (req: any, res: any) => {
  const ownerType = req.query.ownerType as any;
  const status = req.query.status as any;
  const minBalance = req.query.minBalance ? Number(req.query.minBalance) : undefined;
  const wallets = rezCoinService.listWallets({ ownerType, status, minBalance });
  res.json(apiResponse(true, { wallets, total: wallets.length }));
}));

// ─── Mint / Burn / Transfer ────────────────────────────────
app.post('/api/v1/mint', asyncRoute(async (req: any, res: any) => {
  const v = MintSchema.safeParse(req.body);
  if (!v.success) { res.status(400).json(apiResponse(false, undefined, `Validation error: ${handleZodError(v.error)}`)); return; }
  const tx = rezCoinService.mint(v.data.toWalletId, v.data.amount, v.data.memo, v.data.reference);
  res.status(201).json(apiResponse(true, tx));
}));

app.post('/api/v1/burn', asyncRoute(async (req: any, res: any) => {
  const v = BurnSchema.safeParse(req.body);
  if (!v.success) { res.status(400).json(apiResponse(false, undefined, `Validation error: ${handleZodError(v.error)}`)); return; }
  const tx = rezCoinService.burn(v.data.fromWalletId, v.data.amount, v.data.memo, v.data.reference);
  res.status(201).json(apiResponse(true, tx));
}));

app.post('/api/v1/transfer', asyncRoute(async (req: any, res: any) => {
  const v = TransferSchema.safeParse(req.body);
  if (!v.success) { res.status(400).json(apiResponse(false, undefined, `Validation error: ${handleZodError(v.error)}`)); return; }
  const tx = rezCoinService.transfer(v.data.fromWalletId, v.data.toWalletId, v.data.amount, v.data.memo);
  res.status(201).json(apiResponse(true, tx));
}));

// ─── Read ─────────────────────────────────────────────────
app.get('/api/v1/supply', (_req, res) => res.json(apiResponse(true, rezCoinService.getSupplyStats())));

app.get('/api/v1/history', asyncRoute(async (req: any, res: any) => {
  const walletId = req.query.walletId as string | undefined;
  const kind = req.query.kind as RezTxKind | undefined;
  const limit = req.query.limit ? Math.min(Number(req.query.limit), 200) : 50;
  const txs = rezCoinService.getTransactions(walletId, kind, limit);
  res.json(apiResponse(true, { transactions: txs, total: txs.length }));
}));

const server = app.listen(PORT, () => {
  const stats = rezCoinService.getSupplyStats();
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║           REZ COIN — REZ (port 4050)                            ║
║           "Utility token + loyalty points hybrid"               ║
╠═══════════════════════════════════════════════════════════════╣
║  Wallets:        ${String(stats.totalWallets).padEnd(45)}║
║  Total supply:   ${String(stats.totalSupply).padEnd(41)} REZ${'(₹' + (stats.totalSupply).toLocaleString() + ')'.padEnd(0)}║
║  Transactions:   ${String(stats.totalTransactions).padEnd(45)}║
║  Burned:         ${String(stats.totalBurned).padEnd(42)} REZ${' (2% decay for inactive)'.padEnd(0)}║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

const shutdown = () => { console.log('[rez-coin] shutting down'); server.close(() => process.exit(0)); };
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export default app;