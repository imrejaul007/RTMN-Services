import express, { Application, Request, Response } from 'express';
import mongoose from 'mongoose';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware';
import { secretRotationService } from './services';
import logger, { auditLogger, createLogger } from './utils/logger';
import { HealthCheckResponse } from './types';

// Load environment variables
dotenv.config();

const appLogger = createLogger('app');

class VaultServer {
  public app: Application;
  public port: number;
  private startTime: Date;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '4033', 10);
    this.startTime = new Date();

    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  /**
   * Initialize middleware
   */
  private initializeMiddleware(): void {
    // Security headers
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:']
        }
      },
      crossOriginEmbedderPolicy: false
    }));

    // CORS
    this.app.use(cors({
      origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => {
        const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.CORS_ORIGINS || 'https://rez.money').split(',');
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Internal-Token',
        'X-Service-Token',
        'X-Service-Id',
        'X-API-Key'
      ],
      credentials: true,
      maxAge: 86400
    }));

    // Compression
    this.app.use(compression());

    // Request logging
    this.app.use(morgan('combined', {
      stream: {
        write: (message: string) => {
          logger.info(message.trim());
        }
      },
      skip: (req) => req.url === '/health'
    }));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '60000', 10),
      max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests, please try again later'
        },
        timestamp: new Date().toISOString()
      },
      skip: (req) => req.path === '/health'
    });
    this.app.use(limiter);

    // Request ID
    this.app.use((req, res, next) => {
      const requestId = req.headers['x-request-id'] as string ||
        `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      res.setHeader('X-Request-ID', requestId);
      req.requestId = requestId;
      next();
    });
  }

  /**
   * Initialize routes
   */
  private initializeRoutes(): void {
    // Health check endpoint
    this.app.get('/health', async (req: Request, res: Response) => {
      const mongoStatus = mongoose.connection.readyState === 1;

      const health: HealthCheckResponse = {
        status: mongoStatus ? 'healthy' : 'unhealthy',
        version: process.env.npm_package_version || '1.0.0',
        uptime: Math.floor((Date.now() - this.startTime.getTime()) / 1000),
        checks: {
          database: mongoStatus,
          encryption: !!(process.env.VAULT_MASTER_KEY || process.env.ENCRYPTION_KEY)
        }
      };

      const statusCode = health.status === 'healthy' ? 200 : 503;
      res.status(statusCode).json(health);
    });

    // Readiness probe
    this.app.get('/ready', async (req: Request, res: Response) => {
      const mongoStatus = mongoose.connection.readyState === 1;

      if (mongoStatus) {
        res.json({ ready: true, timestamp: new Date().toISOString() });
      } else {
        res.status(503).json({ ready: false, timestamp: new Date().toISOString() });
      }
    });

    // API routes
    this.app.use('/api/v1', routes);

    // API documentation
    this.app.get('/api', (req: Request, res: Response) => {
      res.json({
        name: 'REZ Secrets Manager',
        version: '1.0.0',
        description: 'Enterprise secrets management service for REZ ecosystem',
        endpoints: {
          health: 'GET /health',
          ready: 'GET /ready',
          secrets: {
            create: 'POST /api/v1/secrets',
            list: 'GET /api/v1/secrets',
            get: 'GET /api/v1/secrets/:name',
            update: 'PUT /api/v1/secrets/:name',
            delete: 'DELETE /api/v1/secrets/:name',
            rotate: 'POST /api/v1/secrets/:name/rotate',
            history: 'GET /api/v1/secrets/:name/history',
            dynamic: 'POST /api/v1/secrets/:name/dynamic'
          },
          policies: {
            create: 'POST /api/v1/policies',
            list: 'GET /api/v1/policies',
            get: 'GET /api/v1/policies/:id',
            update: 'PUT /api/v1/policies/:id',
            delete: 'DELETE /api/v1/policies/:id'
          },
          access: {
            check: 'GET /api/v1/access/:serviceId',
            evaluate: 'POST /api/v1/access/check',
            registerService: 'POST /api/v1/access/services',
            listServices: 'GET /api/v1/access/services/list',
            audit: 'GET /api/v1/access/audit'
          }
        },
        authentication: {
          internalToken: 'X-Internal-Token header',
          apiKey: 'X-API-Key header'
        }
      });
    });
  }

  /**
   * Initialize error handling
   */
  private initializeErrorHandling(): void {
    // 404 handler
    this.app.use(notFoundHandler);

    // Global error handler
    this.app.use(errorHandler);
  }

  /**
   * Connect to MongoDB
   */
  private async connectDatabase(): Promise<void> {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez-secrets-vault';

    try {
      await mongoose.connect(mongoUri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000
      });

      appLogger.info('Connected to MongoDB', { uri: mongoUri.replace(/\/\/.*@/, '//<credentials>@') });

      // Handle connection events
      mongoose.connection.on('error', (err) => {
        appLogger.error('MongoDB connection error', { error: err.message });
      });

      mongoose.connection.on('disconnected', () => {
        appLogger.warn('MongoDB disconnected');
      });

      mongoose.connection.on('reconnected', () => {
        appLogger.info('MongoDB reconnected');
      });
    } catch (error) {
      appLogger.error('Failed to connect to MongoDB', { error });
      throw error;
    }
  }

  /**
   * Start the rotation scheduler
   */
  private startRotationScheduler(): void {
    const rotationCron = process.env.ROTATION_CRON || '0 */15 * * * *';

    try {
      secretRotationService.startScheduler(rotationCron);
      appLogger.info('Rotation scheduler started', { cron: rotationCron });
    } catch (error) {
      appLogger.error('Failed to start rotation scheduler', { error });
    }
  }

  /**
   * Start the server
   */
  public async start(): Promise<void> {
    try {
      // Connect to database
      await this.connectDatabase();

      // Start rotation scheduler
      this.startRotationScheduler();

      // Start HTTP server
      const server = this.app.listen(this.port, () => {
        appLogger.info(`REZ Secrets Manager started`, {
          port: this.port,
          environment: process.env.NODE_ENV || 'development',
          nodeVersion: process.version
        });

        logger.info(
╔═══════════════════════════════════════════════════════════════╗
║                    REZ SECRETS MANAGER                         ║
╠═══════════════════════════════════════════════════════════════╣
║  Status:     RUNNING                                          ║
║  Port:       ${String(this.port).padEnd(53)}║
║  Environment: ${(process.env.NODE_ENV || 'development').padEnd(50)}║
║                                                               ║
║  Endpoints:                                                    ║
║  - Health:    http://localhost:${this.port}/health             ║
║  - API Docs:  http://localhost:${this.port}/api                ║
║  - Secrets:   http://localhost:${this.port}/api/v1/secrets     ║
║  - Policies:  http://localhost:${this.port}/api/v1/policies    ║
║  - Access:    http://localhost:${this.port}/api/v1/access      ║
╚═══════════════════════════════════════════════════════════════╝
        `);
      });

      // Graceful shutdown
      this.setupGracefulShutdown(server);
    } catch (error) {
      appLogger.error('Failed to start server', { error });
      process.exit(1);
    }
  }

  /**
   * Setup graceful shutdown handlers
   */
  private setupGracefulShutdown(server: ReturnType<typeof this.app.listen>): void {
    const shutdown = async (signal: string) => {
      appLogger.info(`Received ${signal}, starting graceful shutdown`);

      // Stop accepting new connections
      server.close(async () => {
        appLogger.info('HTTP server closed');

        try {
          // Stop rotation scheduler
          secretRotationService.stopScheduler();

          // Close database connection
          await mongoose.connection.close();
          appLogger.info('MongoDB connection closed');

          process.exit(0);
        } catch (error) {
          appLogger.error('Error during shutdown', { error });
          process.exit(1);
        }
      });

      // Force exit after 30 seconds
      setTimeout(() => {
        appLogger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      appLogger.error('Uncaught exception', { error, stack: error.stack });
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      appLogger.error('Unhandled rejection', { reason, promise });
    });
  }
}

// Create and start the server
const server = new VaultServer();
server.start();

export default server.app;
