import { Router, Request, Response } from 'express';
import { resolutionEngine } from '../services/resolutionEngine';
import { planGeneratorService } from '../services/planGeneratorService';
import { templateService } from '../services/templateService';
import { escalationService } from '../services/escalationService';
import { ResolutionPlan, ResolutionHistory, Issue } from '../models/resolution';
import {
  validateIssue,
  validatePlanUpdate,
  validateStepUpdate,
  validateActionItemUpdate,
  validateTemplateCreate,
  validateEscalation,
  validateResolutionComplete,
  validatePagination,
  asyncHandler
} from '../middleware/validation';
import { logger } from '../utils/logger';
import { IssueCategory, IssuePriority, TemplateCategory } from '../models/resolution';

const router = Router();

// POST /resolution/analyze - Analyze an issue
router.post(
  '/analyze',
  validateIssue,
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    logger.info('Analyzing issue', { title: req.body.title });

    const analysis = await planGeneratorService.analyzeIssue(req.body);

    const duration = Date.now() - startTime;
    logger.info('Issue analysis completed', { duration });

    res.json({
      success: true,
      data: analysis,
      meta: { duration }
    });
  })
);

// POST /resolution/generate - Generate a resolution plan
router.post(
  '/generate',
  validateIssue,
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    logger.info('Generating resolution plan', { issueId: req.body.issueId });

    const plan = await resolutionEngine.processIssue({
      issueId: req.body.issueId || `issue_${Date.now()}`,
      title: req.body.title,
      description: req.body.description,
      category: req.body.category,
      priority: req.body.priority,
      customerId: req.body.customerId,
      agentId: req.body.agentId,
      context: req.body.context
    });

    const duration = Date.now() - startTime;
    logger.info('Resolution plan generated', { planId: plan.planId, duration });

    res.status(201).json({
      success: true,
      data: plan,
      meta: { duration }
    });
  })
);

// GET /resolution/plan/:planId - Get plan by ID
router.get(
  '/plan/:planId',
  asyncHandler(async (req: Request, res: Response) => {
    const { planId } = req.params;

    const plan = await ResolutionPlan.findOne({ planId }).lean();
    if (!plan) {
      res.status(404).json({
        success: false,
        error: 'Plan not found'
      });
      return;
    }

    // Get progress information
    const progress = await resolutionEngine.trackProgress(planId);

    res.json({
      success: true,
      data: { ...plan, progress }
    });
  })
);

// PUT /resolution/plan/:planId/progress - Update plan progress
router.put(
  '/plan/:planId/progress',
  asyncHandler(async (req: Request, res: Response) => {
    const { planId } = req.params;
    const { stepOrder, actionItemId, status, notes, completedBy } = req.body;

    let updatedPlan;

    if (stepOrder !== undefined) {
      // Update step status
      updatedPlan = await resolutionEngine.updateStepStatus(planId, stepOrder, status, notes);
    } else if (actionItemId) {
      // Update action item status
      updatedPlan = await resolutionEngine.updateActionItemStatus(planId, actionItemId, status, completedBy);
    } else {
      res.status(400).json({
        success: false,
        error: 'Either stepOrder or actionItemId must be provided'
      });
      return;
    }

    const progress = await resolutionEngine.trackProgress(planId);

    res.json({
      success: true,
      data: { ...updatedPlan, progress }
    });
  })
);

// POST /resolution/plan/:planId/complete - Complete resolution
router.post(
  '/plan/:planId/complete',
  validateResolutionComplete,
  asyncHandler(async (req: Request, res: Response) => {
    const { planId } = req.params;
    const { outcome, feedback } = req.body;

    logger.info('Completing resolution', { planId, outcome });

    const completedPlan = await resolutionEngine.completeResolution(planId, outcome, feedback);

    res.json({
      success: true,
      data: completedPlan
    });
  })
);

// GET /resolution/templates - List templates
router.get(
  '/templates',
  validatePagination,
  asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = req.query as { page: number; limit: number };
    const { category, isActive, search } = req.query;

    let templates;
    let total;
    let totalPages;

    if (search) {
      templates = await templateService.searchTemplates(search as string, limit);
      total = templates.length;
      totalPages = 1;
    } else {
      const result = await templateService.listAllTemplates({
        page,
        limit,
        category: category as TemplateCategory,
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined
      });
      templates = result.templates;
      total = result.total;
      totalPages = result.totalPages;
    }

    res.json({
      success: true,
      data: templates,
      meta: {
        page,
        limit,
        total,
        totalPages
      }
    });
  })
);

// GET /resolution/templates/popular - Get popular templates
router.get(
  '/templates/popular',
  asyncHandler(async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 10;

    const templates = await templateService.getPopularTemplates(limit);

    res.json({
      success: true,
      data: templates
    });
  })
);

// POST /resolution/templates - Create template
router.post(
  '/templates',
  validateTemplateCreate,
  asyncHandler(async (req: Request, res: Response) => {
    const createdBy = req.headers['x-user-id'] as string || 'system';

    logger.info('Creating template', { name: req.body.name });

    const template = await templateService.createTemplate({
      ...req.body,
      createdBy
    });

    res.status(201).json({
      success: true,
      data: template
    });
  })
);

// GET /resolution/templates/:templateId - Get template by ID
router.get(
  '/templates/:templateId',
  asyncHandler(async (req: Request, res: Response) => {
    const { templateId } = req.params;

    const template = await templateService.getTemplateById(templateId);
    if (!template) {
      res.status(404).json({
        success: false,
        error: 'Template not found'
      });
      return;
    }

    const stats = await templateService.getTemplateStats(templateId);

    res.json({
      success: true,
      data: { ...template, stats }
    });
  })
);

// POST /resolution/templates/:templateId/clone - Clone template
router.post(
  '/templates/:templateId/clone',
  asyncHandler(async (req: Request, res: Response) => {
    const { templateId } = req.params;
    const { newName } = req.body;
    const createdBy = req.headers['x-user-id'] as string || 'system';

    logger.info('Cloning template', { originalId: templateId, newName });

    const cloned = await templateService.cloneTemplate(templateId, newName, createdBy);
    if (!cloned) {
      res.status(404).json({
        success: false,
        error: 'Template not found'
      });
      return;
    }

    res.status(201).json({
      success: true,
      data: cloned
    });
  })
);

// GET /resolution/history/:customerId - Get resolution history
router.get(
  '/history/:customerId',
  asyncHandler(async (req: Request, res: Response) => {
    const { customerId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const [history, total] = await Promise.all([
      ResolutionHistory.find({ customerId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      ResolutionHistory.countDocuments({ customerId })
    ]);

    res.json({
      success: true,
      data: history,
      meta: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  })
);

// POST /resolution/escalate - Escalate an issue
router.post(
  '/escalate',
  validateEscalation,
  asyncHandler(async (req: Request, res: Response) => {
    const { issueId, reason, targetLevel, notes } = req.body;

    logger.info('Processing escalation', { issueId, targetLevel });

    // Get the issue
    const issue = await Issue.findOne({ issueId }).lean();
    if (!issue) {
      res.status(404).json({
        success: false,
        error: 'Issue not found'
      });
      return;
    }

    // Evaluate escalation
    const evaluation = await escalationService.evaluateEscalation({
      title: issue.title,
      description: issue.description,
      category: issue.category,
      priority: issue.priority,
      context: issue.context
    });

    // Find best agent for escalation
    const level = targetLevel || evaluation.escalationLevel;
    const bestAgent = await escalationService.findBestAgent(
      {
        category: issue.category,
        priority: issue.priority,
        context: issue.context
      },
      level
    );

    // Create escalation path
    const escalationPath = await escalationService.createEscalationPath({
      title: issue.title,
      description: issue.description,
      category: issue.category,
      priority: issue.priority,
      context: issue.context
    });

    // Update issue and plan status
    await Issue.findOneAndUpdate(
      { issueId },
      {
        status: 'escalated',
        updatedAt: new Date()
      }
    );

    await ResolutionPlan.findOneAndUpdate(
      { issueId },
      {
        status: 'in_progress',
        escalationLevel: level,
        escalationReason: reason,
        assignedAgentId: bestAgent?.agentId,
        updatedAt: new Date()
      }
    );

    res.json({
      success: true,
      data: {
        issueId,
        evaluation,
        assignedAgent: bestAgent,
        escalationPath,
        notes
      }
    });
  })
);

// GET /resolution/suggestions/:issueId - Get suggestions for an issue
router.get(
  '/suggestions/:issueId',
  asyncHandler(async (req: Request, res: Response) => {
    const { issueId } = req.params;

    const issue = await Issue.findOne({ issueId }).lean();
    if (!issue) {
      res.status(404).json({
        success: false,
        error: 'Issue not found'
      });
      return;
    }

    // Get similar templates
    const similarTemplates = await templateService.findSimilarTemplate({
      title: issue.title,
      description: issue.description,
      category: issue.category,
      priority: issue.priority
    });

    // Get escalation recommendation
    const escalationEvaluation = await escalationService.evaluateEscalation({
      title: issue.title,
      description: issue.description,
      category: issue.category,
      priority: issue.priority,
      context: issue.context
    });

    // Get time estimate
    const timeEstimate = planGeneratorService.estimateResolutionTime({
      title: issue.title,
      description: issue.description,
      category: issue.category,
      priority: issue.priority,
      context: issue.context
    });

    res.json({
      success: true,
      data: {
        similarTemplates: similarTemplates.slice(0, 5),
        escalationRecommendation: escalationEvaluation,
        timeEstimate,
        generatedAt: new Date().toISOString()
      }
    });
  })
);

// GET /resolution/stats - Get resolution statistics
router.get(
  '/stats',
  asyncHandler(async (req: Request, res: Response) => {
    const stats = await resolutionEngine.getResolutionStats();
    const escalationMetrics = await escalationService.getEscalationMetrics();

    res.json({
      success: true,
      data: {
        resolution: stats,
        escalation: escalationMetrics
      }
    });
  })
);

// GET /resolution/plan/:planId/success-criteria - Get success criteria status
router.get(
  '/plan/:planId/success-criteria',
  asyncHandler(async (req: Request, res: Response) => {
    const { planId } = req.params;

    const plan = await ResolutionPlan.findOne({ planId })
      .select('successCriteria planId status')
      .lean();

    if (!plan) {
      res.status(404).json({
        success: false,
        error: 'Plan not found'
      });
      return;
    }

    const metCriteria = plan.successCriteria.filter(c => c.isMet).length;
    const totalCriteria = plan.successCriteria.length;

    res.json({
      success: true,
      data: {
        planId,
        status: plan.status,
        successCriteria: plan.successCriteria,
        progress: {
          met: metCriteria,
          total: totalCriteria,
          percentage: totalCriteria > 0 ? (metCriteria / totalCriteria) * 100 : 0
        }
      }
    });
  })
);

// PUT /resolution/plan/:planId/success-criteria/:criteriaIndex - Update success criteria
router.put(
  '/plan/:planId/success-criteria/:criteriaIndex',
  asyncHandler(async (req: Request, res: Response) => {
    const { planId, criteriaIndex } = req.params;
    const { isMet, currentValue } = req.body;

    const plan = await ResolutionPlan.findOne({ planId });
    if (!plan) {
      res.status(404).json({
        success: false,
        error: 'Plan not found'
      });
      return;
    }

    const index = parseInt(criteriaIndex, 10);
    if (index < 0 || index >= plan.successCriteria.length) {
      res.status(400).json({
        success: false,
        error: 'Invalid criteria index'
      });
      return;
    }

    plan.successCriteria[index].isMet = isMet;
    if (currentValue !== undefined) {
      plan.successCriteria[index].currentValue = currentValue;
    }
    plan.updatedAt = new Date();

    await plan.save();

    res.json({
      success: true,
      data: plan.successCriteria[index]
    });
  })
);

// Health check endpoint
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'hojai-ai-resolution-service',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

export default router;
