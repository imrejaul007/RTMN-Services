/**
 * Cosmic OS - Main Entry Point
 *
 * AI Council of Agents, cosmic interpretation, spiritual abstraction
 */

import express from 'express';
import cors from 'cors';
import config from './config';
import cosmicRoutes from './routes/cosmicRoutes';
import { requestId, logger, errorHandler, healthCheck } from './middleware';

const app = express();

// Middleware
app.use(cors(config.cors));
app.use(express.json());
app.use(requestId);
app.use(logger);

// Routes
app.get('/health', healthCheck);
app.use('/api', cosmicRoutes);

// Error handler
app.use(errorHandler);

// Start server
app.listen(config.port, () => {
  console.log(`
✨ Cosmic OS Started ✨
━━━━━━━━━━━━━━━━━━━━━━━━━
Port: ${config.port}
Env: ${config.nodeEnv}
━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
});

export default app;