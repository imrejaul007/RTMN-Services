/**
 * REZ Unified Merchant Gateway
 *
 * Central API gateway that consolidates access to ALL merchant-related services:
 * - REZ-Merchant (B2B, POS, Inventory)
 * - RABTUL (Auth, Wallet, Payment, Orders)
 * - REZ-Media (Marketing, Loyalty, Engagement)
 * - REZ-Intelligence (AI, Attribution)
 * - RTNM-Digital (Trust, Operations)
 *
 * This gateway provides:
 * - Single authentication point
 * - Unified merchant profile
 * - Cross-service data aggregation
 * - Simplified API for merchant apps
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from 'dotenv';
import { MerchantGateway } from './services/gateway.js';
import { logger } from './services/logger.js';
import { GatewayAuthMiddleware } from './services/auth.js';
import { gatewayRouter } from './services/routes.js';

config();

const app = express();
const PORT = process.env.PORT || 4080;

// Initialize gateway
const gateway = new MerchantGateway();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// Health check (public)
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'rez-merchant-gateway',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    upstreamServices: gateway.getServiceStatus()
  });
});

app.get('/ready', async (_req: Request, res: Response) => {
  const status = await gateway.healthCheck();
  res.status(status.healthy ? 200 : 503).json(status);
});

// Authentication middleware
const auth = new GatewayAuthMiddleware(gateway);

// Protected routes - use gateway router
app.use('/api/v1', auth.authenticate(), gatewayRouter);

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Gateway error', { error: err.message, stack: err.stack });
  res.status(500).json({
    success: false,
    error: 'Internal gateway error',
    code: 'GATEWAY_ERROR'
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`REZ Merchant Gateway started on port ${PORT}`);
  logger.info(`Unified API for merchant services`);
});

export { app, gateway };
