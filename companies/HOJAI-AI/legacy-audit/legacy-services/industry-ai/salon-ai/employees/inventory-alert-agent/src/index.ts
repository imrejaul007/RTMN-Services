/**
 * Inventory Alert Agent
 *
 * AI Agent that monitors inventory and triggers:
 * - Low stock alerts
 * - Reorder recommendations
 * - Supplier negotiations
 * - Usage-based forecasting
 */

import express, { Request, Response } from 'express';
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const app = express();
const PORT = parseInt(process.env.INVENTORY_ALERT_PORT || '4814', 10);

app.use(express.json());

// Types
interface Product {
  productId: string;
  name: string;
  category: string;
  currentStock: number;
  lowStockThreshold: number;
  reorderPoint: number;
  maxStock: number;
  costPrice: number;
  sellingPrice: number;
  supplierId: string;
  supplierName: string;
  leadTimeDays: number;
  usagePerService: Record<string, number>;
}

interface InventoryAlert {
  alertId: string;
  productId: string;
  productName: string;
  category: string;
  currentStock: number;
  threshold: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  daysUntilStockout: number;
  message: string;
  suggestedAction: string;
}

interface ReorderRecommendation {
  productId: string;
  productName: string;
  category: string;
  currentStock: number;
  recommendedOrder: number;
  urgency: 'immediate' | 'soon' | 'planned';
  estimatedCost: number;
  supplierId: string;
  supplierName: string;
  leadTimeDays: number;
  reason: string;
}

interface UsageForecast {
  productId: string;
  productName: string;
  category: string;
  avgDailyUsage: number;
  predictedStockoutDate: Date;
  daysUntilStockout: number;
  confidence: number;
}

// In-memory inventory (would connect to REZ Salon Inventory)
const inventory = new Map<string, Product>();

// Initialize with sample inventory
function initializeSampleInventory() {
  const sampleProducts: Product[] = [
    {
      productId: 'PROD-001',
      name: 'Premium Hair Color - Dark Brown',
      category: 'color',
      currentStock: 5,
      lowStockThreshold: 20,
      reorderPoint: 30,
      maxStock: 100,
      costPrice: 300,
      sellingPrice: 500,
      supplierId: 'SUP-001',
      supplierName: 'Beauty Supplies Co.',
      leadTimeDays: 7,
      usagePerService: { 'hair-color': 0.5, 'balayage': 1 }
    },
    {
      productId: 'PROD-002',
      name: 'Premium Hair Color - Black',
      category: 'color',
      currentStock: 8,
      lowStockThreshold: 20,
      reorderPoint: 30,
      maxStock: 100,
      costPrice: 300,
      sellingPrice: 500,
      supplierId: 'SUP-001',
      supplierName: 'Beauty Supplies Co.',
      leadTimeDays: 7,
      usagePerService: { 'hair-color': 0.5, 'balayage': 1 }
    },
    {
      productId: 'PROD-003',
      name: 'Developer Cream - 40 Volume',
      category: 'color',
      currentStock: 12,
      lowStockThreshold: 30,
      reorderPoint: 40,
      maxStock: 150,
      costPrice: 150,
      sellingPrice: 250,
      supplierId: 'SUP-001',
      supplierName: 'Beauty Supplies Co.',
      leadTimeDays: 7,
      usagePerService: { 'hair-color': 1, 'balayage': 1.5 }
    },
    {
      productId: 'PROD-004',
      name: 'Keratin Treatment Serum',
      category: 'treatment',
      currentStock: 2,
      lowStockThreshold: 15,
      reorderPoint: 25,
      maxStock: 80,
      costPrice: 400,
      sellingPrice: 700,
      supplierId: 'SUP-002',
      supplierName: 'Professional Beauty Products',
      leadTimeDays: 10,
      usagePerService: { 'keratin': 1 }
    },
    {
      productId: 'PROD-005',
      name: 'Deep Conditioning Mask',
      category: 'treatment',
      currentStock: 18,
      lowStockThreshold: 25,
      reorderPoint: 35,
      maxStock: 100,
      costPrice: 200,
      sellingPrice: 400,
      supplierId: 'SUP-002',
      supplierName: 'Professional Beauty Products',
      leadTimeDays: 10,
      usagePerService: { 'deep-conditioning': 0.5, 'hair-spa': 0.5 }
    },
    {
      productId: 'PROD-006',
      name: 'Organic Shampoo - 500ml',
      category: 'shampoo',
      currentStock: 25,
      lowStockThreshold: 30,
      reorderPoint: 40,
      maxStock: 120,
      costPrice: 200,
      sellingPrice: 350,
      supplierId: 'SUP-003',
      supplierName: 'Organic Beauty Supply',
      leadTimeDays: 5,
      usagePerService: { 'hair-spa': 0.3, 'haircut': 0.1 }
    },
    {
      productId: 'PROD-007',
      name: 'Hair Serum - Anti-Frizz',
      category: 'treatment',
      currentStock: 15,
      lowStockThreshold: 20,
      reorderPoint: 30,
      maxStock: 80,
      costPrice: 250,
      sellingPrice: 450,
      supplierId: 'SUP-002',
      supplierName: 'Professional Beauty Products',
      leadTimeDays: 10,
      usagePerService: { 'keratin': 0.5, 'blowout': 0.2 }
    },
    {
      productId: 'PROD-008',
      name: 'Nail Polish - Red',
      category: 'nails',
      currentStock: 30,
      lowStockThreshold: 25,
      reorderPoint: 35,
      maxStock: 100,
      costPrice: 80,
      sellingPrice: 150,
      supplierId: 'SUP-004',
      supplierName: 'Nail Art Supplies',
      leadTimeDays: 3,
      usagePerService: { 'manicure': 0.2, 'pedicure': 0.2 }
    },
    {
      productId: 'PROD-009',
      name: 'Facial Cream - Moisturizing',
      category: 'skincare',
      currentStock: 10,
      lowStockThreshold: 15,
      reorderPoint: 25,
      maxStock: 60,
      costPrice: 300,
      sellingPrice: 600,
      supplierId: 'SUP-005',
      supplierName: 'Skincare Direct',
      leadTimeDays: 7,
      usagePerService: { 'facial': 0.5 }
    },
    {
      productId: 'PROD-010',
      name: 'Color Protect Shampoo',
      category: 'shampoo',
      currentStock: 20,
      lowStockThreshold: 25,
      reorderPoint: 35,
      maxStock: 100,
      costPrice: 250,
      sellingPrice: 450,
      supplierId: 'SUP-002',
      supplierName: 'Professional Beauty Products',
      leadTimeDays: 10,
      usagePerService: { 'hair-color': 0.3 }
    }
  ];

  for (const product of sampleProducts) {
    inventory.set(product.productId, product);
  }
}

initializeSampleInventory();

// API Endpoints

/**
 * Get all inventory alerts
 * GET /api/alerts
 */
app.get('/api/alerts', (req: Request, res: Response) => {
  try {
    const alerts: InventoryAlert[] = [];

    for (const [productId, product] of inventory) {
      if (product.currentStock <= product.lowStockThreshold) {
        const daysUntilStockout = calculateDaysUntilStockout(product);
        const priority = determinePriority(product.currentStock, product.lowStockThreshold, daysUntilStockout);

        alerts.push({
          alertId: `ALERT-${Date.now()}-${productId}`,
          productId,
          productName: product.name,
          category: product.category,
          currentStock: product.currentStock,
          threshold: product.lowStockThreshold,
          priority,
          daysUntilStockout,
          message: generateAlertMessage(product, daysUntilStockout),
          suggestedAction: generateSuggestedAction(product, daysUntilStockout)
        });
      }
    }

    // Sort by priority
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    alerts.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    logger.info(`Generated ${alerts.length} inventory alerts`);

    res.json({ success: true, data: alerts });
  } catch (error) {
    logger.error('Error generating alerts:', error);
    res.status(500).json({ success: false, error: 'Failed to generate alerts' });
  }
});

/**
 * Get reorder recommendations
 * GET /api/reorder
 */
app.get('/api/reorder', (req: Request, res: Response) => {
  try {
    const recommendations: ReorderRecommendation[] = [];

    for (const [productId, product] of inventory) {
      if (product.currentStock <= product.reorderPoint) {
        const daysUntilStockout = calculateDaysUntilStockout(product);
        const recommendedOrder = calculateRecommendedOrder(product);
        const urgency = determineUrgency(daysUntilStockout, product.leadTimeDays);

        recommendations.push({
          productId,
          productName: product.name,
          category: product.category,
          currentStock: product.currentStock,
          recommendedOrder,
          urgency,
          estimatedCost: recommendedOrder * product.costPrice,
          supplierId: product.supplierId,
          supplierName: product.supplierName,
          leadTimeDays: product.leadTimeDays,
          reason: generateReorderReason(product, daysUntilStockout)
        });
      }
    }

    // Sort by urgency
    const urgencyOrder = { immediate: 0, soon: 1, planned: 2 };
    recommendations.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);

    logger.info(`Generated ${recommendations.length} reorder recommendations`);

    res.json({ success: true, data: recommendations });
  } catch (error) {
    logger.error('Error generating reorder recommendations:', error);
    res.status(500).json({ success: false, error: 'Failed to generate recommendations' });
  }
});

/**
 * Get usage forecast
 * GET /api/forecast
 */
app.get('/api/forecast', (req: Request, res: Response) => {
  try {
    const forecasts: UsageForecast[] = [];

    for (const [productId, product] of inventory) {
      const avgDailyUsage = calculateAvgDailyUsage(product);
      const daysUntilStockout = avgDailyUsage > 0
        ? Math.floor(product.currentStock / avgDailyUsage)
        : 999;
      const predictedStockoutDate = new Date(Date.now() + daysUntilStockout * 24 * 60 * 60 * 1000);

      forecasts.push({
        productId,
        productName: product.name,
        category: product.category,
        avgDailyUsage,
        predictedStockoutDate,
        daysUntilStockout,
        confidence: 0.8 // Would be calculated from historical data
      });
    }

    // Sort by days until stockout
    forecasts.sort((a, b) => a.daysUntilStockout - b.daysUntilStockout);

    res.json({ success: true, data: forecasts });
  } catch (error) {
    logger.error('Error generating forecast:', error);
    res.status(500).json({ success: false, error: 'Failed to generate forecast' });
  }
});

/**
 * Update stock level
 * POST /api/stock
 */
app.post('/api/stock', (req: Request, res: Response) => {
  try {
    const { productId, quantity, operation } = req.body;

    const product = inventory.get(productId);
    if (!product) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }

    if (operation === 'add') {
      product.currentStock += quantity;
    } else if (operation === 'deduct') {
      product.currentStock = Math.max(0, product.currentStock - quantity);
    } else if (operation === 'set') {
      product.currentStock = quantity;
    }

    inventory.set(productId, product);

    logger.info(`Updated stock for ${productId}: ${operation} ${quantity}, new stock: ${product.currentStock}`);

    res.json({ success: true, data: product });
  } catch (error) {
    logger.error('Error updating stock:', error);
    res.status(500).json({ success: false, error: 'Failed to update stock' });
  }
});

/**
 * Record product usage
 * POST /api/usage
 */
app.post('/api/usage', (req: Request, res: Response) => {
  try {
    const { productId, serviceId, quantity = 1 } = req.body;

    const product = inventory.get(productId);
    if (!product) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }

    // Deduct from stock
    product.currentStock = Math.max(0, product.currentStock - quantity);
    inventory.set(productId, product);

    logger.info(`Recorded usage for ${productId}: ${quantity} units, new stock: ${product.currentStock}`);

    // Check if alert should be triggered
    const alerts: InventoryAlert[] = [];
    if (product.currentStock <= product.lowStockThreshold) {
      alerts.push({
        alertId: `ALERT-${Date.now()}-${productId}`,
        productId,
        productName: product.name,
        category: product.category,
        currentStock: product.currentStock,
        threshold: product.lowStockThreshold,
        priority: 'high',
        daysUntilStockout: calculateDaysUntilStockout(product),
        message: `Low stock alert: ${product.name} running low`,
        suggestedAction: `Consider reordering ${product.name}`
      });
    }

    res.json({ success: true, data: { product, alerts } });
  } catch (error) {
    logger.error('Error recording usage:', error);
    res.status(500).json({ success: false, error: 'Failed to record usage' });
  }
});

/**
 * Get all products
 * GET /api/products
 */
app.get('/api/products', (req: Request, res: Response) => {
  try {
    const products = Array.from(inventory.values());
    res.json({ success: true, data: products });
  } catch (error) {
    logger.error('Error getting products:', error);
    res.status(500).json({ success: false, error: 'Failed to get products' });
  }
});

/**
 * Health check
 * GET /health
 */
app.get('/health', (req: Request, res: Response) => {
  const criticalAlerts = Array.from(inventory.values())
    .filter(p => p.currentStock <= p.lowStockThreshold * 0.5).length;

  res.json({
    status: 'healthy',
    service: 'inventory-alert-agent',
    version: '1.0.0',
    productsTracked: inventory.size,
    criticalAlerts
  });
});

// Helper functions

function calculateAvgDailyUsage(product: Product): number {
  // Simplified calculation - would use historical data
  const usageValues = Object.values(product.usagePerService);
  if (usageValues.length === 0) return 0.5; // Default
  return usageValues.reduce((sum, u) => sum + u, 0) / usageValues.length;
}

function calculateDaysUntilStockout(product: Product): number {
  const avgDailyUsage = calculateAvgDailyUsage(product);
  if (avgDailyUsage <= 0) return 999;
  return Math.floor(product.currentStock / avgDailyUsage);
}

function determinePriority(currentStock: number, threshold: number, daysUntilStockout: number): InventoryAlert['priority'] {
  if (currentStock <= threshold * 0.25 || daysUntilStockout <= 3) return 'critical';
  if (currentStock <= threshold * 0.5 || daysUntilStockout <= 7) return 'high';
  if (currentStock <= threshold * 0.75 || daysUntilStockout <= 14) return 'medium';
  return 'low';
}

function determineUrgency(daysUntilStockout: number, leadTimeDays: number): ReorderRecommendation['urgency'] {
  if (daysUntilStockout <= leadTimeDays) return 'immediate';
  if (daysUntilStockout <= leadTimeDays * 2) return 'soon';
  return 'planned';
}

function calculateRecommendedOrder(product: Product): number {
  // Order enough to reach max stock
  return product.maxStock - product.currentStock;
}

function generateAlertMessage(product: Product, daysUntilStockout: number): string {
  if (daysUntilStockout <= 3) {
    return `CRITICAL: ${product.name} will run out in ${daysUntilStockout} days!`;
  }
  if (daysUntilStockout <= 7) {
    return `Low stock: ${product.name} (${product.currentStock} units, ${daysUntilStockout} days remaining)`;
  }
  return `Stock running low: ${product.name} (${product.currentStock} units)`;
}

function generateSuggestedAction(product: Product, daysUntilStockout: number): string {
  if (daysUntilStockout <= product.leadTimeDays) {
    return `Order ${product.maxStock - product.currentStock} units from ${product.supplierName} IMMEDIATELY (${product.leadTimeDays} day lead time)`;
  }
  return `Schedule reorder for ${product.maxStock - product.currentStock} units from ${product.supplierName}`;
}

function generateReorderReason(product: Product, daysUntilStockout: number): string {
  if (daysUntilStockout <= product.leadTimeDays) {
    return `Stock will run out before new order arrives (${daysUntilStockout} days vs ${product.leadTimeDays} day lead time)`;
  }
  return `Stock below reorder point (${product.currentStock}/${product.reorderPoint})`;
}

// Start server
app.listen(PORT, () => {
  logger.info(`Inventory Alert Agent running on port ${PORT}`);
});

export { app };
