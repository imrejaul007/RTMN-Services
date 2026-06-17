import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { contactsRouter, dealsRouter, activitiesRouter } from './routes';
import { authMiddleware } from './middleware';
import { getHubSpotStatus, getZohoStatus } from './services';

const app = express();
const PORT = process.env.PORT || 4888;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
}));
app.use(express.json());

// Request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
  const requestId = uuidv4();
  req.headers['x-request-id'] = requestId;
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} [${requestId}]`);
  next();
});

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

  res.json({
    status: 'ok',
    service: 'crm-engine',
    version: '1.0.0',
    port: PORT,
    timestamp: new Date().toISOString(),
    mongodb: mongoStatus,
  });
});

// API info endpoint
app.get('/api', (_req: Request, res: Response) => {
  res.json({
    service: 'CRM Engine',
    version: '1.0.0',
    description: 'Deals, Contacts, and Pipeline management',
    endpoints: {
      contacts: {
        'GET /api/contacts': 'List contacts (paginated)',
        'GET /api/contacts/:id': 'Get contact by ID',
        'POST /api/contacts': 'Create contact',
        'PUT /api/contacts/:id': 'Update contact',
        'DELETE /api/contacts/:id': 'Delete contact',
        'POST /api/contacts/sync/hubspot': 'Sync with HubSpot',
        'POST /api/contacts/sync/zoho': 'Sync with Zoho',
      },
      deals: {
        'GET /api/deals': 'List deals (paginated)',
        'GET /api/deals/pipeline': 'Get pipeline statistics',
        'GET /api/deals/:id': 'Get deal by ID',
        'POST /api/deals': 'Create deal',
        'PUT /api/deals/:id': 'Update deal',
        'PATCH /api/deals/:id/stage': 'Update deal stage',
        'DELETE /api/deals/:id': 'Delete deal',
        'POST /api/deals/sync/hubspot': 'Sync with HubSpot',
        'POST /api/deals/sync/zoho': 'Sync with Zoho',
      },
      activities: {
        'GET /api/activities': 'List activities (paginated)',
        'GET /api/activities/:id': 'Get activity by ID',
        'POST /api/activities': 'Create activity',
        'PUT /api/activities/:id': 'Update activity',
        'DELETE /api/activities/:id': 'Delete activity',
      },
      integrations: {
        'GET /api/integrations/status': 'Get integration status',
      },
    },
    models: {
      lifecycleStages: ['lead', 'prospect', 'customer', 'evangelist'],
      dealStages: ['prospect', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost'],
      activityTypes: ['call', 'email', 'note', 'meeting', 'task'],
    },
  });
});

// Integration status endpoint
app.get('/api/integrations/status', async (_req: Request, res: Response) => {
  try {
    const [hubspot, zoho] = await Promise.all([
      getHubSpotStatus(),
      getZohoStatus(),
    ]);

    res.json({ hubspot, zoho });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get integration status' });
  }
});

// Apply auth middleware to API routes
app.use('/api/contacts', authMiddleware, contactsRouter);
app.use('/api/deals', authMiddleware, dealsRouter);
app.use('/api/activities', authMiddleware, activitiesRouter);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/crm-engine';

async function connectDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log(`[MongoDB] Connected to ${MONGODB_URI}`);
  } catch (error) {
    console.error('[MongoDB] Connection failed:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Server] SIGTERM received, shutting down gracefully');
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[Server] SIGINT received, shutting down gracefully');
  await mongoose.connection.close();
  process.exit(0);
});

// Start server
async function start() {
  await connectDatabase();

  app.listen(PORT, () => {
    console.log(`[Server] CRM Engine running on port ${PORT}`);
    console.log(`[Server] Health check: http://localhost:${PORT}/health`);
    console.log(`[Server] API docs: http://localhost:${PORT}/api`);
  });
}

start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

export default app;