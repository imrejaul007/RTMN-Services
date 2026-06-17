import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { v4 as uuidv4 } from 'uuid';

// Types
interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  requestId?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  duration?: number;
}

// Load environment variables
dotenv.config();

// Create Express app
const app: Express = express();
const httpServer = createServer(app);

// Configuration
const PORT = parseInt(process.env.PORT || '4939', 10);
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/knowledge-marketplace';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

// In-memory log storage
const logs: LogEntry[] = [];
const MAX_LOGS = 1000;

// Simple logger
function log(level: string, message: string, meta?: Partial<LogEntry>): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta
  };

  logs.push(entry);
  if (logs.length > MAX_LOGS) logs.shift();

  const prefix = `[${entry.timestamp}] ${entry.level.toUpperCase()}`;
  if (level === 'error') {
    console.error(prefix, message, meta || '');
  } else {
    console.log(prefix, message, meta || '');
  }
}

// Request logging middleware
app.use((req: Request, res: Response, next) => {
  const requestId = uuidv4();
  const startTime = Date.now();

  req.headers['x-request-id'] = requestId;

  log('info', 'Incoming request', {
    requestId,
    method: req.method,
    path: req.path
  });

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    log('info', 'Request completed', {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration
    });
  });

  next();
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:4939',
  'https://rtmn-pilot-portal.vercel.app',
  'https://rtmn.vercel.app'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', async (req: Request, res: Response) => {
  const health = {
    status: 'healthy',
    service: 'knowledge-marketplace',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      memory: process.memoryUsage().heapUsed / 1024 / 1024 < 500 ? 'ok' : 'warning'
    }
  };

  const statusCode = health.checks.mongodb === 'connected' ? 200 : 503;
  res.status(statusCode).json(health);
});

// API Info endpoint
app.get('/api', (req: Request, res: Response) => {
  res.json({
    service: 'Knowledge Marketplace',
    version: '1.0.0',
    description: 'Pre-built SOPs, compliance guides, training courses',
    endpoints: {
      health: 'GET /health',
      marketplace: {
        browse: 'GET /api/marketplace',
        get: 'GET /api/marketplace/:knowledgeId',
        search: 'GET /api/marketplace/search',
        categories: 'GET /api/marketplace/categories',
        industries: 'GET /api/marketplace/categories/industries',
        types: 'GET /api/marketplace/categories/types',
        install: 'POST /api/marketplace/:knowledgeId/install',
        uninstall: 'DELETE /api/marketplace/:knowledgeId/uninstall',
        reviews: 'POST /api/marketplace/:knowledgeId/reviews',
        related: 'GET /api/marketplace/:knowledgeId/related',
        citations: 'GET /api/marketplace/search/citations/:knowledgeId'
      },
      installations: 'GET /api/marketplace/installs/:clientId'
    }
  });
});

// API Routes
import knowledgeRoutes from './routes/knowledge';
import categoriesRoutes from './routes/categories';
import installRoutes from './routes/install';
import searchRoutes from './routes/search';

app.use('/api/marketplace', knowledgeRoutes);
app.use('/api/marketplace/categories', categoriesRoutes);
app.use('/api/marketplace', installRoutes);
app.use('/api/marketplace/search', searchRoutes);

// Installation routes (needs to be before generic routes)
app.use('/api/marketplace/installs', installRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: any) => {
  log('error', 'Unhandled error', { message: err.message, stack: err.stack });

  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

// Logs endpoint (for debugging)
app.get('/api/logs', (req: Request, res: Response) => {
  const { level, limit = 100 } = req.query;
  let filteredLogs = logs;

  if (level) {
    filteredLogs = logs.filter(l => l.level === level);
  }

  res.json({
    success: true,
    data: filteredLogs.slice(-Number(limit))
  });
});

// Start server
async function startServer(): Promise<void> {
  try {
    // Connect to MongoDB
    log('info', 'Connecting to MongoDB...', { uri: MONGODB_URI });

    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    log('info', 'MongoDB connected successfully');

    // Start HTTP server
    httpServer.listen(PORT, () => {
      log('info', `Knowledge Marketplace service started`, {
        port: PORT,
        environment: process.env.NODE_ENV || 'development'
      });

      console.log(`
╔════════════════════════════════════════════════════════════╗
║           Knowledge Marketplace Service                     ║
╠════════════════════════════════════════════════════════════╣
║  Status:  ✅ RUNNING                                        ║
║  Port:    ${PORT}                                              ║
║  MongoDB: ${MONGODB_URI.split('@')[1] || 'localhost'}   ║
║                                                            ║
║  Endpoints:                                                 ║
║  • Health:      http://localhost:${PORT}/health              ║
║  • API Info:    http://localhost:${PORT}/api                 ║
║  • Marketplace: http://localhost:${PORT}/api/marketplace    ║
║  • Categories:  http://localhost:${PORT}/api/marketplace/categories ║
║  • Search:      http://localhost:${PORT}/api/marketplace/search     ║
║  • Logs:        http://localhost:${PORT}/api/logs            ║
╚════════════════════════════════════════════════════════════╝
      `);
    });

  } catch (error) {
    log('error', 'Failed to start server', { error: (error as Error).message });
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  log('info', 'SIGTERM received, shutting down gracefully');

  httpServer.close(() => {
    log('info', 'HTTP server closed');
  });

  await mongoose.connection.close();
  log('info', 'MongoDB connection closed');

  process.exit(0);
});

process.on('SIGINT', async () => {
  log('info', 'SIGINT received, shutting down gracefully');

  httpServer.close(() => {
    log('info', 'HTTP server closed');
  });

  await mongoose.connection.close();
  log('info', 'MongoDB connection closed');

  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  log('error', 'Uncaught exception', { message: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log('error', 'Unhandled rejection', { reason: String(reason) });
});

// Start the server
startServer();

export { app, httpServer };
