/**
 * RTMN Service Starter Template
 *
 * This template includes all security best practices pre-configured:
 * - JWT Authentication
 * - Rate Limiting
 * - Security Headers
 * - Input Validation
 * - Error Handling
 * - Audit Logging
 * - Health Checks
 * - Circuit Breakers
 *
 * @company RTMN
 * @version 1.0.0
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';

// ============================================
// RTMN Shared SDK Imports
// ============================================

import {
  // Auth
  AuthMiddleware,
  TokenService,
  HIPAAAuditLogger,
  createAuthMiddleware,
  createTokenService,
  type RTMNUser,
  type AuthenticatedRequest,
  // Security
  createCorsMiddleware,
  createHelmetMiddleware,
  createRateLimiters,
  // Validation
  validateRequest,
  // Error Handling
  AppError,
  errorHandler,
  // Logging
  Logger,
  requestLogger,
  requestIdMiddleware,
  // Health
  createHealthCheck,
  type HealthStatus,
  // Utilities
  CircuitBreaker,
  parsePagination,
  createPaginatedResponse,
} from '@rtmn/shared-sdk';

// ============================================
// Configuration
// ============================================

interface ServiceConfig {
  name: string;
  port: number;
  version: string;
  mongoUri: string;
  mongodbName: string;
  isHealthcare?: boolean; // Enable HIPAA compliance
}

const config: ServiceConfig = {
  name: process.env.SERVICE_NAME || 'rtmn-service',
  port: parseInt(process.env.PORT || '5000', 10),
  version: process.env.SERVICE_VERSION || '1.0.0',
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/rtmn',
  mongodbName: process.env.MONGODB_NAME || 'rtmn',
  isHealthcare: process.env.IS_HEALTHCARE === 'true',
};

// ============================================
// Initialize Services
// ============================================

const app: Express = express();
const logger = new Logger(config.name);

// Initialize Auth
const auth = createAuthMiddleware();
const tokenService = createTokenService();

// Initialize HIPAA Audit Logger if healthcare service
const hipaaLogger = config.isHealthcare ? new HIPAAAuditLogger() : null;

// ============================================
// Security Middleware
// ============================================

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// Request ID for distributed tracing
app.use(requestIdMiddleware());

// CORS configuration
app.use(createCorsMiddleware());

// Security headers
app.use(createHelmetMiddleware());

// Rate limiting
const { global: globalLimiter, auth: authLimiter, write: writeLimiter } = createRateLimiters();
app.use(globalLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(requestLogger(logger));

// ============================================
// Database Connection
// ============================================

async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(config.mongoUri, {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    logger.info('MongoDB connected', { uri: config.mongoUri.replace(/\/\/.*@/, '//<credentials>@') });

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB error', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });
  } catch (error) {
    logger.error('MongoDB connection failed', error as Error);
    throw error;
  }
}

// ============================================
// Health Check Endpoints
// ============================================

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: config.name });
});

app.get('/ready', createHealthCheck(config.name, config.version));

// ============================================
// Validation Schemas (Example)
// ============================================

const createResourceSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    category: z.enum(['category1', 'category2', 'category3']),
    metadata: z.record(z.any()).optional(),
  }),
});

const updateResourceSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    category: z.enum(['category1', 'category2', 'category3']).optional(),
    metadata: z.record(z.any()).optional(),
  }),
  params: z.object({
    id: z.string().regex(/^[a-f\d]{24}$/i),
  }),
});

const listResourcesSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    category: z.enum(['category1', 'category2', 'category3']).optional(),
    search: z.string().max(100).optional(),
  }),
});

// ============================================
// Mongoose Model (Example)
// ============================================

interface IResource extends mongoose.Document {
  name: string;
  description?: string;
  category: string;
  metadata?: Record<string, unknown>;
  tenantId: string;
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const resourceSchema = new mongoose.Schema<IResource>(
  {
    name: { type: String, required: true, index: true },
    description: { type: String },
    category: { type: String, required: true, enum: ['category1', 'category2', 'category3'] },
    metadata: { type: mongoose.Schema.Types.Mixed },
    tenantId: { type: String, required: true, index: true },
    createdBy: { type: String, required: true },
    updatedBy: { type: String },
  },
  { timestamps: true }
);

// Compound indexes for common queries
resourceSchema.index({ tenantId: 1, category: 1 });
resourceSchema.index({ tenantId: 1, createdAt: -1 });
resourceSchema.index({ tenantId: 1, name: 'text', description: 'text' });

const ResourceModel = mongoose.model<IResource>('Resource', resourceSchema);

// ============================================
// Circuit Breaker for External Services
// ============================================

const externalApiBreaker = new CircuitBreaker(5, 60000, 30000);

// ============================================
// API Routes
// ============================================

// Auth routes (public, with rate limiting)
app.use('/auth', authLimiter);

app.post('/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Email and password required');
  }

  // TODO: Verify credentials against database
  // const user = await UserModel.findOne({ email });
  // const isValid = await bcrypt.compare(password, user.passwordHash);

  // Generate token
  const user: Omit<RTMNUser, 'iat' | 'exp'> = {
    id: 'user-123',
    tenantId: 'tenant-123',
    email,
    roles: ['user'],
    permissions: ['read', 'write'],
    businessId: 'business-123',
  };

  const token = tokenService.generateToken(user);
  const refreshToken = tokenService.generateRefreshToken(user);

  res.json({
    success: true,
    data: {
      token,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        roles: user.roles,
      },
    },
  });
});

// Protected routes
app.use('/api', auth.authenticate());

// List resources with pagination
app.get('/api/resources', validateRequest(listResourcesSchema), async (req: AuthenticatedRequest, res: Response) => {
  const { page, limit, category, search } = parsePagination(req.query as Record<string, unknown>);

  const filter: Record<string, unknown> = { tenantId: req.user!.tenantId };

  if (category) {
    filter.category = category;
  }

  if (search) {
    filter.$text = { $search: search };
  }

  const skip = (page - 1) * limit;

  const [resources, total] = await Promise.all([
    ResourceModel.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
    ResourceModel.countDocuments(filter),
  ]);

  res.json({
    success: true,
    ...createPaginatedResponse(resources, total, { page, limit }),
  });
});

// Get single resource
app.get('/api/resources/:id', async (req: AuthenticatedRequest, res: Response) => {
  const resource = await ResourceModel.findOne({
    _id: req.params.id,
    tenantId: req.user!.tenantId,
  });

  if (!resource) {
    throw new AppError(404, 'NOT_FOUND', 'Resource not found');
  }

  // Log HIPAA event if applicable
  if (hipaaLogger) {
    hipaaLogger.logPHIAccess(
      req.user!.id,
      req.user!.tenantId,
      'resource',
      resource._id.toString(),
      req,
      'view'
    );
  }

  res.json({ success: true, data: resource });
});

// Create resource
app.post('/api/resources', validateRequest(createResourceSchema), async (req: AuthenticatedRequest, res: Response) => {
  const resource = new ResourceModel({
    ...req.body,
    tenantId: req.user!.tenantId,
    createdBy: req.user!.id,
  });

  await resource.save();

  // Log HIPAA event if applicable
  if (hipaaLogger) {
    hipaaLogger.logPHIAccess(
      req.user!.id,
      req.user!.tenantId,
      'resource',
      resource._id.toString(),
      req,
      'create'
    );
  }

  res.status(201).json({ success: true, data: resource });
});

// Update resource
app.patch('/api/resources/:id', validateRequest(updateResourceSchema), async (req: AuthenticatedRequest, res: Response) => {
  const resource = await ResourceModel.findOneAndUpdate(
    {
      _id: req.params.id,
      tenantId: req.user!.tenantId,
    },
    {
      ...req.body,
      updatedBy: req.user!.id,
    },
    { new: true }
  );

  if (!resource) {
    throw new AppError(404, 'NOT_FOUND', 'Resource not found');
  }

  // Log HIPAA event if applicable
  if (hipaaLogger) {
    hipaaLogger.logPHIAccess(
      req.user!.id,
      req.user!.tenantId,
      'resource',
      resource._id.toString(),
      req,
      'update'
    );
  }

  res.json({ success: true, data: resource });
});

// Delete resource (soft delete recommended for compliance)
app.delete('/api/resources/:id', async (req: AuthenticatedRequest, res: Response) => {
  const resource = await ResourceModel.findOneAndUpdate(
    {
      _id: req.params.id,
      tenantId: req.user!.tenantId,
    },
    {
      deletedAt: new Date(),
      deletedBy: req.user!.id,
    },
    { new: true }
  );

  if (!resource) {
    throw new AppError(404, 'NOT_FOUND', 'Resource not found');
  }

  res.json({ success: true, message: 'Resource deleted' });
});

// ============================================
// External API Call Example with Circuit Breaker
// ============================================

app.post('/api/external-action', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await externalApiBreaker.execute(async () => {
      const response = await fetch('https://api.external-service.com/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.EXTERNAL_API_KEY}`,
        },
        body: JSON.stringify(req.body),
      });

      if (!response.ok) {
        throw new Error(`External API error: ${response.status}`);
      }

      return response.json();
    });

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('External API call failed', error as Error);
    throw new AppError(502, 'EXTERNAL_SERVICE_ERROR', 'External service unavailable');
  }
});

// ============================================
// Error Handling
// ============================================

app.use(errorHandler());

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
    code: 'NOT_FOUND',
  });
});

// ============================================
// Graceful Shutdown
// ============================================

let isShuttingDown = false;

async function gracefulShutdown(signal: string): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`Received ${signal}, starting graceful shutdown`);

  // Stop accepting new connections
  server.close(async () => {
    logger.info('HTTP server closed');

    // Close database connection
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');

    process.exit(0);
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ============================================
// Start Server
// ============================================

let server: ReturnType<Express['listen']>;

async function start(): Promise<void> {
  try {
    // Connect to database
    await connectDatabase();

    // Start HTTP server
    server = app.listen(config.port, () => {
      logger.info(`Server started`, {
        service: config.name,
        port: config.port,
        version: config.version,
        environment: process.env.NODE_ENV,
        healthcare: config.isHealthcare,
      });
    });

    server.on('error', (error: Error) => {
      logger.error('Server error', error);
      process.exit(1);
    });
  } catch (error) {
    logger.error('Failed to start server', error as Error);
    process.exit(1);
  }
}

start();

export { app };
