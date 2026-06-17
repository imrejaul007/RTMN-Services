import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routes
import organizationRoutes from './routes/organization';
import departmentRoutes from './routes/departments';
import branchRoutes from './routes/branches';
import employeeRoutes from './routes/employees';
import policyRoutes from './routes/policies';
import slaRoutes from './routes/sla';
import { generateInsights } from './services/insights';

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 4888;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/organization_twin';

// Middleware
app.use(helmet());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

  res.json({
    status: 'healthy',
    service: 'organization-twin',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: dbStatus,
    endpoints: {
      organizations: '/api/organizations',
      departments: '/api/departments',
      branches: '/api/branches',
      employees: '/api/employees',
      policies: '/api/policies',
      sla: '/api/sla',
      insights: '/api/insights',
    },
  });
});

// API Routes
app.use('/api/organizations', organizationRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/policies', policyRoutes);
app.use('/api/sla', slaRoutes);

// Insights routes
app.get('/api/insights', async (req: Request, res: Response) => {
  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || (req.query.tenantId as string);
    const organizationId = req.query.organizationId as string;

    const insights = await generateInsights({ tenantId, organizationId });

    res.json({
      success: true,
      data: insights,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Insights error:', error);
    res.status(500).json({ success: false, error: message });
  }
});

app.get('/api/insights/org/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || (req.query.tenantId as string);

    const insights = await generateInsights({
      tenantId,
      organizationId: req.params.id,
    });

    res.json({
      success: true,
      data: insights,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Insights error:', error);
    res.status(500).json({ success: false, error: message });
  }
});

// API Documentation endpoint
app.get('/api', (_req: Request, res: Response) => {
  res.json({
    name: 'Organization Twin Service',
    version: '1.0.0',
    description: 'Manages company structure, departments, branches, employees, policies, SLAs, assets, and business hours',
    documentation: {
      health: 'GET /health',
      organizations: {
        list: 'GET /api/organizations',
        create: 'POST /api/organizations',
        get: 'GET /api/organizations/:id',
        update: 'PUT /api/organizations/:id',
        delete: 'DELETE /api/organizations/:id',
        tree: 'GET /api/organizations/:id/tree',
      },
      departments: {
        list: 'GET /api/departments',
        create: 'POST /api/departments',
        get: 'GET /api/departments/:id',
        update: 'PUT /api/departments/:id',
        delete: 'DELETE /api/departments/:id',
        tree: 'GET /api/departments/:id/tree',
      },
      branches: {
        list: 'GET /api/branches',
        create: 'POST /api/branches',
        get: 'GET /api/branches/:id',
        update: 'PUT /api/branches/:id',
        delete: 'DELETE /api/branches/:id',
        hours: 'GET/PUT /api/branches/:id/hours',
      },
      employees: {
        list: 'GET /api/employees',
        create: 'POST /api/employees',
        get: 'GET /api/employees/:id',
        update: 'PUT /api/employees/:id',
        delete: 'DELETE /api/employees/:id',
        subordinates: 'GET /api/employees/:id/subordinates',
      },
      policies: {
        list: 'GET /api/policies',
        create: 'POST /api/policies',
        get: 'GET /api/policies/:id',
        update: 'PUT /api/policies/:id',
        delete: 'DELETE /api/policies/:id',
        byType: 'GET /api/policies/type/:type',
        version: 'POST /api/policies/:id/version',
      },
      sla: {
        list: 'GET /api/sla',
        create: 'POST /api/sla',
        get: 'GET /api/sla/:id',
        update: 'PUT /api/sla/:id',
        delete: 'DELETE /api/sla/:id',
        byPriority: 'GET /api/sla/priority/:priority',
        activate: 'POST /api/sla/:id/activate',
        deactivate: 'POST /api/sla/:id/deactivate',
      },
      insights: {
        overview: 'GET /api/insights',
        byOrganization: 'GET /api/insights/org/:id',
      },
    },
    headers: {
      'X-Tenant-ID': 'Required for multi-tenant isolation',
    },
  });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    availableEndpoints: [
      'GET /health',
      'GET /api',
      'GET /api/organizations',
      'GET /api/departments',
      'GET /api/branches',
      'GET /api/employees',
      'GET /api/policies',
      'GET /api/sla',
      'GET /api/insights',
    ],
  });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB connected successfully');

    app.listen(PORT, () => {
      console.log(`
╔══════════════════════════════════════════════════════════╗
║           Organization Twin Service Started             ║
╠══════════════════════════════════════════════════════════╣
║  Port: ${PORT}                                              ║
║  Health: http://localhost:${PORT}/health                   ║
║  API:    http://localhost:${PORT}/api                      ║
║  Docs:   http://localhost:${PORT}/api                      ║
╠══════════════════════════════════════════════════════════╣
║  Multi-tenant: X-Tenant-ID header required                ║
╚══════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

// Start the server
startServer();

export default app;
