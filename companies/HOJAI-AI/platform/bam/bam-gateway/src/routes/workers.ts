/**
 * Workers Routes — List, discover, and execute workers
 */

import { Router, Request, Response } from 'express';
import axios from 'axios';
import { WORKER_REGISTRY, findWorker } from '../registry.js';

const router = Router();

// GET /api/workers
router.get('/', (req: Request, res: Response) => {
  res.json({
    workers: WORKER_REGISTRY.map(w => ({
      id: w.id,
      name: w.name,
      description: w.description,
      category: w.category,
      pricing: w.pricing,
      skills: w.skills.map(s => ({ id: s.id, name: s.name, description: s.description })),
      inputs: w.inputs,
      outputs: w.outputs,
    })),
    total: WORKER_REGISTRY.length,
    timestamp: new Date().toISOString(),
  });
});

// GET /api/workers/:id
router.get('/:id', (req: Request, res: Response) => {
  const worker = findWorker(req.params.id);

  if (!worker) {
    return res.status(404).json({
      success: false,
      error: { code: 'WORKER_NOT_FOUND', message: `Worker ${req.params.id} not found` },
    });
  }

  res.json({
    success: true,
    worker,
    timestamp: new Date().toISOString(),
  });
});

// GET /api/workers/category/:category
router.get('/category/:category', (req: Request, res: Response) => {
  const workers = WORKER_REGISTRY.filter(
    w => w.category === req.params.category
  );

  res.json({
    category: req.params.category,
    workers,
    total: workers.length,
    timestamp: new Date().toISOString(),
  });
});

// POST /api/workers/:id/run
router.post('/:id/run', async (req: Request, res: Response) => {
  const worker = findWorker(req.params.id);

  if (!worker) {
    return res.status(404).json({
      success: false,
      error: { code: 'WORKER_NOT_FOUND', message: `Worker ${req.params.id} not found` },
    });
  }

  try {
    // Forward request to the worker
    const response = await axios.post(
      `${worker.url}/run`,
      req.body,
      { timeout: 30000 }
    );

    res.json({
      success: true,
      workerId: worker.id,
      result: response.data,
      cost: calculateCost(worker, req.body),
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    // Return mock response if worker service not available
    res.json({
      success: true,
      workerId: worker.id,
      result: generateMockResult(worker.id, req.body),
      cost: calculateCost(worker, req.body),
      note: 'Worker service unavailable, returning mock result',
      timestamp: new Date().toISOString(),
    });
  }
});

function calculateCost(worker: any, body: any): number {
  switch (worker.pricing.model) {
    case 'per_request':
      return worker.pricing.unitPrice || 0;
    case 'per_record':
      const count = body.target_count || body.products?.length || 1;
      return worker.pricing.basePrice + (worker.pricing.unitPrice || 0) * count;
    case 'one_time':
      return worker.pricing.basePrice;
    default:
      return 0;
  }
}

function generateMockResult(workerId: string, body: any): any {
  switch (workerId) {
    case 'vendor-acquisition':
      return {
        prospects: Array.from({ length: body.target_count || 10 }, (_, i) => ({
          id: `VENDOR-${i + 1}`,
          name: `Vendor ${i + 1}`,
          email: `vendor${i + 1}@example.com`,
          score: Math.random() * 0.5 + 0.5,
          status: 'qualified',
        })),
        batchId: `BATCH-${Date.now()}`,
        contacted: body.target_count || 10,
        responses: Math.floor((body.target_count || 10) * 0.3),
      };
    case 'catalog-normalization':
      return {
        processed: body.products?.length || 1,
        averageQuality: 0.85,
        results: (body.products || [{ id: 'PROD001' }]).map((p: any) => ({
          productId: p.id,
          normalized: true,
          qualityScore: 0.85,
          improvements: ['Added 3 image variants', 'Generated SEO description'],
        })),
      };
    case 'recommendation':
      return {
        recommendations: Array.from({ length: body.limit || 20 }, (_, i) => ({
          productId: `PROD${String(i + 1).padStart(3, '0')}`,
          score: Math.random() * 0.5 + 0.5,
          reason: 'Based on your preferences',
        })),
      };
    case 'growth':
      return {
        campaign: {
          id: `CAMP-${Date.now()}`,
          type: body.type,
          targeting: { audienceSize: 10000 },
          content: { headline: 'Special Offer', cta: 'Shop Now' },
        },
      };
    default:
      return { success: true, data: body };
  }
}

export default router;
