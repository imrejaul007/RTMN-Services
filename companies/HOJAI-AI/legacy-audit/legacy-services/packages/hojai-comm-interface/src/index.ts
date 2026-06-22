import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import helmet from 'helmet';
import cors from 'cors';
import { v4 as uuid } from 'uuid';

import { employeeRegistry } from './services/employeeRegistry.js';
import { conversationManager } from './services/conversationManager.js';
import { whatsAppBridge } from './whatsappBridge.js';
import { webSocketServer } from './webSocketServer.js';
import apiRoutes from './routes/apiRoutes.js';
import { EmployeeStatus } from './types/index.js';

// ============================================================================
// CONFIG
// ============================================================================

const PORT = parseInt(process.env.PORT || '4584', 10);
const WS_PORT = parseInt(process.env.WS_PORT || '4586', 10);
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai-comm-interface';

// ============================================================================
// EXPRESS APP
// ============================================================================

const app = express();

// Security middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request ID middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  (req as any).requestId = (req.headers['x-request-id'] as string) || `req_${Date.now()}_${uuid()}`;
  res.setHeader('X-Request-ID', (req as any).requestId);
  next();
});

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });

  next();
});

// ============================================================================
// HEALTH CHECKS
// ============================================================================

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'hojai-comm-interface',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0'
  });
});

app.get('/ready', async (req: Request, res: Response) => {
  try {
    const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

    const checks = {
      mongodb: mongoStatus,
      websocket: webSocketServer.getConnectionCount() >= 0 ? 'ready' : 'not_ready',
      whatsapp: whatsAppBridge.getConnectedTenants().length >= 0 ? 'ready' : 'not_ready'
    };

    const allReady = Object.values(checks).every(status => status === 'connected' || status === 'ready');

    res.json({
      status: allReady ? 'ready' : 'not_ready',
      service: 'hojai-comm-interface',
      checks,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      error: 'Service unavailable'
    });
  }
});

// ============================================================================
// API ROUTES
// ============================================================================

app.use('/', apiRoutes);

// ============================================================================
// ERROR HANDLERS
// ============================================================================

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path,
    requestId: (req as any).requestId
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  const statusCode = (err as any).statusCode || 500;
  const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message;

  console.error('[Error]', {
    requestId: (req as any).requestId,
    path: req.path,
    method: req.method,
    error: err.message,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined
  });

  res.status(statusCode).json({
    success: false,
    error: message,
    requestId: (req as any).requestId
  });
});

// ============================================================================
// STARTUP
// ============================================================================

async function initializeServices(): Promise<void> {
  console.log('[Startup] Initializing services...');

  // Connect to MongoDB
  await mongoose.connect(MONGODB_URI);
  console.log('[MongoDB] Connected to', MONGODB_URI);

  // Initialize employee registry
  await employeeRegistry.initialize();
  console.log('[EmployeeRegistry] Initialized');

  // Initialize conversation manager
  await conversationManager.initialize();
  console.log('[ConversationManager] Initialized');

  // Seed demo employees if none exist
  await seedDemoEmployees();

  console.log('[Startup] All services initialized');
}

async function seedDemoEmployees(): Promise<void> {
  const count = await employeeRegistry.countByTenant('default-tenant');

  if (count > 0) {
    console.log('[Demo] Employees already exist, skipping seed');
    return;
  }

  console.log('[Demo] Seeding default employees...');

  const demoEmployees = [
    {
      tenantId: 'default-tenant',
      name: 'Alice',
      role: 'sales',
      description: 'Sales specialist for pricing and plans',
      capabilities: ['sales', 'pricing', 'quotes', 'upgrades'],
      skills: ['customer service', 'product knowledge', 'negotiation'],
      languages: ['en', 'hi']
    },
    {
      tenantId: 'default-tenant',
      name: 'Bob',
      role: 'support',
      description: 'Technical support specialist',
      capabilities: ['support', 'troubleshooting', 'technical', 'bugs'],
      skills: ['problem solving', 'technical analysis', 'debugging'],
      languages: ['en']
    },
    {
      tenantId: 'default-tenant',
      name: 'Carol',
      role: 'billing',
      description: 'Billing and accounts specialist',
      capabilities: ['billing', 'invoices', 'payments', 'refunds'],
      skills: ['accounting', 'payment processing', 'dispute resolution'],
      languages: ['en', 'hi']
    },
    {
      tenantId: 'default-tenant',
      name: 'David',
      role: 'technical',
      description: 'Technical integration specialist',
      capabilities: ['technical', 'api', 'integration', 'sdk'],
      skills: ['software development', 'api design', 'documentation'],
      languages: ['en']
    },
    {
      tenantId: 'default-tenant',
      name: 'Eva',
      role: 'assistant',
      description: 'General purpose assistant',
      capabilities: ['general', 'information', 'help', 'faq'],
      skills: ['communication', 'research', 'problem solving'],
      languages: ['en', 'hi', 'bn']
    }
  ];

  for (const employee of demoEmployees) {
    await employeeRegistry.register(employee);
  }

  // Set first employee to online
  const employees = await employeeRegistry.listByTenant('default-tenant');
  if (employees.length > 0) {
    await employeeRegistry.updateStatus(employees[0].id, 'default-tenant', EmployeeStatus.ONLINE);
  }

  console.log('[Demo] Seeded', demoEmployees.length, 'employees');
}

async function startServer(): Promise<void> {
  console.log('[Hojai Comm Interface] Starting server...');

  await initializeServices();

  // Connect WhatsApp for default tenant
  await whatsAppBridge.connect('default-tenant');

  // Start WebSocket server
  webSocketServer.initialize(WS_PORT);

  // Start HTTP server
  app.listen(PORT, () => {
    console.log(`[Hojai Comm Interface] HTTP server running on port ${PORT}`);
    console.log(`[Hojai Comm Interface] WebSocket server running on port ${WS_PORT}`);
    console.log(`[Hojai Comm Interface] Health check: http://localhost:${PORT}/health`);
    console.log(`[Hojai Comm Interface] Ready for connections`);
  });
}

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

async function shutdown(): Promise<void> {
  console.log('[Hojai Comm Interface] Shutting down...');

  // Disconnect WhatsApp
  await whatsAppBridge.shutdown();

  // Shutdown WebSocket
  webSocketServer.shutdown();

  // Disconnect MongoDB
  await mongoose.disconnect();

  console.log('[Hojai Comm Interface] Shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('[Uncaught Exception]', error);
  shutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Unhandled Rejection]', reason);
});

// ============================================================================
// START
// ============================================================================

startServer().catch((error) => {
  console.error('[Hojai Comm Interface] Failed to start:', error);
  process.exit(1);
});

export default app;
