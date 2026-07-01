/**
 * ProcurementOS - Sourcing & RFQ
 */
import { Router } from 'express';
const router = Router();

export interface RFQ { id: string; title: string; category: string[]; status: 'draft'|'published'|'closed'; bids: Bid[]; deadline: Date; specs: string; quantity: number; estimatedBudget?: number; createdBy: string; createdAt: Date; }
export interface Bid { supplierId: string; supplierName: string; amount: number; deliveryDays: number; validity: number; notes?: string; status: 'pending'|'shortlisted'|'awarded'|'rejected'; submittedAt: Date; }

const rfqs = new Map<string, RFQ>();

router.post('/rfqs', (req, res) => { const r: RFQ = { id: crypto.randomUUID(), ...req.body, status: 'draft', bids: [], createdAt: new Date() }; rfqs.set(r.id, r); res.status(201).json({ success: true, rfq: r }); });
router.get('/rfqs', (req, res) => { res.json({ success: true, rfqs: Array.from(rfqs.values()) }); });
router.patch('/rfqs/:id', (req, res) => { const r = rfqs.get(req.params.id); if (!r) return res.status(404).json({ error: 'Not found' }); Object.assign(r, req.body); rfqs.set(req.params.id, r); res.json({ success: true, rfq: r }); });
router.post('/rfqs/:id/bids', (req, res) => { const r = rfqs.get(req.params.id); if (!r) return res.status(404).json({ error: 'RFQ not found' }); const bid: Bid = { ...req.body, status: 'pending', submittedAt: new Date() }; r.bids.push(bid); rfqs.set(req.params.id, r); res.json({ success: true, bid }); });
router.post('/rfqs/:id/shortlist/:supplierId', (req, res) => { const r = rfqs.get(req.params.id); if (!r) return res.status(404).json({ error: 'RFQ not found' }); const bid = r.bids.find(b => b.supplierId === req.params.supplierId); if (bid) bid.status = 'shortlisted'; rfqs.set(req.params.id, r); res.json({ success: true, rfq: r }); });
router.post('/rfqs/:id/award/:supplierId', (req, res) => { const r = rfqs.get(req.params.id); if (!r) return res.status(404).json({ error: 'RFQ not found' }); r.bids.forEach(b => { b.status = b.supplierId === req.params.supplierId ? 'awarded' : 'rejected'; }); r.status = 'closed'; rfqs.set(req.params.id, r); res.json({ success: true, rfq: r }); });
router.get('/rfqs/:id/compare', (req, res) => { const r = rfqs.get(req.params.id); if (!r) return res.status(404).json({ error: 'RFQ not found' }); const sorted = [...r.bids].sort((a, b) => a.amount - b.amount); res.json({ success: true, comparison: { cheapest: sorted[0], byDelivery: [...r.bids].sort((a, b) => a.deliveryDays - b.deliveryDays)[0], total: r.bids.length } }); });

export default router;