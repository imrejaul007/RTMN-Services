import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

import { logger } from './services/logger';
import rideRoutes from './routes/ride';
import deliveryRoutes from './routes/delivery';
import fleetRoutes from './routes/fleet';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 4967;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req: Request, _res: Response, next) => {
  logger.info(`${req.method} ${req.path}`, { query: req.query, body: req.body });
  next();
});

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    service: 'khairmove-integration',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    port: PORT,
    connections: {
      shipmentTwin: process.env.SHIPMENT_TWIN_URL || 'localhost:3013',
      orderTwin: process.env.ORDER_TWIN_URL || 'localhost:3018',
      customerTwin: process.env.CUSTOMER_TWIN_URL || 'localhost:3017',
      agentTwin: process.env.AGENT_TWIN_URL || 'localhost:3011'
    }
  });
});

// Routes
app.use('/api/ride', rideRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/fleet', fleetRoutes);

// Service info
app.get('/api/info', (_req: Request, res: Response) => {
  res.json({
    name: 'KHAIRMOVE Integration',
    version: '1.0.0',
    description: 'Ride, Delivery, Fleet operations connected to RTMN Customer Operations',
    capabilities: [
      'Ride booking and tracking',
      'Delivery scheduling and sync',
      'Fleet management',
      'Shipment Twin integration',
      'Order Twin integration',
      'Customer Twin integration'
    ],
    twins: {
      shipmentTwin: 'Shipment tracking and logistics',
      orderTwin: 'Order management',
      customerTwin: 'Customer profiles and preferences'
    }
  });
});

// Error handling
app.use((err: Error, _req: Request, res: Response) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`KHAIRMOVE Integration Service started on port ${PORT}`);
  logger.info(`Connected to TwinOS Hub: ${process.env.TWINOS_HUB_URL || 'localhost:4705'}`);
});

export default app;
