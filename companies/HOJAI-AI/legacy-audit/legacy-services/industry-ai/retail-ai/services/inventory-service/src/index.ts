/**
 * HOJAI Retail Inventory Service
 * Stock management, reorder suggestions, multi-location
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

interface InventoryItem {
  id: string;
  productId: string;
  sku: string;
  name: string;
  location: string; // warehouse/store ID
  stock: number;
  minStock: number;
  maxStock: number;
  reorderPoint: number;
  lastRestocked?: string;
  lastSold?: string;
  avgDailySales: number;
}

interface Transfer {
  id: string;
  fromLocation: string;
  toLocation: string;
  productId: string;
  quantity: number;
  status: 'pending' | 'shipped' | 'delivered';
  createdAt: string;
}

interface StockAlert {
  id: string;
  productId: string;
  productName: string;
  location: string;
  currentStock: number;
  minStock: number;
  alertType: 'low' | 'out' | 'overstock';
  daysUntilStockout: number;
  suggestedAction: string;
}

const inventory = new Map<string, InventoryItem>();
const transfers = new Map<string, Transfer>();

// Add inventory item
router.post('/items', async (req, res) => {
  try {
    const item: InventoryItem = { ...req.body, id: uuidv4() };
    inventory.set(item.id, item);
    res.status(201).json({ success: true, item });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add item' });
  }
});

// Get inventory
router.get('/items', async (req, res) => {
  try {
    const { location, lowStock } = req.query;
    let result = Array.from(inventory.values());

    if (location) result = result.filter(i => i.location === location);
    if (lowStock === 'true') {
      result = result.filter(i => i.stock <= i.minStock);
    }

    res.json({ items: result, count: result.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get inventory' });
  }
});

// Update stock
router.patch('/items/:id/stock', async (req, res) => {
  try {
    const { adjustment, reason } = req.body;
    const item = inventory.get(req.params.id);

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    item.stock += adjustment;
    if (adjustment > 0) {
      item.lastRestocked = new Date().toISOString();
    } else {
      item.lastSold = new Date().toISOString();
    }

    inventory.set(item.id, item);

    res.json({ success: true, item });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update stock' });
  }
});

// Transfer between locations
router.post('/transfers', async (req, res) => {
  try {
    const { fromLocation, toLocation, productId, quantity } = req.body;

    const transfer: Transfer = {
      id: uuidv4(),
      fromLocation,
      toLocation,
      productId,
      quantity,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    transfers.set(transfer.id, transfer);
    res.status(201).json({ success: true, transfer });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create transfer' });
  }
});

// Get alerts
router.get('/alerts', async (req, res) => {
  try {
    const alerts: StockAlert[] = [];

    inventory.forEach(item => {
      if (item.stock === 0) {
        alerts.push({
          id: uuidv4(),
          productId: item.productId,
          productName: item.name,
          location: item.location,
          currentStock: item.stock,
          minStock: item.minStock,
          alertType: 'out',
          daysUntilStockout: 0,
          suggestedAction: 'Urgent reorder required',
        });
      } else if (item.stock <= item.minStock) {
        const daysOut = item.avgDailySales > 0 ? Math.floor(item.stock / item.avgDailySales) : 999;
        alerts.push({
          id: uuidv4(),
          productId: item.productId,
          productName: item.name,
          location: item.location,
          currentStock: item.stock,
          minStock: item.minStock,
          alertType: 'low',
          daysUntilStockout: daysOut,
          suggestedAction: daysOut <= 3 ? 'Reorder immediately' : 'Reorder soon',
        });
      }
    });

    alerts.sort((a, b) => a.daysUntilStockout - b.daysUntilStockout);

    res.json({ alerts });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get alerts' });
  }
});

export { router, inventory, transfers };
