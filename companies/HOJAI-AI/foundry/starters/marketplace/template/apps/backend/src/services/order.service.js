/**
 * Order service — RFQ + quote + order + invoice pipeline.
 */

import { randomUUID } from 'node:crypto';
import store from './store.js';

export function createRfq({ buyerId, productId, quantity, message }) {
  if (!buyerId || !productId) throw new Error('buyerId and productId required');
  const id = randomUUID();
  const rfq = { id, buyerId, productId, quantity: Number(quantity) || 1, message: message || '', status: 'open', createdAt: new Date().toISOString() };
  store.rfqs.set(id, rfq);
  return rfq;
}

export function listRfqs(filter = {}) {
  return [...store.rfqs.values()].filter(r => {
    if (filter.buyerId && r.buyerId !== filter.buyerId) return false;
    if (filter.status && r.status !== filter.status) return false;
    return true;
  });
}

export function createQuote({ rfqId, sellerId, priceInr, message }) {
  if (!rfqId || !sellerId) throw new Error('rfqId and sellerId required');
  const id = randomUUID();
  const quote = { id, rfqId, sellerId, priceInr: Number(priceInr) || 0, message: message || '', status: 'pending', createdAt: new Date().toISOString() };
  store.quotes.set(id, quote);
  return quote;
}

export function listQuotes(rfqId) {
  return [...store.quotes.values()].filter(q => q.rfqId === rfqId);
}

export function createOrder({ buyerId, productId, quantity, priceInr }) {
  const id = randomUUID();
  const order = { id, buyerId, productId, quantity: Number(quantity) || 1, priceInr: Number(priceInr) || 0, status: 'created', createdAt: new Date().toISOString() };
  store.orders.set(id, order);
  return order;
}

export function getOrder(id) { return store.orders.get(id) || null; }
export function listOrders(filter = {}) {
  return [...store.orders.values()].filter(o => {
    if (filter.buyerId && o.buyerId !== filter.buyerId) return false;
    if (filter.status && o.status !== filter.status) return false;
    return true;
  });
}

export function createInvoice({ orderId, amountInr }) {
  const id = randomUUID();
  const invoice = { id, orderId, amountInr: Number(amountInr) || 0, status: 'unpaid', createdAt: new Date().toISOString() };
  store.invoices.set(id, invoice);
  return invoice;
}
