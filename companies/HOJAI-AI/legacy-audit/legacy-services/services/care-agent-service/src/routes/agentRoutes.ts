import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { careAgentService } from '../services/careAgentService';
import { logger } from '../utils/logger';

// ============================================================================
// Validation Schemas
// ============================================================================

const ChatRequestSchema = z.object({
  message: z.string().min(1, 'Message is required').max(5000, 'Message too long'),
  sessionId: z.string().optional(),
  profileId: z.string().optional(),
  context: z.record(z.unknown()).optional(),
});

const ExplainReportRequestSchema = z.object({
  profileId: z.string().min(1, 'Profile ID is required'),
  reportId: z.string().min(1, 'Report ID is required'),
});

const AssessSymptomsRequestSchema = z.object({
  profileId: z.string().min(1, 'Profile ID is required'),
  symptoms: z.array(z.string()).min(1, 'At least one symptom is required'),
  duration: z.string().optional(),
  severity: z.enum(['mild', 'moderate', 'severe']).optional(),
  additionalContext: z.string().optional(),
  age: z.number().min(0).max(150).optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
});

const RecallHistoryRequestSchema = z.object({
  topic: z.string().min(1, 'Topic is required').max(500, 'Topic too long'),
});

const GenerateCarePlanRequestSchema = z.object({
  profileId: z.string().min(1, 'Profile ID is required'),
});

// ============================================================================
// Types
// ============================================================================

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    tenantId?: string;
  };
}

// ============================================================================
// Router Setup
// ============================================================================

const router = Router();

// ============================================================================
// Middleware
// ============================================================================

/**
 * Request logging middleware
 */
const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  const requestId = uuidv4();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info('Request completed', {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
    });
  });

  next();
};

/**
 * Async handler wrapper to catch errors
 */
const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// ============================================================================
// Routes
// ============================================================================

/**
 * POST /agent/chat
 * Chat with the care agent
 */
router.post(
  '/chat',
  requestLogger,
  asyncHandler(async (req: Request, res: Response) => {
    // Validate request body
    const validationResult = ChatRequestSchema.safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationResult.error.issues,
      });
      return;
    }

    const { message, sessionId: providedSessionId, profileId, context } = validationResult.data;

    // Use provided session ID or generate new one
    const sessionId = providedSessionId || uuidv4();

    logger.info('Chat request received', { sessionId, profileId });

    // Call the care agent service
    const response = await careAgentService.chat(sessionId, message, {
      profileId,
      preferences: context,
    });

    res.status(200).json({
      success: true,
      data: response,
    });
  })
);

/**
 * POST /agent/explain
 * Explain a health report
 */
router.post(
  '/explain',
  requestLogger,
  asyncHandler(async (req: Request, res: Response) => {
    // Validate request body
    const validationResult = ExplainReportRequestSchema.safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationResult.error.issues,
      });
      return;
    }

    const { profileId, reportId } = validationResult.data;

    logger.info('Explain report request received', { profileId, reportId });

    // Call the care agent service
    const explanation = await careAgentService.explainReport(profileId, reportId);

    res.status(200).json({
      success: true,
      data: explanation,
    });
  })
);

/**
 * POST /agent/symptoms
 * Assess symptoms
 */
router.post(
  '/symptoms',
  requestLogger,
  asyncHandler(async (req: Request, res: Response) => {
    // Validate request body
    const validationResult = AssessSymptomsRequestSchema.safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationResult.error.issues,
      });
      return;
    }

    const { profileId, symptoms, duration, severity, additionalContext, age, gender } =
      validationResult.data;

    logger.info('Assess symptoms request received', {
      profileId,
      symptomCount: symptoms.length,
      severity,
    });

    // Call the care agent service
    const result = await careAgentService.assessSymptoms(profileId, symptoms);

    res.status(200).json({
      success: true,
      data: {
        profileId,
        symptoms,
        assessment: result.assessment,
        followUp: result.followUp,
      },
    });
  })
);

/**
 * GET /agent/prepare/:appointmentId
 * Prepare for an appointment
 */
router.get(
  '/prepare/:appointmentId',
  requestLogger,
  asyncHandler(async (req: Request, res: Response) => {
    const { appointmentId } = req.params;

    // Validate appointment ID
    if (!appointmentId || appointmentId.trim() === '') {
      res.status(400).json({
        success: false,
        error: 'Appointment ID is required',
      });
      return;
    }

    // Optional profile ID from query
    const profileId = req.query.profileId as string | undefined;

    logger.info('Appointment preparation request received', {
      appointmentId,
      profileId,
    });

    // Call the care agent service
    const preparation = await careAgentService.prepareAppointment(
      profileId || 'default',
      appointmentId
    );

    res.status(200).json({
      success: true,
      data: preparation,
    });
  })
);

/**
 * GET /agent/recall/:profileId
 * Recall care history
 */
router.get(
  '/recall/:profileId',
  requestLogger,
  asyncHandler(async (req: Request, res: Response) => {
    const { profileId } = req.params;

    // Validate profile ID
    if (!profileId || profileId.trim() === '') {
      res.status(400).json({
        success: false,
        error: 'Profile ID is required',
      });
      return;
    }

    // Get topic from query
    const topic = req.query.topic as string | undefined;

    if (!topic) {
      res.status(400).json({
        success: false,
        error: 'Topic query parameter is required',
      });
      return;
    }

    logger.info('Care history recall request received', { profileId, topic });

    // Call the care agent service
    const historyRecall = await careAgentService.recallHistory(profileId, topic);

    res.status(200).json({
      success: true,
      data: historyRecall,
    });
  })
);

/**
 * POST /agent/care-plan
 * Generate a care plan
 */
router.post(
  '/care-plan',
  requestLogger,
  asyncHandler(async (req: Request, res: Response) => {
    // Validate request body
    const validationResult = GenerateCarePlanRequestSchema.safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationResult.error.issues,
      });
      return;
    }

    const { profileId } = validationResult.data;

    logger.info('Generate care plan request received', { profileId });

    // Call the care agent service
    const carePlan = await careAgentService.generateCarePlan(profileId);

    res.status(200).json({
      success: true,
      data: carePlan,
    });
  })
);

/**
 * GET /agent/sessions/:sessionId/history
 * Get chat history for a session
 */
router.get(
  '/sessions/:sessionId/history',
  requestLogger,
  asyncHandler(async (req: Request, res: Response) => {
    const { sessionId } = req.params;

    if (!sessionId || sessionId.trim() === '') {
      res.status(400).json({
        success: false,
        error: 'Session ID is required',
      });
      return;
    }

    logger.info('Get session history request received', { sessionId });

    // Get chat history from the service
    const { careAgentService } = await import('../services/careAgentService');
    const chatHistory = await careAgentService.chat(
      sessionId,
      '', // Empty message to just get history
      {}
    );

    res.status(200).json({
      success: true,
      data: {
        sessionId,
        messages: chatHistory.context?.previousMessages || [],
      },
    });
  })
);

// ============================================================================
// Error Handler
// ============================================================================

/**
 * Global error handler
 */
router.use((err: Error, req: Request, res: Response, next: NextFunction): void => {
  logger.error('Unhandled error in agent routes', err, {
    path: req.path,
    method: req.method,
  });

  // Check if headers have already been sent
  if (res.headersSent) {
    return next(err);
  }

  // Handle specific error types
  if (err instanceof z.ZodError) {
    res.status(400).json({
      success: false,
      error: 'Validation error',
      details: err.issues,
    });
    return;
  }

  // Default error response
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred',
  });
});

export default router;
