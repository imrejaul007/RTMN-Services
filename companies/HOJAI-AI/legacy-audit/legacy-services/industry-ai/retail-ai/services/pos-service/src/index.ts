/**
 * HOJAI Retail POS Service
 * Point of Sale for retail stores
 * Reuses: Restaurant POS pattern, adapts for retail
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  brand: string;
  price: number;
  mrp: number;
  costPrice: number;
  stock: number;
  minStock: number;
  unit: string;
  barcode?: string;
  image?: string;
  variants?: { name: string; price: number; stock: number }[];
  taxRate: number;
  status: 'active' | 'inactive' | 'out_of_stock';
}

interface CartItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  discount: number;
  total: number;
  variant?: string;
}

interface Transaction {
  id: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'upi' | 'mixed';
  amountPaid: number;
  change: number;
  customerId?: string;
  customerName?: string;
  cashierId: string;
  cashierName: string;
  branchId?: string;
  status: 'completed' | 'voided' | 'refunded';
  createdAt: string;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  loyaltyPoints: number;
  totalSpent: number;
  visitCount: number;
  tags: string[];
  memberSince: string;
}

interface ReturnItem {
  transactionId: string;
  productId: string;
  quantity: number;
  reason: string;
  refundAmount: number;
  processedAt: string;
}

const products = new Map<string, Product>();
const transactions = new Map<string, Transaction>();
const customers = new Map<string, Customer>();
const returns = new Map<string, ReturnItem>();

// Initialize with sample products
function initSampleProducts(): void {
  const samples: Omit<Product, 'id'>[] = [
    { sku: 'SKU001', name: 'T-Shirt', category: 'Apparel', brand: 'Generic', price: 499, mrp: 599, costPrice: 250, stock: 50, minStock: 10, unit: 'piece', taxRate: 5 },
    { sku: 'SKU002', name: 'Jeans', category: 'Apparel', brand: 'Generic', price: 1299, mrp: 1599, costPrice: 600, stock: 30, minStock: 5, unit: 'piece', taxRate: 5 },
    { sku: 'SKU003', name: 'Sneakers', category: 'Footwear', brand: 'Generic', price: 1999, mrp: 2499, costPrice: 900, stock: 25, minStock: 5, unit: 'pair', taxRate: 12 },
    { sku: 'SKU004', name: 'Shampoo', category: 'Personal Care', brand: 'Generic', price: 199, mrp: 250, costPrice: 80, stock: 100, minStock: 20, unit: 'bottle', taxRate: 18 },
    { sku: 'SKU005', name: 'Face Cream', category: 'Personal Care', brand: 'Generic', price: 399, mrp: 499, costPrice: 150, stock: 40, minStock: 10, unit: 'piece', taxRate: 18 },
    { sku: 'SKU006', name: 'Snacks Pack', category: 'Food', brand: 'Generic', price: 99, mrp: 120, costPrice: 40, stock: 200, minStock: 50, unit: 'pack', taxRate: 12 },
  ];

  samples.forEach(p => {
    const product: Product = { ...p, id: uuidv4(), status: 'active' };
    products.set(product.id, product);
  });
}

initSampleProducts();

// Product CRUD
router.post('/products', async (req, res) => {
  try {
    const product: Product = { ...req.body, id: uuidv4(), status: 'active' };
    products.set(product.id, product);
    res.status(201).json({ success: true, product });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add product' });
  }
});

router.get('/products', async (req, res) => {
  try {
    const { category, search, lowStock } = req.query;
    let result = Array.from(products.values());

    if (category) result = result.filter(p => p.category === category);
    if (search) {
      const term = (search as string).toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(term) ||
        p.sku.toLowerCase().includes(term) ||
        p.barcode?.includes(term)
      );
    }
    if (lowStock === 'true') {
      result = result.filter(p => p.stock <= p.minStock);
    }

    res.json({ products: result, count: result.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

router.get('/products/:id', async (req, res) => {
  try {
    const product = products.get(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ product });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

router.put('/products/:id', async (req, res) => {
  try {
    const product = products.get(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const updated = { ...product, ...req.body, id: product.id };
    updated.status = updated.stock === 0 ? 'out_of_stock' : 'active';
    products.set(product.id, updated);

    res.json({ success: true, product: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Lookup by barcode
router.get('/products/barcode/:barcode', async (req, res) => {
  try {
    const product = Array.from(products.values()).find(p => p.barcode === req.params.barcode);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ product });
  } catch (error) {
    res.status(500).json({ error: 'Failed to lookup barcode' });
  }
});

// Create new transaction (sale)
router.post('/transactions', async (req, res) => {
  try {
    const { items, paymentMethod, amountPaid, customerId, cashierId, cashierName, branchId } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'No items in cart' });
    }

    // Validate stock and calculate totals
    let subtotal = 0;
    const cartItems: CartItem[] = [];

    for (const item of items) {
      const product = products.get(item.productId);
      if (!product) {
        return res.status(400).json({ error: `Product ${item.productId} not found` });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({ error: `Insufficient stock for ${product.name}` });
      }

      const itemTotal = (product.price - item.discount) * item.quantity;
      subtotal += itemTotal;

      cartItems.push({
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        price: product.price,
        discount: item.discount || 0,
        total: itemTotal,
        variant: item.variant,
      });

      // Deduct stock
      product.stock -= item.quantity;
      product.status = product.stock === 0 ? 'out_of_stock' : 'active';
      products.set(product.id, product);
    }

    const tax = Math.round(subtotal * 0.05); // 5% GST
    const total = subtotal + tax;
    const change = amountPaid ? amountPaid - total : 0;

    // Get customer if provided
    let customerName: string | undefined;
    if (customerId) {
      const customer = customers.get(customerId);
      customerName = customer?.name;
    }

    const transaction: Transaction = {
      id: uuidv4(),
      items: cartItems,
      subtotal,
      discount: items.reduce((sum: number, i: any) => sum + (i.discount || 0) * i.quantity, 0),
      tax,
      total,
      paymentMethod: paymentMethod || 'cash',
      amountPaid: amountPaid || total,
      change: Math.max(0, change),
      customerId,
      customerName,
      cashierId: cashierId || 'system',
      cashierName: cashierName || 'System',
      branchId,
      status: 'completed',
      createdAt: new Date().toISOString(),
    };

    transactions.set(transaction.id, transaction);

    // Update customer loyalty points
    if (customerId) {
      const customer = customers.get(customerId);
      if (customer) {
        customer.loyaltyPoints += Math.floor(total / 100);
        customer.totalSpent += total;
        customer.visitCount += 1;
        customers.set(customerId, customer);
      }
    }

    res.status(201).json({ success: true, transaction });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process transaction' });
  }
});

// Get transactions
router.get('/transactions', async (req, res) => {
  try {
    const { date, customerId, cashierId, limit } = req.query;
    let result = Array.from(transactions.values());

    if (date) {
      result = result.filter(t => t.createdAt.includes(date as string));
    }
    if (customerId) {
      result = result.filter(t => t.customerId === customerId);
    }
    if (cashierId) {
      result = result.filter(t => t.cashierId === cashierId);
    }

    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({ transactions: result.slice(0, parseInt(limit as string) || 50), count: result.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

router.get('/transactions/:id', async (req, res) => {
  try {
    const transaction = transactions.get(req.params.id);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json({ transaction });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});

// Void transaction
router.post('/transactions/:id/void', async (req, res) => {
  try {
    const transaction = transactions.get(req.params.id);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (transaction.status === 'voided') {
      return res.status(400).json({ error: 'Already voided' });
    }

    // Restore stock
    for (const item of transaction.items) {
      const product = products.get(item.productId);
      if (product) {
        product.stock += item.quantity;
        product.status = 'active';
        products.set(product.id, product);
      }
    }

    transaction.status = 'voided';
    transactions.set(transaction.id, transaction);

    res.json({ success: true, transaction });
  } catch (error) {
    res.status(500).json({ error: 'Failed to void transaction' });
  }
});

// Refund
router.post('/transactions/:id/refund', async (req, res) => {
  try {
    const { items, reason } = req.body;
    const transaction = transactions.get(req.params.id);

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    let refundAmount = 0;
    for (const refundItem of items) {
      const product = products.get(refundItem.productId);
      if (product) {
        product.stock += refundItem.quantity;
        product.status = 'active';
        products.set(product.id, product);
      }
      const price = transaction.items.find(i => i.productId === refundItem.productId)?.price || 0;
      refundAmount += price * refundItem.quantity;
    }

    const returnItem: ReturnItem = {
      transactionId: transaction.id,
      productId: items[0]?.productId,
      quantity: items.reduce((sum: number, i: any) => sum + i.quantity, 0),
      reason,
      refundAmount,
      processedAt: new Date().toISOString(),
    };

    returns.set(returnItem.transactionId + '-' + returnItem.productId, returnItem);

    res.json({ success: true, refund: returnItem });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process refund' });
  }
});

// Customer management
router.post('/customers', async (req, res) => {
  try {
    const { name, phone, email } = req.body;

    const customer: Customer = {
      id: uuidv4(),
      name,
      phone,
      email,
      loyaltyPoints: 0,
      totalSpent: 0,
      visitCount: 0,
      tags: [],
      memberSince: new Date().toISOString(),
    };

    customers.set(customer.id, customer);
    res.status(201).json({ success: true, customer });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

router.get('/customers', async (req, res) => {
  try {
    const { phone, search } = req.query;

    if (phone) {
      const customer = Array.from(customers.values()).find(c => c.phone === phone);
      return res.json({ customer: customer || null });
    }

    let result = Array.from(customers.values());
    if (search) {
      const term = (search as string).toLowerCase();
      result = result.filter(c =>
        c.name.toLowerCase().includes(term) ||
        c.phone.includes(term)
      );
    }

    res.json({ customers: result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

router.get('/customers/:id', async (req, res) => {
  try {
    const customer = customers.get(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const history = Array.from(transactions.values())
      .filter(t => t.customerId === req.params.id)
      .slice(0, 10);

    res.json({ customer, history });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

// Daily sales summary
router.get('/sales/summary', async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date as string || new Date().toISOString().split('T')[0];

    const dayTransactions = Array.from(transactions.values())
      .filter(t => t.createdAt.includes(targetDate) && t.status === 'completed');

    const totalSales = dayTransactions.reduce((sum, t) => sum + t.total, 0);
    const totalTransactions = dayTransactions.length;
    const totalItems = dayTransactions.reduce((sum, t) => sum + t.items.reduce((s, i) => s + i.quantity, 0), 0);

    const byPayment: { [key: string]: number } = {};
    dayTransactions.forEach(t => {
      byPayment[t.paymentMethod] = (byPayment[t.paymentMethod] || 0) + t.total;
    });

    res.json({
      date: targetDate,
      totalSales,
      totalTransactions,
      totalItems,
      avgTransaction: totalTransactions > 0 ? Math.round(totalSales / totalTransactions) : 0,
      byPayment,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get summary' });
  }
});

export { router, products, transactions, customers, returns };
export type { Product, CartItem, Transaction, Customer, ReturnItem };
