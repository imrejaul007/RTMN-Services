import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { questionGeneratorService } from '../services/questionGeneratorService';
import { preparationService } from '../services/preparationService';
import { symptomAnalyzerService } from '../services/symptomAnalyzerService';
import { historyService } from '../services/historyService';
import { vitalsService } from '../services/vitalsService';
import { visitSummaryService } from '../services/visitSummaryService';
import { validateRequest, validateParams, validateQuery } from '../middleware/validation';
import { logger } from '../utils/logger';
import {
  VisitType,
  QuestionCategory,
  QuestionPriority,
  TaskStatus,
  TaskCategory,
  SymptomSeverity,
  SymptomDuration,
  VitalType
} from '../models/preVisit';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createPreparationSchema = z.object({
  visitId: z.string().min(1),
  patientId: z.string().min(1),
  visitType: z.nativeEnum(VisitType),
  doctorId: z.string().optional(),
  specialty: z.string().optional(),
  chiefComplaint: z.string().optional(),
  scheduledDate: z.string().datetime().optional(),
  symptoms: z.array(z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    severity: z.number().min(0).max(4),
    duration: z.nativeEnum(SymptomDuration),
    durationValue: z.number().min(0),
    location: z.string().optional(),
    frequency: z.enum(['constant', 'intermittent', 'occasional']).optional(),
    impactOnDailyLife: z.number().min(1).max(10).optional(),
  })).optional(),
  conditions: z.array(z.string()).optional(),
  additionalNotes: z.string().optional(),
});

const logSymptomsSchema = z.object({
  symptoms: z.array(z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    severity: z.number().min(0).max(4),
    duration: z.nativeEnum(SymptomDuration),
    durationValue: z.number().min(0),
    location: z.string().optional(),
    triggers: z.array(z.string()).optional(),
    alleviatingFactors: z.array(z.string()).optional(),
    frequency: z.enum(['constant', 'intermittent', 'occasional']).optional(),
    associatedSymptoms: z.array(z.string()).optional(),
    impactOnDailyLife: z.number().min(1).max(10).optional(),
    notes: z.string().optional(),
  })),
  visitId: z.string().optional(),
  preOrPostVisit: z.enum(['pre', 'post']).optional(),
  notes: z.string().optional(),
  weatherFactors: z.object({
    temperature: z.number().optional(),
    humidity: z.number().optional(),
    pressure: z.number().optional(),
  }).optional(),
  activityFactors: z.object({
    exercise: z.boolean().optional(),
    stress: z.enum(['low', 'medium', 'high']).optional(),
    sleep: z.enum(['poor', 'adequate', 'good']).optional(),
    diet: z.enum(['poor', 'fair', 'good']).optional(),
  }).optional(),
});

const logVitalsSchema = z.object({
  vitals: z.array(z.object({
    type: z.nativeEnum(VitalType),
    value: z.union([z.string(), z.number()]),
    unit: z.string(),
    recordedAt: z.string().datetime(),
    source: z.enum(['home', 'clinic', 'hospital', 'wearable']).optional(),
    notes: z.string().optional(),
  })),
});

const generateSummarySchema = z.object({
  transcript: z.string().optional(),
  keyPoints: z.object({
    diagnosis: z.array(z.string()).optional(),
    treatments: z.array(z.string()).optional(),
    instructions: z.array(z.string()).optional(),
    warnings: z.array(z.string()).optional(),
  }).optional(),
  visitDate: z.string().datetime().optional(),
  doctorId: z.string().optional(),
});

const shareSchema = z.object({
  permissions: z.enum(['view', 'edit']).optional(),
});

// ============================================================================
// PREPARATION ROUTES
// ============================================================================

/**
 * POST /previsit/preparation
 * Create preparation for a doctor visit
 */
router.post(
  '/preparation',
  validateRequest(createPreparationSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        visitId,
        patientId,
        visitType,
        doctorId,
        specialty,
        chiefComplaint,
        scheduledDate,
        symptoms,
        conditions,
        additionalNotes
      } = req.body;

      logger.info('Creating visit preparation', { visitId, patientId, visitType });

      const preparation = await preparationService.createPreparation(visitId, patientId);

      res.status(201).json({
        success: true,
        data: preparation,
        message: 'Visit preparation created successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /previsit/preparation/:visitId
 * Get preparation for a specific visit
 */
router.get(
  '/preparation/:visitId',
  validateParams(z.object({ visitId: z.string().min(1) })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { visitId } = req.params;

      const preparation = await preparationService.getPreparation(visitId);

      if (!preparation) {
        return res.status(404).json({
          success: false,
          error: 'Preparation not found'
        });
      }

      res.json({
        success: true,
        data: preparation
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================================
// QUESTIONS ROUTES
// ============================================================================

/**
 * POST /previsit/questions/:visitId
 * Generate questions for a visit
 */
router.post(
  '/questions/:visitId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { visitId } = req.params;
      const {
        visitType = VisitType.OTHER,
        specialty,
        chiefComplaint,
        symptoms,
        conditions,
        additionalNotes
      } = req.body;

      logger.info('Generating questions for visit', { visitId, visitType });

      const visitContext = {
        patientId: req.body.patientId || '',
        visitType,
        specialty,
        chiefComplaint,
        symptoms,
        conditions,
        additionalNotes
      };

      const questions = await questionGeneratorService.generateQuestions(visitContext);

      // Save questions
      const savedQuestions = await questionGeneratorService.saveQuestions(
        visitId,
        visitContext.patientId,
        questions,
        visitType
      );

      res.status(201).json({
        success: true,
        data: {
          visitId,
          questions,
          questionCount: questions.length
        },
        message: 'Questions generated successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /previsit/questions/:visitId
 * Get questions for a visit
 */
router.get(
  '/questions/:visitId',
  validateParams(z.object({ visitId: z.string().min(1) })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { visitId } = req.params;

      const questions = await questionGeneratorService.getQuestionsForVisit(visitId);

      if (!questions) {
        return res.status(404).json({
          success: false,
          error: 'Questions not found'
        });
      }

      res.json({
        success: true,
        data: questions
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /previsit/questions/:visitId/personalize
 * Personalize questions for a patient
 */
router.post(
  '/questions/:visitId/personalize',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { visitId } = req.params;
      const { patientId, visitType } = req.body;

      if (!patientId || !visitType) {
        return res.status(400).json({
          success: false,
          error: 'patientId and visitType are required'
        });
      }

      logger.info('Personalizing questions', { visitId, patientId, visitType });

      const personalizedQuestions = await questionGeneratorService.personalizeQuestions(
        patientId,
        visitType as VisitType
      );

      res.json({
        success: true,
        data: {
          visitId,
          questions: personalizedQuestions,
          questionCount: personalizedQuestions.length
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /previsit/questions/:visitId/followup
 * Generate follow-up questions from previous visit
 */
router.post(
  '/questions/:visitId/followup',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { visitId } = req.params;
      const { previousVisitId } = req.body;

      if (!previousVisitId) {
        return res.status(400).json({
          success: false,
          error: 'previousVisitId is required'
        });
      }

      const followUpQuestions = await questionGeneratorService.getFollowUpQuestions(previousVisitId);

      res.json({
        success: true,
        data: {
          visitId,
          previousVisitId,
          questions: followUpQuestions,
          questionCount: followUpQuestions.length
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================================
// SYMPTOMS ROUTES
// ============================================================================

/**
 * POST /previsit/symptoms/:patientId
 * Log symptoms for a patient
 */
router.post(
  '/symptoms/:patientId',
  validateParams(z.object({ patientId: z.string().min(1) })),
  validateRequest(logSymptomsSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { patientId } = req.params;
      const { symptoms, visitId, preOrPostVisit, notes, weatherFactors, activityFactors } = req.body;

      logger.info('Logging symptoms', { patientId, symptomCount: symptoms.length });

      const symptomLog = await symptomAnalyzerService.logSymptoms(
        patientId,
        symptoms,
        { visitId, preOrPostVisit, notes, weatherFactors, activityFactors }
      );

      res.status(201).json({
        success: true,
        data: symptomLog,
        message: 'Symptoms logged successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /previsit/symptoms/:patientId
 * Get symptom history for a patient
 */
router.get(
  '/symptoms/:patientId',
  validateParams(z.object({ patientId: z.string().min(1) })),
  validateQuery(z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    limit: z.coerce.number().positive().optional(),
    symptomName: z.string().optional(),
  })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { patientId } = req.params;
      const { startDate, endDate, limit, symptomName } = req.query;

      const history = await symptomAnalyzerService.getSymptomHistory(patientId, {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        symptomName: symptomName as string,
      });

      res.json({
        success: true,
        data: history,
        count: history.length
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /previsit/symptoms/:patientId/patterns
 * Get symptom patterns analysis
 */
router.get(
  '/symptoms/:patientId/patterns',
  validateParams(z.object({ patientId: z.string().min(1) })),
  validateQuery(z.object({
    days: z.coerce.number().positive().optional(),
  })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { patientId } = req.params;
      const days = req.query.days ? parseInt(req.query.days as string) : 30;

      const patterns = await symptomAnalyzerService.analyzeSymptomPatterns(patientId, days);

      res.json({
        success: true,
        data: patterns
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /previsit/symptoms/:patientId/severity
 * Calculate symptom severity
 */
router.get(
  '/symptoms/:patientId/severity',
  validateParams(z.object({ patientId: z.string().min(1) })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { patientId } = req.params;

      const currentSymptoms = await symptomAnalyzerService.getCurrentSymptoms(patientId);
      const severity = symptomAnalyzerService.calculateSymptomSeverity(currentSymptoms);

      res.json({
        success: true,
        data: {
          currentSymptoms,
          severity
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /previsit/symptoms/:patientId/summary
 * Get symptom summary for doctor
 */
router.get(
  '/symptoms/:patientId/summary',
  validateParams(z.object({ patientId: z.string().min(1) })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { patientId } = req.params;

      const summary = await symptomAnalyzerService.prepareSymptomSummary(patientId);

      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /previsit/symptoms/:patientId/worsening
 * Detect worsening symptoms
 */
router.get(
  '/symptoms/:patientId/worsening',
  validateParams(z.object({ patientId: z.string().min(1) })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { patientId } = req.params;

      const detection = await symptomAnalyzerService.detectWorseningSymptoms(patientId);

      res.json({
        success: true,
        data: detection
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /previsit/symptoms/:patientId/statistics
 * Get symptom statistics
 */
router.get(
  '/symptoms/:patientId/statistics',
  validateParams(z.object({ patientId: z.string().min(1) })),
  validateQuery(z.object({
    days: z.coerce.number().positive().optional(),
  })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { patientId } = req.params;
      const days = req.query.days ? parseInt(req.query.days as string) : 30;

      const statistics = await symptomAnalyzerService.getSymptomStatistics(patientId, days);

      res.json({
        success: true,
        data: statistics
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================================
// VITALS ROUTES
// ============================================================================

/**
 * POST /previsit/vitals/:patientId
 * Log vitals for a patient
 */
router.post(
  '/vitals/:patientId',
  validateParams(z.object({ patientId: z.string().min(1) })),
  validateRequest(logVitalsSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { patientId } = req.params;
      const { vitals } = req.body;

      logger.info('Logging vitals', { patientId, vitalCount: vitals.length });

      const vitalRecord = await vitalsService.logVitals(patientId, vitals);

      res.status(201).json({
        success: true,
        data: vitalRecord,
        message: 'Vitals logged successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /previsit/vitals/:patientId
 * Get recent vitals for a patient
 */
router.get(
  '/vitals/:patientId',
  validateParams(z.object({ patientId: z.string().min(1) })),
  validateQuery(z.object({
    days: z.coerce.number().positive().optional(),
    types: z.string().optional(),
  })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { patientId } = req.params;
      const { days, types } = req.query;

      const vitalTypes = types
        ? (types as string).split(',').map(t => t.trim() as VitalType)
        : undefined;

      const vitals = await vitalsService.getRecentVitals(
        patientId,
        days ? parseInt(days as string) : 30,
        vitalTypes
      );

      res.json({
        success: true,
        data: vitals
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /previsit/vitals/:patientId/compare
 * Compare vitals to baseline
 */
router.get(
  '/vitals/:patientId/compare',
  validateParams(z.object({ patientId: z.string().min(1) })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { patientId } = req.params;

      const comparison = await vitalsService.compareToBaseline(patientId);

      res.json({
        success: true,
        data: comparison
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /previsit/vitals/:patientId/summary
 * Get vitals summary for doctor
 */
router.get(
  '/vitals/:patientId/summary',
  validateParams(z.object({ patientId: z.string().min(1) })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { patientId } = req.params;

      const summary = await vitalsService.prepareVitalsSummary(patientId);

      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /previsit/vitals/:patientId/concerns
 * Detect vitals concerns
 */
router.get(
  '/vitals/:patientId/concerns',
  validateParams(z.object({ patientId: z.string().min(1) })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { patientId } = req.params;

      const concerns = await vitalsService.detectVitalsConcerns(patientId);

      res.json({
        success: true,
        data: concerns
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /previsit/vitals/:patientId/trends/:type
 * Get vital trends
 */
router.get(
  '/vitals/:patientId/trends/:type',
  validateParams(z.object({
    patientId: z.string().min(1),
    type: z.nativeEnum(VitalType)
  })),
  validateQuery(z.object({
    days: z.coerce.number().positive().optional(),
  })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { patientId, type } = req.params;
      const days = req.query.days ? parseInt(req.query.days as string) : 90;

      const trends = await vitalsService.getVitalsTrends(patientId, type, days);

      res.json({
        success: true,
        data: trends
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /previsit/vitals/:patientId/concerns/:type/acknowledge
 * Acknowledge a vitals concern
 */
router.put(
  '/vitals/:patientId/concerns/:type/acknowledge',
  validateParams(z.object({
    patientId: z.string().min(1),
    type: z.nativeEnum(VitalType)
  })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { patientId, type } = req.params;

      await vitalsService.acknowledgeConcern(patientId, type);

      res.json({
        success: true,
        message: 'Concern acknowledged'
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================================
// HISTORY ROUTES
// ============================================================================

/**
 * GET /previsit/history/:patientId
 * Get relevant history for a visit
 */
router.get(
  '/history/:patientId',
  validateParams(z.object({ patientId: z.string().min(1) })),
  validateQuery(z.object({
    visitType: z.nativeEnum(VisitType).optional(),
    specialty: z.string().optional(),
  })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { patientId } = req.params;
      const { visitType, specialty } = req.query;

      const history = await historyService.prepareHistoryForDoctor(
        patientId,
        (visitType as VisitType) || VisitType.GENERAL_CHECKUP,
        specialty as string
      );

      res.json({
        success: true,
        data: history
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /previsit/history/:patientId/full
 * Get full patient history
 */
router.get(
  '/history/:patientId/full',
  validateParams(z.object({ patientId: z.string().min(1) })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { patientId } = req.params;

      const history = await historyService.getFullHistory(patientId);

      res.json({
        success: true,
        data: history
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /previsit/history/:patientId/medications
 * Get medication changes
 */
router.get(
  '/history/:patientId/medications',
  validateParams(z.object({ patientId: z.string().min(1) })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { patientId } = req.params;

      const medications = await historyService.getMedicationChanges(patientId);

      res.json({
        success: true,
        data: medications
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /previsit/history/:patientId/tests
 * Get test results
 */
router.get(
  '/history/:patientId/tests',
  validateParams(z.object({ patientId: z.string().min(1) })),
  validateQuery(z.object({
    since: z.string().datetime().optional(),
  })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { patientId } = req.params;
      const { since } = req.query;

      const tests = await historyService.getTestResults(
        patientId,
        since ? new Date(since as string) : undefined
      );

      res.json({
        success: true,
        data: tests
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /previsit/history/:patientId/past-visits
 * Get past visit summaries
 */
router.get(
  '/history/:patientId/past-visits',
  validateParams(z.object({ patientId: z.string().min(1) })),
  validateQuery(z.object({
    limit: z.coerce.number().positive().optional(),
  })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { patientId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;

      const pastVisits = await historyService.summarizePastVisits(patientId, limit);

      res.json({
        success: true,
        data: pastVisits
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================================
// CHECKLIST ROUTES
// ============================================================================

/**
 * POST /previsit/checklist/:visitId
 * Generate checklist for a visit
 */
router.post(
  '/checklist/:visitId',
  validateParams(z.object({ visitId: z.string().min(1) })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { visitId } = req.params;

      logger.info('Generating checklist', { visitId });

      const checklist = await preparationService.generateChecklist(visitId);

      res.status(201).json({
        success: true,
        data: {
          visitId,
          checklist,
          taskCount: checklist.length
        },
        message: 'Checklist generated successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /previsit/checklist/:prepId
 * Get checklist for a preparation
 */
router.get(
  '/checklist/:prepId',
  validateParams(z.object({ prepId: z.string().min(1) })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { prepId } = req.params;

      const checklist = await preparationService.getChecklist(prepId);

      res.json({
        success: true,
        data: checklist
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /previsit/checklist/:taskId/complete
 * Mark task as complete
 */
router.put(
  '/checklist/:taskId/complete',
  validateParams(z.object({ taskId: z.string().min(1) })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { taskId } = req.params;

      const task = await preparationService.markTaskComplete(taskId);

      res.json({
        success: true,
        data: task,
        message: 'Task marked as complete'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /previsit/checklist/:taskId/status
 * Update task status
 */
router.put(
  '/checklist/:taskId/status',
  validateParams(z.object({ taskId: z.string().min(1) })),
  validateRequest(z.object({
    status: z.nativeEnum(TaskStatus)
  })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { taskId } = req.params;
      const { status } = req.body;

      const task = await preparationService.updateTaskStatus(taskId, status);

      res.json({
        success: true,
        data: task,
        message: 'Task status updated'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /previsit/checklist/:prepId/progress
 * Get preparation progress
 */
router.get(
  '/checklist/:prepId/progress',
  validateParams(z.object({ prepId: z.string().min(1) })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { prepId } = req.params;

      const progress = await preparationService.trackPreparationProgress(prepId);

      res.json({
        success: true,
        data: progress
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================================
// SUMMARY ROUTES
// ============================================================================

/**
 * POST /previsit/summary/:visitId
 * Generate visit summary
 */
router.post(
  '/summary/:visitId',
  validateParams(z.object({ visitId: z.string().min(1) })),
  validateRequest(generateSummarySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { visitId } = req.params;
      const {
        transcript,
        keyPoints,
        visitDate,
        doctorId,
        patientId,
        visitType
      } = req.body;

      logger.info('Generating visit summary', { visitId });

      const summary = await visitSummaryService.generateVisitSummary(visitId, transcript, {
        keyPoints: keyPoints?.diagnosis,
        diagnosis: keyPoints?.diagnosis,
        treatments: keyPoints?.treatments,
        instructions: keyPoints?.instructions,
        warnings: keyPoints?.warnings,
        visitDate: visitDate ? new Date(visitDate) : undefined,
        doctorId,
        patientId,
        visitType: visitType as VisitType
      });

      res.status(201).json({
        success: true,
        data: summary,
        message: 'Visit summary generated successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /previsit/summary/:visitId
 * Get visit summary
 */
router.get(
  '/summary/:visitId',
  validateParams(z.object({ visitId: z.string().min(1) })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { visitId } = req.params;

      const summary = await visitSummaryService.getVisitSummary(visitId);

      if (!summary) {
        return res.status(404).json({
          success: false,
          error: 'Summary not found'
        });
      }

      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /previsit/summary/:visitId/report
 * Get formatted visit report
 */
router.get(
  '/summary/:visitId/report',
  validateParams(z.object({ visitId: z.string().min(1) })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { visitId } = req.params;

      const report = await visitSummaryService.createVisitReport(visitId);

      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /previsit/summary/:visitId/action/:actionId/status
 * Update action item status
 */
router.post(
  '/summary/:visitId/action/:actionId/status',
  validateParams(z.object({
    visitId: z.string().min(1),
    actionId: z.string().min(1)
  })),
  validateRequest(z.object({
    status: z.nativeEnum(TaskStatus)
  })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { visitId, actionId } = req.params;
      const { status } = req.body;

      const summary = await visitSummaryService.updateActionItemStatus(
        visitId,
        actionId,
        status
      );

      res.json({
        success: true,
        data: summary,
        message: 'Action item status updated'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /previsit/summary/patient/:patientId
 * Get summaries for a patient
 */
router.get(
  '/summary/patient/:patientId',
  validateParams(z.object({ patientId: z.string().min(1) })),
  validateQuery(z.object({
    limit: z.coerce.number().positive().optional(),
    visitType: z.nativeEnum(VisitType).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { patientId } = req.params;
      const { limit, visitType, startDate, endDate } = req.query;

      const summaries = await visitSummaryService.getPatientSummaries(patientId, {
        limit: limit ? parseInt(limit as string) : undefined,
        visitType: visitType as VisitType,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      });

      res.json({
        success: true,
        data: summaries,
        count: summaries.length
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /previsit/summary/patient/:patientId/statistics
 * Get visit statistics for a patient
 */
router.get(
  '/summary/patient/:patientId/statistics',
  validateParams(z.object({ patientId: z.string().min(1) })),
  validateQuery(z.object({
    days: z.coerce.number().positive().optional(),
  })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { patientId } = req.params;
      const days = req.query.days ? parseInt(req.query.days as string) : 365;

      const statistics = await visitSummaryService.getVisitStatistics(patientId, days);

      res.json({
        success: true,
        data: statistics
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================================
// SHARE ROUTES
// ============================================================================

/**
 * POST /previsit/share/:visitId/:circleId
 * Share visit summary with care circle
 */
router.post(
  '/share/:visitId/:circleId',
  validateParams(z.object({
    visitId: z.string().min(1),
    circleId: z.string().min(1)
  })),
  validateRequest(shareSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { visitId, circleId } = req.params;
      const { permissions = 'view' } = req.body;

      logger.info('Sharing visit summary with care circle', { visitId, circleId });

      const summary = await visitSummaryService.shareWithCareCircle(
        visitId,
        circleId,
        permissions
      );

      res.json({
        success: true,
        data: summary,
        message: 'Visit summary shared successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================================
// REMINDERS ROUTES
// ============================================================================

/**
 * GET /previsit/reminders/:patientId
 * Get reminders for a patient
 */
router.get(
  '/reminders/:patientId',
  validateParams(z.object({ patientId: z.string().min(1) })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { patientId } = req.params;

      const reminders = await preparationService.getReminders(patientId);

      res.json({
        success: true,
        data: reminders,
        count: reminders.length
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /previsit/reminders/:patientId/unfinished
 * Get unfinished tasks
 */
router.get(
  '/reminders/:patientId/unfinished',
  validateParams(z.object({ patientId: z.string().min(1) })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { patientId } = req.params;

      const unfinishedTasks = await preparationService.remindUnfinishedTasks(patientId);

      res.json({
        success: true,
        data: unfinishedTasks
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================================
// EXPORT
// ============================================================================

export default router;
