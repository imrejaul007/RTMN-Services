/**
 * Inventory Controller
 * Port: 4830
 *
 * Role: Stock management, reorder points, demand forecasting, waste reduction
 * Persona: Efficient planner, data-driven, cost-conscious, detail-oriented
 */

import express, { Request, Response } from 'express';

const app = express();
app.use(express.json({ limit: "10kb" }));

const PORT = process.env.PORT || 4830;

// Integration endpoints
const MEMORY_SERVICE = process.env.MEMORY_SERVICE_URL || 'http://localhost:4520';
const EVENT_SERVICE = process.env.EVENT_SERVICE_URL || 'http://localhost:4510';

// Types
interface Item {
  id: string;
  sku: string;
  name: string;
  category: string;
  currentStock: number;
  reorderPoint: number;
  reorderQuantity: number;
  unit: string;
  unitCost: number;
  leadTime: number;
  supplier: string;
  status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'overstocked';
}

interface StockMovement {
  id: string;
  itemId: string;
  type: 'purchase' | 'sale' | 'adjustment' | 'return' | 'damage';
  quantity: number;
  date: Date;
  reference?: string;
  notes?: string;
}

interface ReorderRecommendation {
  itemId: string;
  itemName: string;
  currentStock: number;
  reorderPoint: number;
  daysOfStock: number;
  recommendedQuantity: number;
  estimatedCost: number;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  supplier: string;
  estimatedDelivery: Date;
}

interface DemandForecast {
  itemId: string;
  period: string;
  predicted: number;
  actual?: number;
  confidence: number;
  trend: 'increasing' | 'stable' | 'decreasing';
}

// Seed inventory
const inventory: Item[] = [
  { id: 'item-1', sku: 'WH-001', name: 'Widget Type A', category: 'Widgets', currentStock: 150, reorderPoint: 100, reorderQuantity: 200, unit: 'pcs', unitCost: 25, leadTime: 5, supplier: 'Supplier A', status: 'in_stock' },
  { id: 'item-2', sku: 'WH-002', name: 'Widget Type B', category: 'Widgets', currentStock: 45, reorderPoint: 75, reorderQuantity: 150, unit: 'pcs', unitCost: 35, leadTime: 7, supplier: 'Supplier A', status: 'low_stock' },
  { id: 'item-3', sku: 'CP-001', name: 'Component X', category: 'Components', currentStock: 0, reorderPoint: 50, reorderQuantity: 100, unit: 'pcs', unitCost: 15, leadTime: 10, supplier: 'Supplier B', status: 'out_of_stock' },
  { id: 'item-4', sku: 'PK-001', name: 'Packaging Box M', category: 'Packaging', currentStock: 500, reorderPoint: 200, reorderQuantity: 500, unit: 'pcs', unitCost: 3, leadTime: 3, supplier: 'Supplier C', status: 'in_stock' },
  { id: 'item-5', sku: 'RM-001', name: 'Raw Material Z', category: 'Raw Materials', currentStock: 1000, reorderPoint: 300, reorderQuantity: 500, unit: 'kg', unitCost: 8, leadTime: 14, supplier: 'Supplier B', status: 'overstocked' }
];

// Calculate item status
function calculateStatus(item: Item): Item['status'] {
  if (item.currentStock === 0) return 'out_of_stock';
  if (item.currentStock < item.reorderPoint * 0.5) return 'low_stock';
  if (item.currentStock > item.reorderPoint * 3) return 'overstocked';
  return 'in_stock';
}

// Calculate days of stock
function calculateDaysOfStock(item: Item, dailyDemand: number): number {
  if (dailyDemand === 0) return 999;
  return Math.round(item.currentStock / dailyDemand);
}

// Generate reorder recommendations
function generateReorderRecommendations(): ReorderRecommendation[] {
  const recommendations: ReorderRecommendation[] = [];

  inventory.forEach(item => {
    const status = calculateStatus(item);
    if (status === 'low_stock' || status === 'out_of_stock') {
      const priority = status === 'out_of_stock' ? 'urgent' : 'high';
      const daysOfStock = calculateDaysOfStock(item, 20);

      recommendations.push({
        itemId: item.id,
        itemName: item.name,
        currentStock: item.currentStock,
        reorderPoint: item.reorderPoint,
        daysOfStock,
        recommendedQuantity: item.reorderQuantity,
        estimatedCost: item.reorderQuantity * item.unitCost,
        priority,
        supplier: item.supplier,
        estimatedDelivery: new Date(Date.now() + item.leadTime * 24 * 60 * 60 * 1000)
      });
    }
  });

  return recommendations.sort((a, b) => {
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

// Forecast demand using simple moving average
function forecastDemand(itemId: string, periods: number = 6): DemandForecast {
  // Simulated historical data
  const historical = [18, 22, 19, 25, 21, 24];

  const avg = historical.reduce((a, b) => a + b, 0) / historical.length;
  const trend = avg > historical[historical.length - 1] ? 'increasing' :
                avg < historical[historical.length - 1] ? 'decreasing' : 'stable';

  const variance = Math.sqrt(historical.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / historical.length);
  const confidence = Math.max(50, Math.min(95, 100 - (variance / avg * 100)));

  return {
    itemId,
    period: 'next_30_days',
    predicted: Math.round(avg * 30),
    confidence: Math.round(confidence),
    trend
  };
}

// Get inventory overview
app.get('/api/inventory', (req: Request, res: Response) => {
  const statusCounts = inventory.reduce((acc, item) => {
    const status = calculateStatus(item);
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalValue = inventory.reduce((sum, item) => sum + (item.currentStock * item.unitCost), 0);

  res.json({
    inventory: inventory.map(item => ({ ...item, status: calculateStatus(item) })),
    summary: {
      totalItems: inventory.length,
      totalValue,
      ...statusCounts,
      totalStock: inventory.reduce((sum, item) => sum + item.currentStock, 0)
    },
    alerts: {
      outOfStock: inventory.filter(i => calculateStatus(i) === 'out_of_stock').length,
      lowStock: inventory.filter(i => calculateStatus(i) === 'low_stock').length,
      overstocked: inventory.filter(i => calculateStatus(i) === 'overstocked').length
    }
  });
});

// Get single item
app.get('/api/inventory/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  const item = inventory.find(i => i.id === id);

  if (!item) {
    return res.status(404).json({ error: 'Item not found' });
  }

  const forecast = forecastDemand(item.id);
  const daysOfStock = calculateDaysOfStock(item, forecast.predicted / 30);

  res.json({
    item: { ...item, status: calculateStatus(item) },
    forecast,
    metrics: {
      daysOfStock,
      turnoverRate: 12,
      holdingCost: item.currentStock * item.unitCost * 0.2
    },
    movements: [
      { type: 'purchase', quantity: 200, date: '2026-05-20' },
      { type: 'sale', quantity: 50, date: '2026-05-22' },
      { type: 'sale', quantity: 25, date: '2026-05-25' }
    ]
  });
});

// Update stock
app.patch('/api/inventory/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { adjustment, type, notes } = req.body;

  const item = inventory.find(i => i.id === id);

  if (!item) {
    return res.status(404).json({ error: 'Item not found' });
  }

  const movement: StockMovement = {
    id: `mov-${Date.now()}`,
    itemId: id,
    type,
    quantity: adjustment,
    date: new Date(),
    notes
  };

  if (type === 'purchase' || type === 'return') {
    item.currentStock += Math.abs(adjustment);
  } else if (type === 'sale' || type === 'damage') {
    item.currentStock -= Math.abs(adjustment);
  } else {
    item.currentStock += adjustment;
  }

  item.status = calculateStatus(item);

  res.json({
    item,
    movement,
    message: `Stock ${type === 'purchase' ? 'added' : 'reduced'} by ${Math.abs(adjustment)} ${item.unit}`
  });
});

// Get reorder recommendations
app.get('/api/reorder', (req: Request, res: Response) => {
  const recommendations = generateReorderRecommendations();

  res.json({
    recommendations,
    summary: {
      total: recommendations.length,
      urgent: recommendations.filter(r => r.priority === 'urgent').length,
      high: recommendations.filter(r => r.priority === 'high').length,
      totalCost: recommendations.reduce((sum, r) => sum + r.estimatedCost, 0)
    }
  });
});

// Create purchase order
app.post('/api/purchase-orders', (req: Request, res: Response) => {
  const { items, supplier, notes } = req.body;

  const order = {
    id: `po-${Date.now()}`,
    items: items || generateReorderRecommendations().slice(0, 3).map(r => ({
      itemId: r.itemId,
      itemName: r.itemName,
      quantity: r.recommendedQuantity,
      unitCost: inventory.find(i => i.id === r.itemId)?.unitCost || 0
    })),
    supplier: supplier || 'Supplier A',
    status: 'draft',
    totalAmount: 0,
    createdAt: new Date(),
    notes
  };

  order.totalAmount = order.items.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);

  res.json({
    order,
    approvalWorkflow: {
      required: order.totalAmount > 50000,
      approvers: ['manager@company.com']
    }
  });
});

// Demand forecast
app.get('/api/forecast/:itemId', (req: Request, res: Response) => {
  const { itemId } = req.params;

  const item = inventory.find(i => i.id === itemId) || inventory[0];
  const forecast = forecastDemand(itemId);

  res.json({
    item: { id: item.id, name: item.name, currentStock: item.currentStock },
    forecast,
    recommendations: forecast.trend === 'increasing'
      ? 'Consider increasing reorder quantities by 20%'
      : forecast.trend === 'decreasing'
        ? 'Monitor closely, may need to reduce stock levels'
        : 'Maintain current reorder strategy',
    seasonalAdjustment: {
      current: 1.0,
      nextMonth: 1.15,
      note: 'Peak season approaching'
    }
  });
});

// Stock movements
app.get('/api/movements/:itemId', (req: Request, res: Response) => {
  const { itemId } = req.params;

  const movements: StockMovement[] = [
    { id: 'mov-1', itemId, type: 'purchase', quantity: 200, date: new Date('2026-05-20') },
    { id: 'mov-2', itemId, type: 'sale', quantity: 50, date: new Date('2026-05-22') },
    { id: 'mov-3', itemId, type: 'sale', quantity: 25, date: new Date('2026-05-25') },
    { id: 'mov-4', itemId, type: 'damage', quantity: 5, date: new Date('2026-05-26') },
    { id: 'mov-5', itemId, type: 'return', quantity: 10, date: new Date('2026-05-28') }
  ];

  res.json({
    movements,
    summary: {
      totalIn: movements.filter(m => m.type === 'purchase' || m.type === 'return').reduce((sum, m) => sum + m.quantity, 0),
      totalOut: movements.filter(m => m.type === 'sale' || m.type === 'damage').reduce((sum, m) => sum + m.quantity, 0),
      netChange: movements.filter(m => m.type === 'purchase' || m.type === 'return').reduce((sum, m) => sum + m.quantity, 0) -
                movements.filter(m => m.type === 'sale' || m.type === 'damage').reduce((sum, m) => sum + m.quantity, 0)
    }
  });
});

// Inventory valuation
app.get('/api/valuation', (req: Request, res: Response) => {
  const valuation = inventory.map(item => ({
    item: { id: item.id, name: item.name, sku: item.sku },
    currentStock: item.currentStock,
    unitCost: item.unitCost,
    totalValue: item.currentStock * item.unitCost,
    category: item.category
  }));

  const byCategory = valuation.reduce((acc, v) => {
    if (!acc[v.category]) acc[v.category] = 0;
    acc[v.category] += v.totalValue;
    return acc;
  }, {} as Record<string, number>);

  res.json({
    valuation,
    summary: {
      totalValue: valuation.reduce((sum, v) => sum + v.totalValue, 0),
      byCategory,
      avgItemValue: Math.round(valuation.reduce((sum, v) => sum + v.totalValue, 0) / valuation.length)
    },
    metrics: {
      holdingCost: valuation.reduce((sum, v) => sum + v.totalValue, 0) * 0.2,
      carryingCost: '20% of inventory value',
      turnoverRate: 8.5
    }
  });
});

// ABC Analysis
app.get('/api/abc-analysis', (req: Request, res: Response) => {
  const analysis = inventory.map(item => ({
    item: { id: item.id, name: item.name, sku: item.sku },
    annualUsage: Math.round(Math.random() * 10000) + 1000,
    unitCost: item.unitCost,
    annualValue: 0
  }));

  analysis.forEach(a => {
    a.annualValue = a.annualUsage * a.unitCost;
  });

  const totalValue = analysis.reduce((sum, a) => sum + a.annualValue, 0);
  let cumulative = 0;

  analysis.forEach(a => {
    cumulative += a.annualValue;
    const percentage = (cumulative / totalValue) * 100;
    a.class = percentage <= 80 ? 'A' : percentage <= 95 ? 'B' : 'C';
  });

  analysis.sort((a, b) => b.annualValue - a.annualValue);

  res.json({
    analysis,
    summary: {
      classA: { count: analysis.filter(a => a.class === 'A').length, percentage: 80 },
      classB: { count: analysis.filter(a => a.class === 'B').length, percentage: 15 },
      classC: { count: analysis.filter(a => a.class === 'C').length, percentage: 5 }
    },
    recommendations: {
      classA: 'Frequent counting, tight control, focus on service levels',
      classB: 'Regular counting, moderate control',
      classC: 'Annual counting acceptable, minimal control'
    }
  });
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'inventory-controller',
    port: PORT,
    uptime: process.uptime()
  });
});

app.listen(PORT, () => {
  console.log(`Inventory Controller running on port ${PORT}`);
  console.log('Role: Stock management, reorder points, forecasting');
});

export default app;
