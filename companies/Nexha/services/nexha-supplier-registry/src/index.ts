/**
 * Nexha Supplier Registry — v1.0
 * Port: 4281
 *
 * Tier-5 missing service — complete trade lifecycle:
 * onboarding → KYB verification → contract signing → trade (RFQ→PO→ship→pay)
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { z } from 'zod';
import onboardingService from './services/onboarding.service.js';
import verificationService from './services/verification.service.js';
import contractService from './services/contract.service.js';
import tradeService from './services/trade.service.js';

const app = express();
const PORT = parseInt(process.env.PORT || '4281');
const START_TIME = Date.now();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const apiResponse = <T>(success: boolean, data?: T, error?: string) =>
  ({ success, data, error, timestamp: new Date().toISOString() });

const asyncRoute = (h: (req: express.Request, res: express.Response) => Promise<unknown>) =>
  async (req: express.Request, res: express.Response) => {
    try { await h(req, res); }
    catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[supplier-registry]', msg);
      if (res.headersSent) return;
      if (e instanceof SyntaxError)      { res.status(400).json(apiResponse(false, undefined, `Invalid JSON: ${msg}`)); return; }
      if (msg.includes('not found') || msg.includes('Not found')) { res.status(404).json(apiResponse(false, undefined, msg)); return; }
      if (msg.includes('timeout') || msg.includes('Timeout'))    { res.status(504).json(apiResponse(false, undefined, msg)); return; }
      if (msg.includes('ECONNREFUSED') || msg.includes('fetch failed')) { res.status(502).json(apiResponse(false, undefined, `Upstream error: ${msg}`)); return; }
      res.status(500).json(apiResponse(false, undefined, msg));
    }
  };

// ── Seed demo data ─────────────────────────────────────────────────────────────
const seeded = onboardingService.seedDemoSuppliers();
console.log(`[supplier-registry] seeded ${seeded} demo suppliers`);

// ── Health ─────────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', service: 'nexha-supplier-registry', version: '1.0.0', port: PORT, uptime: Math.floor((Date.now() - START_TIME) / 1000) });
});
app.get('/ready', (_req, res) => { res.json({ ready: true }); });

// ── Registry ───────────────────────────────────────────────────────────────────
app.get('/api/v1/info', (_req, res) => {
  res.json(apiResponse(true, { name: 'nexha-supplier-registry', version: '1.0.0', description: 'Complete supplier trade lifecycle', phase: 'Tier-5' }));
});

// Supplier registration
const RegisterSchema = z.object({
  corpId: z.string().min(1), name: z.string().min(1), email: z.string().email(),
  phone: z.string().optional(), description: z.string().optional(), nexhaId: z.string().optional(),
});
app.post('/api/v1/suppliers', asyncRoute(async (req, res) => {
  const { corpId, name, email, phone, description, nexhaId } = RegisterSchema.parse(req.body);
  const existing = onboardingService.getByCorpId(corpId);
  if (existing) { res.status(409).json(apiResponse(false, undefined, 'Supplier already registered')); return; }
  const s = onboardingService.registerSupplier({ corpId, name, email, phone, description, nexhaId });
  res.status(201).json(apiResponse(true, s));
}));

app.get('/api/v1/suppliers', asyncRoute(async (req, res) => {
  const { status, tier, verified, search, limit, offset } = req.query;
  const result = onboardingService.listSuppliers({
    status: status as any, tier: tier as any, verified: verified === 'true',
    search: search as string, limit: limit ? parseInt(limit as string) : undefined,
    offset: offset ? parseInt(offset as string) : undefined,
  });
  res.json(apiResponse(true, result));
}));

app.get('/api/v1/suppliers/:id', asyncRoute(async (req, res) => {
  const s = onboardingService.getSupplier(req.params.id);
  if (!s) { res.status(404).json(apiResponse(false, undefined, 'Supplier not found')); return; }
  res.json(apiResponse(true, s));
}));

const UpdateSupplierSchema = z.object({
  name: z.string().min(1).optional(),
  contactName: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  address: z.string().optional(),
  description: z.string().optional(),
  categories: z.array(z.string()).optional(),
  paymentTerms: z.enum(['immediate', 'net_15', 'net_30', 'net_60', 'net_90']).optional(),
  minOrderValue: z.number().nonnegative().optional(),
  certifications: z.array(z.string()).optional(),
  tradeHistory: z.boolean().optional(),
});
app.patch('/api/v1/suppliers/:id', asyncRoute(async (req, res) => {
  const validation = UpdateSupplierSchema.safeParse(req.body);
  if (!validation.success) { res.status(422).json(apiResponse(false, undefined, `Validation: ${validation.error.message}`)); return; }
  const s = onboardingService.updateSupplier(req.params.id, validation.data);
  if (!s) { res.status(404).json(apiResponse(false, undefined, 'Supplier not found')); return; }
  res.json(apiResponse(true, s));
}));

// Onboarding checklist
app.get('/api/v1/suppliers/:id/checklist', asyncRoute(async (req, res) => {
  const s = onboardingService.getSupplier(req.params.id);
  if (!s) { res.status(404).json(apiResponse(false, undefined, 'Supplier not found')); return; }
  res.json(apiResponse(true, s.onboardingChecklist));
}));

const ChecklistSchema = z.object({ completed: z.boolean(), proofUrl: z.string().optional() });
app.patch('/api/v1/suppliers/:id/checklist/:itemId', asyncRoute(async (req, res) => {
  const { completed, proofUrl } = ChecklistSchema.parse(req.body);
  const item = onboardingService.updateChecklistItem(req.params.id, req.params.itemId, completed, proofUrl);
  if (!item) { res.status(404).json(apiResponse(false, undefined, 'Item not found')); return; }
  const s = onboardingService.getSupplier(req.params.id);
  res.json(apiResponse(true, { item, checklist: s?.onboardingChecklist }));
}));

// Stats
app.get('/api/v1/stats', (_req, res) => {
  const regStats = onboardingService.getStats();
  const tradeStats = tradeService.getTradeStats();
  res.json(apiResponse(true, { registry: regStats, trade: tradeStats }));
});

// ── KYB / Verification ─────────────────────────────────────────────────────────
app.post('/api/v1/suppliers/:id/kyb/initiate', asyncRoute(async (req, res) => {
  const kyc = verificationService.initiateKYB(req.params.id);
  if (!kyc) { res.status(404).json(apiResponse(false, undefined, 'Supplier not found')); return; }
  res.json(apiResponse(true, kyc));
}));

const KYBSchema = z.object({
  gstin: z.string().optional(), pan: z.string().optional(),
  businessType: z.enum(['proprietorship', 'partnership', 'llp', 'private_ltd', 'public_ltd']).optional(),
  registrationNumber: z.string().optional(), yearEstablished: z.number().optional(),
  employeeCount: z.number().optional(), annualTurnover: z.number().optional(),
  address: z.string().optional(), bankAccount: z.string().optional(), bankIfsc: z.string().optional(),
});
app.post('/api/v1/suppliers/:id/kyb/submit', asyncRoute(async (req, res) => {
  const kyc = verificationService.submitKYB(req.params.id, KYBSchema.parse(req.body));
  if (!kyc) { res.status(404).json(apiResponse(false, undefined, 'Supplier not found')); return; }
  res.json(apiResponse(true, kyc));
}));

app.post('/api/v1/suppliers/:id/kyb/approve', asyncRoute(async (req, res) => {
  const { verificationLevel } = req.body;
  const s = verificationService.approveKYB(req.params.id, verificationLevel);
  if (!s) { res.status(404).json(apiResponse(false, undefined, 'Supplier not found')); return; }
  res.json(apiResponse(true, s));
}));

app.post('/api/v1/suppliers/:id/kyb/reject', asyncRoute(async (req, res) => {
  const { reason } = req.body;
  const s = verificationService.rejectKYB(req.params.id, reason);
  if (!s) { res.status(404).json(apiResponse(false, undefined, 'Supplier not found')); return; }
  res.json(apiResponse(true, s));
}));

const VerifyDocSchema = z.object({ docIndex: z.number().int().min(0), verified: z.boolean(), verifiedBy: z.string().optional() });
app.post('/api/v1/suppliers/:id/kyb/document/verify', asyncRoute(async (req, res) => {
  const validation = VerifyDocSchema.safeParse(req.body);
  if (!validation.success) { res.status(422).json(apiResponse(false, undefined, `Validation: ${validation.error.message}`)); return; }
  const { docIndex, verified, verifiedBy } = validation.data;
  const ok = verificationService.verifyDocument(req.params.id, docIndex, verified, verifiedBy);
  if (!ok) { res.status(404).json(apiResponse(false, undefined, 'Supplier or document not found')); return; }
  res.json(apiResponse(true, { docIndex, verified, verifiedBy: verifiedBy ?? 'system' }));
}));

app.get('/api/v1/suppliers/:id/trust-score', asyncRoute(async (req, res) => {
  const score = verificationService.computeTrustScore(req.params.id);
  res.json(apiResponse(true, { score, supplierId: req.params.id }));
}));

const DocSchema = z.object({ type: z.enum(['gstin_certificate', 'pan_card', 'address_proof', 'bank_statement', 'registration', 'trade_license', 'iso_cert', 'other']), label: z.string(), url: z.string().optional() });
app.post('/api/v1/suppliers/:id/documents', asyncRoute(async (req, res) => {
  const doc = verificationService.uploadDocument(req.params.id, req.body.type, req.body.label, req.body.url);
  if (!doc) { res.status(404).json(apiResponse(false, undefined, 'Supplier not found')); return; }
  res.json(apiResponse(true, doc));
}));

// ── Contract ────────────────────────────────────────────────────────────────────
app.get('/api/v1/suppliers/:id/contract', asyncRoute(async (req, res) => {
  const c = contractService.getContract(req.params.id);
  if (!c) { res.status(404).json(apiResponse(false, undefined, 'No contract found')); return; }
  res.json(apiResponse(true, c));
}));

app.get('/api/v1/contract/templates', (_req, res) => {
  res.json(apiResponse(true, contractService.getTemplates()));
});

app.post('/api/v1/suppliers/:id/contract', asyncRoute(async (req, res) => {
  const { template, terms } = req.body;
  const c = contractService.createContract(req.params.id, template, terms);
  if (!c) { res.status(404).json(apiResponse(false, undefined, 'Supplier not found')); return; }
  res.status(201).json(apiResponse(true, c));
}));

app.patch('/api/v1/suppliers/:id/contract', asyncRoute(async (req, res) => {
  const c = contractService.updateContract(req.params.id, req.body);
  if (!c) { res.status(404).json(apiResponse(false, undefined, 'No contract found')); return; }
  res.json(apiResponse(true, c));
}));

const SignSchema = z.object({ signedBy: z.string(), signedName: z.string(), signedTitle: z.string() });
app.post('/api/v1/suppliers/:id/contract/sign', asyncRoute(async (req, res) => {
  const { signedBy, signedName, signedTitle } = SignSchema.parse(req.body);
  const c = contractService.signContract(req.params.id, signedBy, signedName, signedTitle);
  if (!c) { res.status(404).json(apiResponse(false, undefined, 'No contract found')); return; }
  res.json(apiResponse(true, c));
}));

// ── Trade: RFQ → Quote → PO → Shipment → Payment ───────────────────────────────

// RFQ
const RFQSchema = z.object({
  buyerNexhaId: z.string(), supplierIds: z.array(z.string()),
  category: z.string(), items: z.array(z.object({ description: z.string(), quantity: z.number(), unit: z.string(), specifications: z.string().optional() })),
  deliveryLocation: z.string(), deliveryBy: z.string(), notes: z.string().optional(),
});
app.post('/api/v1/trade/rfq', asyncRoute(async (req, res) => {
  const rfq = tradeService.createRFQ(RFQSchema.parse(req.body));
  res.status(201).json(apiResponse(true, rfq));
}));
app.get('/api/v1/trade/rfq', asyncRoute(async (req, res) => {
  const list = tradeService.listRFQs(req.query.nexhaId as string);
  res.json(apiResponse(true, list));
}));
app.get('/api/v1/trade/rfq/:id', asyncRoute(async (req, res) => {
  const rfq = tradeService.getRFQ(req.params.id);
  if (!rfq) { res.status(404).json(apiResponse(false, undefined, 'RFQ not found')); return; }
  res.json(apiResponse(true, rfq));
}));
app.get('/api/v1/trade/rfq/:id/quotes', asyncRoute(async (req, res) => {
  res.json(apiResponse(true, tradeService.getQuotesForRFQ(req.params.id)));
}));

// Quote
const QuoteSchema = z.object({
  rfqId: z.string(), supplierId: z.string(), supplierName: z.string(),
  lineItems: z.array(z.object({ description: z.string(), quantity: z.number(), unitPrice: z.number() })),
  taxes: z.number().optional(), validDays: z.number().optional(), notes: z.string().optional(),
});
app.post('/api/v1/trade/quotes', asyncRoute(async (req, res) => {
  const quote = tradeService.submitQuote(QuoteSchema.parse(req.body));
  res.status(201).json(apiResponse(true, quote));
}));
app.get('/api/v1/trade/quotes/:id', asyncRoute(async (req, res) => {
  const q = tradeService.getQuote(req.params.id);
  if (!q) { res.status(404).json(apiResponse(false, undefined, 'Quote not found')); return; }
  res.json(apiResponse(true, q));
}));
app.post('/api/v1/trade/quotes/:id/accept', asyncRoute(async (req, res) => {
  const po = tradeService.acceptQuote(req.params.id);
  if (!po) { res.status(404).json(apiResponse(false, undefined, 'Quote not found')); return; }
  res.status(201).json(apiResponse(true, po));
}));
app.post('/api/v1/trade/quotes/:id/reject', asyncRoute(async (req, res) => {
  const q = tradeService.rejectQuote(req.params.id);
  if (!q) { res.status(404).json(apiResponse(false, undefined, 'Quote not found')); return; }
  res.json(apiResponse(true, q));
}));

// PO
app.get('/api/v1/trade/po/:id', asyncRoute(async (req, res) => {
  const po = tradeService.getPO(req.params.id);
  if (!po) { res.status(404).json(apiResponse(false, undefined, 'PO not found')); return; }
  res.json(apiResponse(true, po));
}));
app.get('/api/v1/trade/po', asyncRoute(async (req, res) => {
  const list = tradeService.listPOs({ buyerNexhaId: req.query.buyerNexhaId as string, supplierId: req.query.supplierId as string });
  res.json(apiResponse(true, list));
}));
const UpdatePOStatusSchema = z.object({ status: z.enum(['processing', 'shipped', 'delivered', 'cancelled', 'completed']) });
app.patch('/api/v1/trade/po/:id/status', asyncRoute(async (req, res) => {
  const validation = UpdatePOStatusSchema.safeParse(req.body);
  if (!validation.success) { res.status(422).json(apiResponse(false, undefined, `Validation: ${validation.error.message}`)); return; }
  const po = tradeService.updatePOStatus(req.params.id, validation.data.status);
  if (!po) { res.status(404).json(apiResponse(false, undefined, 'PO not found')); return; }
  res.json(apiResponse(true, po));
}));

// Shipment
app.get('/api/v1/trade/shipment/po/:poId', asyncRoute(async (req, res) => {
  const s = tradeService.getShipmentForPO(req.params.poId);
  if (!s) { res.status(404).json(apiResponse(false, undefined, 'Shipment not found')); return; }
  res.json(apiResponse(true, s));
}));
const TrackShipmentSchema = z.object({
  carrier: z.string().min(1),
  trackingNumber: z.string().min(1),
});
app.patch('/api/v1/trade/shipment/:id/track', asyncRoute(async (req, res) => {
  const validation = TrackShipmentSchema.safeParse(req.body);
  if (!validation.success) { res.status(422).json(apiResponse(false, undefined, `Validation: ${validation.error.message}`)); return; }
  const { carrier, trackingNumber } = validation.data;
  const s = tradeService.updateTracking(req.params.id, carrier, trackingNumber);
  if (!s) { res.status(404).json(apiResponse(false, undefined, 'Shipment not found')); return; }
  res.json(apiResponse(true, s));
}));
app.post('/api/v1/trade/shipment/:id/event', asyncRoute(async (req, res) => {
  const s = tradeService.addShipmentEvent(req.params.id, req.body);
  if (!s) { res.status(404).json(apiResponse(false, undefined, 'Shipment not found')); return; }
  res.json(apiResponse(true, s));
}));

// Payment
app.post('/api/v1/trade/po/:id/payment', asyncRoute(async (req, res) => {
  const p = tradeService.initiatePayment(req.params.id);
  if (!p) { res.status(404).json(apiResponse(false, undefined, 'PO not found')); return; }
  res.status(201).json(apiResponse(true, p));
}));
app.get('/api/v1/trade/payment/:id', asyncRoute(async (req, res) => {
  const p = tradeService.getPayment(req.params.id);
  if (!p) { res.status(404).json(apiResponse(false, undefined, 'Payment not found')); return; }
  res.json(apiResponse(true, p));
}));
app.post('/api/v1/trade/payment/:id/complete', asyncRoute(async (req, res) => {
  const { transactionRef, method } = req.body;
  const p = tradeService.completePayment(req.params.id, transactionRef, method);
  if (!p) { res.status(404).json(apiResponse(false, undefined, 'Payment not found')); return; }
  res.json(apiResponse(true, p));
}));

// Disputes
const DisputeSchema = z.object({ poId: z.string(), raisedBy: z.string(), reason: z.string(), description: z.string(), evidence: z.array(z.string()).optional() });
app.post('/api/v1/trade/disputes', asyncRoute(async (req, res) => {
  const d = tradeService.raiseDispute(DisputeSchema.parse(req.body));
  res.status(201).json(apiResponse(true, d));
}));
app.get('/api/v1/trade/disputes/:id', asyncRoute(async (req, res) => {
  const d = tradeService.getDispute(req.params.id);
  if (!d) { res.status(404).json(apiResponse(false, undefined, 'Dispute not found')); return; }
  res.json(apiResponse(true, d));
}));
const ResolveDisputeSchema = z.object({
  resolution: z.string().min(1),
  resolvedBy: z.string().min(1),
  outcome: z.enum(['resolved_buyer', 'resolved_supplier', 'escalated']),
});
app.patch('/api/v1/trade/disputes/:id/resolve', asyncRoute(async (req, res) => {
  const validation = ResolveDisputeSchema.safeParse(req.body);
  if (!validation.success) { res.status(422).json(apiResponse(false, undefined, `Validation: ${validation.error.message}`)); return; }
  const d = tradeService.resolveDispute(req.params.id, validation.data.resolution, validation.data.resolvedBy, validation.data.outcome);
  if (!d) { res.status(404).json(apiResponse(false, undefined, 'Dispute not found')); return; }
  res.json(apiResponse(true, d));
}));

// ── 404 + Start ────────────────────────────────────────────────────────────────
app.use((_req, res) => { res.status(404).json(apiResponse(false, undefined, 'Not found')); });

const server = app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════╗
║   NEXHA SUPPLIER REGISTRY — v1.0                  ║
║   Complete Trade Lifecycle                          ║
╠══════════════════════════════════════════════════════╣
║  Port: ${PORT}                                        ║
║  Trade Flow:                                        ║
║    Register → KYB → Contract → RFQ → Quote         ║
║    → PO → Shipment → Payment → Dispute             ║
╚══════════════════════════════════════════════════════╝
  `);
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT',  () => server.close(() => process.exit(0)));
