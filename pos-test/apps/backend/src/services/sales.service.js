import { store } from './store.js';

export function listProducts() { return store.products; }
export function getProduct(id) { return store.products.find(p => p.id === id || p.barcode === id) || null; }

export function createSale({ lines, paymentMethod, totalInr }) {
  if (!lines || !lines.length) throw new Error('lines required');
  const total = lines.reduce((sum, l) => sum + l.qty * l.price, 0);
  const sale = { id: crypto.randomUUID(), lines, totalInr: totalInr || total, paymentMethod: paymentMethod || 'cash', createdAt: new Date().toISOString() };
  store.sales.unshift(sale);
  const receipt = { id: crypto.randomUUID(), saleId: sale.id, totalInr: sale.totalInr, printedAt: sale.createdAt };
  store.receipts.unshift(receipt);
  return { sale, receipt };
}

export function listSales() { return store.sales; }
export function listReceipts() { return store.receipts; }
