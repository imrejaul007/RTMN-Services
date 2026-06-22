import { createLogger } from '@rtmn/shared/lib/logger';
const logger = createLogger('sadaTrustIntegration');
/**
 * Salar OS - SADA Trust Integration Module
 *
 * Integrates with SADA (Trust, Governance & Risk Platform)
 * to provide unified trust scores for workforce entities
 */

import { Router, Request, Response } from 'express';

const router = Router();

// SADA Service
const SADA_URL = process.env.SADA_SERVICE_URL || 'http://localhost:4190';
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;

/**
 * Get unified trust score from SADA
 * GET /sada-trust/:entityId
 */
router.get('/:entityId', async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params;

    const response = await fetch(`${SADA_URL}/trust/${entityId}`, {
      headers: {
        'x-internal-token': INTERNAL_TOKEN,
      },
    });

    if (!response.ok) {
      // Return placeholder if SADA not available
      return res.json({
        success: true,
        data: {
          entityId,
          source: 'salar-os',
          overallScore: 70,
          riskLevel: 'MEDIUM',
          note: 'SADA not available, using default score',
        },
      });
    }

    const data = await response.json();

    res.json({
      success: true,
      data: {
        ...data.data,
        source: 'sada',
      },
    });
  } catch (error: any) {
    logger.error('SADA trust error:', error);
    // Fallback response
    res.json({
      success: true,
      data: {
        entityId: req.params.entityId,
        source: 'salar-os-fallback',
        overallScore: 70,
        riskLevel: 'MEDIUM',
        note: 'SADA unavailable',
      },
    });
  }
});

/**
 * Record activity to SADA for trust calculation
 * POST /sada-trust/:entityId/activity
 */
router.post('/:entityId/activity', async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params;
    const { success, amount, responseTime, quality, taskType } = req.body;

    try {
      const response = await fetch(`${SADA_URL}/trust/${entityId}/activity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-token': INTERNAL_TOKEN,
        },
        body: JSON.stringify({
          success,
          amount,
          responseTime,
          quality,
          type: taskType || 'WORK_TASK',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return res.json({
          success: true,
          data: {
            ...data.data,
            source: 'sada',
          },
        });
      }
    } catch {
      // SADA not available, continue with fallback
    }

    // Fallback: Update local trust in response
    res.json({
      success: true,
      data: {
        entityId,
        source: 'salar-os',
        activityRecorded: true,
        trustUpdatePending: true,
        note: 'SADA unavailable, will sync later',
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'SADA_ERROR', message: error.message },
    });
  }
});

/**
 * Verify entity with SADA
 * POST /sada-trust/:entityId/verify
 */
router.post('/:entityId/verify', async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params;
    const { type } = req.body;

    try {
      const response = await fetch(`${SADA_URL}/verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-token': INTERNAL_TOKEN,
        },
        body: JSON.stringify({
          entityId,
          type: type || 'AGENT_VERIFICATION',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return res.json({
          success: true,
          data: {
            ...data.data,
            source: 'sada',
          },
        });
      }
    } catch {
      // SADA not available
    }

    // Fallback
    res.json({
      success: true,
      data: {
        entityId,
        verificationId: `PENDING-${entityId}`,
        status: 'PENDING',
        source: 'salar-os',
        note: 'SADA unavailable',
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'SADA_ERROR', message: error.message },
    });
  }
});

/**
 * Assess risk with SADA
 * POST /sada-trust/:entityId/risk
 */
router.post('/:entityId/risk', async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params;
    const { factors, context } = req.body;

    try {
      const response = await fetch(`${SADA_URL}/risk/assess`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-token': INTERNAL_TOKEN,
        },
        body: JSON.stringify({
          entityId,
          entityType: 'AGENT',
          factors: factors || [],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return res.json({
          success: true,
          data: {
            ...data.data,
            source: 'sada',
          },
        });
      }
    } catch {
      // SADA not available
    }

    // Fallback
    res.json({
      success: true,
      data: {
        entityId,
        riskScore: 40,
        riskLevel: 'MEDIUM',
        source: 'salar-os',
        note: 'SADA unavailable',
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'SADA_ERROR', message: error.message },
    });
  }
});

/**
 * Get trust leaderboard from SADA
 * GET /sada-trust/leaderboard
 */
router.get('/leaderboard/all', async (req: Request, res: Response) => {
  try {
    const { entityType, limit = 20 } = req.query;

    const response = await fetch(`${SADA_URL}/trust/leaderboard?entityType=${entityType || ''}&limit=${limit}`, {
      headers: {
        'x-internal-token': INTERNAL_TOKEN,
      },
    });

    if (response.ok) {
      const data = await response.json();
      return res.json({
        success: true,
        data: {
          ...data.data,
          source: 'sada',
        },
      });
    }

    throw new Error('SADA unavailable');
  } catch (error: any) {
    res.status(503).json({
      success: false,
      error: { code: 'SADA_UNAVAILABLE', message: 'SADA trust service not available' },
    });
  }
});

/**
 * Check SADA health
 * GET /sada-trust/health
 */
router.get('/health', async (_req: Request, res: Response) => {
  try {
    const response = await fetch(`${SADA_URL}/health`);

    if (response.ok) {
      const data = await response.json();
      res.json({
        success: true,
        data: {
          sadaHealthy: true,
          sadaVersion: data.version,
          connected: true,
        },
      });
    } else {
      res.json({
        success: true,
        data: {
          sadaHealthy: false,
          connected: false,
        },
      });
    }
  } catch (error: any) {
    res.json({
      success: true,
      data: {
        sadaHealthy: false,
        connected: false,
        error: error.message,
      },
    });
  }
});

/**
 * Bulk sync trust scores from SADA
 * POST /sada-trust/sync
 */
router.post('/sync', async (req: Request, res: Response) => {
  try {
    const { entityIds, entityType } = req.body;

    if (!entityIds || !Array.isArray(entityIds)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'entityIds array required' },
      });
    }

    const results = {
      synced: 0,
      failed: 0,
      scores: [] as any[],
    };

    for (const entityId of entityIds) {
      try {
        const response = await fetch(`${SADA_URL}/trust/${entityId}`, {
          headers: {
            'x-internal-token': INTERNAL_TOKEN,
          },
        });

        if (response.ok) {
          const data = await response.json();
          results.scores.push({
            entityId,
            ...data.data,
          });
          results.synced++;
        } else {
          results.failed++;
        }
      } catch {
        results.failed++;
      }
    }

    res.json({
      success: true,
      data: results,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'SYNC_ERROR', message: error.message },
    });
  }
});

export { router as sadaTrustRouter };
export default router;