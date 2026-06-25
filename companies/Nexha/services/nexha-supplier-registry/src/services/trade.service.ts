/**
 * Nexha Supplier Registry — Trade Service
 * Complete trade lifecycle: RFQ → Quote → PO → Shipment → Payment
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  RFQ,
  RFQItem,
  Quote,
  QuoteLineItem,
  PurchaseOrder,
  POLineItem,
  Shipment,
  ShipmentEvent,
  Payment,
  Dispute,
  OrderStatus,
  PaymentStatus,
  DisputeStatus,
} from '../types/index.js';
import { getSupplier, _internal } from './onboarding.service.js';

// ── In-memory stores ────────────────────────────────────────────────────────────

const RFQs = new Map<string, RFQ>();
const QUOTES = new Map<string, Quote>();
const POs = new Map<string, PurchaseOrder>();
const SHIPMENTS = new Map<string, Shipment>();
const PAYMENTS = new Map<string, Payment>();
const DISPUTES = new Map<string, Dispute>();

// ── RFQ ────────────────────────────────────────────────────────────────────────

export function createRFQ(input: {
  buyerNexhaId: string;
  supplierIds: string[];
  category: string;
  items: RFQItem[];
  deliveryLocation: string;
  deliveryBy: string;
  notes?: string;
}): RFQ {
  const rfq: RFQ = {
    id: `rfq-${uuidv4()}`,
    buyerNexhaId: input.buyerNexhaId,
    supplierIds: input.supplierIds,
    category: input.category,
    items: input.items,
    deliveryLocation: input.deliveryLocation,
    deliveryBy: input.deliveryBy,
    notes: input.notes,
    status: 'rfq',
    createdAt: new Date().toISOString(),
  };
  RFQs.set(rfq.id, rfq);
  return rfq;
}

export function getRFQ(id: string): RFQ | null {
  return RFQs.get(id) ?? null;
}

export function listRFQs(nexhaId?: string): RFQ[] {
  let list = Array.from(RFQs.values());
  if (nexhaId) list = list.filter(r => r.buyerNexhaId === nexhaId);
  return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getQuotesForRFQ(rfqId: string): Quote[] {
  return Array.from(QUOTES.values()).filter(q => q.rfqId === rfqId);
}

// ── Quote ──────────────────────────────────────────────────────────────────────

export function submitQuote(input: {
  rfqId: string;
  supplierId: string;
  supplierName: string;
  lineItems: Array<{ description: string; quantity: number; unitPrice: number }>;
  taxes?: number;
  validDays?: number;
  notes?: string;
}): Quote {
  const subtotal = input.lineItems.reduce((sum, li) => sum + li.quantity * li.unitPrice, 0);
  const taxes = input.taxes ?? subtotal * 0.18;
  const validDays = input.validDays ?? 7;

  const lineItems: QuoteLineItem[] = input.lineItems.map(li => ({
    description: li.description,
    quantity: li.quantity,
    unitPrice: li.unitPrice,
    total: li.quantity * li.unitPrice,
  }));

  const quote: Quote = {
    id: `quote-${uuidv4()}`,
    rfqId: input.rfqId,
    supplierId: input.supplierId,
    supplierName: input.supplierName,
    lineItems,
    subtotal,
    taxes,
    total: subtotal + taxes,
    currency: 'INR',
    validUntil: new Date(Date.now() + validDays * 24 * 60 * 60 * 1000).toISOString(),
    deliveryDays: 0,
    notes: input.notes,
    status: 'submitted',
    submittedAt: new Date().toISOString(),
  };

  QUOTES.set(quote.id, quote);

  // Auto-advance RFQ status
  const rfq = RFQs.get(input.rfqId);
  if (rfq && rfq.status === 'rfq') {
    rfq.status = 'quote_received';
  }

  return quote;
}

export function getQuote(id: string): Quote | null {
  return QUOTES.get(id) ?? null;
}

export function acceptQuote(quoteId: string): PurchaseOrder | null {
  const quote = QUOTES.get(quoteId);
  if (!quote) return null;
  if (quote.status !== 'submitted') throw new Error('Can only accept submitted quotes');

  quote.status = 'accepted';

  const rfq = RFQs.get(quote.rfqId);
  const po: PurchaseOrder = {
    id: `po-${uuidv4()}`,
    rfqId: quote.rfqId,
    quoteId: quote.id,
    buyerNexhaId: rfq?.buyerNexhaId ?? '',
    supplierId: quote.supplierId,
    lineItems: quote.lineItems.map(li => ({
      description: li.description,
      quantity: li.quantity,
      unitPrice: li.unitPrice,
      total: li.total,
      deliveredQty: 0,
    })),
    subtotal: quote.subtotal,
    taxes: quote.taxes,
    total: quote.total,
    currency: quote.currency,
    paymentTermsDays: 30,
    expectedDelivery: rfq?.deliveryBy ?? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'awarded',
    createdAt: new Date().toISOString(),
  };
  POs.set(po.id, po);
  return po;
}

export function rejectQuote(quoteId: string): Quote | null {
  const quote = QUOTES.get(quoteId);
  if (!quote) return null;
  quote.status = 'rejected';
  return quote;
}

export function counterQuote(quoteId: string, counterLineItems: Array<{ description: string; quantity: number; unitPrice: number }>): Quote | null {
  const quote = QUOTES.get(quoteId);
  if (!quote) return null;
  quote.status = 'countered';
  const subtotal = counterLineItems.reduce((s, li) => s + li.quantity * li.unitPrice, 0);
  quote.lineItems = counterLineItems.map(li => ({ ...li, total: li.quantity * li.unitPrice }));
  quote.subtotal = subtotal;
  quote.taxes = subtotal * 0.18;
  quote.total = subtotal + quote.taxes;
  return quote;
}

// ── Purchase Order ─────────────────────────────────────────────────────────────

export function getPO(id: string): PurchaseOrder | null {
  return POs.get(id) ?? null;
}

export function listPOs(filters?: { buyerNexhaId?: string; supplierId?: string; status?: OrderStatus }): PurchaseOrder[] {
  let list = Array.from(POs.values());
  if (filters?.buyerNexhaId) list = list.filter(p => p.buyerNexhaId === filters.buyerNexhaId);
  if (filters?.supplierId) list = list.filter(p => p.supplierId === filters.supplierId);
  if (filters?.status) list = list.filter(p => p.status === filters.status);
  return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function updatePOStatus(poId: string, status: OrderStatus): PurchaseOrder | null {
  const po = POs.get(poId);
  if (!po) return null;
  po.status = status;
  if (status === 'confirmed') {
    // Trigger shipment creation
    const shipment: Shipment = {
      id: `ship-${uuidv4()}`,
      poId: po.id,
      supplierId: po.supplierId,
      status: 'preparing',
      events: [{ timestamp: new Date().toISOString(), status: 'preparing', description: 'Order confirmed, preparing for dispatch' }],
    };
    SHIPMENTS.set(shipment.id, shipment);
  }
  return po;
}

// ── Shipment ───────────────────────────────────────────────────────────────────

export function getShipment(id: string): Shipment | null {
  return SHIPMENTS.get(id) ?? null;
}

export function getShipmentForPO(poId: string): Shipment | null {
  for (const s of SHIPMENTS.values()) {
    if (s.poId === poId) return s;
  }
  return null;
}

export function addShipmentEvent(shipmentId: string, event: Omit<ShipmentEvent, 'timestamp'>): Shipment | null {
  const s = SHIPMENTS.get(shipmentId);
  if (!s) return null;
  s.events.push({ timestamp: new Date().toISOString(), ...event });
  s.status = event.status as Shipment['status'];
  // Auto-update PO on delivery
  if (event.status === 'delivered') {
    s.actualDelivery = new Date().toISOString();
    const po = POs.get(s.poId);
    if (po) po.status = 'delivered';
  }
  return s;
}

export function updateTracking(shipmentId: string, carrier: string, trackingNumber: string): Shipment | null {
  const s = getShipment(shipmentId);
  if (!s) return null;
  s.carrier = carrier;
  s.trackingNumber = trackingNumber;
  s.status = 'picked_up';
  s.events.push({ timestamp: new Date().toISOString(), status: 'picked_up', description: `Shipment picked up. Tracking: ${trackingNumber}` });
  const po = POs.get(s.poId);
  if (po) po.trackingNumber = trackingNumber;
  return s;
}

// ── Payment ────────────────────────────────────────────────────────────────────

export function initiatePayment(poId: string): Payment | null {
  const po = POs.get(poId);
  if (!po) return null;
  const existing = Array.from(PAYMENTS.values()).find(p => p.poId === poId);
  if (existing) return existing;

  const payment: Payment = {
    id: `pay-${uuidv4()}`,
    poId,
    amount: po.total,
    currency: po.currency,
    status: 'pending',
    retryCount: 0,
  };
  PAYMENTS.set(payment.id, payment);
  return payment;
}

export function getPayment(id: string): Payment | null {
  return PAYMENTS.get(id) ?? null;
}

export function getPaymentForPO(poId: string): Payment | null {
  for (const p of PAYMENTS.values()) {
    if (p.poId === poId) return p;
  }
  return null;
}

export function completePayment(paymentId: string, transactionRef: string, method?: string): Payment | null {
  const p = PAYMENTS.get(paymentId);
  if (!p) return null;
  p.status = 'completed';
  p.transactionRef = transactionRef;
  p.method = method;
  p.completedAt = new Date().toISOString();

  const po = POs.get(p.poId);
  if (po) {
    po.status = 'completed';
    // Also complete the shipment if exists
    const ship = getShipmentForPO(po.id);
    if (ship && ship.status !== 'delivered') {
      ship.status = 'delivered';
      ship.actualDelivery = new Date().toISOString();
    }
  }
  return p;
}

export function failPayment(paymentId: string, reason: string): Payment | null {
  const p = PAYMENTS.get(paymentId);
  if (!p) return null;
  p.status = 'failed';
  p.failedReason = reason;
  p.retryCount++;
  return p;
}

export function refundPayment(paymentId: string): Payment | null {
  const p = PAYMENTS.get(paymentId);
  if (!p) return null;
  if (p.status !== 'completed') throw new Error('Can only refund completed payments');
  p.status = 'refunded';
  return p;
}

// ── Dispute ────────────────────────────────────────────────────────────────────

export function raiseDispute(input: {
  poId: string;
  raisedBy: string;
  reason: string;
  description: string;
  evidence?: string[];
}): Dispute {
  const dispute: Dispute = {
    id: `disp-${uuidv4()}`,
    poId: input.poId,
    raisedBy: input.raisedBy,
    reason: input.reason,
    description: input.description,
    evidence: input.evidence,
    status: 'open',
    createdAt: new Date().toISOString(),
  };
  DISPUTES.set(dispute.id, dispute);

  const po = POs.get(input.poId);
  if (po) po.status = 'disputed';

  return dispute;
}

export function getDispute(id: string): Dispute | null {
  return DISPUTES.get(id) ?? null;
}

export function listDisputes(filters?: { poId?: string; raisedBy?: string; status?: DisputeStatus }): Dispute[] {
  let list = Array.from(DISPUTES.values());
  if (filters?.poId) list = list.filter(d => d.poId === filters.poId);
  if (filters?.raisedBy) list = list.filter(d => d.raisedBy === filters.raisedBy);
  if (filters?.status) list = list.filter(d => d.status === filters.status);
  return list;
}

export function resolveDispute(disputeId: string, resolution: string, resolvedBy: string, outcome: 'resolved_buyer' | 'resolved_supplier' | 'escalated'): Dispute | null {
  const d = DISPUTES.get(disputeId);
  if (!d) return null;
  d.status = outcome;
  d.resolution = resolution;
  d.resolvedAt = new Date().toISOString();
  d.resolvedBy = resolvedBy;
  return d;
}

// ── Trade stats ────────────────────────────────────────────────────────────────

export function getTradeStats() {
  const pos = Array.from(POs.values());
  const payments = Array.from(PAYMENTS.values());
  const completedPayments = payments.filter(p => p.status === 'completed');

  return {
    totalRFQs: RFQs.size,
    totalQuotes: QUOTES.size,
    totalPOs: pos.length,
    activePOs: pos.filter(p => !['completed', 'cancelled'].includes(p.status)).length,
    totalPayments: payments.length,
    completedPayments: completedPayments.length,
    totalTradeValue: completedPayments.reduce((s, p) => s + p.amount, 0),
    averagePOValue: pos.length > 0 ? pos.reduce((s, p) => s + p.total, 0) / pos.length : 0,
    disputes: {
      open: DISPUTES.size,
      resolved: Array.from(DISPUTES.values()).filter(d => d.status.startsWith('resolved')).length,
    },
  };
}

export default {
  // RFQ
  createRFQ, getRFQ, listRFQs, getQuotesForRFQ,
  // Quote
  submitQuote, getQuote, acceptQuote, rejectQuote, counterQuote,
  // PO
  getPO, listPOs, updatePOStatus,
  // Shipment
  getShipment, getShipmentForPO, addShipmentEvent, updateTracking,
  // Payment
  initiatePayment, getPayment, getPaymentForPO, completePayment, failPayment, refundPayment,
  // Dispute
  raiseDispute, getDispute, listDisputes, resolveDispute,
  // Stats
  getTradeStats,
};
