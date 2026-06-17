import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

import { integrationRoutes } from './routes/integration';
import { syncRoutes } from './routes/sync';
import { Connector } from './models/Connector';
import { SyncLog } from './models/SyncLog';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4890;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/integrations', integrationRoutes);
app.use('/api/sync', syncRoutes);

// Health check
app.get('/health', async (_req: Request, res: Response) => {
  try {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

    // Get connector status
    const connectors = await Connector.find({ isActive: true });
    const connectorStatus = connectors.reduce((acc: Record<string, any>, c) => {
      acc[c.name] = { status: c.status, lastSync: c.lastSyncAt };
      return acc;
    }, {});

    res.json({
      status: 'healthy',
      service: 'hojai-integration-hub',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      database: dbStatus,
      connectors: connectorStatus
    });
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', error: String(error) });
  }
});

// API Info
app.get('/api', (_req: Request, res: Response) => {
  res.json({
    service: 'HOJAI Integration Hub',
    version: '1.0.0',
    description: 'Third-party service integrations (Shopify, Stripe, QuickBooks, Xero, Slack)',
    supportedIntegrations: ['shopify', 'stripe', 'quickbooks', 'xero', 'slack'],
    endpoints: {
      integrations: '/api/integrations',
      sync: '/api/sync',
      health: '/health'
    }
  });
});

// Database connection
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai-integration-hub';
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected successfully');

    // Create indexes
    await Connector.createIndexes();
    await SyncLog.createIndexes();

    // Seed default connectors
    await seedDefaultConnectors();
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Seed default connectors
const seedDefaultConnectors = async () => {
  const defaultConnectors = [
    {
      name: 'shopify',
      displayName: 'Shopify',
      type: 'ecommerce',
      status: 'disconnected',
      isActive: true,
      config: {
        endpoints: ['products', 'orders', 'customers', 'inventory']
      }
    },
    {
      name: 'stripe',
      displayName: 'Stripe',
      type: 'payments',
      status: 'disconnected',
      isActive: true,
      config: {
        endpoints: ['customers', 'subscriptions', 'invoices', 'payments']
      }
    },
    {
      name: 'quickbooks',
      displayName: 'QuickBooks Online',
      type: 'accounting',
      status: 'disconnected',
      isActive: true,
      config: {
        endpoints: ['invoices', 'customers', 'products', 'payments']
      }
    },
    {
      name: 'xero',
      displayName: 'Xero',
      type: 'accounting',
      status: 'disconnected',
      isActive: true,
      config: {
        endpoints: ['invoices', 'contacts', 'items', 'bank-transactions']
      }
    },
    {
      name: 'slack',
      displayName: 'Slack',
      type: 'messaging',
      status: 'disconnected',
      isActive: true,
      config: {
        endpoints: ['channels', 'messages', 'users']
      }
    }
  ];

  for (const connector of defaultConnectors) {
    await Connector.findOneAndUpdate(
      { name: connector.name },
      connector,
      { upsert: true, new: true }
    );
  }
  console.log('Default connectors seeded');
};

// Start server
const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║     HOJAI INTEGRATION HUB                                    ║
║     Port: ${PORT}                                            ║
║     Status: Running                                         ║
╚════════════════════════════════════════════════════════════╝
    `);
  });
};

startServer().catch(console.error);