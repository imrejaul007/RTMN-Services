import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import dotenv from 'dotenv';

// Import route modules
import companySimulationRoutes from '../company-simulation/routes/companySimulationRoutes.js';
import marketSimulationRoutes from '../market-simulation/routes/marketSimulationRoutes.js';
import pricingSimulationRoutes from '../pricing-simulation/routes/pricingSimulationRoutes.js';
import riskSimulationRoutes from '../risk-simulation/routes/riskSimulationRoutes.js';
import whatifAnalysisRoutes from '../whatif-analysis/routes/whatifAnalysisRoutes.js';

// Load environment variables
dotenv.config();

// ============================================================================
// SimulationOS 2.0 - Production-ready simulation engine for SUTAR
// ============================================================================

/**
 * SimulationOS Configuration
 */
interface SimulationOSConfig {
  port: number;
  env: string;
  name: string;
  version: string;
}

/**
 * Health check response
 */
interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  modules: {
    companySimulation: boolean;
    marketSimulation: boolean;
    pricingSimulation: boolean;
    riskSimulation: boolean;
    whatIfAnalysis: boolean;
  };
  stats: {
    totalSimulations: number;
    companySimulations: number;
    marketSimulations: number;
    pricingSimulations: number;
    riskSimulations: number;
    whatIfAnalyses: number;
  };
}

/**
 * Error response format
 */
interface ErrorResponse {
  success: false;
  error: string;
  message?: string;
  details?: any;
  timestamp: string;
  requestId: string;
}

/**
 * Success response format
 */
interface SuccessResponse<T = any> {
  success: true;
  data: T;
  timestamp: string;
  requestId: string;
}

/**
 * Create and configure Express application
 */
export function createApp(config?: Partial<SimulationOSConfig>): Express {
  const app = express();
  const PORT = config?.port || parseInt(process.env.SIMULATION_PORT || '4300', 10);
  const startTime = Date.now();

  // Middleware
  app.use(helmet());
  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
  }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Request ID middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    (req as any).requestId = uuidv4();
    res.setHeader('X-Request-ID', (req as any).requestId);
    next();
  });

  // Request logging middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(JSON.stringify({
        type: 'request',
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        requestId: (req as any).requestId,
        timestamp: new Date().toISOString()
      }));
    });
    next();
  });

  // Trust proxy (for production behind load balancer)
  app.set('trust proxy', 1);

  // ============================================================================
  // API Routes
  // ============================================================================

  // Health check endpoint
  app.get('/health', (req: Request, res: Response) => {
    const response: HealthCheckResponse = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - startTime) / 1000),
      version: '2.0.0',
      modules: {
        companySimulation: true,
        marketSimulation: true,
        pricingSimulation: true,
        riskSimulation: true,
        whatIfAnalysis: true
      },
      stats: {
        totalSimulations: 0,
        companySimulations: 0,
        marketSimulations: 0,
        pricingSimulations: 0,
        riskSimulations: 0,
        whatIfAnalyses: 0
      }
    };

    res.status(200).json(response);
  });

  // Ready check endpoint
  app.get('/ready', (req: Request, res: Response) => {
    res.status(200).json({
      ready: true,
      timestamp: new Date().toISOString()
    });
  });

  // API info endpoint
  app.get('/api', (req: Request, res: Response) => {
    res.status(200).json({
      name: 'SimulationOS 2.0',
      description: 'Production-ready simulation engine for SUTAR',
      version: '2.0.0',
      endpoints: {
        company: {
          'POST /api/simulate/company': 'Run company simulation',
          'GET /api/simulate/:id': 'Get simulation results',
          'GET /api/simulate/:id/scenarios': 'Compare scenarios',
          'POST /api/simulate/:id/commit': 'Commit winning scenario',
          'GET /api/simulate/types/company': 'Get simulation types'
        },
        market: {
          'POST /api/simulate/market': 'Run market simulation',
          'GET /api/simulate/market/:id': 'Get market simulation results',
          'GET /api/simulate/market/trends': 'Get market trends',
          'GET /api/simulate/market/:id/analysis': 'Get detailed analysis'
        },
        pricing: {
          'POST /api/simulate/pricing': 'Run pricing simulation',
          'GET /api/simulate/pricing/:id': 'Get pricing results',
          'GET /api/simulate/pricing/:id/recommendations': 'Get recommendations',
          'GET /api/simulate/pricing/:id/compare': 'Compare simulations',
          'GET /api/simulate/pricing/ladder/:productId': 'Get price ladder'
        },
        risk: {
          'POST /api/simulate/risk': 'Run risk simulation',
          'GET /api/simulate/risk/:id': 'Get risk results',
          'GET /api/simulate/risk/:id/var': 'Get VaR results',
          'GET /api/simulate/risk/:id/sensitivity': 'Get sensitivity analysis',
          'GET /api/simulate/risk/:id/stress': 'Get stress test results',
          'GET /api/simulate/risk/:id/mitigations': 'Get risk mitigations'
        },
        whatif: {
          'POST /api/simulate/whatif': 'Run what-if analysis',
          'GET /api/simulate/whatif/:id': 'Get what-if results',
          'POST /api/simulate/whatif/compare': 'Compare analyses',
          'GET /api/simulate/whatif/templates': 'Get templates',
          'GET /api/simulate/whatif/types': 'Get question types'
        }
      },
      documentation: {
        swagger: '/api/docs',
        openapi: '/api/openapi.json'
      }
    });
  });

  // Mount simulation routes
  app.use('/api/simulate', companySimulationRoutes);
  app.use('/api/simulate', marketSimulationRoutes);
  app.use('/api/simulate', pricingSimulationRoutes);
  app.use('/api/simulate', riskSimulationRoutes);
  app.use('/api/simulate', whatifAnalysisRoutes);

  // ============================================================================
  // Error Handling
  // ============================================================================

  // 404 handler
  app.use((req: Request, res: Response) => {
    const error: ErrorResponse = {
      success: false,
      error: 'Not Found',
      message: `Route ${req.method} ${req.path} not found`,
      timestamp: new Date().toISOString(),
      requestId: (req as any).requestId
    };
    res.status(404).json(error);
  });

  // Global error handler
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(JSON.stringify({
      type: 'error',
      error: err.message,
      stack: err.stack,
      requestId: (req as any).requestId,
      path: req.path,
      timestamp: new Date().toISOString()
    }));

    // Zod validation errors
    if (err instanceof z.ZodError) {
      const error: ErrorResponse = {
        success: false,
        error: 'Validation Error',
        message: 'Request validation failed',
        details: err.errors,
        timestamp: new Date().toISOString(),
        requestId: (req as any).requestId
      };
      res.status(400).json(error);
      return;
    }

    // Default error response
    const error: ErrorResponse = {
      success: false,
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : err.message,
      timestamp: new Date().toISOString(),
      requestId: (req as any).requestId
    };
    res.status(500).json(error);
  });

  return app;
}

/**
 * Start the server
 */
export function startServer(config?: Partial<SimulationOSConfig>): Promise<{ app: Express; port: number }> {
  return new Promise((resolve) => {
    const app = createApp(config);
    const PORT = config?.port || parseInt(process.env.SIMULATION_PORT || '4300', 10);

    app.listen(PORT, () => {
      console.log(JSON.stringify({
        type: 'startup',
        message: `SimulationOS 2.0 running on port ${PORT}`,
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        endpoints: [
          `http://localhost:${PORT}/health`,
          `http://localhost:${PORT}/api`,
          `http://localhost:${PORT}/api/simulate/company`,
          `http://localhost:${PORT}/api/simulate/market`,
          `http://localhost:${PORT}/api/simulate/pricing`,
          `http://localhost:${PORT}/api/simulate/risk`,
          `http://localhost:${PORT}/api/simulate/whatif`
        ]
      }));
      resolve({ app, port: PORT });
    });
  });
}

// ============================================================================
// Main Entry Point
// ============================================================================

// Start server if this is the main module
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule || process.argv[1]?.endsWith('index.ts')) {
  startServer({
    port: parseInt(process.env.SIMULATION_PORT || '4300', 10),
    env: process.env.NODE_ENV || 'development',
    name: 'SimulationOS 2.0',
    version: '2.0.0'
  });
}

// Export for testing and external use
export default { createApp, startServer };
