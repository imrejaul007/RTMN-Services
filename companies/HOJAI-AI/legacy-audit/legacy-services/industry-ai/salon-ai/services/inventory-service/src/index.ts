/**
 * HOJAI Salon Inventory Service
 * Product tracking, reorder alerts, usage tracking
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

interface Product {
  id: string;
  name: string;
  category: string;
  brand: string;
  unit: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  costPrice: number;
  sellPrice: number;
  expiryDate?: string;
  supplier?: string;
  lastRestocked?: string;
}

interface Usage {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  serviceId?: string;
  staffId: string;
  date: string;
  notes?: string;
}

interface ReorderAlert {
  productId: string;
  productName: string;
  currentStock: number;
  minStock: number;
  suggestedOrder: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

const products = new Map<string, Product>();
const usage = new Map<string, Usage>();

// Initialize with sample products
function initSampleProducts(): void {
  const samples: Omit<Product, 'id'>[] = [
    { name: 'Hair Color - Black', category: 'Hair Color', brand: 'Loreal', unit: 'tube', currentStock: 20, minStock: 10, maxStock: 50, costPrice: 150, sellPrice: 299 },
    { name: 'Hair Color - Brown', category: 'Hair Color', brand: 'Loreal', unit: 'tube', currentStock: 15, minStock: 10, maxStock: 50, costPrice: 150, sellPrice: 299 },
    { name: 'Facial Kit', category: 'Skin', brand: 'VLCC', unit: 'pack', currentStock: 8, minStock: 5, maxStock: 20, costPrice: 200, sellPrice: 599 },
    { name: 'Massage Oil', category: 'Spa', brand: 'Forest Essentials', unit: 'bottle', currentStock: 5, minStock: 3, maxStock: 15, costPrice: 300, sellPrice: 699 },
    { name: 'Nail Polish - Red', category: 'Nails', brand: 'OPI', unit: 'bottle', currentStock: 30, minStock: 10, maxStock: 50, costPrice: 80, sellPrice: 199 },
    { name: 'Cuticle Oil', category: 'Nails', brand: 'OPI', unit: 'bottle', currentStock: 12, minStock: 5, maxStock: 20, costPrice: 100, sellPrice: 249 },
    { name: 'Shampoo', category: 'Hair', brand: 'Matrix', unit: 'bottle', currentStock: 25, minStock: 10, maxStock: 50, costPrice: 120, sellPrice: 299 },
    { name: 'Conditioner', category: 'Hair', brand: 'Matrix', unit: 'bottle', currentStock: 20, minStock: 10, maxStock: 50, costPrice: 120, sellPrice: 299 },
  ];

  samples.forEach(p => {
    const product: Product = { ...p, id: uuidv4() };
    products.set(product.id, product);
  });
}

initSampleProducts();

// Product CRUD
router.post('/products', async (req, res) => {
  try {
    const product: Product = { ...req.body, id: uuidv4() };
    products.set(product.id, product);
    res.status(201).json({ success: true, product });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add product' });
  }
});

router.get('/products', async (req, res) => {
  try {
    const { category, lowStock } = req.query;
    let result = Array.from(products.values());

    if (category) result = result.filter(p => p.category === category);
    if (lowStock === 'true') {
      result = result.filter(p => p.currentStock <= p.minStock);
    }

    res.json({ products: result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get products' });
  }
});

router.put('/products/:id', async (req, res) => {
  try {
    const product = products.get(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const updated = { ...product, ...req.body, id: product.id };
    products.set(product.id, updated);

    res.json({ success: true, product: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Record usage
router.post('/usage', async (req, res) => {
  try {
    const { productId, quantity, serviceId, staffId } = req.body;

    const product = products.get(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.currentStock < quantity) {
      return res.status(400).json({ error: 'Insufficient stock' });
    }

    // Deduct from stock
    product.currentStock -= quantity;
    products.set(product.id, product);

    // Record usage
    const record: Usage = {
      id: uuidv4(),
      productId,
      productName: product.name,
      quantity,
      serviceId,
      staffId,
      date: new Date().toISOString(),
    };

    usage.set(record.id, record);

    res.status(201).json({ success: true, record, newStock: product.currentStock });
  } catch (error) {
    res.status(500).json({ error: 'Failed to record usage' });
  }
});

router.get('/usage', async (req, res) => {
  try {
    const { productId, date, days } = req.query;
    let result = Array.from(usage.values());

    if (productId) result = result.filter(u => u.productId === productId);
    if (date) result = result.filter(u => u.date.includes(date as string));
    if (days) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - parseInt(days as string));
      result = result.filter(u => new Date(u.date) >= cutoff);
    }

    res.json({ usage: result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get usage' });
  }
});

// Get reorder alerts
router.get('/alerts', async (req, res) => {
  try {
    const alerts: ReorderAlert[] = [];

    products.forEach(p => {
      if (p.currentStock <= p.minStock) {
        let priority: 'low' | 'medium' | 'high' | 'critical' = 'medium';
        if (p.currentStock === 0) priority = 'critical';
        else if (p.currentStock <= p.minStock / 2) priority = 'high';

        alerts.push({
          productId: p.id,
          productName: p.name,
          currentStock: p.currentStock,
          minStock: p.minStock,
          suggestedOrder: p.maxStock - p.currentStock,
          priority,
        });
      }
    });

    alerts.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    res.json({ alerts });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get alerts' });
  }
});

// Restock
router.post('/products/:id/restock', async (req, res) => {
  try {
    const { quantity, costPrice } = req.body;
    const product = products.get(req.params.id);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    product.currentStock += quantity;
    product.lastRestocked = new Date().toISOString();
    if (costPrice) product.costPrice = costPrice;

    products.set(product.id, product);

    res.json({ success: true, product });
  } catch (error) {
    res.status(500).json({ error: 'Failed to restock' });
  }
});

export { router, products, usage };
export type { Product, Usage, ReorderAlert };
