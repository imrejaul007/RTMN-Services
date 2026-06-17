import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import refundRequestsRoutes from './routes/requests';
import policiesRoutes from './routes/policies';
import dashboardRoutes from './routes/dashboard';
import { HealthController } from './controllers/healthController';
import { registerService, discoverServices } from './services/serviceRegistry';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4980;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(requestLogger);

// Health check
app.get('/health', HealthController.healthCheck);

// Routes
app.use('/api/refunds', refundRequestsRoutes);
app.use('/api/policies', policiesRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Metrics endpoint
app.get('/metrics', (req, res) => {
  res.json({
    service: 'refund-engine',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use(errorHandler);

// Initialize service
async function startServer() {
  try {
    // Register with service discovery
    await registerService({
      name: 'refund-engine',
      port: parseInt(PORT.toString()),
      type: 'refund-processor',
      metadata: {
        version: '1.0.0',
        capabilities: ['auto-approve', 'policy-check', 'multi-channel-refund']
      }
    });

    // Discover other services
    await discoverServices();

    app.listen(PORT, () => {
      logger.info(`Refund Engine started on port ${PORT}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
