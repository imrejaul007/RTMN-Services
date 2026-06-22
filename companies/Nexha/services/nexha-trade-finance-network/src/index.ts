/**
 * nexha-trade-finance-network — Express server (port 4287).
 *
 * Phase C.4 — Trade Finance & BNPL
 *
 * REST surface:
 *   GET  /health
 *   GET  /ready
 *   GET  /api/v1/info
 *   GET  /api/v1/stats
 *
 *   ── Entities ──
 *   POST /api/v1/entities                  { entityId, trustScore, ... }
 *   GET  /api/v1/entities/:id
 *
 *   ── Credit Offers (BNPL) ──
 *   POST /api/v1/credit-offers             { entityId, amount, currency, termMonths, purpose }
 *   GET  /api/v1/credit-offers?entityId=
 *   GET  /api/v1/credit-offers/:id
 *
 *   ── Loans ──
 *   POST /api/v1/loans                     { offerId }
 *   POST /api/v1/loans/:id/disburse
 *   GET  /api/v1/loans?entityId=&status=
 *   GET  /api/v1/loans/:id
 *
 *   ── Repayments ──
 *   POST /api/v1/loans/:id/repay           { amount, method, installmentNumber? }
 *   GET  /api/v1/loans/:id/repayments
 *
 *   ── Disputes ──
 *   POST /api/v1/disputes                  { loanId, amount, reason }
 *   POST /api/v1/disputes/:id/resolve      { resolution, note }
 *   GET  /api/v1/disputes?status=
 *
 *   ── FX ──
 *   POST /api/v1/fx/quote                  { fromCurrency, toCurrency, amount }
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { z } from 'zod';
import {
  CreditOfferRequestSchema,
  EntitySchema,
  FxQuoteRequestSchema,
} from './types/index.js';
import * as svc from './services/trade-finance.service.js';
import { emit as emitEvent, shutdown as shutdownEvents } from './services/events.js';

const PORT = parseInt(process.env.PORT || '4287', 10);
const REQUIRE_AUTH = process.env.TRADE_FINANCE_REQUIRE_AUTH !== 'false';

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '256kb' }));

// Optional auth — set TRADE_FINANCE_REQUIRE_AUTH=false for dev
if (REQUIRE_AUTH) {
  // Soft auth: read but don't enforce (real enforce happens upstream in Hub)
  // Kept as a no-op gate so the pattern is consistent with other sutar services.
}

// ─────────────────────────────────────────────────────────────────────────────
// Health
// ─────────────────────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', service: 'nexha-trade-finance-network', port: PORT });
});
app.get('/ready', (_req, res) => {
  res.json({ ready: true, stats: svc.tradeFinanceStats() });
});
app.get('/api/v1/info', (_req, res) => {
  res.json({
    service: 'nexha-trade-finance-network',
    version: '1.0.0',
    description: 'Trade Finance & BNPL — Phase C.4 (credit lines, BNPL offers, FX, disputes)',
    endpoints: [
      'POST /api/v1/entities',
      'GET  /api/v1/entities/:id',
      'POST /api/v1/credit-offers',
      'GET  /api/v1/credit-offers?entityId=',
      'GET  /api/v1/credit-offers/:id',
      'POST /api/v1/loans',
      'POST /api/v1/loans/:id/disburse',
      'GET  /api/v1/loans?entityId=&status=',
      'GET  /api/v1/loans/:id',
      'POST /api/v1/loans/:id/repay',
      'GET  /api/v1/loans/:id/repayments',
      'POST /api/v1/disputes',
      'POST /api/v1/disputes/:id/resolve',
      'GET  /api/v1/disputes?status=',
      'POST /api/v1/fx/quote',
    ],
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Stats
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/v1/stats', (_req, res) => {
  res.json({ success: true, data: svc.tradeFinanceStats() });
});

// ─────────────────────────────────────────────────────────────────────────────
// Entities
// ─────────────────────────────────────────────────────────────────────────────

app.post('/api/v1/entities', (req, res) => {
  const parsed = EntitySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const e = svc.registerEntity(parsed.data);
  res.status(201).json({ success: true, entity: e });
});

app.get('/api/v1/entities/:id', (req, res) => {
  const e = svc.getEntity(req.params.id);
  if (!e) return res.status(404).json({ error: 'not_found' });
  res.json({ success: true, entity: e });
});

// ─────────────────────────────────────────────────────────────────────────────
// Credit offers
// ─────────────────────────────────────────────────────────────────────────────

app.post('/api/v1/credit-offers', (req, res) => {
  const parsed = CreditOfferRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const offer = svc.requestCreditOffer(parsed.data);
  res.status(201).json({ success: true, offer });
});

app.get('/api/v1/credit-offers', (req, res) => {
  const entityId = req.query.entityId as string | undefined;
  const list = svc.listOffers(entityId);
  res.json({ success: true, count: list.length, offers: list });
});

app.get('/api/v1/credit-offers/:id', (req, res) => {
  const o = svc.getOffer(req.params.id);
  if (!o) return res.status(404).json({ error: 'not_found' });
  res.json({ success: true, offer: o });
});

// ─────────────────────────────────────────────────────────────────────────────
// Loans
// ─────────────────────────────────────────────────────────────────────────────

app.post('/api/v1/loans', (req, res) => {
  const { offerId } = req.body || {};
  if (!offerId) return res.status(400).json({ error: 'offerId required' });
  const result = svc.originateLoan(offerId);
  if ('error' in result) return res.status(409).json(result);
  emitEvent(req, 'finance.loan.originated', {
    loanId: (result as { id?: string }).id,
    offerId,
    principal: (result as { principal?: number }).principal,
  });
  res.status(201).json({ success: true, loan: result });
});

app.post('/api/v1/loans/:id/disburse', (req, res) => {
  const result = svc.disburseLoan(req.params.id);
  if ('error' in result) return res.status(409).json(result);
  emitEvent(req, 'finance.loan.disbursed', {
    loanId: req.params.id,
    disbursedAmount: (result as { disbursedAmount?: number }).disbursedAmount,
  });
  res.json({ success: true, loan: result });
});

app.get('/api/v1/loans', (req, res) => {
  const entityId = req.query.entityId as string | undefined;
  const status = req.query.status as any;
  const list = svc.listLoans(entityId, status);
  res.json({ success: true, count: list.length, loans: list });
});

app.get('/api/v1/loans/:id', (req, res) => {
  const l = svc.getLoan(req.params.id);
  if (!l) return res.status(404).json({ error: 'not_found' });
  res.json({ success: true, loan: l });
});

// ─────────────────────────────────────────────────────────────────────────────
// Repayments
// ─────────────────────────────────────────────────────────────────────────────

const RepaySchema = z.object({
  amount: z.number().positive(),
  method: z.enum(['auto-debit', 'manual', 'wallet', 'bank-transfer']),
  installmentNumber: z.number().int().nonnegative().default(0),
});

app.post('/api/v1/loans/:id/repay', (req, res) => {
  const parsed = RepaySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const result = svc.recordRepayment(
    req.params.id,
    parsed.data.amount,
    parsed.data.method,
    parsed.data.installmentNumber,
  );
  if ('error' in result) return res.status(409).json(result);
  res.status(201).json({ success: true, repayment: result });
});

app.get('/api/v1/loans/:id/repayments', (req, res) => {
  const list = svc.listRepayments(req.params.id);
  res.json({ success: true, count: list.length, repayments: list });
});

// ─────────────────────────────────────────────────────────────────────────────
// Disputes
// ─────────────────────────────────────────────────────────────────────────────

const OpenDisputeSchema = z.object({
  loanId: z.string(),
  amount: z.number().positive(),
  reason: z.string().min(1),
});

app.post('/api/v1/disputes', (req, res) => {
  const parsed = OpenDisputeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const result = svc.openDispute(parsed.data.loanId, parsed.data.amount, parsed.data.reason);
  if ('error' in result) return res.status(409).json(result);
  emitEvent(req, 'finance.dispute.opened', {
    disputeId: (result as { id?: string }).id,
    loanId: parsed.data.loanId,
    amount: parsed.data.amount,
  });
  res.status(201).json({ success: true, dispute: result });
});

const ResolveDisputeSchema = z.object({
  resolution: z.enum(['resolved_buyer', 'resolved_seller', 'split', 'cancelled']),
  note: z.string().min(1),
});

app.post('/api/v1/disputes/:id/resolve', (req, res) => {
  const parsed = ResolveDisputeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const result = svc.resolveDispute(req.params.id, parsed.data.resolution, parsed.data.note);
  if ('error' in result) return res.status(409).json(result);
  res.json({ success: true, dispute: result });
});

app.get('/api/v1/disputes', (req, res) => {
  const status = req.query.status as any;
  const list = svc.listDisputes(status);
  res.json({ success: true, count: list.length, disputes: list });
});

// ─────────────────────────────────────────────────────────────────────────────
// FX
// ─────────────────────────────────────────────────────────────────────────────

app.post('/api/v1/fx/quote', (req, res) => {
  const parsed = FxQuoteRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const result = svc.requestFxQuote(parsed.data);
  if ('error' in result) return res.status(409).json(result);
  res.json({ success: true, quote: result });
});

// 404
app.use((_req, res) => res.status(404).json({ error: 'not_found' }));

app.listen(PORT, () => {
  console.log(`nexha-trade-finance-network running on port ${PORT}`);
  console.log(`  GET  http://localhost:${PORT}/api/v1/info`);
  console.log(`  POST http://localhost:${PORT}/api/v1/credit-offers`);
});

process.on('SIGTERM', () => { shutdownEvents().catch(() => undefined); });
process.on('SIGINT', () => { shutdownEvents().catch(() => undefined); });

export default app;
