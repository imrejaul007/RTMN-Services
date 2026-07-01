/**
 * ProcurementOS - Purchase Orders
 */
import { Router } from 'express';
const router = Router();

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  supplierGSTIN?: string;
  billingAddress: Address;
  shippingAddress: Address;
  lineItems: POLineItem[];
  subtotal: number;
  taxAmount: number;
  discount?: { type: 'percentage' | 'fixed'; value: number; amount: number };
  total: number;
  terms: string;
  paymentTerms: number;
  deliveryDate: Date;
  status: 'draft' | 'sent' | 'acknowledged' | 'partial' | 'closed';
  acknowledgements?: POAck;
  history: StatusChange[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface POLineItem {
  id: string;
  itemCode?: string;
  description: string;
  hsnCode?: string;
  quantity: number;
  unit: string;
  rate: number;
  discount?: number;
  taxableValue: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  delivered: number;
  pending: number;
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country?: string;
}

export interface POAck {
  acknowledgedAt: Date;
  deliveryConfirmation: Date;
  notes?: string;
}

export interface StatusChange {
  status: string;
  changedBy: string;
  changedAt: Date;
  notes?: string;
}

export interface GRN {
  id: string;
  grnNumber: string;
  poId: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  receivedDate: Date;
  lineItems: GRNItem[];
  status: 'draft' | 'verified' | 'completed';
  verifiedBy?: string;
  verifiedAt?: Date;
  notes?: string;
  attachments?: string[];
  createdAt: Date;
}

export interface GRNItem {
  lineItemId: string;
  description: string;
  expected: number;
  received: number;
  accepted: number;
  rejected: number;
  rejectionReason?: string;
  quality: 'pass' | 'fail' | 'partial';
}

export interface InvoiceMatching {
  id: string;
  invoiceNumber: string;
  supplierId: string;
  supplierName: string;
  poId?: string;
  grnId?: string;
  invoiceDate: Date;
  invoiceAmount: number;
  poAmount?: number;
  grnAmount?: number;
  variance: number;
  status: 'pending' | 'matched' | 'variances' | 'approved' | 'rejected';
  lineItems: InvoiceLineMatch[];
  approvedBy?: string;
  approvedAt?: Date;
  rejectionReason?: string;
}

export interface InvoiceLineMatch {
  lineItemId: string;
  description: string;
  poLineItem?: string;
  grnLineItem?: string;
  poQty?: number;
  grnQty?: number;
  invoiceQty: number;
  matchStatus: 'matched' | 'short_receipt' | 'excess' | 'missing';
  variance: number;
}

const purchaseOrders = new Map<string, PurchaseOrder>();
const grns = new Map<string, GRN>();
const invoiceMatches = new Map<string, InvoiceMatching>();

router.post('/po', (req, res) => {
  const po: PurchaseOrder = {
    id: crypto.randomUUID(),
    poNumber: `PO-${Date.now()}`,
    status: 'draft',
    history: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...req.body,
  };
  // Calculate totals
  po.subtotal = po.lineItems.reduce((s, i) => s + i.taxableValue, 0);
  po.taxAmount = po.lineItems.reduce((s, i) => s + i.taxAmount, 0);
  po.total = po.subtotal - (po.discount?.amount || 0) + po.taxAmount;
  purchaseOrders.set(po.id, po);
  res.status(201).json({ success: true, po });
});

router.get('/po', (req, res) => {
  const { status, supplierId } = req.query;
  let result = Array.from(purchaseOrders.values());
  if (status) result = result.filter(p => p.status === status);
  if (supplierId) result = result.filter(p => p.supplierId === supplierId);
  res.json({ success: true, pos: result });
});

router.get('/po/:id', (req, res) => {
  const po = purchaseOrders.get(req.params.id);
  po ? res.json({ success: true, po }) : res.status(404).json({ error: 'PO not found' });
});

router.patch('/po/:id', (req, res) => {
  const po = purchaseOrders.get(req.params.id);
  if (!po) return res.status(404).json({ error: 'PO not found' });
  Object.assign(po, req.body, { updatedAt: new Date() });
  purchaseOrders.set(po.id, po);
  res.json({ success: true, po });
});

router.post('/po/:id/send', (req, res) => {
  const po = purchaseOrders.get(req.params.id);
  if (!po) return res.status(404).json({ error: 'PO not found' });
  po.status = 'sent';
  po.history.push({ status: 'sent', changedBy: req.body.sentBy || 'system', changedAt: new Date() });
  purchaseOrders.set(po.id, po);
  res.json({ success: true, po });
});

router.post('/grn', (req, res) => {
  const grn: GRN = {
    id: crypto.randomUUID(),
    grnNumber: `GRN-${Date.now()}`,
    status: 'draft',
    createdAt: new Date(),
    ...req.body,
  };
  grns.set(grn.id, grn);
  res.status(201).json({ success: true, grn });
});

router.patch('/grn/:id/verify', (req, res) => {
  const grn = grns.get(req.params.id);
  if (!grn) return res.status(404).json({ error: 'GRN not found' });
  grn.status = 'verified';
  grn.verifiedBy = req.body.verifiedBy;
  grn.verifiedAt = new Date();
  grns.set(grn.id, grn);
  res.json({ success: true, grn });
});

router.post('/matching', (req, res) => {
  const match: InvoiceMatching = {
    id: crypto.randomUUID(),
    variance: req.body.invoiceAmount - (req.body.poAmount || 0) - (req.body.grnAmount || 0),
    lineItems: req.body.lineItems || [],
    status: 'pending',
    ...req.body,
  };
  if (Math.abs(match.variance) < 1) match.status = 'matched';
  else if (Math.abs(match.variance) < req.body.invoiceAmount * 0.05) match.status = 'variances';
  invoiceMatches.set(match.id, match);
  res.status(201).json({ success: true, match });
});

router.get('/matching', (req, res) => {
  const { status } = req.query;
  let result = Array.from(invoiceMatches.values());
  if (status) result = result.filter(m => m.status === status);
  res.json({ success: true, matches: result });
});

export default router;
</parameter>
</parameter>
