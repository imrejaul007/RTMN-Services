import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { voiceCommerceService } from './services/VoiceCommerceService.js';
import { orderService } from './services/OrderService.js';
import { bookingService } from './services/BookingService.js';

const app = express();
const PORT = process.env.PORT || 4880;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: "10kb" }));

// ============ VOICE COMMANDS ============

// Start session
app.post('/api/session/start', async (req, res) => {
  try {
    const { customerId, customerPhone } = req.body;

    if (!customerId || !customerPhone) {
      return res.status(400).json({ error: 'customerId and customerPhone required' });
    }

    const sessionId = await voiceCommerceService.startSession(customerId, customerPhone);

    res.json({ success: true, sessionId });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Process voice command
app.post('/api/voice/command', async (req, res) => {
  try {
    const { sessionId, text } = req.body;

    if (!sessionId || !text) {
      return res.status(400).json({ error: 'sessionId and text required' });
    }

    const result = await voiceCommerceService.processCommand(sessionId, text);

    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// End session
app.post('/api/session/end', async (req, res) => {
  try {
    const { sessionId } = req.body;
    await voiceCommerceService.endSession(sessionId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============ ORDERS ============

// Get order
app.get('/api/orders/:id', async (req, res) => {
  try {
    const order = await orderService.getOrder(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json({ success: true, data: order });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Confirm payment
app.post('/api/orders/:id/pay', async (req, res) => {
  try {
    const { transactionId } = req.body;
    const success = await orderService.confirmPayment(req.params.id, transactionId);

    if (!success) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get customer orders
app.get('/api/orders/customer/:customerId', async (req, res) => {
  try {
    const orders = await orderService.getCustomerOrders(req.params.customerId);
    res.json({ success: true, data: orders });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============ BOOKINGS ============

// Get booking
app.get('/api/bookings/:id', async (req, res) => {
  try {
    const booking = await bookingService.getBooking(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    res.json({ success: true, data: booking });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get customer bookings
app.get('/api/bookings/customer/:customerId', async (req, res) => {
  try {
    const bookings = await bookingService.getCustomerBookings(req.params.customerId);
    res.json({ success: true, data: bookings });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Check availability
app.get('/api/bookings/availability', async (req, res) => {
  try {
    const { service, date } = req.query;
    const availability = await bookingService.checkAvailability(
      service as any,
      new Date(date as string)
    );
    res.json({ success: true, data: availability });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============ ANALYTICS ============

// Get analytics
app.get('/api/analytics', async (req, res) => {
  try {
    const analytics = await voiceCommerceService.getAnalytics();
    res.json({ success: true, data: analytics });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============ HEALTH ============

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'hojai-voice-commerce',
    version: '1.0.0'
  });
});

// Start
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║       Hojai Voice Commerce (${PORT})
╠══════════════════════════════════════════════════════════════╣
║  Voice → Order → Pay → Fulfill
║  Book → Confirm → Complete
╚══════════════════════════════════════════════════════════════╝
  `);
});

export default app;
