// ============================================
// HOJAI AI - SDR Agent Qualification Routes
// ============================================

import { Router, Request, Response } from 'express';
import { qualifierService } from '../services/qualifier';
import { requireInternalAuth, extractTenant } from '../middleware/auth';
import {
  validateBody,
  QualificationInputSchema,
  successResponse,
  errorResponse
} from '../utils/validation';
import { logger } from '../utils/logger';

const router = Router();

// Apply middleware
router.use(extractTenant);
router.use(requireInternalAuth);

/**
 * POST /api/prospects/qualify
 * Qualify a lead using BANT framework
 */
router.post('/qualify',
  async (req: Request, res: Response) => {
    try {
      const { tenantId, userId } = req;
      const { leadId, qualification, notes } = req.body;

      if (!leadId) {
        return res.status(400).json(errorResponse(
          'VALIDATION_ERROR',
          'leadId is required'
        ));
      }

      if (!qualification) {
        return res.status(400).json(errorResponse(
          'VALIDATION_ERROR',
          'qualification data is required'
        ));
      }

      // Validate qualification structure
      const validationResult = QualificationInputSchema.safeParse(qualification);
      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid qualification data',
            details: validationResult.error.errors.map(e => ({
              field: e.path.join('.'),
              message: e.message
            }))
          }
        });
      }

      const result = await qualifierService.qualifyLead(
        tenantId!,
        leadId,
        qualification,
        userId || 'system',
        notes
      );

      res.json(successResponse({
        qualification: result.qualification,
        lead: result.lead,
        disqualified: result.disqualified,
        disqualifyReason: result.disqualifyReason,
        summary: {
          qualified: !result.disqualified && result.qualification.status === 'qualified',
          score: result.lead.scoreValue,
          scoreLabel: result.lead.score
        }
      }, result.disqualified ? 'Lead disqualified' : result.qualification.status === 'qualified' ? 'Lead qualified' : 'Qualification in progress'));
    } catch (error) {
      logger.error('Failed to qualify lead', { error, tenantId: req.tenantId });
      res.status(500).json(errorResponse(
        'QUALIFICATION_FAILED',
        'Failed to qualify lead',
        error instanceof Error ? error.message : undefined
      ));
    }
  }
);

/**
 * GET /api/prospects/qualify/:leadId
 * Get qualification status for a lead
 */
router.get('/qualify/:leadId', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req;
    const { leadId } = req.params;

    const qualification = await qualifierService.getQualification(tenantId!, leadId);

    if (!qualification) {
      return res.status(404).json(errorResponse(
        'NOT_FOUND',
        'Qualification not found for this lead'
      ));
    }

    res.json(successResponse({
      qualification
    }));
  } catch (error) {
    logger.error('Failed to get qualification', { error, tenantId: req.tenantId });
    res.status(500).json(errorResponse(
      'QUALIFICATION_GET_FAILED',
      'Failed to get qualification'
    ));
  }
});

/**
 * POST /api/prospects/qualify/:leadId/score
 * Auto-score a lead based on contact/company data
 */
router.post('/qualify/:leadId/score', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req;
    const { leadId } = req.params;

    const scoreResult = await qualifierService.autoScore(tenantId!, leadId);

    res.json(successResponse({
      leadId,
      score: scoreResult.score,
      breakdown: scoreResult.scoreBreakdown,
      recommendations: scoreResult.recommendations,
      label: scoreResult.score >= 80 ? 'hot' : scoreResult.score >= 50 ? 'warm' : 'cold'
    }));
  } catch (error) {
    logger.error('Failed to auto-score lead', { error, tenantId: req.tenantId });
    res.status(500).json(errorResponse(
      'AUTO_SCORE_FAILED',
      'Failed to auto-score lead',
      error instanceof Error ? error.message : undefined
    ));
  }
});

/**
 * GET /api/qualification/templates
 * Get BANT qualification templates
 */
router.get('/templates', async (req: Request, res: Response) => {
  try {
    const templates = [
      {
        id: 'bant-full',
        name: 'BANT Full Assessment',
        description: 'Complete BANT qualification framework',
        fields: ['budget', 'authority', 'need', 'timeline']
      },
      {
        id: 'bant-budget-focused',
        name: 'Budget-Focused BANT',
        description: 'BANT with emphasis on budget and authority',
        fields: ['budget', 'authority']
      },
      {
        id: 'meddic',
        name: 'MEDDIC Qualification',
        description: 'Enterprise sales qualification framework',
        customFields: ['Metrics', 'Economic Buyer', 'Decision Criteria', 'Decision Process', 'Identify Pain', 'Champion']
      }
    ];

    res.json(successResponse({ templates }));
  } catch (error) {
    logger.error('Failed to get qualification templates', { error });
    res.status(500).json(errorResponse(
      'TEMPLATES_FAILED',
      'Failed to get qualification templates'
    ));
  }
});

export { router as qualificationRoutes };
