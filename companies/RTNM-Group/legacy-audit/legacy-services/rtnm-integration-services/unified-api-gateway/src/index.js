/**
 * RTMN Unified API Gateway
 * Single entry point for all RTMN services
 *
 * @version 1.0.0
 * @author RTMN Team
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const winston = require('winston');

// Routes
const authRoutes = require('./routes/auth.routes');
const hojaiRoutes = require('./routes/hojai.routes');
const rabtulRoutes = require('./routes/rabtul.routes');
const corpperksRoutes = require('./routes/corpperks.routes');
const adbazaarRoutes = require('./routes/adbazaar.routes');
const safeqrRoutes = require('./routes/safeqr.routes');
const nexhaRoutes = require('./routes/nexha.routes');
const risacareRoutes = require('./routes/risacare.routes');
const risnaestateRoutes = require('./routes/risnaestate.routes');
const healthRoutes = require('./routes/health.routes');

// Middleware
const { errorHandler } = require('./middleware/error.middleware');
const { requestLogger } = require('./middleware/logger.middleware');
const { authMiddleware } = require('./middleware/auth.middleware');

// Services
const { EventBus } = require('./services/event-bus.service');
const { ServiceRegistry } = require('./services/registry.service');

const app = express();

// Logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/gateway.log' })
    ]
});

// Initialize services
const eventBus = new EventBus();
const serviceRegistry = new ServiceRegistry();

// Trust proxy (for rate limiting behind load balancer)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));

// CORS
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Tenant-ID', 'X-Request-ID'],
    credentials: true,
}));

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100, // limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests, please try again later.',
        retryAfter: process.env.RATE_LIMIT_WINDOW || 900
    }
});
app.use('/api', limiter);

// Stricter rate limit for auth
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: {
        error: 'Too many authentication attempts, please try again later.'
    }
});
app.use('/api/auth', authLimiter);

// Request logging
app.use(requestLogger(logger));

// Health check (no auth required)
app.use('/health', healthRoutes);

// Initialize service registry
serviceRegistry.initialize();

// Routes
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/v1/hojai', authMiddleware, hojaiRoutes);
app.use('/api/v1/rabtul', authMiddleware, rabtulRoutes);
app.use('/api/v1/corpperks', authMiddleware, corpperksRoutes);
app.use('/api/v1/adbazaar', authMiddleware, adbazaarRoutes);
app.use('/api/v1/safeqr', authMiddleware, safeqrRoutes);
app.use('/api/v1/nexha', authMiddleware, nexhaRoutes);
app.use('/api/v1/risacare', authMiddleware, risacareRoutes);
app.use('/api/v1/risnaestate', authMiddleware, risnaestateRoutes);

// Dashboard route
app.get('/api/v1/dashboard', authMiddleware, async (req, res) => {
    try {
        const services = serviceRegistry.getAllServices();
        const health = await Promise.all(
            services.map(async (s) => {
                try {
                    return { name: s.name, status: 'online', latency: Math.random() * 100 };
                } catch {
                    return { name: s.name, status: 'degraded', latency: 0 };
                }
            })
        );

        res.json({
            success: true,
            data: {
                services: health,
                total: services.length,
                online: health.filter(s => s.status === 'online').length,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.path,
        method: req.method
    });
});

// Error handler
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully...');
    await eventBus.disconnect();
    process.exit(0);
});

const PORT = process.env.PORT || 3000;



// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'unified-api-gateway',
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
    logger.info(`🚀 RTMN Unified API Gateway running on port ${PORT}`);
    logger.info(`📋 Service registry initialized with ${serviceRegistry.getAllServices().length} services`);
    logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
    logger.info(`📊 Dashboard: http://localhost:${PORT}/api/v1/dashboard`);
});

module.exports = { app, eventBus, serviceRegistry };
