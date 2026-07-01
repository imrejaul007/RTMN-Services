/**
 * ProcurementOS - Complete Procurement
 */
import { Router } from 'express';
const router = Router();

export interface Supplier { id: string; name: string; category: string; rating: number; status: 'approved' | 'pending' | 'blocked'; contacts: Contact[]; bank: BankInfo; gstin?: string; }
export interface Contact { name: string; email: string; phone?: string; role: string; }
export interface BankInfo { accountName: string; accountNumber: string; ifscCode: string; bankName: string; }
export interface RFQ { id: string; title: string; category: string; status: 'draft' | 'sent' | 'quotes_received' | 'awarded'; bids: Bid[]; deadline: Date; createdAt: Date; }
export interface Bid { supplierId: string; supplierName: string; amount: number; deliveryDays: number; validUntil: Date; status: 'pending' | 'accepted' | 'rejected'; }
export interface PO { id: string; poNumber: string; supplierId: string; supplierName: string; items: POItem[]; subtotal: number; tax: number; total: number; status: 'pending' | 'approved' | 'ordered' | 'delivered' | 'closed'; deliveryDate?: Date; paymentTerms: number; }
export interface POItem { description: string; quantity: number; unitPrice: number; total: number; }
export interface Invoice { id: string; invoiceNumber: string; poId: string; supplierId: string; amount: number; status: 'pending' | 'approved' | 'paid'; dueDate: Date; paidAt?: Date; }
export interface SpendAnalytics { category: string; spent: number; budget: number; variance: number; topSuppliers: string[]; }

const suppliers = new Map<string, Supplier>();
const rfqs = new Map<string, RFQ>();
const pos = new Map<string, PO>();
const invoices = new Map<string, Invoice>();

router.post('/suppliers', (req, res) => { const s: Supplier = { id: crypto.randomUUID(), status: 'pending', contacts: [], ...req.body }; suppliers.set(s.id, s); res.status(201).json({ success: true, supplier: s }); });
router.get('/suppliers', (req, res) => { const { status, category } = req.query; let r = Array.from(suppliers.values()); if (status) r = r.filter(s => s.status === status); if (category) r = r.filter(s => s.category === category); res.json({ success: true, suppliers: r }); });
router.patch('/suppliers/:id/approve', (req, res) => { const s = suppliers.get(req.params.id); if (!s) return res.status(404).json({ success: false, error: 'Not found' }); s.status = 'approved'; suppliers.set(req.params.id, s); res.json({ success: true, supplier: s }); });
router.get('/suppliers/:id', (req, res) => { const s = suppliers.get(req.params.id); s ? res.json({ success: true, supplier: s }) : res.status(404).json({ success: false, error: 'Not found' }); });

router.post('/rfqs', (req, res) => { const r: RFQ = { id: crypto.randomUUID(), status: 'draft', bids: [], createdAt: new Date(), deadline: new Date(req.body.deadline), ...req.body }; rfqs.set(r.id, r); res.status(201).json({ success: true, rfq: r }); });
router.get('/rfqs', (req, res) => { res.json({ success: true, rfqs: Array.from(rfqs.values()) }); });
router.post('/rfqs/:id/bids', (req, res) => { const rfq = rfqs.get(req.params.id); if (!rfq) return res.status(404).json({ success: false, error: 'RFQ not found' }); rfq.bids.push({ status: 'pending', ...req.body }); rfq.status = 'quotes_received'; rfqs.set(req.params.id, rfq); res.json({ success: true, rfq }); });
router.post('/rfqs/:id/award', (req, res) => {
  const rfq = rfqs.get(req.params.id);
  if (!rfq) return res.status(404).json({ success: false, error: 'RFQ not found' });
  const bid = rfq.bids.find(b => b.supplierId === req.body.supplierId);
  if (!bid) return res.status(404).json({ success: false, error: 'Bid not found' });
  bid.status = 'accepted';
  rfq.bids.forEach(b => { if (b !== bid) b.status = 'rejected'; });
  rfq.status = 'awarded';
  rfqs.set(req.params.id, rfq);
  // Create PO
  const po: PO = { id: crypto.randomUUID(), poNumber: `PO-${Date.now()}`, supplierId: bid.supplierId, supplierName: bid.supplierName, items: req.body.items || [], subtotal: bid.amount, tax: bid.amount * 0.18, total: bid.amount * 1.18, status: 'pending' };
  pos.set(po.id, po);
  res.json({ success: true, rfq, po });
});

router.get('/pos', (req, res) => res.json({ success: true, pos: Array.from(pos.values()) }));
router.get('/pos/:id', (req, res) => { const p = pos.get(req.params.id); p ? res.json({ success: true, po: p }) : res.status(404).json({ success: false, error: 'Not found' }); });
router.patch('/pos/:id/status', (req, res) => { const p = pos.get(req.params.id); if (!p) return res.status(404).json({ error: 'Not found' }); Object.assign(p, req.body); pos.set(req.params.id, p); res.json({ success: true, po: p }); });

router.post('/invoices', (req, res) => {
  const i: Invoice = { id: crypto.randomUUID(), status: 'pending', dueDate: new Date(), ...req.body };
  invoices.set(i.id, i);
  res.status(201).json({ success: true, invoice: i });
});
router.get('/invoices', (req, res) => {
  const { status } = req.query;
  let r = Array.from(invoices.values());
  if (status) r = r.filter(i => i.status === status);
  res.json({ success: true, invoices: r });
});
router.patch('/invoices/:id/pay', (req, res) => {
  const i = invoices.get(req.params.id);
  if (!i) return res.status(404).json({ error: 'Not found' });
  i.status = 'paid';
  i.paidAt = new Date();
  invoices.set(req.params.id, i);
  res.json({ success: true, invoice: i });
});

router.get('/reports/spend', (req, res) => {
  const { period } = req.query;
  const all = Array.from(invoices.values()).filter(i => i.status === 'paid');
  const byCategory = all.reduce((acc, inv) => {
    const po = pos.get(inv.poId);
    const cat = po?.items?.[0]?.description || 'General';
    acc[cat] = (acc[cat] || 0) + inv.amount;
    return acc;
  }, {} as Record<string, number>);
  res.json({ success: true, spend: byCategory, total: all.reduce((s, i) => s + i.amount, 0) });
});

export default router;