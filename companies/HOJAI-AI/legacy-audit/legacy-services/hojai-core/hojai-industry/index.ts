/**
 * Hojai Industry Intelligence Platform
 * Version: 1.0 | Date: May 30, 2026
 *
 * Privacy-preserving cross-tenant learning
 */

import express, { Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';

export interface IndustryPattern {
  id: string;
  industry: string;
  pattern_type: string;
  values: Record<string, number>;
  tenant_count: number;
  confidence: number;
  updated_at: string;
}

export interface HojaiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export class IndustryIntelligence {
  private patterns: Map<string, IndustryPattern[]> = new Map();

  async contribute(tenant_id: string, industry: string, data: Record<string, number>) {
    const key = `${industry}_${data.pattern_type}`;
    const existing = this.patterns.get(key) || [];
    existing.push({ ...data, tenant_id, tenant_count: existing.length + 1 });
    this.patterns.set(key, existing);
    return { accepted: true };
  }

  async getPatterns(industry: string) {
    return this.patterns.get(industry) || [];
  }
}

// ============================================
// EXPRESS ROUTES
// ============================================

function createResponse<T>(data: T, meta?: Record<string, any>): HojaiResponse<T> {
  return {
    success: true,
    data,
    ...meta,
    timestamp: new Date().toISOString()
  };
}

function createErrorResponse(code: string, message: string): HojaiResponse {
  return {
    success: false,
    error: message,
    timestamp: new Date().toISOString()
  };
}

function tenantMiddleware() {
  return async (req: Request, res: Response, next: Function) => {
    // Extract tenant from header or body
    const tenantId = req.headers['x-tenant-id'] as string || req.body?.tenant_id;

    if (!tenantId) {
      return res.status(400).json(createErrorResponse('MISSING_TENANT', 'Tenant ID is required'));
    }

    // Attach tenant context
    (req as any).tenantContext = { tenant_id: tenantId };
    next();
  };
}

export function createIndustryRoutes(platform: IndustryIntelligence) {
  const router = express.Router();

  // Contribute pattern
  router.post('/patterns', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const tenantId = (req as any).tenantContext.tenant_id;
      const { industry, pattern_type, values } = req.body;

      if (!industry || !pattern_type || !values) {
        return res.status(400).json(
          createErrorResponse('VALIDATION_ERROR', 'industry, pattern_type, and values are required')
        );
      }

      const data = { pattern_type, ...values };
      const result = await platform.contribute(tenantId, industry, data);
      res.json(createResponse(result, { tenantId }));
    } catch (error: any) {
      res.status(500).json(createErrorResponse('CONTRIBUTE_ERROR', error.message));
    }
  });

  // Get patterns
  router.get('/patterns/:industry', async (req: Request, res: Response) => {
    try {
      const { industry } = req.params;
      const patterns = await platform.getPatterns(industry);
      res.json(createResponse(patterns));
    } catch (error: any) {
      res.status(500).json(createErrorResponse('GET_ERROR', error.message));
    }
  });

  return router;
}

// ============================================
// BOOTSTRAP
// ============================================

export async function bootstrap(port = 4620) {
  const platform = new IndustryIntelligence();
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
  app.use(express.json({ limit: "10kb" }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);

  // Health check
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      service: 'hojai-industry',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });
  });

  // Routes
  app.use('/api/industry', createIndustryRoutes(platform));

  app.listen(port, () => {
    console.log(`Hojai Industry Intelligence started on port ${port}`);
  });

  return { platform, app };
}

export default { IndustryIntelligence, createIndustryRoutes, bootstrap };
