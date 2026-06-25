import { store } from './store.js';

export function createRfq({ buyerId, productId, quantity, message }) {
  if (!buyerId || !productId) throw new Error('buyerId and productId required');
  const rfq = { id: crypto.randomUUID(), buyerId, productId, quantity: Number(quantity) || 1, message: message || '', status: 'open', createdAt: new Date().toISOString() };
  store.rfqs.unshift(rfq);
  return rfq;
}

export function listRfqs(filter = {}) {
  return store.rfqs.filter(r =>
    (!filter.buyerId || r.buyerId === filter.buyerId) &&
    (!filter.status || r.status === filter.status)
  );
}

export function createQuote({ rfqId, sellerId, priceInr, validUntil }) {
  const rfq = store.rfqs.find(r => r.id === rfqId);
  if (!rfq) throw new Error('rfq not found');
  const quote = { id: crypto.randomUUID(), rfqId, sellerId, priceInr: Number(priceInr) || 0, validUntil: validUntil || null, status: 'pending', createdAt: new Date().toISOString() };
  store.quotes.unshift(quote);
  if (rfq) rfq.status = 'quoted';
  return quote;
}

export function createOrder({ quoteId, buyerId }) {
  const quote = store.quotes.find(q => q.id === quoteId);
  if (!quote) throw new Error('quote not found');
  const order = { id: crypto.randomUUID(), quoteId, buyerId, amountInr: quote.priceInr, status: 'created', createdAt: new Date().toISOString() };
  store.orders.unshift(order);
  return order;
}

export function listOrders(filter = {}) {
  return store.orders.filter(o => !filter.buyerId || o.buyerId === filter.buyerId);
}

export function listQuotes(rfqId) {
  return store.quotes.filter(q => q.rfqId === rfqId);
}
