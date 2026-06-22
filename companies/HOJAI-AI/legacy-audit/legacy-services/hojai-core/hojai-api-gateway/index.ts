/**
 * Hojai Core - API Gateway
 * Version: 1.0 | Date: May 29, 2026
 * Purpose: Central entry point with tenant routing
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { tenantMiddleware, TenantContext } from '../../shared/middleware/tenant';
import { createLogger } from '../../shared/utils/logger';
import { createResponse, createErrorResponse } from '../../shared/types';

const logger = createLogger('hojai-api-gateway');

// ============================================
// SERVICE REGISTRY
// ============================================

interface ServiceRoute {
  name: string;
  baseUrl: string;
  port: number;
  healthPath?: string;
}

const SERVICES: Record<string, ServiceRoute> = {
  // Core Platforms (Ports 4500-4599)
  governance: { name: 'hojai-governance', baseUrl: 'localhost', port: 4500, healthPath: '/health' },
  event: { name: 'hojai-event', baseUrl: 'localhost', port: 4510, healthPath: '/health' },
  memory: { name: 'hojai-memory', baseUrl: 'localhost', port: 4520, healthPath: '/health' },
  intelligence: { name: 'hojai-intelligence', baseUrl: 'localhost', port: 4530, healthPath: '/health' },
  agents: { name: 'hojai-agents', baseUrl: 'localhost', port: 4550, healthPath: '/health' },
  workflow: { name: 'hojai-workflow', baseUrl: 'localhost', port: 4560, healthPath: '/health' },
  communications: { name: 'hojai-communications', baseUrl: 'localhost', port: 4570, healthPath: '/health' },
  hyperlocal: { name: 'hojai-hyperlocal', baseUrl: 'localhost', port: 4580, healthPath: '/health' },
  data: { name: 'hojai-data', baseUrl: 'localhost', port: 4590, healthPath: '/health' },

  // External Services (RABTUL - unchanged)
  auth: { name: 'rabtul-auth', baseUrl: 'localhost', port: 4002, healthPath: '/health' },
  payment: { name: 'rabtul-payment', baseUrl: 'localhost', port: 4001, healthPath: '/health' },
  wallet: { name: 'rabtul-wallet', baseUrl: 'localhost', port: 4004, healthPath: '/health' },
};

// ============================================
// API GATEWAY
// ============================================

class HojaiAPIGateway {
  private app: express.Express;
  private serviceHealth: Map<string, boolean> = new Map();

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.startHealthChecks();
  }

  /**
   * Setup middleware
   */
  private setupMiddleware(): void {
    // Security headers
    this.app.use(helmet());

    // CORS
    this.app.use(cors({
      origin: process.env.CORS_ORIGINS?.split(',') || '*',
      credentials: true
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 1000,
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use(limiter);

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging
    this.app.use(this.requestLogger.bind(this));

    // Tenant context extraction (required for all /api routes)
    this.app.use('/api', tenantMiddleware());
  }

  /**
   * Setup routes
   */
  private setupRoutes(): void {
    // ============================================
    // GATEWAY ROUTES
    // ============================================

    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        service: 'hojai-api-gateway',
        version: '1.0.0',
        timestamp: new Date().toISOString()
      });
    });

    // Service health
    this.app.get('/health/services', (req, res) => {
      const services = Object.entries(SERVICES).map(([key, service]) => ({
        name: key,
        ...service,
        healthy: this.serviceHealth.get(key) ?? false
      }));
      res.json({ success: true, data: services });
    });

    // ============================================
    // TENANT ROUTES (require tenant context)
    // ============================================

    // Tenant info
    this.app.get('/api/tenant', (req, res) => {
      const context = req.tenantContext!;
      res.json(createResponse({
        tenant_id: context.tenant_id,
        tenant_type: context.tenant_type,
        namespace: context.namespace,
        roles: context.roles
      }, { tenantId: context.tenant_id }));
    });

    // Tenant stats
    this.app.get('/api/tenant/stats', (req, res) => {
      const context = req.tenantContext!;
      // In production, this would aggregate from all services
      res.json(createResponse({
        tenant_id: context.tenant_id,
        services: {
          events: { count: 0 },
          memories: { count: 0 },
          workflows: { count: 0 },
          agents: { count: 0 }
        }
      }, { tenantId: context.tenant_id }));
    });

    // ============================================
    // SERVICE PROXY ROUTES
    // ============================================

    // Event service
    this.app.use('/api/events', this.createProxy('event'));

    // Memory service
    this.app.use('/api/memory', this.createProxy('memory'));

    // Workflow service
    this.app.use('/api/workflows', this.createProxy('workflow'));

    // Agent service
    this.app.use('/api/agents', this.createProxy('agents'));

    // Data service
    this.app.use('/api/customers', this.createProxy('data'));
    this.app.use('/api/orders', this.createProxy('data'));

    // ============================================
    // EXTERNAL SERVICE ROUTES (RABTUL)
    // ============================================

    // Auth (passthrough)
    this.app.use('/auth', this.createPassthrough('auth'));

    // Payment (passthrough)
    this.app.use('/payment', this.createPassthrough('payment'));

    // Wallet (passthrough)
    this.app.use('/wallet', this.createPassthrough('wallet'));

    // ============================================
    // ERROR HANDLER
    // ============================================

    this.app.use((err: any, req: Request, res: Response, next: NextFunction) => {
      logger.error('gateway_error', {
        error: err.message,
        path: req.path,
        method: req.method
      });

      res.status(500).json(
        createErrorResponse('GATEWAY_ERROR', 'An error occurred')
      );
    });

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json(
        createErrorResponse('NOT_FOUND', `Route ${req.path} not found`)
      );
    });
  }

  /**
   * Create proxy middleware for a service
   */
  private createProxy(serviceKey: string) {
    const service = SERVICES[serviceKey];
    if (!service) {
      throw new Error(`Service ${serviceKey} not found`);
    }

    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const targetUrl = `http://${service.baseUrl}:${service.port}${req.path}`;

        logger.info('proxying_request', {
          service: serviceKey,
          method: req.method,
          path: req.path,
          target: targetUrl,
          tenantId: req.tenantContext?.tenant_id
        });

        // Forward request to service
        const response = await fetch(targetUrl, {
          method: req.method,
          headers: {
            'Content-Type': 'application/json',
            'X-Tenant-Id': req.tenantContext?.tenant_id || '',
            'X-Organization-Id': req.tenantContext?.organization_id || '',
            'X-User-Id': req.tenantContext?.user_id || '',
            'X-Roles': JSON.stringify(req.tenantContext?.roles || [])
          },
          body: ['POST', 'PUT', 'PATCH'].includes(req.method)
            ? JSON.stringify(req.body)
            : undefined
        });

        const data = await response.json();
        res.status(response.status).json(data);

      } catch (error: any) {
        logger.error('proxy_error', {
          service: serviceKey,
          error: error.message
        });

        // Service unavailable
        res.status(503).json(
          createErrorResponse(
            'SERVICE_UNAVAILABLE',
            `Service ${service.name} is currently unavailable`
          )
        );
      }
    };
  }

  /**
   * Create passthrough middleware (no tenant context modification)
   */
  private createPassthrough(serviceKey: string) {
    const service = SERVICES[serviceKey];
    if (!service) {
      throw new Error(`Service ${serviceKey} not found`);
    }

    return async (req: Request, res: Response) => {
      try {
        const targetUrl = `http://${service.baseUrl}:${service.port}${req.path}`;

        const response = await fetch(targetUrl, {
          method: req.method,
          headers: {
            'Content-Type': 'application/json'
          },
          body: ['POST', 'PUT', 'PATCH'].includes(req.method)
            ? JSON.stringify(req.body)
            : undefined
        });

        const data = await response.json();
        res.status(response.status).json(data);

      } catch (error: any) {
        logger.error('passthrough_error', {
          service: serviceKey,
          error: error.message
        });

        res.status(503).json(
          createErrorResponse(
            'SERVICE_UNAVAILABLE',
            `Service ${service.name} is currently unavailable`
          )
        );
      }
    };
  }

  /**
   * Request logger
   */
  private requestLogger(req: Request, res: Response, next: NextFunction): void {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info('request', {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration,
        tenantId: req.tenantContext?.tenant_id
      });
    });

    next();
  }

  /**
   * Start health checks for all services
   */
  private startHealthChecks(): void {
    setInterval(async () => {
      for (const [key, service] of Object.entries(SERVICES)) {
        try {
          const response = await fetch(
            `http://${service.baseUrl}:${service.port}${service.healthPath}`,
            { timeout: 5000 }
          );
          this.serviceHealth.set(key, response.ok);
        } catch {
          this.serviceHealth.set(key, false);
        }
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Start the gateway
   */
  start(port = 4500): void {
    this.app.listen(port, () => {
      logger.info('hojai_api_gateway_started', { port });
      console.log(`Hojai API Gateway running on port ${port}`);
      console.log(`Services registered:`);
      Object.entries(SERVICES).forEach(([key, service]) => {
        console.log(`  ${key}: http://localhost:${service.port}`);
      });
    });
  }
}

// ============================================
// BOOTSTRAP
// ============================================

const gateway = new HojaiAPIGateway();
gateway.start(4500);

export { HojaiAPIGateway, SERVICES };
export default gateway;
