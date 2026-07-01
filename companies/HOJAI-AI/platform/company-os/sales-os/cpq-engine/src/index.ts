/**
 * SalesOS - CPQ Engine (Configure Price Quote)
 */
import { Router } from 'express';
const router = Router();

export interface Product { id: string; name: string; sku: string; basePrice: number; type: 'product' | 'service' | 'subscription'; category: string; attributes: Attribute[]; pricingRules: PricingRule[]; }
export interface Attribute { name: string; values: string[]; required: boolean; }
export interface PricingRule { id: string; condition: string; action: 'discount' | 'bundle' | 'tier'; value: number; priority: number; }
export interface Quote { id: string; number: string; customerId: string; customerName: string; items: QuoteItem[]; subtotal: number; discount: number; tax: number; total: number; status: 'draft' | 'sent' | 'accepted' | 'signed'; validUntil: Date; paymentTerms: number; createdAt: Date; }
export interface QuoteItem { productId: string; name: string; quantity: number; unitPrice: number; discount: number; taxRate: number; tax: number; total: number; }
export interface ApprovalRule { id: string; minAmount: number; maxAmount: number; approverRole: string; type: 'quote' | 'discount' | 'order'; }
export interface Order { id: string; quoteId?: string; orderNumber: string; customerId: string; items: QuoteItem[]; total: number; status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'invoiced'; invoiceId?: string; }

const products = new Map<string, Product>();
const quotes = new Map<string, Quote>();
const orders = new Map<string, Order>();
const approvals = new Map<string, ApprovalRule>();

// Default products
products.set('prod-1', { id: 'prod-1', name: 'Enterprise License', sku: 'ENT-001', basePrice: 100000, type: 'subscription', category: 'Software', attributes: [{ name: 'users', values: ['10', '25', '50', '100', 'unlimited'], required: true }, { name: 'support', values: ['basic', 'premium', 'enterprise'], required: true }], pricingRules: [] });
products.set('prod-2', { id: 'prod-2', name: 'Professional License', sku: 'PRO-001', basePrice: 50000, type: 'subscription', category: 'Software', attributes: [{ name: 'users', values: ['5', '10', '25'], required: true }], pricingRules: [] });
products.set('prod-3', { id: 'prod-3', name: 'Implementation', sku: 'IMP-001', basePrice: 25000, type: 'service', category: 'Services', attributes: [], pricingRules: [] });

router.get('/products', (req, res) => { res.json({ success: true, products: Array.from(products.values()) }); });
router.post('/products', (req, res) => { const p: Product = { id: crypto.randomUUID(), ...req.body }; products.set(p.id, p); res.status(201).json({ success: true, product: p }); });

router.post('/quotes', (req, res) => {
  const { customerId, customerName, items } = req.body;
  let subtotal = 0, discount = 0, tax = 0;
  const processedItems: QuoteItem[] = items?.map((i: any) => {
    const product = products.get(i.productId);
    const unitPrice = product?.basePrice || i.unitPrice || 0;
    const itemDiscount = i.discount || 0;
    const taxRate = i.taxRate || 18;
    const itemTax = (unitPrice * i.quantity * (100 - itemDiscount) / 100 * taxRate / 100;
    const total = unitPrice * i.quantity * (100 - itemDiscount) / 100 + itemTax;
    subtotal += unitPrice * i.quantity * (100 - itemDiscount) / 100;
    discount += (i.quantity * unitPrice - total + itemTax);
    tax += itemTax;
    return { productId: i.productId, name: product?.name || i.name, quantity: i.quantity, unitPrice, discount: itemDiscount, taxRate, tax: itemTax, total };
  }) || [];
  const quote: Quote = { id: crypto.randomUUID(), number: `QT-${Date.now()}`, customerId, customerName, items: processedItems, subtotal, discount, tax, total: subtotal + tax, status: 'draft', validUntil: new Date(Date.now() + 30 * 86400000), paymentTerms: 30, createdAt: new Date() };
  quotes.set(quote.id, quote);
  res.status(201).json({ success: true, quote });
});

router.get('/quotes', (req, res) => { res.json({ success: true, quotes: Array.from(quotes.values()) }); });
router.get('/quotes/:id', (req, res) => { const q = quotes.get(req.params.id); q ? res.json({ success: true, quote: q }) : res.status(404).json({ success: false, error: 'Not found' }); });
router.patch('/quotes/:id', (req, res) => {
  const q = quotes.get(req.params.id);
  if (!q) return res.status(404).json({ success: false, error: 'Not found' });
  Object.assign(q, req.body);
  quotes.set(req.params.id, q);
  res.json({ success: true, quote: q });
});

router.post('/orders', (req, res) => {
  const { quoteId, customerId, items } = req.body;
  const quote = quoteId ? quotes.get(quoteId) : null;
  const order: Order = { id: crypto.randomUUID(), quoteId, orderNumber: `ORD-${Date.now()}`, customerId, items: quote?.items || items || [], total: quote?.total || 0, status: 'pending' };
  orders.set(order.id, order);
  if (quote) { quote.status = 'accepted'; quotes.set(quoteId, quote); }
  res.status(201).json({ success: true, order });
});
router.get('/orders', (req, res) => { res.json({ success: true, orders: Array.from(orders.values()) }); });
router.get('/orders/:id', (req, res) => { const o = orders.get(req.params.id); o ? res.json({ success: true, order: o }) : res.status(404).json({ success: false, error: 'Not found' }); });

router.post('/calculate', (req, res) => {
  const { productId, quantity, attributes, discount: customDiscount } = req.body;
  const product = products.get(productId);
  if (!product) return res.status(404).json({ success: false, error: 'Product not found' });
  let price = product.basePrice;
  if (customDiscount) price = price * (100 - customDiscount) / 100;
  const tax = price * quantity * 18 / 100;
  const total = price * quantity + tax;
  res.json({ success: true, price, tax, total, quantity });
});

export default router;
