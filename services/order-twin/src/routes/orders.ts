import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { Order, IOrder, IOrderItem } from '../models/Order';
import { logger } from '../index';

const router = Router();

// Validation schemas
const OrderItemSchema = z.object({
  productId: z.string().min(1),
  name: z.string().min(1),
  quantity: z.number().int().positive(),
  price: z.number().nonnegative(),
  discount: z.number().nonnegative().optional().default(0),
  sku: z.string().optional(),
  imageUrl: z.string().url().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const ShippingAddressSchema = z.object({
  fullName: z.string().min(1),
  addressLine1: z.string().min(1),
  addressLine2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  postalCode: z.string().min(1),
  country: z.string().min(2).max(2).optional().default('US'),
  phone: z.string().optional(),
  email: z.string().email().optional(),
});

const ShippingSchema = z.object({
  address: ShippingAddressSchema,
  method: z.enum(['standard', 'express', 'overnight', 'same_day', 'pickup']).optional().default('standard'),
  carrier: z.string().optional(),
  trackingNumber: z.string().optional(),
  estimatedDelivery: z.string().datetime().optional(),
  cost: z.number().nonnegative().optional().default(0),
});

const CreateOrderSchema = z.object({
  tenantId: z.string().min(1),
  customerId: z.string().min(1),
  items: z.array(OrderItemSchema).min(1),
  shipping: ShippingSchema,
  paymentId: z.string().optional(),
  paymentMethod: z.string().optional(),
  notes: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  taxRate: z.number().nonnegative().optional().default(0),
  shippingCost: z.number().nonnegative().optional().default(0),
  discountAmount: z.number().nonnegative().optional().default(0),
});

const UpdateOrderSchema = z.object({
  items: z.array(OrderItemSchema).min(1).optional(),
  shipping: ShippingSchema.partial().optional(),
  paymentId: z.string().optional(),
  paymentMethod: z.string().optional(),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const UpdateStatusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned', 'refunded']),
  note: z.string().optional(),
  updatedBy: z.string().optional(),
  location: z.string().optional(),
});

// Helper to calculate pricing
function calculatePricing(items: z.infer<typeof OrderItemSchema>[], taxRate: number, shippingCost: number, discountAmount: number) {
  const subtotal = items.reduce((sum, item) => {
    const itemTotal = item.price * item.quantity;
    return sum + itemTotal - (item.discount || 0);
  }, 0);

  const tax = subtotal * taxRate;
  const total = subtotal + tax + shippingCost - discountAmount;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    shipping: shippingCost,
    discount: discountAmount,
    total: Math.round(total * 100) / 100,
  };
}

// Middleware to extract tenant
function extractTenant(req: Request, res: Response, next: Function) {
  const tenantId = req.headers['x-tenant-id'] as string || req.body?.tenantId || 'default';
  (req as any).tenantId = tenantId;
  next();
}

// GET /api/orders - List orders with filters
router.get('/', extractTenant, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const {
      customerId,
      status,
      startDate,
      endDate,
      page = '1',
      limit = '20',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const query: Record<string, any> = { tenantId };

    if (customerId) query.customerId = customerId;
    if (status) query.status = status;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) (query.createdAt as any).$gte = new Date(startDate as string);
      if (endDate) (query.createdAt as any).$lte = new Date(endDate as string);
    }

    const pageNum = parseInt(page as string);
    const limitNum = Math.min(parseInt(limit as string), 100);
    const skip = (pageNum - 1) * limitNum;

    const sortObj: Record<string, 1 | -1> = { [sortBy as string]: sortOrder === 'desc' ? -1 : 1 };

    const [orders, total] = await Promise.all([
      Order.find(query).sort(sortObj).skip(skip).limit(limitNum).lean(),
      Order.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: orders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    logger.error('Error fetching orders:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch orders' });
  }
});

// GET /api/orders/:orderId - Get single order
router.get('/:orderId', extractTenant, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { orderId } = req.params;

    const order = await Order.findOne({ orderId, tenantId }).lean();

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    res.json({ success: true, data: order });
  } catch (error) {
    logger.error('Error fetching order:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch order' });
  }
});

// POST /api/orders - Create new order
router.post('/', async (req: Request, res: Response) => {
  try {
    const validation = CreateOrderSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }

    const data = validation.data;
    const orderId = `ORD-${uuidv4().substring(0, 8).toUpperCase()}`;

    // Calculate pricing
    const pricing = calculatePricing(data.items, data.taxRate, data.shippingCost, data.discountAmount);

    // Prepare shipping data
    const shippingData = {
      ...data.shipping,
      estimatedDelivery: data.shipping.estimatedDelivery
        ? new Date(data.shipping.estimatedDelivery)
        : undefined,
    };

    const order = new Order({
      orderId,
      tenantId: data.tenantId,
      customerId: data.customerId,
      items: data.items,
      pricing,
      shipping: shippingData,
      paymentId: data.paymentId,
      paymentMethod: data.paymentMethod,
      paymentStatus: data.paymentId ? 'paid' : 'pending',
      notes: data.notes,
      metadata: data.metadata,
      status: 'pending',
      timeline: [
        {
          status: 'pending',
          timestamp: new Date(),
          note: 'Order created',
        },
      ],
    });

    await order.save();

    logger.info(`Order created: ${orderId}`);
    res.status(201).json({ success: true, data: order });
  } catch (error) {
    logger.error('Error creating order:', error);
    res.status(500).json({ success: false, error: 'Failed to create order' });
  }
});

// PUT /api/orders/:orderId - Update order
router.put('/:orderId', extractTenant, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { orderId } = req.params;

    const validation = UpdateOrderSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }

    const order = await Order.findOne({ orderId, tenantId });

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    if (order.status === 'delivered' || order.status === 'cancelled' || order.status === 'refunded') {
      return res.status(400).json({
        success: false,
        error: `Cannot update order with status: ${order.status}`,
      });
    }

    const data = validation.data;

    if (data.items) {
      // Recalculate pricing if items changed
      const subtotal = data.items.reduce((sum, item) => {
        return sum + (item.price * item.quantity - (item.discount || 0));
      }, 0);
      order.pricing.subtotal = Math.round(subtotal * 100) / 100;
      order.pricing.total = Math.round(
        (order.pricing.subtotal + order.pricing.tax + order.pricing.shipping - order.pricing.discount) * 100
      ) / 100;
      order.items = data.items as IOrderItem[];
    }

    if (data.shipping) {
      Object.assign(order.shipping, data.shipping);
      if (data.shipping.cost !== undefined) {
        order.pricing.shipping = data.shipping.cost;
        order.pricing.total = Math.round(
          (order.pricing.subtotal + order.pricing.tax + order.pricing.shipping - order.pricing.discount) * 100
        ) / 100;
      }
    }

    if (data.paymentId) order.paymentId = data.paymentId;
    if (data.paymentMethod) order.paymentMethod = data.paymentMethod;
    if (data.notes) order.notes = data.notes;
    if (data.internalNotes) order.internalNotes = data.internalNotes;
    if (data.metadata) order.metadata = { ...order.metadata, ...data.metadata };

    await order.save();

    logger.info(`Order updated: ${orderId}`);
    res.json({ success: true, data: order });
  } catch (error) {
    logger.error('Error updating order:', error);
    res.status(500).json({ success: false, error: 'Failed to update order' });
  }
});

// PATCH /api/orders/:orderId/status - Update order status
router.patch('/:orderId/status', extractTenant, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { orderId } = req.params;

    const validation = UpdateStatusSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }

    const order = await Order.findOne({ orderId, tenantId });

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const { status, note, updatedBy, location } = validation.data;

    // Validate status transition
    const validTransitions: Record<string, string[]> = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['processing', 'cancelled'],
      processing: ['shipped', 'cancelled'],
      shipped: ['delivered', 'returned'],
      delivered: ['returned'],
      cancelled: [],
      returned: ['refunded'],
      refunded: [],
    };

    if (!validTransitions[order.status].includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status transition from ${order.status} to ${status}`,
      });
    }

    // Add timeline event
    order.timeline.push({
      status,
      timestamp: new Date(),
      note,
      updatedBy,
      location,
    });

    order.status = status;

    // Handle specific status actions
    if (status === 'delivered') {
      order.shipping.actualDelivery = new Date();
      order.paymentStatus = 'paid';
    }

    if (status === 'cancelled') {
      order.cancelledAt = new Date();
      order.cancelledBy = updatedBy;
      order.cancellationReason = note;
    }

    await order.save();

    logger.info(`Order status updated: ${orderId} -> ${status}`);
    res.json({ success: true, data: order });
  } catch (error) {
    logger.error('Error updating order status:', error);
    res.status(500).json({ success: false, error: 'Failed to update order status' });
  }
});

// PATCH /api/orders/:orderId/tracking - Update tracking info
router.patch('/:orderId/tracking', extractTenant, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { orderId } = req.params;
    const { carrier, trackingNumber, method } = req.body;

    const order = await Order.findOne({ orderId, tenantId });

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    if (carrier) order.shipping.carrier = carrier;
    if (trackingNumber) order.shipping.trackingNumber = trackingNumber;

    // Add timeline event
    order.timeline.push({
      status: 'shipped',
      timestamp: new Date(),
      note: trackingNumber ? `Tracking: ${trackingNumber}` : 'Order shipped',
    });

    // Auto-update status if shipped
    if (['pending', 'confirmed', 'processing'].includes(order.status)) {
      order.status = 'shipped';
    }

    await order.save();

    logger.info(`Tracking updated for order: ${orderId}`);
    res.json({ success: true, data: order });
  } catch (error) {
    logger.error('Error updating tracking:', error);
    res.status(500).json({ success: false, error: 'Failed to update tracking' });
  }
});

// DELETE /api/orders/:orderId - Cancel order
router.delete('/:orderId', extractTenant, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { orderId } = req.params;
    const { reason } = req.body;

    const order = await Order.findOne({ orderId, tenantId });

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    if (['shipped', 'delivered'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        error: 'Cannot cancel shipped or delivered orders',
      });
    }

    order.status = 'cancelled';
    order.cancelledAt = new Date();
    order.cancellationReason = reason || 'Cancelled by user';
    order.timeline.push({
      status: 'cancelled',
      timestamp: new Date(),
      note: reason || 'Cancelled by user',
    });

    await order.save();

    logger.info(`Order cancelled: ${orderId}`);
    res.json({ success: true, data: order });
  } catch (error) {
    logger.error('Error cancelling order:', error);
    res.status(500).json({ success: false, error: 'Failed to cancel order' });
  }
});

// GET /api/orders/customer/:customerId - Get customer orders
router.get('/customer/:customerId', extractTenant, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { customerId } = req.params;
    const { status, page = '1', limit = '10' } = req.query;

    const query: Record<string, any> = { tenantId, customerId };
    if (status) query.status = status;

    const pageNum = parseInt(page as string);
    const limitNum = Math.min(parseInt(limit as string), 50);

    const [orders, total] = await Promise.all([
      Order.find(query).sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum).lean(),
      Order.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: orders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    logger.error('Error fetching customer orders:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch customer orders' });
  }
});

export default router;
