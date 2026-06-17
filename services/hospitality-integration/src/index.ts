import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

// Routes
import hotelRoutes from './routes/hotel';
import restaurantRoutes from './routes/restaurant';
import bookingRoutes from './routes/booking';
import guestRoutes from './routes/guest';

// Services
import { CustomerOpsBridge } from './services/customerOpsBridge';
import { BookingSync } from './services/bookingSync';
import { ExperienceSync } from './services/experienceSync';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4964;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Request ID middleware
app.use((req, res, next) => {
  (req as any).requestId = uuidv4();
  res.setHeader('X-Request-ID', (req as any).requestId);
  next();
});

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Initialize services
const customerOpsBridge = new CustomerOpsBridge();
const bookingSync = new BookingSync();
const experienceSync = new ExperienceSync();

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'hospitality-integration',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    integrations: {
      hotelOS: process.env.HOTEL_OS_URL || 'localhost:5025',
      restaurantOS: process.env.RESTAURANT_OS_URL || 'localhost:5010',
      stayOwn: process.env.STAYOWN_HOSPITALITY_URL || 'localhost:6000'
    }
  });
});

// API Routes
app.use('/api/hotel', hotelRoutes);
app.use('/api/restaurant', restaurantRoutes);
app.use('/api/booking', bookingRoutes);
app.use('/api/guest', guestRoutes);

// Dashboard overview
app.get('/api/dashboard', async (req, res) => {
  try {
    const [hotelStats, restaurantStats, bookingStats, guestStats] = await Promise.all([
      customerOpsBridge.getHotelStats(),
      customerOpsBridge.getRestaurantStats(),
      bookingSync.getBookingStats(),
      customerOpsBridge.getGuestStats()
    ]);

    res.json({
      service: 'hospitality-integration',
      timestamp: new Date().toISOString(),
      stats: {
        hotel: hotelStats,
        restaurant: restaurantStats,
        bookings: bookingStats,
        guests: guestStats
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// Integration status
app.get('/api/status', async (req, res) => {
  try {
    const status = await customerOpsBridge.checkIntegrationStatus();
    res.json({
      service: 'hospitality-integration',
      timestamp: new Date().toISOString(),
      integrations: status
    });
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ error: 'Failed to check integration status' });
  }
});

// Sync endpoints
app.post('/api/sync/bookings', async (req, res) => {
  try {
    const result = await bookingSync.syncAllBookings();
    res.json({ success: true, synced: result });
  } catch (error) {
    console.error('Booking sync error:', error);
    res.status(500).json({ error: 'Failed to sync bookings' });
  }
});

app.post('/api/sync/experiences', async (req, res) => {
  try {
    const result = await experienceSync.syncAllExperiences();
    res.json({ success: true, synced: result });
  } catch (error) {
    console.error('Experience sync error:', error);
    res.status(500).json({ error: 'Failed to sync experiences' });
  }
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(`[${new Date().toISOString()}] Error:`, err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    requestId: (req as any).requestId
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║           HOSPITALITY INTEGRATION SERVICE STARTED            ║
╠══════════════════════════════════════════════════════════════╣
║  Port: ${PORT}                                                ║
║  Status: Running                                               ║
║  Integrations:                                                 ║
║    - Hotel OS: ${(process.env.HOTEL_OS_URL || 'localhost:5025').substring(0, 20).padEnd(20)}              ║
║    - Restaurant OS: ${(process.env.RESTAURANT_OS_URL || 'localhost:5010').substring(0, 20).padEnd(20)}         ║
║    - StayOwn Hospitality: ${(process.env.STAYOWN_HOSPITALITY_URL || 'localhost:6000').substring(0, 20).padEnd(20)}       ║
║                                                               ║
║  Twins Connected:                                              ║
║    - Asset Twin (room/cabin)                                  ║
║    - Customer Twin (guest profiles)                           ║
║    - Order Twin (restaurant orders)                           ║
║    - Feedback Twin (reviews)                                  ║
╚══════════════════════════════════════════════════════════════╝
  `);

  // Register with service registry
  customerOpsBridge.registerService();
});

export default app;
