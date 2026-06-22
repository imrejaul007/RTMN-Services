import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import helmet from 'helmet';
import cors from 'cors';
import { v4 as uuid } from 'uuid';
import eventRoutes from './routes/events.js';
import subscriptionRoutes from './routes/subscriptions.js';
import dlqRoutes from './routes/dlq.js';
import { eventBusService } from './services/eventBus.js';

// ============================================================================
// CONFIG
// ============================================================================

const PORT = process.env.PORT || 4510;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai-event';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// ============================================================================
// EXPRESS APP
// ============================================================================

const app = express();

// Security
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: '10mb' }));

// Request ID
app.use((req: Request, res: Response, next: NextFunction) => {
  req.requestId = (req.headers['x-request-id'] as string) || uuid();
  res.setHeader('X-Request-ID', req.requestId);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'hojai-event',
    timestamp: new Date().toISOString()
  });
});

app.get('/ready', async (req, res) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

  res.json({
    status: 'ready',
    mongodb: mongoStatus,
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/events', eventRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/dlq', dlqRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('[Error]', err);

  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

// ============================================================================
// DATABASE
// ============================================================================

async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('[MongoDB] Connected to', MONGODB_URI);
  } catch (error) {
    console.error('[MongoDB] Connection failed:', error);
    process.exit(1);
  }
}

// ============================================================================
// SERVER
// ============================================================================

async function startServer(): Promise<void> {
  console.log('[Hojai Event] Starting server...');

  await connectDatabase();
  await eventBusService.initialize();

  app.listen(PORT, () => {
    console.log(`[Hojai Event] Server running on port ${PORT}`);
    console.log(`[Hojai Event] Health: http://localhost:${PORT}/health`);
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Hojai Event] Shutting down...');
  await eventBusService.shutdown();
  await mongoose.disconnect();
  process.exit(0);
});

startServer().catch(console.error);

export default app;
