import { Router, Request, Response } from 'express';
import axios from 'axios';
import { CustomerOpsBridge } from '../services/customerOpsBridge';
import { RestaurantOrder, OrderItem } from '../models/HospitalityProfile';

const router = Router();
const customerOpsBridge = new CustomerOpsBridge();

const RESTAURANT_OS_URL = process.env.RESTAURANT_OS_URL || 'http://localhost:5010';

// Get all restaurants
router.get('/restaurants', async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`${RESTAURANT_OS_URL}/api/restaurants`);
    res.json({
      success: true,
      source: 'restaurant-os',
      restaurants: response.data
    });
  } catch (error: any) {
    console.error('Restaurant OS error:', error.message);
    res.json({
      success: true,
      source: 'local',
      restaurants: getMockRestaurants()
    });
  }
});

// Get restaurant by ID
router.get('/restaurants/:restaurantId', async (req: Request, res: Response) => {
  const { restaurantId } = req.params;
  try {
    const response = await axios.get(`${RESTAURANT_OS_URL}/api/restaurants/${restaurantId}`);
    res.json({
      success: true,
      source: 'restaurant-os',
      restaurant: response.data
    });
  } catch (error: any) {
    console.error('Restaurant OS error:', error.message);
    const mockRestaurant = getMockRestaurants().find(r => r.id === restaurantId);
    if (mockRestaurant) {
      res.json({
        success: true,
        source: 'local',
        restaurant: mockRestaurant
      });
    } else {
      res.status(404).json({ error: 'Restaurant not found' });
    }
  }
});

// Get restaurant menu
router.get('/restaurants/:restaurantId/menu', async (req: Request, res: Response) => {
  const { restaurantId } = req.params;
  try {
    const response = await axios.get(`${RESTAURANT_OS_URL}/api/restaurants/${restaurantId}/menu`);
    res.json({
      success: true,
      source: 'restaurant-os',
      menu: response.data
    });
  } catch (error: any) {
    console.error('Menu error:', error.message);
    res.json({
      success: true,
      source: 'local',
      menu: getMockMenu(restaurantId)
    });
  }
});

// Get all orders
router.get('/orders', async (req: Request, res: Response) => {
  const { restaurantId, status, guestId, date } = req.query;
  try {
    const response = await axios.get(`${RESTAURANT_OS_URL}/api/orders`, {
      params: { restaurantId, status, guestId, date }
    });
    res.json({
      success: true,
      source: 'restaurant-os',
      orders: response.data
    });
  } catch (error: any) {
    console.error('Orders error:', error.message);
    res.json({
      success: true,
      source: 'local',
      orders: getMockOrders()
    });
  }
});

// Get order by ID
router.get('/orders/:orderId', async (req: Request, res: Response) => {
  const { orderId } = req.params;
  try {
    const response = await axios.get(`${RESTAURANT_OS_URL}/api/orders/${orderId}`);
    res.json({
      success: true,
      source: 'restaurant-os',
      order: response.data
    });
  } catch (error: any) {
    console.error('Order error:', error.message);
    const mockOrder = getMockOrders().find(o => o.id === orderId);
    if (mockOrder) {
      res.json({
        success: true,
        source: 'local',
        order: mockOrder
      });
    } else {
      res.status(404).json({ error: 'Order not found' });
    }
  }
});

// Create new order
router.post('/orders', async (req: Request, res: Response) => {
  const order: RestaurantOrder = req.body;

  try {
    const response = await axios.post(`${RESTAURANT_OS_URL}/api/orders`, order);
    const createdOrder = response.data;

    // Sync to Order Twin
    await customerOpsBridge.syncToOrderTwin(createdOrder);

    res.json({
      success: true,
      source: 'restaurant-os',
      order: createdOrder
    });
  } catch (error: any) {
    console.error('Create order error:', error.message);
    const localOrder: RestaurantOrder = {
      ...order,
      id: `ORD-${Date.now()}`,
      orderTwinId: `OT-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await customerOpsBridge.syncToOrderTwin(localOrder);

    res.json({
      success: true,
      source: 'local',
      order: localOrder
    });
  }
});

// Update order
router.put('/orders/:orderId', async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const updates = req.body;

  try {
    const response = await axios.put(`${RESTAURANT_OS_URL}/api/orders/${orderId}`, updates);
    res.json({
      success: true,
      source: 'restaurant-os',
      order: response.data
    });
  } catch (error: any) {
    console.error('Update order error:', error.message);
    res.json({
      success: true,
      source: 'local',
      order: { id: orderId, ...updates, updatedAt: new Date().toISOString() }
    });
  }
});

// Add items to order
router.post('/orders/:orderId/items', async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const items: OrderItem[] = req.body.items;

  try {
    const response = await axios.post(`${RESTAURANT_OS_URL}/api/orders/${orderId}/items`, { items });
    res.json({
      success: true,
      source: 'restaurant-os',
      order: response.data
    });
  } catch (error: any) {
    console.error('Add items error:', error.message);
    res.json({
      success: true,
      source: 'local',
      order: {
        id: orderId,
        items: items.map(item => ({
          ...item,
          id: `ITEM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        })),
        updatedAt: new Date().toISOString()
      }
    });
  }
});

// Update order status
router.patch('/orders/:orderId/status', async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const { status, notes } = req.body;

  try {
    const response = await axios.patch(`${RESTAURANT_OS_URL}/api/orders/${orderId}/status`, {
      status,
      notes
    });
    res.json({
      success: true,
      source: 'restaurant-os',
      order: response.data
    });
  } catch (error: any) {
    console.error('Status update error:', error.message);
    res.json({
      success: true,
      source: 'local',
      order: { id: orderId, status, updatedAt: new Date().toISOString() }
    });
  }
});

// Process payment
router.post('/orders/:orderId/pay', async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const { method, amount, tip } = req.body;

  try {
    const response = await axios.post(`${RESTAURANT_OS_URL}/api/orders/${orderId}/pay`, {
      method,
      amount,
      tip
    });
    res.json({
      success: true,
      source: 'restaurant-os',
      payment: response.data
    });
  } catch (error: any) {
    console.error('Payment error:', error.message);
    res.json({
      success: true,
      source: 'local',
      payment: {
        orderId,
        method,
        amount: amount || 0,
        tip: tip || 0,
        status: 'paid',
        transactionId: `TXN-${Date.now()}`,
        paidAt: new Date().toISOString()
      }
    });
  }
});

// Room service order
router.post('/room-service', async (req: Request, res: Response) => {
  const { bookingId, roomNumber, items, guestNotes, deliveryTime } = req.body;

  const roomServiceOrder: RestaurantOrder = {
    id: `RS-${Date.now()}`,
    guestId: req.body.guestId,
    tableId: `ROOM-${roomNumber}`,
    restaurantId: 'REST-001',
    restaurantName: 'Grand Plaza - Room Service',
    items: items.map((item: any) => ({
      id: `ITEM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      menuItemId: item.menuItemId || item.id,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.price,
      totalPrice: item.price * item.quantity,
      modifiers: item.modifiers,
      specialInstructions: item.instructions
    })),
    subtotal: items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0),
    tax: 0,
    totalAmount: items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0) * 1.1,
    paymentStatus: 'pending',
    status: 'open',
    orderType: 'room-service',
    guestNotes,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  try {
    const response = await axios.post(`${RESTAURANT_OS_URL}/api/room-service`, roomServiceOrder);
    res.json({
      success: true,
      source: 'restaurant-os',
      order: response.data
    });
  } catch (error: any) {
    console.error('Room service error:', error.message);
    res.json({
      success: true,
      source: 'local',
      order: roomServiceOrder
    });
  }
});

// Get tables
router.get('/tables', async (req: Request, res: Response) => {
  const { restaurantId, status } = req.query;
  try {
    const response = await axios.get(`${RESTAURANT_OS_URL}/api/tables`, {
      params: { restaurantId, status }
    });
    res.json({
      success: true,
      source: 'restaurant-os',
      tables: response.data
    });
  } catch (error: any) {
    console.error('Tables error:', error.message);
    res.json({
      success: true,
      source: 'local',
      tables: getMockTables()
    });
  }
});

// Reserve table
router.post('/reservations', async (req: Request, res: Response) => {
  const { restaurantId, guestId, guestName, date, time, partySize, specialRequests } = req.body;

  try {
    const response = await axios.post(`${RESTAURANT_OS_URL}/api/reservations`, {
      restaurantId,
      guestId,
      guestName,
      date,
      time,
      partySize,
      specialRequests
    });
    res.json({
      success: true,
      source: 'restaurant-os',
      reservation: response.data
    });
  } catch (error: any) {
    console.error('Reservation error:', error.message);
    res.json({
      success: true,
      source: 'local',
      reservation: {
        id: `RES-${Date.now()}`,
        restaurantId,
        guestId,
        guestName,
        date,
        time,
        partySize,
        status: 'confirmed',
        specialRequests,
        confirmationCode: `CONF-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
        createdAt: new Date().toISOString()
      }
    });
  }
});

// Get guest dining history
router.get('/history/:guestId', async (req: Request, res: Response) => {
  const { guestId } = req.params;
  const { limit } = req.query;

  try {
    const response = await axios.get(`${RESTAURANT_OS_URL}/api/guests/${guestId}/dining-history`, {
      params: { limit }
    });
    res.json({
      success: true,
      source: 'restaurant-os',
      history: response.data
    });
  } catch (error: any) {
    console.error('Dining history error:', error.message);
    res.json({
      success: true,
      source: 'local',
      history: getMockDiningHistory(guestId)
    });
  }
});

// Submit order rating
router.post('/orders/:orderId/rate', async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const { rating, feedback, categories } = req.body;

  try {
    const response = await axios.post(`${RESTAURANT_OS_URL}/api/orders/${orderId}/rate`, {
      rating,
      feedback,
      categories
    });

    // Sync to Feedback Twin
    await customerOpsBridge.syncToFeedbackTwin({
      type: 'restaurant',
      orderId,
      rating,
      feedback,
      createdAt: new Date().toISOString()
    });

    res.json({
      success: true,
      source: 'restaurant-os',
      rating: response.data
    });
  } catch (error: any) {
    console.error('Rating error:', error.message);
    res.json({
      success: true,
      source: 'local',
      rating: {
        orderId,
        rating,
        feedback,
        categories,
        submittedAt: new Date().toISOString()
      }
    });
  }
});

// Mock data functions
function getMockRestaurants() {
  return [
    {
      id: 'REST-001',
      name: 'The Grand Kitchen',
      type: 'fine-dining',
      propertyId: 'HTL-001',
      propertyName: 'Grand Plaza Hotel',
      cuisine: 'International',
      capacity: 80,
      tables: 20,
      rating: 4.6,
      hours: { open: '07:00', close: '23:00' },
      amenities: ['Private Dining', 'Bar', 'Outdoor Seating']
    },
    {
      id: 'REST-002',
      name: 'Skyline Bar & Lounge',
      type: 'lounge',
      propertyId: 'HTL-001',
      propertyName: 'Grand Plaza Hotel',
      cuisine: 'Cocktails & Tapas',
      capacity: 50,
      tables: 15,
      rating: 4.4,
      hours: { open: '16:00', close: '02:00' },
      amenities: ['Live Music', 'Rooftop', 'Happy Hour']
    }
  ];
}

function getMockMenu(restaurantId: string) {
  return {
    restaurantId,
    categories: [
      {
        name: 'Appetizers',
        items: [
          { id: 'APP-001', name: 'Caesar Salad', price: 14, description: 'Classic caesar with parmesan' },
          { id: 'APP-002', name: 'Soup of the Day', price: 10, description: 'Ask your server' }
        ]
      },
      {
        name: 'Main Courses',
        items: [
          { id: 'MAIN-001', name: 'Grilled Salmon', price: 32, description: 'Atlantic salmon with seasonal vegetables' },
          { id: 'MAIN-002', name: 'Ribeye Steak', price: 45, description: '12oz prime ribeye' }
        ]
      },
      {
        name: 'Beverages',
        items: [
          { id: 'BEV-001', name: 'Fresh Juice', price: 8, description: 'Orange, Apple, or Mixed' },
          { id: 'BEV-002', name: 'Coffee', price: 5, description: 'Regular or Decaf' }
        ]
      }
    ]
  };
}

function getMockTables() {
  return [
    { id: 'TBL-01', name: 'Table 1', capacity: 2, status: 'available', section: 'main' },
    { id: 'TBL-02', name: 'Table 2', capacity: 4, status: 'occupied', section: 'main' },
    { id: 'TBL-03', name: 'Table 3', capacity: 6, status: 'reserved', section: 'main' },
    { id: 'TBL-04', name: 'Patio 1', capacity: 4, status: 'available', section: 'outdoor' }
  ];
}

function getMockOrders(): RestaurantOrder[] {
  return [
    {
      id: 'ORD-001',
      guestId: 'GUEST-001',
      tableId: 'TBL-02',
      tableName: 'Table 2',
      restaurantId: 'REST-001',
      restaurantName: 'The Grand Kitchen',
      items: [
        { id: 'ITEM-001', menuItemId: 'APP-001', name: 'Caesar Salad', quantity: 2, unitPrice: 14, totalPrice: 28 },
        { id: 'ITEM-002', menuItemId: 'MAIN-001', name: 'Grilled Salmon', quantity: 1, unitPrice: 32, totalPrice: 32 }
      ],
      subtotal: 60,
      tax: 6.6,
      tip: 12,
      totalAmount: 78.6,
      paymentStatus: 'paid',
      paymentMethod: 'card',
      status: 'closed',
      orderType: 'dine-in',
      createdAt: '2026-06-15T19:00:00Z',
      updatedAt: '2026-06-15T21:00:00Z'
    }
  ];
}

function getMockDiningHistory(guestId: string) {
  return [
    {
      id: 'ORD-001',
      restaurantId: 'REST-001',
      restaurantName: 'The Grand Kitchen',
      date: '2026-06-15',
      totalAmount: 78.6,
      items: ['Caesar Salad', 'Grilled Salmon'],
      rating: 5
    },
    {
      id: 'ORD-002',
      restaurantId: 'REST-001',
      restaurantName: 'The Grand Kitchen',
      date: '2026-05-20',
      totalAmount: 145.5,
      items: ['Soup of the Day', 'Ribeye Steak', 'Tiramisu'],
      rating: 4
    }
  ];
}

export default router;
