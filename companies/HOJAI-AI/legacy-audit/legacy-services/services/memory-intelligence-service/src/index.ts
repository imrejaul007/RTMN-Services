// HOJAI Memory Intelligence Service - Main Entry Point
// Port: 4591
// Purpose: Longitudinal memory, pattern detection, cross-domain memory, care memory

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { memoryRoutes } from './routes/memoryRoutes.js';
import { careMemoryRoutes } from './routes/careMemoryRoutes.js';
import { patternRoutes } from './routes/patternRoutes.js';
import { crossDomainRoutes } from './routes/crossDomainRoutes.js';
import { logger } from './utils/logger.js';
import { connectDatabase } from './config/database.js';

const PORT = parseInt(process.env.PORT || '4591', 10);
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai-memory-intelligence';

const app = express();

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: '50mb' }));

// Request ID middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = (req.headers['x-request-id'] as string) || `mem_${uuidv4().replace(/-/g, '').substring(0, 16)}`;
  res.setHeader('X-Request-ID', requestId);
  (req as any).requestId = requestId;
  next();
});

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`, {
      requestId: (req as any).requestId,
      duration,
    });
  });
  next();
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'hojai-memory-intelligence-service',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    capabilities: {
      longitudinalMemory: true,
      patternDetection: true,
      crossDomainLinks: true,
      careMemory: true,
    },
  });
});

app.get('/ready', async (req: Request, res: Response) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({
    status: 'ready',
    mongodb: mongoStatus,
  });
});

// Mount routes
app.use('/api/memory', memoryRoutes);
app.use('/api/care', careMemoryRoutes);
app.use('/api/patterns', patternRoutes);
app.use('/api/cross-domain', crossDomainRoutes);

// Error handling
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Memory Intelligence Service Error', err, { requestId: (req as any).requestId });
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production' ? 'An error occurred' : err.message,
      requestId: (req as any).requestId,
    },
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
      requestId: (req as any).requestId,
    },
  });
});

// Start server
async function start() {
  try {
    await connectDatabase();
    logger.info('Connected to MongoDB');

    app.listen(PORT, () => {
      logger.info(`HOJAI Memory Intelligence Service started on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

start();

export default app;
