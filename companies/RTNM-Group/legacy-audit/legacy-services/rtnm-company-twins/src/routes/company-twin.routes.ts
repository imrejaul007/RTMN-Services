import { Router, Request, Response, NextFunction } from 'express';
import companyTwinService, {
  CreateTwinInput,
  UpdateTwinInput,
  UpdateBudgetInput,
  UpdatePoliciesInput,
} from '../services/company-twin.service';
import logger from '../utils/logger';

const router = Router();

// ============================================
// MIDDLEWARE
// ============================================

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

const validateCorpId = (req: Request, res: Response, next: NextFunction) => {
  const { corpId } = req.params;
  if (!corpId || corpId.trim() === '') {
    return res.status(400).json({
      success: false,
      error: 'corpId is required',
    });
  }
  next();
};

// ============================================
// ROUTES
// ============================================

/**
 * POST /twins
 * Create a new company twin
 */
router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info('POST /twins - Creating new company twin', {
      body: { ...req.body, corpId: req.body.corpId },
    });

    const input: CreateTwinInput = {
      corpId: req.body.corpId,
      name: req.body.name,
      type: req.body.type,
      revenueModel: req.body.revenueModel,
      costStructure: req.body.costStructure,
      margins: req.body.margins,
      growthTargets: req.body.growthTargets,
      riskTolerance: req.body.riskTolerance,
      budget: req.body.budget,
      policies: req.body.policies,
      aiAgent: req.body.aiAgent,
      trustRules: req.body.trustRules,
      metadata: req.body.metadata,
    };

    // Validate required fields
    if (!input.corpId || !input.name || !input.type) {
      return res.status(400).json({
        success: false,
        error: 'corpId, name, and type are required fields',
      });
    }

    const result = await companyTwinService.createTwin(input);

    if (!result.success) {
      const statusCode = result.error?.includes('already exists') ? 409 : 400;
      return res.status(statusCode).json(result);
    }

    return res.status(201).json(result);
  })
);

/**
 * GET /twins
 * Get all company twins with optional filters
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info('GET /twins - Getting all company twins', { query: req.query });

    const filters = {
      status: req.query.status as 'active' | 'inactive' | 'suspended' | 'pending',
      type: req.query.type as 'startup' | 'smb' | 'midmarket' | 'enterprise' | 'corporate',
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      skip: req.query.skip ? parseInt(req.query.skip as string, 10) : undefined,
    };

    const result = await companyTwinService.getAllTwins(filters);

    if (!result.success) {
      return res.status(500).json(result);
    }

    return res.status(200).json(result);
  })
);

/**
 * GET /twins/:corpId
 * Get a specific company twin by corpId
 */
router.get(
  '/:corpId',
  validateCorpId,
  asyncHandler(async (req: Request, res: Response) => {
    const { corpId } = req.params;
    logger.info('GET /twins/:corpId - Getting company twin', { corpId });

    const result = await companyTwinService.getTwin(corpId);

    if (!result.success) {
      return res.status(404).json(result);
    }

    return res.status(200).json(result);
  })
);

/**
 * PUT /twins/:corpId
 * Update company twin
 */
router.put(
  '/:corpId',
  validateCorpId,
  asyncHandler(async (req: Request, res: Response) => {
    const { corpId } = req.params;
    logger.info('PUT /twins/:corpId - Updating company twin', { corpId, updates: req.body });

    const updates: UpdateTwinInput = {
      name: req.body.name,
      type: req.body.type,
      revenueModel: req.body.revenueModel,
      costStructure: req.body.costStructure,
      margins: req.body.margins,
      growthTargets: req.body.growthTargets,
      riskTolerance: req.body.riskTolerance,
      status: req.body.status,
      metadata: req.body.metadata,
    };

    // Remove undefined values
    Object.keys(updates).forEach((key) => {
      if (updates[key as keyof UpdateTwinInput] === undefined) {
        delete updates[key as keyof UpdateTwinInput];
      }
    });

    const result = await companyTwinService.updateTwin(corpId, updates);

    if (!result.success) {
      return res.status(404).json(result);
    }

    return res.status(200).json(result);
  })
);

/**
 * PUT /twins/:corpId/budget
 * Update company twin budget
 */
router.put(
  '/:corpId/budget',
  validateCorpId,
  asyncHandler(async (req: Request, res: Response) => {
    const { corpId } = req.params;
    logger.info('PUT /twins/:corpId/budget - Updating budget', { corpId, budget: req.body });

    const budgetUpdates: UpdateBudgetInput = {
      total: req.body.total,
      allocated: req.body.allocated,
      categories: req.body.categories,
      fiscalYear: req.body.fiscalYear,
      currency: req.body.currency,
    };

    const result = await companyTwinService.updateBudget(corpId, budgetUpdates);

    if (!result.success) {
      return res.status(404).json(result);
    }

    return res.status(200).json(result);
  })
);

/**
 * PUT /twins/:corpId/policies
 * Update company twin policies
 */
router.put(
  '/:corpId/policies',
  validateCorpId,
  asyncHandler(async (req: Request, res: Response) => {
    const { corpId } = req.params;
    logger.info('PUT /twins/:corpId/policies - Updating policies', { corpId, policies: req.body.policies });

    const policyUpdates: UpdatePoliciesInput = {
      policies: req.body.policies,
      action: req.body.action || 'replace',
    };

    if (!policyUpdates.policies || !Array.isArray(policyUpdates.policies)) {
      return res.status(400).json({
        success: false,
        error: 'policies array is required',
      });
    }

    const result = await companyTwinService.updatePolicies(corpId, policyUpdates);

    if (!result.success) {
      return res.status(404).json(result);
    }

    return res.status(200).json(result);
  })
);

/**
 * PUT /twins/:corpId/ai-agent
 * Update company twin AI agent
 */
router.put(
  '/:corpId/ai-agent',
  validateCorpId,
  asyncHandler(async (req: Request, res: Response) => {
    const { corpId } = req.params;
    logger.info('PUT /twins/:corpId/ai-agent - Updating AI agent', { corpId, agent: req.body });

    const result = await companyTwinService.updateAIAgent(corpId, req.body);

    if (!result.success) {
      return res.status(404).json(result);
    }

    return res.status(200).json(result);
  })
);

/**
 * PUT /twins/:corpId/trust-rules
 * Update company twin trust rules
 */
router.put(
  '/:corpId/trust-rules',
  validateCorpId,
  asyncHandler(async (req: Request, res: Response) => {
    const { corpId } = req.params;
    logger.info('PUT /twins/:corpId/trust-rules - Updating trust rules', { corpId, rules: req.body });

    const result = await companyTwinService.updateTrustRules(corpId, req.body);

    if (!result.success) {
      return res.status(404).json(result);
    }

    return res.status(200).json(result);
  })
);

/**
 * DELETE /twins/:corpId
 * Delete company twin
 */
router.delete(
  '/:corpId',
  validateCorpId,
  asyncHandler(async (req: Request, res: Response) => {
    const { corpId } = req.params;
    logger.info('DELETE /twins/:corpId - Deleting company twin', { corpId });

    const result = await companyTwinService.deleteTwin(corpId);

    if (!result.success) {
      return res.status(404).json(result);
    }

    return res.status(200).json(result);
  })
);

/**
 * POST /twins/:corpId/activate
 * Activate company twin
 */
router.post(
  '/:corpId/activate',
  validateCorpId,
  asyncHandler(async (req: Request, res: Response) => {
    const { corpId } = req.params;
    logger.info('POST /twins/:corpId/activate - Activating company twin', { corpId });

    const result = await companyTwinService.activateTwin(corpId);

    if (!result.success) {
      return res.status(404).json(result);
    }

    return res.status(200).json(result);
  })
);

/**
 * POST /twins/:corpId/suspend
 * Suspend company twin
 */
router.post(
  '/:corpId/suspend',
  validateCorpId,
  asyncHandler(async (req: Request, res: Response) => {
    const { corpId } = req.params;
    const reason = req.body.reason;
    logger.info('POST /twins/:corpId/suspend - Suspending company twin', { corpId, reason });

    const result = await companyTwinService.suspendTwin(corpId, reason);

    if (!result.success) {
      return res.status(404).json(result);
    }

    return res.status(200).json(result);
  })
);

/**
 * GET /twins/:corpId/summary
 * Get company twin summary/analytics
 */
router.get(
  '/:corpId/summary',
  validateCorpId,
  asyncHandler(async (req: Request, res: Response) => {
    const { corpId } = req.params;
    logger.info('GET /twins/:corpId/summary - Getting company twin summary', { corpId });

    const result = await companyTwinService.getTwinSummary(corpId);

    if (!result.success) {
      return res.status(404).json(result);
    }

    return res.status(200).json(result);
  })
);

export default router;
