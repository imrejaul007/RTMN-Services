import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import * as dotenv from 'dotenv';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import path from 'path';

import { uploadRoutes } from './routes/upload';
import { extractRoutes } from './routes/extract';
import { validateRoutes } from './routes/validate';
import { invoiceRoutes } from './routes/invoices';
import { tenantMiddleware } from './middleware/tenant';
import { Logger } from './utils/logger';
import { storageService } from './utils/storage';
import { InvoiceOCRModel } from './models/InvoiceOCR';
import { ExtractedDataModel } from './models/ExtractedData';

// Load environment variables
dotenv.config();

const logger = new Logger('rez-invoice-ocr');

// Configuration
const PORT = parseInt(process.env.PORT || '5002', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez-invoice-ocr';
const CORS_ORIGINS = process.env.CORS_ORIGINS?.split(',') || [
  'http://localhost:3000',
  'http://localhost:3001',
];

// Initialize Express
const app: Express = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// CORS
app.use(cors({
  origin: CORS_ORIGINS,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Tenant-Id',
    'X-User-Id',
    'X-User-Name',
  ],
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  message: {
    success: false,
    error: 'Too many requests, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Static files
const storagePath = process.env.UPLOAD_PATH || './uploads';
app.use('/uploads', express.static(path.join(process.cwd(), storagePath)));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'error' : 'info';
    const message = `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`;

    if (logLevel === 'error') {
      logger.error(message, {
        ip: req.ip,
        statusCode: res.statusCode,
        duration,
      });
    } else {
      logger.info(message, {
        ip: req.ip,
        statusCode: res.statusCode,
        duration,
      });
    }
  });

  next();
});

// Tenant middleware
app.use(tenantMiddleware);

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      service: 'rez-invoice-ocr',
      port: PORT,
      environment: NODE_ENV,
      mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    },
  });
});

// Readiness check
app.get('/ready', async (_req: Request, res: Response) => {
  const mongoStatus = mongoose.connection.readyState === 1;

  if (!mongoStatus) {
    res.status(503).json({
      success: false,
      error: 'Service not ready',
      details: {
        mongodb: 'disconnected',
      },
    });
    return;
  }

  res.json({
    success: true,
    data: {
      status: 'ready',
      mongodb: 'connected',
    },
  });
});

// API Routes
app.use('/api/upload', uploadRoutes);
app.use('/api/extract', extractRoutes);
app.use('/api/validate', validateRoutes);
app.use('/api/invoices', invoiceRoutes);

// Root endpoint
app.get('/api', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      service: 'rez-invoice-ocr',
      version: '1.0.0',
      description: 'AI-powered Invoice OCR Service using Claude',
      endpoints: {
        upload: '/api/upload',
        extract: '/api/extract',
        validate: '/api/validate',
        invoices: '/api/invoices',
        health: '/health',
        ready: '/ready',
      },
      features: [
        'Document upload (PDF, JPG, PNG)',
        'AI-powered invoice extraction using Claude',
        'GSTIN validation',
        'Duplicate invoice detection',
        'Line item parsing with HSN codes',
        'Export to JSON/CSV formats',
      ],
    },
  });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
  });
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
  });

  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  });
});

// Database connection
async function connectToDatabase(): Promise<void> {
  try {
    logger.info('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    logger.info('MongoDB connected successfully');

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error', { error: err.message });
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });
  } catch (error) {
    logger.error('Failed to connect to MongoDB', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

// Graceful shutdown
async function shutdown(signal: string): Promise<void> {
  logger.info(`${signal} received. Shutting down gracefully...`);

  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Start server
async function startServer(): Promise<void> {
  try {
    // Ensure upload directory exists
    await storageService.ensureUploadDir();

    // Connect to database
    await connectToDatabase();

    app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   REZ Invoice OCR Service Started Successfully             ║
║                                                            ║
║   Port: ${PORT.toString().padEnd(47)}║
║   Env:  ${NODE_ENV.padEnd(47)}║
║                                                            ║
║   Endpoints:                                               ║
║   - Health:  http://localhost:${PORT}/health                  ║
║   - API:     http://localhost:${PORT}/api                     ║
║   - Upload:  http://localhost:${PORT}/api/upload              ║
║   - Extract: http://localhost:${PORT}/api/extract             ║
║   - Validate: http://localhost:${PORT}/api/validate           ║
║   - Invoices: http://localhost:${PORT}/api/invoices           ║
║                                                            ║
║   Features:                                                ║
║   - Document upload (PDF, JPG, PNG)                        ║
║   - AI-powered extraction with Claude                       ║
║   - GSTIN validation                                       ║
║   - Duplicate detection                                     ║
║   - Export to JSON/CSV                                    ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    logger.error('Failed to start server', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    process.exit(1);
  }
}

startServer();

export { app };
