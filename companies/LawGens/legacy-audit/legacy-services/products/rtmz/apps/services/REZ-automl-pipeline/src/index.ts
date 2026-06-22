/**
 * REZ AutoML Pipeline Service
 * Main entry point
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs/promises';

// Load environment variables
dotenv.config();

// Import routes
import experimentsRouter from './routes/experiments';
import trainingRouter from './routes/training';
import modelsRouter from './routes/models';

// Import services
import { trainingService } from './services/trainingService';
import { experimentTracker } from './services/experimentTracker';
import { pythonRunner } from './services/pythonRunner';

// Logger setup
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  [key: string]: unknown;
}

function log(level: string, message: string, meta?: Record<string, unknown>): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta
  };

  if (level === 'error') {
    console.error(JSON.stringify(entry));
  } else if (LOG_LEVEL === 'debug' || (level === 'info' && LOG_LEVEL !== 'silent')) {
    console.log(JSON.stringify(entry));
  }
}

// Error interface
interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

// Create Express app
const app: Application = express();

// Server instance (initialized in startServer)
let server: ReturnType<Application['listen']>;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging middleware
app.use((req: Request, _res: Response, next: NextFunction): void => {
  log('info', 'Incoming request', {
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip
  });
  next();
});

// Health check endpoint
app.get('/health', (_req: Request, res: Response): void => {
  const runningProcesses = pythonRunner.getRunningCount();

  res.json({
    status: 'healthy',
    service: 'rez-automl-pipeline',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    metrics: {
      runningPythonProcesses: runningProcesses,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage()
    }
  });
});

// Readiness check endpoint
app.get('/ready', async (_req: Request, res: Response): Promise<void> => {
  try {
    // Check if services are initialized
    const stats = await trainingService.getStatistics();

    res.json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      checks: {
        trainingService: true,
        experimentTracker: true,
        pythonRunner: true,
        queue: {
          status: 'operational',
          queuedJobs: stats.queuedJobs,
          runningJobs: stats.runningJobs
        }
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// API routes
app.use('/api/experiments', experimentsRouter);
app.use('/api/training', trainingRouter);
app.use('/api/models', modelsRouter);

// Root endpoint
app.get('/', (_req: Request, res: Response): void => {
  res.json({
    service: 'REZ AutoML Pipeline',
    version: '1.0.0',
    description: 'Automated hyperparameter tuning and model selection service',
    endpoints: {
      health: '/health',
      ready: '/ready',
      experiments: '/api/experiments',
      training: '/api/training',
      models: '/api/models'
    },
    documentation: {
      createExperiment: 'POST /api/experiments',
      listExperiments: 'GET /api/experiments',
      startTraining: 'POST /api/training/start',
      getJobStatus: 'GET /api/training/:jobId/status',
      listModels: 'GET /api/models',
      compareModels: 'POST /api/models/compare'
    }
  });
});

// 404 handler
app.use((_req: Request, res: Response): void => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found',
    statusCode: 404
  });
});

// Global error handler
app.use((err: AppError, _req: Request, res: Response, _next: NextFunction): void => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  log('error', 'Request error', {
    error: err.message,
    stack: err.stack,
    statusCode
  });

  res.status(statusCode).json({
    error: statusCode === 500 ? 'Internal Server Error' : message,
    message: statusCode === 500 ? 'An unexpected error occurred' : message,
    statusCode,
    code: err.code,
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown
async function gracefulShutdown(signal: string): Promise<void> {
  log('info', `Received ${signal}, starting graceful shutdown...`);

  // Stop accepting new requests
  server.close(() => {
    log('info', 'HTTP server closed');
  });

  // Kill all Python processes
  pythonRunner.killAll();
  log('info', 'All Python processes killed');

  // Wait for any ongoing jobs to complete (with timeout)
  const shutdownTimeout = setTimeout(() => {
    log('warn', 'Shutdown timeout reached, forcing exit');
    process.exit(1);
  }, 30000);

  try {
    // Give some time for cleanup
    await new Promise(resolve => setTimeout(resolve, 5000));
    clearTimeout(shutdownTimeout);
    log('info', 'Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    clearTimeout(shutdownTimeout);
    log('error', 'Error during shutdown', { error });
    process.exit(1);
  }
}

// Initialize and start server
async function startServer(): Promise<void> {
  const PORT = parseInt(process.env.PORT || '5001', 10);

  try {
    // Create necessary directories
    await fs.mkdir('./logs', { recursive: true });
    await fs.mkdir('./models', { recursive: true });
    await fs.mkdir('./experiments', { recursive: true });
    await fs.mkdir('./jobs', { recursive: true });

    log('info', 'Directories created');

    // Initialize services
    await trainingService.initialize();
    await experimentTracker.initialize();

    log('info', 'Services initialized');

    // Start server
    server = app.listen(PORT, () => {
      log('info', `REZ AutoML Pipeline started on port ${PORT}`, {
        port: PORT,
        nodeEnv: process.env.NODE_ENV || 'development',
        pythonPath: process.env.PYTHON_PATH || 'python3',
        scriptsPath: process.env.PYTHON_SCRIPTS_PATH || './python/automl'
      });

      console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                 REZ AutoML Pipeline Service                    ║
╠═══════════════════════════════════════════════════════════════╣
║  Status:     RUNNING                                           ║
║  Port:       ${String(PORT).padEnd(53)}║
║  Environment: ${String(process.env.NODE_ENV || 'development').padEnd(49)}║
║                                                               ║
║  Endpoints:                                                    ║
║    - Health:    http://localhost:${PORT}/health                ║
║    - Ready:     http://localhost:${PORT}/ready                ║
║    - API:       http://localhost:${PORT}/api                  ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
      `);
    });

    // Handle server errors
    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        log('error', `Port ${PORT} is already in use`);
        process.exit(1);
      }
      throw error;
    });

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      log('error', 'Uncaught exception', { error: error.message, stack: error.stack });
      gracefulShutdown('uncaughtException');
    });

    // Handle unhandled rejections
    process.on('unhandledRejection', (reason: unknown) => {
      log('error', 'Unhandled rejection', { reason });
    });

    // Export server for testing
    (global as Record<string, unknown>).app = app;
    (global as Record<string, unknown>).server = server;

  } catch (error) {
    log('error', 'Failed to start server', { error });
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

export { app };
