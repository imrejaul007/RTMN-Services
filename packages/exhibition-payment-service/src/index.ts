import express, { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 5048;

app.use(cors());
app.use(express.json());

// Ticket types
const ticketTypes = [
  {
    id: 'vip',
    name: 'VIP Pass',
    price: 499,
    currency: 'USD',
    benefits: ['All sessions', 'VIP lounge', 'Speaker dinner', 'Priority networking'],
    available: true,
    quantity: 50
  },
  {
    id: 'premium',
    name: 'Premium Pass',
    price: 299,
    currency: 'USD',
    benefits: ['All sessions', 'Premium networking', 'Workshop access'],
    available: true,
    quantity: 500
  },
  {
    id: 'standard',
    name: 'Standard Pass',
    price: 149,
    currency: 'USD',
    benefits: ['General sessions', 'Exhibition floor', 'Networking'],
    available: true,
    quantity: 2000
  },
  {
    id: 'virtual',
    name: 'Virtual Pass',
    price: 49,
    currency: 'USD',
    benefits: ['Live streaming', 'Recorded sessions', 'Virtual networking'],
    available: true,
    quantity: -1
  }
];

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'exhibition-payment-service',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// Get ticket types
app.get('/api/tickets/types', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: ticketTypes,
    meta: { timestamp: new Date().toISOString(), requestId: uuidv4() }
  });
});

// Create order
app.post('/api/orders', (req: Request, res: Response) => {
  const { ticketType, quantity, buyerInfo, paymentMethod } = req.body;

  const ticket = ticketTypes.find(t => t.id === ticketType);
  if (!ticket) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_TICKET_TYPE', message: 'Ticket type not found' }
    });
  }

  const order = {
    id: `ORD-${uuidv4().split('-')[0].toUpperCase()}`,
    ticketType: ticket.id,
    ticketName: ticket.name,
    quantity: quantity || 1,
    unitPrice: ticket.price,
    totalAmount: ticket.price * (quantity || 1),
    currency: ticket.currency,
    buyerInfo,
    paymentMethod: paymentMethod || 'card',
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  res.json({
    success: true,
    data: order,
    meta: { timestamp: new Date().toISOString(), requestId: uuidv4() }
  });
});

// Get order
app.get('/api/orders/:orderId', (req: Request, res: Response) => {
  const { orderId } = req.params;

  res.json({
    success: true,
    data: {
      id: orderId,
      ticketType: 'premium',
      ticketName: 'Premium Pass',
      quantity: 2,
      unitPrice: 299,
      totalAmount: 598,
      currency: 'USD',
      status: 'completed',
      paymentId: `PAY-${uuidv4().split('-')[0].toUpperCase()}`,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      completedAt: new Date(Date.now() - 86400000 + 300000).toISOString()
    },
    meta: { timestamp: new Date().toISOString(), requestId: uuidv4() }
  });
});

// Process payment
app.post('/api/payments', (req: Request, res: Response) => {
  const { orderId, paymentMethod, cardDetails } = req.body;

  const payment = {
    id: `PAY-${uuidv4().split('-')[0].toUpperCase()}`,
    orderId,
    amount: 598,
    currency: 'USD',
    paymentMethod: paymentMethod || 'card',
    status: 'succeeded',
    cardLast4: cardDetails?.last4 || '4242',
    processedAt: new Date().toISOString()
  };

  res.json({
    success: true,
    data: payment,
    meta: { timestamp: new Date().toISOString(), requestId: uuidv4() }
  });
});

// Get payment
app.get('/api/payments/:paymentId', (req: Request, res: Response) => {
  const { paymentId } = req.params;

  res.json({
    success: true,
    data: {
      id: paymentId,
      orderId: 'ORD-123456',
      amount: 598,
      currency: 'USD',
      paymentMethod: 'card',
      status: 'succeeded',
      cardLast4: '4242',
      cardBrand: 'visa',
      processedAt: new Date().toISOString()
    },
    meta: { timestamp: new Date().toISOString(), requestId: uuidv4() }
  });
});

// Refund payment
app.post('/api/payments/:paymentId/refund', (req: Request, res: Response) => {
  const { paymentId } = req.params;
  const { amount, reason } = req.body;

  res.json({
    success: true,
    data: {
      id: `REF-${uuidv4().split('-')[0].toUpperCase()}`,
      paymentId,
      amount: amount || 598,
      currency: 'USD',
      status: 'succeeded',
      reason: reason || 'Customer requested',
      processedAt: new Date().toISOString()
    },
    meta: { timestamp: new Date().toISOString(), requestId: uuidv4() }
  });
});

// Generate tickets
app.post('/api/tickets/generate', (req: Request, res: Response) => {
  const { orderId, quantity } = req.body;

  const tickets = Array.from({ length: quantity || 1 }, () => ({
    id: `TKT-${uuidv4().split('-')[0].toUpperCase()}`,
    orderId,
    qrCode: uuidv4(),
    status: 'active',
    usedAt: null,
    createdAt: new Date().toISOString()
  }));

  res.json({
    success: true,
    data: { tickets },
    meta: { timestamp: new Date().toISOString(), requestId: uuidv4() }
  });
});

// Validate ticket
app.post('/api/tickets/validate', (req: Request, res: Response) => {
  const { ticketId, qrCode } = req.body;

  res.json({
    success: true,
    data: {
      valid: true,
      ticketId,
      ticketType: 'premium',
      ticketName: 'Premium Pass',
      holderName: 'John Doe',
      checkedIn: false,
      checkedInAt: null
    },
    meta: { timestamp: new Date().toISOString(), requestId: uuidv4() }
  });
});

// Check-in ticket
app.post('/api/tickets/:ticketId/checkin', (req: Request, res: Response) => {
  const { ticketId } = req.params;

  res.json({
    success: true,
    data: {
      ticketId,
      status: 'checked-in',
      checkedInAt: new Date().toISOString(),
      location: 'Main Entrance'
    },
    meta: { timestamp: new Date().toISOString(), requestId: uuidv4() }
  });
});

// Get user tickets
app.get('/api/tickets/user/:userId', (req: Request, res: Response) => {
  const { userId } = req.params;

  res.json({
    success: true,
    data: {
      tickets: [
        {
          id: 'TKT-123456',
          ticketType: 'premium',
          ticketName: 'Premium Pass',
          status: 'active',
          orderId: 'ORD-123456',
          qrCode: 'uuid-here',
          createdAt: new Date(Date.now() - 86400000).toISOString()
        }
      ],
      total: 1
    },
    meta: { timestamp: new Date().toISOString(), requestId: uuidv4() }
  });
});

// Revenue stats
app.get('/api/revenue/stats', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      today: {
        tickets: 12450,
        upgrades: 2340,
        total: 14790
      },
      thisWeek: {
        tickets: 87650,
        upgrades: 12340,
        total: 99990
      },
      thisMonth: {
        tickets: 156780,
        upgrades: 23400,
        sponsorships: 85000,
        total: 265180
      },
      byTicketType: {
        vip: { count: 115, revenue: 57485 },
        premium: { count: 523, revenue: 156377 },
        standard: { count: 2341, revenue: 348809 },
        virtual: { count: 856, revenue: 41944 }
      },
      conversions: {
        viewToPurchase: 0.082,
        addToCartToPurchase: 0.34
      }
    },
    meta: { timestamp: new Date().toISOString(), requestId: uuidv4() }
  });
});

// Promo codes
app.post('/api/promo/validate', (req: Request, res: Response) => {
  const { code, orderAmount } = req.body;

  // Mock promo validation
  const promos: Record<string, any> = {
    'EARLYBIRD': { discount: 20, type: 'percent', maxDiscount: 50 },
    'VIP10': { discount: 10, type: 'fixed', currency: 'USD' },
    'SPEAKER20': { discount: 20, type: 'percent' }
  };

  const promo = promos[code.toUpperCase()];

  if (!promo) {
    return res.json({
      success: true,
      data: { valid: false, error: 'Invalid promo code' }
    });
  }

  res.json({
    success: true,
    data: {
      valid: true,
      code: code.toUpperCase(),
      discountType: promo.type,
      discountValue: promo.discount,
      maxDiscount: promo.maxDiscount,
      calculatedDiscount: promo.type === 'percent'
        ? Math.min(orderAmount * (promo.discount / 100), promo.maxDiscount || Infinity)
        : promo.discount
    },
    meta: { timestamp: new Date().toISOString(), requestId: uuidv4() }
  });
});

app.listen(PORT, () => {
  console.log(`Exhibition Payment Service running on port ${PORT}`);
  console.log(`Health: http://localhost:${PORT}/health`);
});
