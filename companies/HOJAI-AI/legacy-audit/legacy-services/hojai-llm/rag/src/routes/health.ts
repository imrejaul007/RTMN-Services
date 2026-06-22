/**
 * HOJAI RAG Service - Health Routes
 */

import { Router, Request, Response } from 'express';
import { getStorageStats } from '../services/documentService';
import type { APIResponse } from '../types';
import config from '../config';

const router = Router();

interface HealthStatus {
  status: 'healthy' | 'degraded';
  service: string;
  version: string;
  uptime: number;
  timestamp: string;
  checks?: {
    vector_service?: string;
    llm_provider?: string;
  };
}

// GET /health - Health check
router.get('/health', (_req: Request, res: Response) => {
  const health: HealthStatus = {
    status: 'healthy',
    service: config.serviceName,
    version: config.version,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    checks: {
      vector_service: config.vectorServiceUrl ? 'configured' : 'not_configured',
      llm_provider: config.openaiApiKey ? 'configured' : 'mock',
    },
  };

  res.json(health);
});

// GET /health/ready - Readiness check
router.get('/health/ready', (_req: Request, res: Response) => {
  const isReady = true; // Add actual checks here if needed
  const stats = getStorageStats();

  if (isReady) {
    res.json({
      ready: true,
      documents: stats.total_documents,
      namespaces: stats.total_namespaces,
    });
  } else {
    res.status(503).json({
      ready: false,
      reason: 'Service not ready',
    });
  }
});

// GET /health/live - Liveness check
router.get('/health/live', (_req: Request, res: Response) => {
  res.json({ alive: true });
});

// GET / - Root endpoint
router.get('/', (_req: Request, res: Response) => {
  const response: APIResponse<{
    service: string;
    version: string;
    endpoints: string[];
  }> = {
    success: true,
    data: {
      service: config.serviceName,
      version: config.version,
      endpoints: [
        'POST /api/documents - Create document',
        'POST /api/documents/batch - Batch create',
        'GET /api/documents/:id - Get document',
        'DELETE /api/documents/:id - Delete document',
        'GET /api/documents - List documents',
        'POST /api/search - Search documents',
        'POST /api/generate - Generate with RAG',
        'GET /health - Health check',
      ],
    },
    timestamp: new Date().toISOString(),
  };

  res.json(response);
});

export default router;
