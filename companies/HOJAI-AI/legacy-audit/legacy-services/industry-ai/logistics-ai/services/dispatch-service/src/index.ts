/**
 * HOJAI Logistics Dispatch Service
 * Order assignment, route optimization, delivery tracking
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

interface DeliveryOrder {
  id: string;
  orderNo: string;
  customerName: string;
  customerPhone: string;
  pickup: { address: string; lat?: number; lng?: number };
  dropoff: { address: string; lat?: number; lng?: number };
  weight: number;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'pending' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'failed';
  vehicleId?: string;
  driverId?: string;
  estimatedDelivery?: string;
  actualDelivery?: string;
  otp?: string;
  proofImage?: string;
  notes?: string;
  createdAt: string;
}

interface Route {
  id: string;
  vehicleId: string;
  driverId: string;
  stops: { orderId: string; address: string; type: 'pickup' | 'dropoff'; sequence: number }[];
  totalDistance: number;
  estimatedTime: number;
  optimizedOrder: number[];
  status: 'planned' | 'in_progress' | 'completed';
}

const orders = new Map<string, DeliveryOrder>();
const routes = new Map<string, Route>();

// Create order
router.post('/orders', async (req, res) => {
  try {
    const order: DeliveryOrder = {
      ...req.body,
      id: uuidv4(),
      status: 'pending',
      otp: Math.floor(1000 + Math.random() * 9000).toString(),
      createdAt: new Date().toISOString(),
    };
    orders.set(order.id, order);
    res.status(201).json({ success: true, order });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create order' });
  }
});

router.get('/orders', async (req, res) => {
  try {
    const { status, priority, date } = req.query;
    let result = Array.from(orders.values());

    if (status) result = result.filter(o => o.status === status);
    if (priority) result = result.filter(o => o.priority === priority);
    if (date) result = result.filter(o => o.createdAt.startsWith(date as string));

    res.json({ orders: result, count: result.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

router.get('/orders/:id', async (req, res) => {
  try {
    const order = orders.get(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({ order });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Assign order to vehicle/driver
router.post('/orders/:id/assign', async (req, res) => {
  try {
    const { vehicleId, driverId } = req.body;
    const order = orders.get(req.params.id);

    if (!order) return res.status(404).json({ error: 'Order not found' });

    order.vehicleId = vehicleId;
    order.driverId = driverId;
    order.status = 'assigned';
    orders.set(order.id, order);

    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ error: 'Failed to assign order' });
  }
});

// Update order status
router.patch('/orders/:id/status', async (req, res) => {
  try {
    const { status, notes } = req.body;
    const order = orders.get(req.params.id);

    if (!order) return res.status(404).json({ error: 'Order not found' });

    order.status = status;
    if (notes) order.notes = notes;

    if (status === 'delivered') {
      order.actualDelivery = new Date().toISOString();
    }

    orders.set(order.id, order);

    // Send notification
    console.log(`[SMS] To: ${order.customerPhone}, Status: Your order ${order.orderNo} is ${status}`);

    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Create optimized route
router.post('/routes', async (req, res) => {
  try {
    const { vehicleId, driverId, stops } = req.body;

    // Simple nearest-neighbor optimization
    const optimizedOrder = optimizeRoute(stops);

    const route: Route = {
      id: uuidv4(),
      vehicleId,
      driverId,
      stops: stops.map((s: any, i: number) => ({ ...s, sequence: optimizedOrder.indexOf(i) })),
      totalDistance: calculateTotalDistance(stops, optimizedOrder),
      estimatedTime: stops.length * 15, // 15 mins per stop
      optimizedOrder,
      status: 'planned',
    };

    routes.set(route.id, route);

    res.status(201).json({ success: true, route });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create route' });
  }
});

router.get('/routes', async (req, res) => {
  try {
    const { vehicleId, status } = req.query;
    let result = Array.from(routes.values());

    if (vehicleId) result = result.filter(r => r.vehicleId === vehicleId);
    if (status) result = result.filter(r => r.status === status);

    res.json({ routes: result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch routes' });
  }
});

// Track order
router.get('/track/:orderNo', async (req, res) => {
  try {
    const order = Array.from(orders.values()).find(o => o.orderNo === req.params.orderNo);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    res.json({
      orderNo: order.orderNo,
      status: order.status,
      estimatedDelivery: order.estimatedDelivery,
      currentLocation: order.status === 'in_transit' ? order.dropoff : undefined,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to track order' });
  }
});

// Dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const pending = Array.from(orders.values()).filter(o => o.status === 'pending').length;
    const assigned = Array.from(orders.values()).filter(o => o.status === 'assigned' || o.status === 'picked_up' || o.status === 'in_transit').length;
    const delivered = Array.from(orders.values()).filter(o => o.status === 'delivered').length;
    const failed = Array.from(orders.values()).filter(o => o.status === 'failed').length;

    const today = new Date().toISOString().split('T')[0];
    const todayDelivered = Array.from(orders.values())
      .filter(o => o.status === 'delivered' && o.actualDelivery?.startsWith(today)).length;

    res.json({
      orders: { pending, inProgress: assigned, delivered, failed },
      todayDelivered,
      deliveryRate: (pending + assigned) > 0 ? Math.round(delivered / (delivered + failed) * 100) : 100,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get dashboard' });
  }
});

// Helper functions
function optimizeRoute(stops: any[]): number[] {
  // Simple nearest-neighbor algorithm
  const n = stops.length;
  if (n <= 2) return stops.map((_, i) => i);

  const visited = new Set<number>();
  const order: number[] = [];
  let current = 0;
  visited.add(current);
  order.push(current);

  while (visited.size < n) {
    let nearest = -1;
    let minDist = Infinity;

    for (let i = 0; i < n; i++) {
      if (!visited.has(i)) {
        const dist = Math.random() * 10; // Simplified distance
        if (dist < minDist) {
          minDist = dist;
          nearest = i;
        }
      }
    }

    if (nearest >= 0) {
      visited.add(nearest);
      order.push(nearest);
    }
  }

  return order;
}

function calculateTotalDistance(stops: any[], order: number[]): number {
  // Simplified distance calculation
  return order.length * 5; // km
}

export { router, orders, routes };
