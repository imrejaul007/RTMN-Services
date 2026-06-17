import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';

// Routes
import industryRoutes from './routes/industry';
import knowledgeRoutes from './routes/knowledge';
import complianceRoutes from './routes/compliance';
import benchmarksRoutes from './routes/benchmarks';

// Models (for initialization)
import './models/IndustryProfile';
import './models/DomainKnowledge';
import './models/Compliance';
import './models/Benchmark';
import './models/CaseStudy';
import './models/Restaurant';
import './models/Hotel';
import './models/Healthcare';
import './models/Retail';

// Load environment variables
dotenv.config();

// Configure Winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

const app: Application = express();
const PORT = process.env.PORT || 4893;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/industry-twin';

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request ID middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  req.headers['x-request-id'] = req.headers['x-request-id'] || uuidv4();
  res.setHeader('X-Request-ID', req.headers['x-request-id']);
  next();
});

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info({
    requestId: req.headers['x-request-id'],
    method: req.method,
    path: req.path,
    query: req.query
  });
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'industry-twin',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// API Routes
app.use('/api/industry', industryRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/compliance', complianceRoutes);
app.use('/api/benchmarks', benchmarksRoutes);

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error({
    requestId: req.headers['x-request-id'],
    error: err.message,
    stack: err.stack
  });

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    requestId: req.headers['x-request-id']
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path
  });
});

// Database connection and server start
const startServer = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    logger.info('Connected to MongoDB');

    app.listen(PORT, () => {
      logger.info(`Industry Twin service running on port ${PORT}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await mongoose.connection.close();
  process.exit(0);
});

startServer();

export { app, logger };
