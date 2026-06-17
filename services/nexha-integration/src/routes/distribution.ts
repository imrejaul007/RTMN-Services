import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';
import {
  DistributionOrder,
  DistributionChannel,
  Warehouse,
  createDistributionOrder,
  SupplierAddress
} from '../models/NexhaProfile';
import { CustomerOpsBridge } from '../services/customerOpsBridge';
import { OrderSync } from '../services/orderSync';

export interface DistributionDependencies {
  customerOpsBridge: CustomerOpsBridge;
  orderSync: OrderSync;
  logger: winston.Logger;
}

// In-memory stores (replace with database in production)
const distributionOrders: Map<string, DistributionOrder> = new Map();
const warehouses: Map<string, Warehouse> = new Map();

// Initialize with sample warehouses
const sampleWarehouses: Warehouse[] = [
  {
    id: 'wh-001',
    name: 'Central Distribution Center',
    code: 'CDC',
    address: {
      street: '123 Logistics Ave',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400001',
      country: 'India',
      coordinates: { lat: 19.0760, lng: 72.8777 }
    },
    capacity: 100000,
    currentUtilization: 45000,
    manager: 'Rajesh Kumar',
    contactPhone: '+91-9876543210',
    isActive: true
  },
  {
    id: 'wh-002',
    name: 'North Hub',
    code: 'NH',
    address: {
      street: '456 Industrial Area',
      city: 'Delhi',
      state: 'Delhi',
      postalCode: '110001',
      country: 'India',
      coordinates: { lat: 28.6139, lng: 77.2090 }
    },
    capacity: 75000,
    currentUtilization: 38000,
    manager: 'Priya Sharma',
    contactPhone: '+91-9876543211',
    isActive: true
  },
  {
    id: 'wh-003',
    name: 'East Zone Warehouse',
    code: 'EZ',
    address: {
      street: '789 Trade Park',
      city: 'Kolkata',
      state: 'West Bengal',
      postalCode: '700001',
      country: 'India',
      coordinates: { lat: 22.5726, lng: 88.3639 }
    },
    capacity: 50000,
    currentUtilization: 22000,
    manager: 'Amit Ghosh',
    contactPhone: '+91-9876543212',
    isActive: true
  }
];

sampleWarehouses.forEach(wh => warehouses.set(wh.id, wh));

// Available distribution channels
const channels: DistributionChannel[] = [
  { id: 'ch-001', name: 'Retail Stores', type: 'retail', priority: 1 },
  { id: 'ch-002', name: 'Wholesale Partners', type: 'wholesale', priority: 2 },
  { id: 'ch-003', name: 'Online Marketplace', type: 'online', priority: 3 },
  { id: 'ch-004', name: 'Direct Sales', type: 'direct', priority: 4 }
];

export default function distributionRoutes(
  bridge: CustomerOpsBridge,
  orderSync: OrderSync,
  logger: winston.Logger
): Router {
  const router = Router();

  // ============ Distribution Orders ============

  // List all distribution orders
  router.get('/', async (_req: Request, res: Response) => {
    try {
      const orders = Array.from(distributionOrders.values());
      res.json({
        success: true,
        count: orders.length,
        data: orders
      });
    } catch (error) {
      logger.error('Error listing distribution orders:', error);
      res.status(500).json({ success: false, error: 'Failed to list orders' });
    }
  });

  // Get single distribution order
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const order = distributionOrders.get(req.params.id);
      if (!order) {
        return res.status(404).json({ success: false, error: 'Order not found' });
      }
      res.json({ success: true, data: order });
    } catch (error) {
      logger.error('Error getting distribution order:', error);
      res.status(500).json({ success: false, error: 'Failed to get order' });
    }
  });

  // Create new distribution order
  router.post('/', async (req: Request, res: Response) => {
    try {
      const { sourceWarehouseId, destinationAddress, channel, items, notes, currency } = req.body;

      if (!sourceWarehouseId || !destinationAddress || !items || items.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Source warehouse, destination address, and items are required'
        });
      }

      const warehouse = warehouses.get(sourceWarehouseId);
      if (!warehouse) {
        return res.status(400).json({ success: false, error: 'Invalid warehouse ID' });
      }

      // Calculate total amount
      const totalAmount = items.reduce((sum: number, item: { quantity: number; unitPrice: number }) => {
        return sum + (item.quantity * item.unitPrice);
      }, 0);

      const order = createDistributionOrder({
        sourceWarehouseId,
        destinationAddress,
        channel: channel || channels[0],
        items,
        totalAmount,
        currency: currency || 'USD',
        notes
      });

      distributionOrders.set(order.id, order);
      logger.info(`Created distribution order: ${order.orderNumber}`);

      // Sync to Order Twin
      try {
        await orderSync.syncToOrderTwin(order);
      } catch (syncError) {
        logger.warn('Order sync warning:', syncError);
      }

      res.status(201).json({ success: true, data: order });
    } catch (error) {
      logger.error('Error creating distribution order:', error);
      res.status(500).json({ success: false, error: 'Failed to create order' });
    }
  });

  // Update distribution order
  router.put('/:id', async (req: Request, res: Response) => {
    try {
      const order = distributionOrders.get(req.params.id);
      if (!order) {
        return res.status(404).json({ success: false, error: 'Order not found' });
      }

      const updatedOrder: DistributionOrder = {
        ...order,
        ...req.body,
        id: order.id,
        type: 'distribution_order',
        updatedAt: new Date()
      };

      distributionOrders.set(order.id, updatedOrder);
      logger.info(`Updated distribution order: ${updatedOrder.orderNumber}`);

      // Sync to twins
      try {
        await orderSync.syncToOrderTwin(updatedOrder);
      } catch (syncError) {
        logger.warn('Order sync warning:', syncError);
      }

      res.json({ success: true, data: updatedOrder });
    } catch (error) {
      logger.error('Error updating distribution order:', error);
      res.status(500).json({ success: false, error: 'Failed to update order' });
    }
  });

  // Update order status
  router.patch('/:id/status', async (req: Request, res: Response) => {
    try {
      const order = distributionOrders.get(req.params.id);
      if (!order) {
        return res.status(404).json({ success: false, error: 'Order not found' });
      }

      const { status, trackingNumber, carrier } = req.body;
      const validStatuses = ['pending', 'processing', 'packed', 'shipped', 'in_transit', 'delivered', 'failed'];

      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        });
      }

      order.status = status as DistributionOrder['status'];
      order.updatedAt = new Date();

      if (trackingNumber) {
        order.trackingNumber = trackingNumber;
      }
      if (carrier) {
        order.carrier = carrier;
      }

      distributionOrders.set(order.id, order);
      logger.info(`Updated distribution order status: ${order.orderNumber} -> ${status}`);

      // Publish status change event
      try {
        await bridge.publishEvent({
          type: 'distribution.order.status_changed',
          source: 'distribution',
          entityType: 'distribution_order',
          entityId: order.id,
          action: 'status_changed',
          data: {
            orderNumber: order.orderNumber,
            newStatus: status,
            trackingNumber: order.trackingNumber,
            carrier: order.carrier
          }
        });
      } catch (eventError) {
        logger.warn('Event publish warning:', eventError);
      }

      res.json({ success: true, data: order });
    } catch (error) {
      logger.error('Error updating distribution order status:', error);
      res.status(500).json({ success: false, error: 'Failed to update status' });
    }
  });

  // Get orders by warehouse
  router.get('/warehouse/:warehouseId', async (req: Request, res: Response) => {
    try {
      const orders = Array.from(distributionOrders.values())
        .filter(order => order.sourceWarehouseId === req.params.warehouseId);

      res.json({
        success: true,
        count: orders.length,
        data: orders
      });
    } catch (error) {
      logger.error('Error listing warehouse orders:', error);
      res.status(500).json({ success: false, error: 'Failed to list orders' });
    }
  });

  // Get orders by channel
  router.get('/channel/:channelId', async (req: Request, res: Response) => {
    try {
      const orders = Array.from(distributionOrders.values())
        .filter(order => order.channel.id === req.params.channelId);

      res.json({
        success: true,
        count: orders.length,
        data: orders
      });
    } catch (error) {
      logger.error('Error listing channel orders:', error);
      res.status(500).json({ success: false, error: 'Failed to list orders' });
    }
  });

  // ============ Warehouses ============

  // List all warehouses
  router.get('/warehouses/all', async (_req: Request, res: Response) => {
    try {
      const warehouseList = Array.from(warehouses.values());
      res.json({
        success: true,
        count: warehouseList.length,
        data: warehouseList
      });
    } catch (error) {
      logger.error('Error listing warehouses:', error);
      res.status(500).json({ success: false, error: 'Failed to list warehouses' });
    }
  });

  // Get single warehouse
  router.get('/warehouses/:id', async (req: Request, res: Response) => {
    try {
      const warehouse = warehouses.get(req.params.id);
      if (!warehouse) {
        return res.status(404).json({ success: false, error: 'Warehouse not found' });
      }
      res.json({ success: true, data: warehouse });
    } catch (error) {
      logger.error('Error getting warehouse:', error);
      res.status(500).json({ success: false, error: 'Failed to get warehouse' });
    }
  });

  // Create warehouse
  router.post('/warehouses', async (req: Request, res: Response) => {
    try {
      const { name, code, address, capacity, manager, contactPhone } = req.body;

      if (!name || !code || !address || !capacity) {
        return res.status(400).json({
          success: false,
          error: 'Name, code, address, and capacity are required'
        });
      }

      const warehouse: Warehouse = {
        id: uuidv4(),
        name,
        code,
        address,
        capacity,
        currentUtilization: 0,
        manager,
        contactPhone,
        isActive: true
      };

      warehouses.set(warehouse.id, warehouse);
      logger.info(`Created warehouse: ${warehouse.name}`);

      // Sync to Asset Twin
      try {
        await bridge.syncToAssetTwin(warehouse);
      } catch (syncError) {
        logger.warn('Asset Twin sync warning:', syncError);
      }

      res.status(201).json({ success: true, data: warehouse });
    } catch (error) {
      logger.error('Error creating warehouse:', error);
      res.status(500).json({ success: false, error: 'Failed to create warehouse' });
    }
  });

  // Update warehouse
  router.put('/warehouses/:id', async (req: Request, res: Response) => {
    try {
      const warehouse = warehouses.get(req.params.id);
      if (!warehouse) {
        return res.status(404).json({ success: false, error: 'Warehouse not found' });
      }

      const updatedWarehouse: Warehouse = {
        ...warehouse,
        ...req.body,
        id: warehouse.id
      };

      warehouses.set(warehouse.id, updatedWarehouse);
      logger.info(`Updated warehouse: ${updatedWarehouse.name}`);

      // Sync to Asset Twin
      try {
        await bridge.syncToAssetTwin(updatedWarehouse);
      } catch (syncError) {
        logger.warn('Asset Twin sync warning:', syncError);
      }

      res.json({ success: true, data: updatedWarehouse });
    } catch (error) {
      logger.error('Error updating warehouse:', error);
      res.status(500).json({ success: false, error: 'Failed to update warehouse' });
    }
  });

  // Update warehouse utilization
  router.patch('/warehouses/:id/utilization', async (req: Request, res: Response) => {
    try {
      const warehouse = warehouses.get(req.params.id);
      if (!warehouse) {
        return res.status(404).json({ success: false, error: 'Warehouse not found' });
      }

      const { currentUtilization } = req.body;
      if (typeof currentUtilization !== 'number') {
        return res.status(400).json({
          success: false,
          error: 'currentUtilization must be a number'
        });
      }

      warehouse.currentUtilization = currentUtilization;
      warehouses.set(warehouse.id, warehouse);
      logger.info(`Updated warehouse utilization: ${warehouse.name} -> ${currentUtilization}`);

      res.json({ success: true, data: warehouse });
    } catch (error) {
      logger.error('Error updating warehouse utilization:', error);
      res.status(500).json({ success: false, error: 'Failed to update utilization' });
    }
  });

  // ============ Channels ============

  // List all channels
  router.get('/channels/all', async (_req: Request, res: Response) => {
    try {
      res.json({
        success: true,
        count: channels.length,
        data: channels
      });
    } catch (error) {
      logger.error('Error listing channels:', error);
      res.status(500).json({ success: false, error: 'Failed to list channels' });
    }
  });

  // ============ Analytics ============

  // Get distribution analytics
  router.get('/analytics/summary', async (_req: Request, res: Response) => {
    try {
      const orders = Array.from(distributionOrders.values());

      const summary = {
        totalOrders: orders.length,
        byStatus: {} as Record<string, number>,
        byChannel: {} as Record<string, number>,
        totalValue: 0,
        averageOrderValue: 0,
        warehouseUtilization: {} as Record<string, { total: number; current: number; percent: number }>
      };

      orders.forEach(order => {
        summary.byStatus[order.status] = (summary.byStatus[order.status] || 0) + 1;
        summary.byChannel[order.channel.name] = (summary.byChannel[order.channel.name] || 0) + 1;
        summary.totalValue += order.totalAmount;
      });

      summary.averageOrderValue = orders.length > 0 ? summary.totalValue / orders.length : 0;

      // Calculate warehouse utilization
      warehouses.forEach(wh => {
        summary.warehouseUtilization[wh.code] = {
          total: wh.capacity,
          current: wh.currentUtilization,
          percent: Math.round((wh.currentUtilization / wh.capacity) * 100)
        };
      });

      res.json({ success: true, data: summary });
    } catch (error) {
      logger.error('Error getting distribution analytics:', error);
      res.status(500).json({ success: false, error: 'Failed to get analytics' });
    }
  });

  return router;
}

export { distributionOrders, warehouses };
