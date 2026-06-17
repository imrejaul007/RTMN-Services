import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';
import {
  ProcurementOrder,
  createProcurementOrder,
  ProcurementLineItem
} from '../models/NexhaProfile';
import { CustomerOpsBridge } from '../services/customerOpsBridge';
import { OrderSync } from '../services/orderSync';

export interface ProcurementDependencies {
  customerOpsBridge: CustomerOpsBridge;
  orderSync: OrderSync;
  logger: winston.Logger;
}

// In-memory store (replace with database in production)
const procurementOrders: Map<string, ProcurementOrder> = new Map();

export default function procurementRoutes(
  bridge: CustomerOpsBridge,
  orderSync: OrderSync,
  logger: winston.Logger
): Router {
  const router = Router();

  // List all procurement orders
  router.get('/', async (_req: Request, res: Response) => {
    try {
      const orders = Array.from(procurementOrders.values());
      res.json({
        success: true,
        count: orders.length,
        data: orders
      });
    } catch (error) {
      logger.error('Error listing procurement orders:', error);
      res.status(500).json({ success: false, error: 'Failed to list orders' });
    }
  });

  // Get single procurement order
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const order = procurementOrders.get(req.params.id);
      if (!order) {
        return res.status(404).json({ success: false, error: 'Order not found' });
      }
      res.json({ success: true, data: order });
    } catch (error) {
      logger.error('Error getting procurement order:', error);
      res.status(500).json({ success: false, error: 'Failed to get order' });
    }
  });

  // Create new procurement order
  router.post('/', async (req: Request, res: Response) => {
    try {
      const { supplierId, supplierName, lineItems, shippingAddress, notes, expectedDeliveryDate } = req.body;

      if (!supplierId || !lineItems || lineItems.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Supplier ID and line items are required'
        });
      }

      // Calculate line item totals
      const processedLineItems: ProcurementLineItem[] = lineItems.map((item: Partial<ProcurementLineItem>) => ({
        productId: item.productId || uuidv4(),
        productSku: item.productSku || '',
        productName: item.productName || '',
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice || 0,
        totalPrice: (item.quantity || 1) * (item.unitPrice || 0),
        currency: item.currency || 'USD'
      }));

      const order = createProcurementOrder({
        supplierId,
        supplierName,
        lineItems: processedLineItems,
        shippingAddress,
        notes,
        expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : undefined
      });

      procurementOrders.set(order.id, order);
      logger.info(`Created procurement order: ${order.orderNumber}`);

      // Sync to Order Twin
      try {
        await orderSync.syncToOrderTwin(order);
      } catch (syncError) {
        logger.warn('Order sync warning:', syncError);
      }

      res.status(201).json({ success: true, data: order });
    } catch (error) {
      logger.error('Error creating procurement order:', error);
      res.status(500).json({ success: false, error: 'Failed to create order' });
    }
  });

  // Update procurement order
  router.put('/:id', async (req: Request, res: Response) => {
    try {
      const order = procurementOrders.get(req.params.id);
      if (!order) {
        return res.status(404).json({ success: false, error: 'Order not found' });
      }

      const updatedOrder: ProcurementOrder = {
        ...order,
        ...req.body,
        id: order.id,
        type: 'procurement_order',
        updatedAt: new Date()
      };

      procurementOrders.set(order.id, updatedOrder);
      logger.info(`Updated procurement order: ${updatedOrder.orderNumber}`);

      // Sync updates to twins
      try {
        await orderSync.syncToOrderTwin(updatedOrder);
      } catch (syncError) {
        logger.warn('Order sync warning:', syncError);
      }

      res.json({ success: true, data: updatedOrder });
    } catch (error) {
      logger.error('Error updating procurement order:', error);
      res.status(500).json({ success: false, error: 'Failed to update order' });
    }
  });

  // Update order status
  router.patch('/:id/status', async (req: Request, res: Response) => {
    try {
      const order = procurementOrders.get(req.params.id);
      if (!order) {
        return res.status(404).json({ success: false, error: 'Order not found' });
      }

      const { status } = req.body;
      const validStatuses = ['draft', 'pending', 'approved', 'confirmed', 'shipped', 'delivered', 'cancelled'];

      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        });
      }

      order.status = status as ProcurementOrder['status'];
      order.updatedAt = new Date();

      if (status === 'approved') {
        order.approvedAt = new Date();
        order.approvedBy = req.body.approvedBy || 'system';
      }

      if (status === 'delivered') {
        order.actualDeliveryDate = new Date();
      }

      procurementOrders.set(order.id, order);
      logger.info(`Updated order status: ${order.orderNumber} -> ${status}`);

      // Notify twins of status change
      try {
        await bridge.publishEvent({
          type: 'procurement.order.status_changed',
          source: 'procurement',
          entityType: 'procurement_order',
          entityId: order.id,
          action: 'status_changed',
          data: { orderNumber: order.orderNumber, newStatus: status }
        });
      } catch (eventError) {
        logger.warn('Event publish warning:', eventError);
      }

      res.json({ success: true, data: order });
    } catch (error) {
      logger.error('Error updating order status:', error);
      res.status(500).json({ success: false, error: 'Failed to update status' });
    }
  });

  // Approve procurement order
  router.post('/:id/approve', async (req: Request, res: Response) => {
    try {
      const order = procurementOrders.get(req.params.id);
      if (!order) {
        return res.status(404).json({ success: false, error: 'Order not found' });
      }

      if (order.status !== 'pending') {
        return res.status(400).json({
          success: false,
          error: 'Only pending orders can be approved'
        });
      }

      order.status = 'approved';
      order.approvedAt = new Date();
      order.approvedBy = req.body.approvedBy || 'system';
      order.updatedAt = new Date();

      procurementOrders.set(order.id, order);
      logger.info(`Approved procurement order: ${order.orderNumber}`);

      // Sync to twins
      try {
        await orderSync.syncToOrderTwin(order);
      } catch (syncError) {
        logger.warn('Order sync warning:', syncError);
      }

      res.json({ success: true, data: order });
    } catch (error) {
      logger.error('Error approving procurement order:', error);
      res.status(500).json({ success: false, error: 'Failed to approve order' });
    }
  });

  // Get orders by supplier
  router.get('/supplier/:supplierId', async (req: Request, res: Response) => {
    try {
      const orders = Array.from(procurementOrders.values())
        .filter(order => order.supplierId === req.params.supplierId);

      res.json({
        success: true,
        count: orders.length,
        data: orders
      });
    } catch (error) {
      logger.error('Error listing supplier orders:', error);
      res.status(500).json({ success: false, error: 'Failed to list orders' });
    }
  });

  // Get orders by status
  router.get('/status/:status', async (req: Request, res: Response) => {
    try {
      const orders = Array.from(procurementOrders.values())
        .filter(order => order.status === req.params.status);

      res.json({
        success: true,
        count: orders.length,
        data: orders
      });
    } catch (error) {
      logger.error('Error listing orders by status:', error);
      res.status(500).json({ success: false, error: 'Failed to list orders' });
    }
  });

  // Delete procurement order
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const order = procurementOrders.get(req.params.id);
      if (!order) {
        return res.status(404).json({ success: false, error: 'Order not found' });
      }

      if (order.status !== 'draft' && order.status !== 'cancelled') {
        return res.status(400).json({
          success: false,
          error: 'Only draft or cancelled orders can be deleted'
        });
      }

      procurementOrders.delete(req.params.id);
      logger.info(`Deleted procurement order: ${order.orderNumber}`);

      res.json({ success: true, message: 'Order deleted' });
    } catch (error) {
      logger.error('Error deleting procurement order:', error);
      res.status(500).json({ success: false, error: 'Failed to delete order' });
    }
  });

  // Get procurement analytics
  router.get('/analytics/summary', async (_req: Request, res: Response) => {
    try {
      const orders = Array.from(procurementOrders.values());

      const summary = {
        totalOrders: orders.length,
        byStatus: {} as Record<string, number>,
        totalValue: 0,
        averageOrderValue: 0,
        bySupplier: {} as Record<string, { count: number; value: number }>
      };

      orders.forEach(order => {
        // Count by status
        summary.byStatus[order.status] = (summary.byStatus[order.status] || 0) + 1;

        // Sum total value
        summary.totalValue += order.totalAmount;

        // By supplier
        if (!summary.bySupplier[order.supplierId]) {
          summary.bySupplier[order.supplierId] = { count: 0, value: 0 };
        }
        summary.bySupplier[order.supplierId].count++;
        summary.bySupplier[order.supplierId].value += order.totalAmount;
      });

      summary.averageOrderValue = orders.length > 0 ? summary.totalValue / orders.length : 0;

      res.json({ success: true, data: summary });
    } catch (error) {
      logger.error('Error getting procurement analytics:', error);
      res.status(500).json({ success: false, error: 'Failed to get analytics' });
    }
  });

  return router;
}

export { procurementOrders };
