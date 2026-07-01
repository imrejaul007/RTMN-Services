/**
 * ProcurementOS - Trade Finance
 * LC, BG, Invoice Discounting, Supply Chain Finance
 */
import { Router } from 'express';
const router = Router();

export interface LetterOfCredit { id: string; lcNumber: string; type: 'sight'|'usance'|'revocable'|'irrevocable'; applicant: string; beneficiary: string; amount: number; currency: string; bank: string; expiryDate: Date; shipmentDate: Date; documents: string[]; status: 'pending'|'issued'|'utilized'|'closed'; }

export interface BankGuarantee { id: string; bgNumber: string; type: 'performance'|'financial'|'bid_bond'; beneficiary: string; amount: number; validity: Date; status: 'pending'|'active'|'claimed'|'released'; }

export interface InvoiceDiscounting { id: string; invoiceId: string; amount: number; discountrate: number; net: number; buyer: string; status: 'pending'|'approved'|'disbursed'|'settled'; }

export interface Insurance { id: string; policyNumber: string; type: 'marine'|'credit'|'cargo'; provider: string; coverage: number; premium: number; status: 'active'|'expired'|'claimed'; }

const lcs = new Map<string, LetterOfCredit>();
const bgs = new Map<string, BankGuarantee>();
const discounts = new Map<string, InvoiceDiscounting>();
const policies = new Map<string, Insurance>();

router.post('/lc', (req, res) => { const lc: LetterOfCredit = { id: crypto.randomUUID(), lcNumber: `LC-${Date.now()}`, status: 'pending', ...req.body }; lcs.set(lc.id, lc); res.status(201).json({ success: true, lc }); });
router.get('/lc', (req, res) => { res.json({ success: true, lcs: Array.from(lcs.values()) }); });
router.patch('/lc/:id', (req, res) => { const lc = lcs.get(req.params.id); if (!lc) return res.status(404).json({ error: 'LC not found' }); Object.assign(lc, req.body); lcs.set(req.params.id, lc); res.json({ success: true, lc }); });

router.post('/bg', (req, res) => { const bg: BankGuarantee = { id: crypto.randomUUID(), bgNumber: `BG-${Date.now()}`, status: 'pending', ...req.body }; bgs.set(bg.id, bg); res.status(201).json({ success: true, bg }); });
router.get('/bg', (req, res) => { res.json({ success: true, bgs: Array.from(bgs.values()) }); });

router.post('/discounting', (req, res) => {
  const { invoiceId, amount, discountrate } = req.body;
  const d: InvoiceDiscounting = { id: crypto.randomUUID(), invoiceId, amount, discountrate, net: amount * (1 - discountrate / 100), status: 'pending' };
  discounts.set(d.id, d);
  res.status(201).json({ success: true, discounting: d });
});
router.get('/discounting', (req, res) => res.json({ success: true, discounts: Array.from(discounts.values()) }));

router.post('/insurance', (req, res) => { const p: Insurance = { id: crypto.randomUUID(), policyNumber: `INS-${Date.now()}`, status: 'active', ...req.body }; policies.set(p.id, p); res.status(201).json({ success: true, policy: p }); });
router.get('/insurance', (req, res) => res.json({ success: true, policies: Array.from(policies.values()) }));

export default router;
</parameter>
