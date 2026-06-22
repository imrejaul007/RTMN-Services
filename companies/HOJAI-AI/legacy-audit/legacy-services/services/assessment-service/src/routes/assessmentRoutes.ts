import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { assessmentService, CreateAssessmentInput } from '../services/assessmentService';
import { templateService } from '../services/templateService';
import { trendAnalysisService } from '../services/trendAnalysisService';
import { AssessmentType } from '../models/assessment';
import { logger } from '../utils/logger';

const router = Router();

// Validation schemas
const createAssessmentSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  type: z.nativeEnum(AssessmentType, {
    errorMap: () => ({ message: 'Invalid assessment type' })
  }),
  assessorId: z.string().min(1, 'Assessor ID is required'),
  assessorName: z.string().optional(),
  department: z.string().optional(),
  facilityId: z.string().optional(),
  responses: z.array(
    z.object({
      questionId: z.string().min(1),
      answer: z.unknown(),
      notes: z.string().optional()
    })
  ).min(1, 'At least one response is required'),
  diagnosisCodes: z.array(z.string()).optional(),
  medications: z.array(z.string()).optional(),
  comorbidities: z.array(z.string()).optional(),
  notes: z.string().optional(),
  date: z.string().datetime().optional()
});

const createTemplateSchema = z.object({
  type: z.nativeEnum(AssessmentType),
  name: z.string().min(1),
  description: z.string().min(1),
  version: z.string().optional(),
  questions: z.array(z.any()),
  scoring: z.object({
    method: z.enum(['sum', 'weighted', 'formula'])
  }),
  thresholds: z.object({
    low: z.number(),
    medium: z.number().optional(),
    high: z.number().optional(),
    veryHigh: z.number().optional()
  }),
  category: z.string().min(1),
  specialty: z.string().optional(),
  applicableSpecialties: z.array(z.string()).optional(),
  estimatedDuration: z.number().optional(),
  requiredTraining: z.string().optional(),
  source: z.string().optional()
});

const updateTemplateSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  questions: z.array(z.any()).optional(),
  scoring: z.object({
    method: z.enum(['sum', 'weighted', 'formula'])
  }).optional(),
  thresholds: z.object({
    low: z.number().optional(),
    medium: z.number().optional(),
    high: z.number().optional(),
    veryHigh: z.number().optional()
  }).optional(),
  isActive: z.boolean().optional(),
  estimatedDuration: z.number().optional(),
  requiredTraining: z.string().optional(),
  applicableSpecialties: z.array(z.string()).optional()
});

// Request validation middleware
const validateRequest = (schema: z.ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.warn('Validation error', { errors: error.errors });
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      next(error);
    }
  };
};

// Error handler
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * @route POST /assessments
 * @desc Create a new assessment
 * @access Internal
 */
router.post(
  '/',
  validateRequest(createAssessmentSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const input: CreateAssessmentInput = {
      ...req.body,
      date: req.body.date ? new Date(req.body.date) : undefined
    };

    const result = await assessmentService.createAssessment(input);

    logger.info('Assessment created via API', {
      assessmentId: result.assessment.assessmentId,
      patientId: result.assessment.patientId,
      type: result.assessment.type
    });

    res.status(201).json({
      success: true,
      data: {
        assessment: result.assessment,
        recommendations: result.recommendations,
        requiresFollowUp: result.requiresFollowUp,
        followUpDate: result.followUpDate
      }
    });
  })
);

/**
 * @route GET /assessments/:assessmentId
 * @desc Get assessment by ID
 * @access Internal
 */
router.get(
  '/:assessmentId',
  asyncHandler(async (req: Request, res: Response) => {
    const { assessmentId } = req.params;

    const assessment = await assessmentService.getAssessment(assessmentId);

    if (!assessment) {
      return res.status(404).json({
        success: false,
        error: 'Assessment not found'
      });
    }

    res.json({
      success: true,
      data: assessment
    });
  })
);

/**
 * @route GET /assessments/patient/:patientId
 * @desc Get all assessments for a patient
 * @access Internal
 */
router.get(
  '/patient/:patientId',
  asyncHandler(async (req: Request, res: Response) => {
    const { patientId } = req.params;
    const { type, limit, skip } = req.query;

    const assessments = await assessmentService.getAssessmentHistory(
      patientId,
      type as AssessmentType | undefined,
      limit ? parseInt(limit as string, 10) : undefined,
      skip ? parseInt(skip as string, 10) : undefined
    );

    res.json({
      success: true,
      data: {
        assessments,
        count: assessments.length
      }
    });
  })
);

/**
 * @route GET /assessments/patient/:patientId/:type
 * @desc Get assessments for a patient by type
 * @access Internal
 */
router.get(
  '/patient/:patientId/:type',
  asyncHandler(async (req: Request, res: Response) => {
    const { patientId, type } = req.params;

    if (!Object.values(AssessmentType).includes(type as AssessmentType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid assessment type'
      });
    }

    const history = await assessmentService.getAssessmentHistory(
      patientId,
      type as AssessmentType
    );

    const latest = await assessmentService.getLatestAssessment(
      patientId,
      type as AssessmentType
    );

    res.json({
      success: true,
      data: {
        history,
        latest,
        count: history.length
      }
    });
  })
);

/**
 * @route GET /assessments/:assessmentId/trend
 * @desc Get score trend for an assessment
 * @access Internal
 */
router.get(
  '/:assessmentId/trend',
  asyncHandler(async (req: Request, res: Response) => {
    const { assessmentId } = req.params;
    const { days } = req.query;

    // First get the assessment to find patient and type
    const assessment = await assessmentService.getAssessment(assessmentId);

    if (!assessment) {
      return res.status(404).json({
        success: false,
        error: 'Assessment not found'
      });
    }

    const trends = await assessmentService.getAssessmentTrends(
      assessment.patientId,
      assessment.type,
      days ? parseInt(days as string, 10) : undefined
    );

    res.json({
      success: true,
      data: trends
    });
  })
);

/**
 * @route GET /assessments/analysis/trends/:patientId/:type
 * @desc Get detailed trend analysis
 * @access Internal
 */
router.get(
  '/analysis/trends/:patientId/:type',
  asyncHandler(async (req: Request, res: Response) => {
    const { patientId, type } = req.params;
    const { days, startDate, endDate } = req.query;

    if (!Object.values(AssessmentType).includes(type as AssessmentType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid assessment type'
      });
    }

    const trends = await trendAnalysisService.analyzeScoreTrends(
      patientId,
      type as AssessmentType,
      {
        days: days ? parseInt(days as string, 10) : undefined,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined
      }
    );

    res.json({
      success: true,
      data: trends
    });
  })
);

/**
 * @route GET /assessments/analysis/predict/:patientId/:type
 * @desc Predict decline for a patient
 * @access Internal
 */
router.get(
  '/analysis/predict/:patientId/:type',
  asyncHandler(async (req: Request, res: Response) => {
    const { patientId, type } = req.params;

    if (!Object.values(AssessmentType).includes(type as AssessmentType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid assessment type'
      });
    }

    const prediction = await trendAnalysisService.predictDecline(
      patientId,
      type as AssessmentType
    );

    res.json({
      success: true,
      data: prediction
    });
  })
);

/**
 * @route GET /assessments/analysis/reassess/:patientId/:type
 * @desc Get reassessment recommendation
 * @access Internal
 */
router.get(
  '/analysis/reassess/:patientId/:type',
  asyncHandler(async (req: Request, res: Response) => {
    const { patientId, type } = req.params;

    if (!Object.values(AssessmentType).includes(type as AssessmentType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid assessment type'
      });
    }

    const recommendation = await trendAnalysisService.recommendReassessment(
      patientId,
      type as AssessmentType
    );

    res.json({
      success: true,
      data: recommendation
    });
  })
);

/**
 * @route GET /assessments/analysis/overview/:patientId
 * @desc Get patient overview with all assessment trends
 * @access Internal
 */
router.get(
  '/analysis/overview/:patientId',
  asyncHandler(async (req: Request, res: Response) => {
    const { patientId } = req.params;
    const { days } = req.query;

    const overview = await trendAnalysisService.getPatientOverview(
      patientId,
      days ? parseInt(days as string, 10) : undefined
    );

    res.json({
      success: true,
      data: overview
    });
  })
);

// Template routes
/**
 * @route POST /assessments/templates
 * @desc Create a new assessment template
 * @access Internal
 */
router.post(
  '/templates',
  validateRequest(createTemplateSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const template = await templateService.createTemplate(req.body);

    logger.info('Template created via API', {
      templateId: template.templateId,
      type: template.type
    });

    res.status(201).json({
      success: true,
      data: template
    });
  })
);

/**
 * @route GET /assessments/templates/:type
 * @desc Get template by assessment type
 * @access Internal
 */
router.get(
  '/templates/:type',
  asyncHandler(async (req: Request, res: Response) => {
    const { type } = req.params;

    if (!Object.values(AssessmentType).includes(type as AssessmentType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid assessment type'
      });
    }

    const template = await templateService.getTemplate(type as AssessmentType);

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    res.json({
      success: true,
      data: template
    });
  })
);

/**
 * @route GET /assessments/templates
 * @desc List all templates
 * @access Internal
 */
router.get(
  '/templates',
  asyncHandler(async (req: Request, res: Response) => {
    const { category, isActive, specialty, limit, skip } = req.query;

    const result = await templateService.getAllTemplates({
      category: category as string,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      specialty: specialty as string,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      skip: skip ? parseInt(skip as string, 10) : undefined
    });

    res.json({
      success: true,
      data: result
    });
  })
);

/**
 * @route PUT /assessments/templates/:templateId
 * @desc Update a template
 * @access Internal
 */
router.put(
  '/templates/:templateId',
  validateRequest(updateTemplateSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { templateId } = req.params;

    const template = await templateService.updateTemplate(templateId, req.body);

    logger.info('Template updated via API', { templateId });

    res.json({
      success: true,
      data: template
    });
  })
);

/**
 * @route GET /assessments/templates/categories/list
 * @desc Get template categories
 * @access Internal
 */
router.get(
  '/templates/categories/list',
  asyncHandler(async (req: Request, res: Response) => {
    const categories = await templateService.getCategories();

    res.json({
      success: true,
      data: { categories }
    });
  })
);

/**
 * @route POST /assessments/templates/:type/validate
 * @desc Validate responses against a template
 * @access Internal
 */
router.post(
  '/templates/:type/validate',
  asyncHandler(async (req: Request, res: Response) => {
    const { type } = req.params;
    const { responses } = req.body;

    if (!Object.values(AssessmentType).includes(type as AssessmentType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid assessment type'
      });
    }

    if (!Array.isArray(responses)) {
      return res.status(400).json({
        success: false,
        error: 'Responses must be an array'
      });
    }

    const validation = await templateService.validateResponses(
      type as AssessmentType,
      responses
    );

    res.json({
      success: true,
      data: validation
    });
  })
);

/**
 * @route GET /assessments/health
 * @desc Health check endpoint
 * @access Public
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

export default router;
