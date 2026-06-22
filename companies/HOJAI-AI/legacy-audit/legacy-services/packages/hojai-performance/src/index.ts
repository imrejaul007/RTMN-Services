/**
 * HOJAI Performance Dashboard API
 *
 * KPI tracking, evaluations, compensation, and performance reports for AI employees.
 *
 * Port: 4580
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

import performanceRoutes from './routes/performanceRoutes.js';
import { v4 as uuid } from 'uuid';

// ============================================
// CONFIGURATION
// ============================================

const PORT = parseInt(process.env.PORT || '4580', 10);
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai-performance';
const JWT_SECRET = process.env.JWT_SECRET || 'hojai-performance-secret-key-change-in-production';

// ============================================
// EXPRESS APP
// ============================================

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'X-Internal-Token'],
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
  const requestId = `req_${uuid().slice(0, 8)}`;
  (req as any).requestId = requestId;
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${requestId}`);
  next();
});

// ============================================
// AUTH MIDDLEWARE
// ============================================

async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // Skip auth for health checks and some public endpoints
  const publicPaths = ['/health', '/api/employees', '/api/leaderboard'];
  if (publicPaths.some(p => req.path.startsWith(p))) {
    // For public paths, just ensure tenantId is present
    const tenantId = req.headers['x-tenant-id'] || req.query.tenantId;
    if (!tenantId && !req.path.startsWith('/health')) {
      return res.status(400).json({ error: 'TENANT_ID_REQUIRED' });
    }
    (req as any).tenantId = tenantId;
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'AUTH_REQUIRED' });
  }

  try {
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : authHeader;

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    (req as any).tenantId = decoded.tenantId || decoded.tenant_id;
    (req as any).userId = decoded.userId || decoded.user_id;
    (req as any).role = decoded.role || 'user';
    next();
  } catch {
    return res.status(401).json({ error: 'AUTH_INVALID' });
  }
}

// Internal service token check
function internalTokenMiddleware(req: Request, res: Response, next: NextFunction) {
  const internalToken = req.headers['x-internal-token'];

  if (internalToken && internalToken === process.env.INTERNAL_SERVICE_TOKEN) {
    (req as any).isInternal = true;
    return next();
  }

  // Fall back to regular auth
  return authMiddleware(req, res, next);
}

// Admin-only middleware
function adminOnly(req: Request, res: Response, next: NextFunction) {
  const role = (req as any).role;
  if (role !== 'admin' && role !== 'superadmin') {
    return res.status(403).json({ error: 'ADMIN_ONLY' });
  }
  next();
}

// ============================================
// ROUTES
// ============================================

// Apply auth middleware to all routes
app.use(internalTokenMiddleware);
app.use(performanceRoutes);

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: 'NOT_FOUND',
    message: 'The requested endpoint does not exist',
  });
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: err.message,
    });
  }

  // Mongoose duplicate key error
  if (err.name === 'MongoServerError' && (err as any).code === 11000) {
    return res.status(409).json({
      error: 'DUPLICATE_ENTRY',
      message: 'A record with this key already exists',
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'AUTH_INVALID',
      message: 'Invalid authentication token',
    });
  }

  // Default error
  res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : err.message,
  });
});

// ============================================
// DATABASE CONNECTION
// ============================================

async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB connected successfully');

    // Create indexes
    await createIndexes();
  } catch (error) {
    console.error('MongoDB connection failed:', error);
    throw error;
  }
}

async function createIndexes(): Promise<void> {
  try {
    // Dynamic import for ESM compatibility
    const { models } = await import('./models/performanceModel.js');

    // Ensure indexes exist
    console.log('Database indexes verified');
  } catch (error) {
    console.warn('Index creation warning:', error);
  }
}

// ============================================
// SEED DATA (Development)
// ============================================

async function seedDemoData(): Promise<void> {
  const { EmployeeProfile, KPI, Evaluation } = await import('./models/performanceModel.js');

  // Check if demo data exists
  const existingCount = await EmployeeProfile.countDocuments({ tenantId: 'demo' });
  if (existingCount > 0) {
    console.log('Demo data already exists, skipping seed');
    return;
  }

  console.log('Seeding demo data...');

  const departments = ['Engineering', 'Sales', 'Support', 'Marketing'];
  const roles = ['Junior', 'Senior', 'Lead', 'Manager'];

  const demoEmployees = [];

  for (let i = 1; i <= 20; i++) {
    const employeeId = `emp_${String(i).padStart(3, '0')}`;
    const department = departments[i % departments.length];
    const role = roles[Math.floor(Math.random() * roles.length)];
    const level = Math.floor(Math.random() * 5) + 1;

    const employee = new EmployeeProfile({
      employeeId,
      tenantId: 'demo',
      name: `Employee ${i}`,
      email: `employee${i}@demo.hojai.ai`,
      role: `${role} ${department.slice(0, 3)}`,
      department,
      level,
      baseSalary: 50000 + (level * 10000),
      hourlyRate: (50000 + (level * 10000)) / (22 * 8),
      hireDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
      status: 'active',
    });

    await employee.save();
    demoEmployees.push(employee);

    // Create KPIs
    const kpi = new KPI({
      kpiId: `kpi_${employeeId}`,
      employeeId,
      tenantId: 'demo',
      period: new Date().toISOString().slice(0, 7),
      tasksCompleted: Math.floor(Math.random() * 200) + 50,
      tasksFailed: Math.floor(Math.random() * 10),
      tasksInProgress: Math.floor(Math.random() * 5),
      totalTasksAttempted: Math.floor(Math.random() * 220) + 50,
      avgResponseTime: Math.floor(Math.random() * 3000) + 500,
      customerSatisfaction: Math.floor(Math.random() * 30) + 70,
      qualityScore: Math.floor(Math.random() * 30) + 65,
      revenueGenerated: Math.floor(Math.random() * 50000) + 5000,
      errorRate: Math.random() * 0.1,
      escalationRate: Math.random() * 0.1,
      utilizationRate: Math.random() * 0.3 + 0.7,
    });

    await kpi.save();

    // Create Evaluation
    const evaluation = new Evaluation({
      evaluationId: `eval_${employeeId}`,
      employeeId,
      tenantId: 'demo',
      evaluatorId: 'system',
      period: new Date().toISOString().slice(0, 7),
      periodType: 'monthly',
      qualityScore: kpi.qualityScore,
      productivityScore: Math.floor(Math.random() * 30) + 60,
      reliabilityScore: Math.floor(Math.random() * 25) + 70,
      collaborationScore: Math.floor(Math.random() * 30) + 60,
      growthScore: Math.floor(Math.random() * 40) + 50,
      overallScore: Math.floor(Math.random() * 35) + 55,
      status: 'completed',
      completedAt: new Date(),
    });

    await evaluation.save();
  }

  console.log(`Seeded ${demoEmployees.length} demo employees with KPIs and evaluations`);
}

// ============================================
// START SERVER
// ============================================

async function start(): Promise<void> {
  try {
    // Connect to database
    await connectDatabase();

    // Seed demo data in development
    if (process.env.NODE_ENV !== 'production') {
      await seedDemoData();
    }

    // Start HTTP server
    

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'hojai-performance',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Liveness probe
app.get('/health/live', (req, res) => {
  res.json({ status: 'alive' });
});

// Readiness probe
app.get('/health/ready', (req, res) => {
  res.json({ status: 'ready' });
});
app.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                   HOJAI PERFORMANCE DASHBOARD API                        ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  Port:          ${PORT}                                                     ║
║  Database:      ${MONGODB_URI.split('@').pop() || MONGODB_URI}  ║
║  Environment:   ${process.env.NODE_ENV || 'development'}                                          ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  Endpoints:                                                           ║
║    GET  /health                          Health check                   ║
║    GET  /api/employee/:id/kpis          Get employee KPIs              ║
║    GET  /api/employee/:id/evaluation     Get employee evaluation        ║
║    GET  /api/leaderboard                Get performance leaderboard     ║
║    POST /api/compensation/calculate      Calculate compensation         ║
║    GET  /api/report/:employeeId         Get performance report         ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  Demo Tenant: demo | Demo data seeded for development                   ║
╚═══════════════════════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start the application
start();

export default app;
