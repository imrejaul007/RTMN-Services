import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createLogger, format, transports } from 'winston';
import consultRoutes from './routes/consultRoutes';

// ============================================
// Configuration
// ============================================

const PORT = process.env.PORT || 4759;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ============================================
// Logger
// ============================================

const logger = createLogger({
  level: NODE_ENV === 'production' ? 'info' : 'debug',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.printf(({ timestamp, level, message, stack }) => {
      return `${timestamp} [${level.toUpperCase()}]: ${message}${stack ? '\n' + stack : ''}`;
    })
  ),
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.timestamp({ format: 'HH:mm:ss' }),
        format.printf(({ timestamp, level, message }) => {
          return `${timestamp} ${level}: ${message}`;
        })
      ),
    }),
  ],
});

// ============================================
// Express App
// ============================================

const app: Express = express();

// ============================================
// Middleware
// ============================================

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // Disable for API
}));

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Internal-Token'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many requests, please try again later.',
    },
  },
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// ============================================
// Health Check Endpoint
// ============================================

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      service: 'Salon Growth Consultant',
      version: '1.0.0',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
  });
});

// ============================================
// API Routes
// ============================================

app.use('/api/consult', consultRoutes);

// ============================================
// Error Handling
// ============================================

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'The requested resource was not found.',
    },
  });
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error:', err);

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: NODE_ENV === 'development' ? err.message : 'An unexpected error occurred.',
    },
  });
});

// ============================================
// Server Startup
// ============================================

app.listen(PORT, () => {
  logger.info(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   Salon Growth Consultant                                     ║
║      Expert Employee Service                                  ║
║                                                               ║
║   Port: ${PORT}                                                  ║
║   Environment: ${NODE_ENV}                                        ║
║                                                               ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║   API Endpoints:                                              ║
║   • POST /api/consult/staff       - Staff Utilization        ║
║   • POST /api/consult/bookings    - Booking Optimization     ║
║   • POST /api/consult/memberships - Membership Setup         ║
║   • POST /api/consult/packages    - Package Recommendations  ║
║   • POST /api/consult/scheduling  - Staff Scheduling         ║
║   • GET  /api/consult/growth      - Growth Recommendations  ║
║   • GET  /api/consult/analytics   - Analytics Summary       ║
║                                                               ║
║   Modules:                                                    ║
║   • Staff Analyzer       - Utilization & Performance         ║
║   • Booking Optimizer    - Patterns & Retention             ║
║   • Membership Manager   - Tier Programs & Campaigns         ║
║   • Package Advisor      - Beauty Packages & Bundles         ║
║   • Schedule Optimizer   - Staffing & Peak Coverage          ║
║   • Growth Advisor       - Comprehensive Strategy            ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

// ============================================
// Graceful Shutdown
// ============================================

const gracefulShutdown = (signal: string) => {
  logger.info(`${signal} received. Shutting down gracefully...`);
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;
