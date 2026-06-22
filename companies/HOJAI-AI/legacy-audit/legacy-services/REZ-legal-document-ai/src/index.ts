import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config();

import logger from './utils/logger';
import { authMiddleware } from './middleware/tenant';
import { initializeClauseLibrary } from './services/ragService';

// Import routes
import documentsRouter from './routes/documents';
import clausesRouter from './routes/clauses';
import complianceRouter from './routes/compliance';
import qaRouter from './routes/qa';

const app: Express = express();
const PORT = parseInt(process.env.PORT || '5004');

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false // Disable for API
}));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Tenant-ID'],
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request completed', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
      requestId: req.requestId
    });
  });

  next();
});

// Auth middleware for all routes
app.use(authMiddleware);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'rez-legal-document-ai',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// API info endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    service: 'REZ Legal Document AI',
    version: '1.0.0',
    description: 'AI-powered legal document analysis and clause extraction service',
    endpoints: {
      documents: {
        'POST /documents/upload': 'Upload a document',
        'POST /documents/:id/analyze': 'Analyze a document',
        'GET /documents': 'List documents',
        'GET /documents/:id': 'Get document details',
        'GET /documents/:id/clauses': 'Get extracted clauses',
        'GET /documents/:id/risk-report': 'Get risk assessment',
        'POST /documents/:id/compare': 'Compare clauses',
        'POST /documents/:id/compliance': 'Check compliance',
        'POST /documents/:id/qa': 'Question answering',
        'POST /documents/:id/summarize': 'Generate summary'
      },
      clauses: {
        'GET /clauses/library': 'Get standard clause library',
        'POST /clauses/library': 'Add to clause library',
        'GET /clauses/types': 'Get clause types',
        'GET /clauses/stats': 'Get clause statistics'
      },
      compliance: {
        'GET /compliance/frameworks': 'Get supported frameworks',
        'POST /compliance/check': 'Check compliance',
        'GET /compliance/report/:id': 'Get compliance report',
        'GET /compliance/dashboard': 'Get dashboard data'
      },
      qa: {
        'POST /qa/ask': 'Ask question about document',
        'POST /qa/compare': 'Compare documents',
        'POST /qa/extract': 'Extract information',
        'POST /qa/summarize': 'Quick summary',
        'POST /qa/analyze-risk': 'Quick risk analysis'
      }
    }
  });
});

// API routes
app.use('/documents', documentsRouter);
app.use('/clauses', clausesRouter);
app.use('/compliance', complianceRouter);
app.use('/qa', qaRouter);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    requestId: req.requestId
  });

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Database connection
async function connectToDatabase(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez_legal_docs';

  try {
    await mongoose.connect(mongoUri);
    logger.info('Connected to MongoDB', { uri: mongoUri.replace(/\/\/.*@/, '//***@') });

    // Initialize default data
    await initializeClauseLibrary();
  } catch (error) {
    logger.error('Failed to connect to MongoDB', { error });
    throw error;
  }
}

// Ensure upload directory exists
function ensureDirectories(): void {
  const uploadDir = process.env.UPLOAD_DIR || './uploads';
  const logDir = process.env.LOG_FILE ? path.dirname(process.env.LOG_FILE) : './logs';

  fs.mkdirSync(uploadDir, { recursive: true });
  fs.mkdirSync(logDir, { recursive: true });

  logger.info('Directories ensured', { uploadDir, logDir });
}

// Graceful shutdown
async function shutdown(): Promise<void> {
  logger.info('Shutting down gracefully...');

  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
  } catch (error) {
    logger.error('Error during shutdown', { error });
  }

  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start server
async function startServer(): Promise<void> {
  try {
    // Ensure directories exist
    ensureDirectories();

    // Connect to database
    await connectToDatabase();

    // Start listening
    app.listen(PORT, () => {
      logger.info(`REZ Legal Document AI service started`, {
        port: PORT,
        nodeEnv: process.env.NODE_ENV || 'development',
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'connecting'
      });
      logger.info(\n🚀 REZ Legal Document AI service running on port ${PORT}`);
      logger.info(📄 API docs: http://localhost:${PORT}/`);
      logger.info(❤️  Health: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', { reason, promise });
});

// Start the application
startServer();

export default app;
