import { Router, Response } from 'express';
import { aiReceptionistService, voiceService } from '../services';
import { authenticate, asyncHandler } from '../middleware';

const router = Router();

/**
 * POST /api/v1/ai/receptionist
 * Handle receptionist query
 */
router.post(
  '/receptionist',
  asyncHandler(async (req, res: Response) => {
    const { message, sessionId, patientContext } = req.body;

    if (!message) {
      res.status(400).json({ success: false, error: 'Message is required' });
      return;
    }

    const result = await aiReceptionistService.handleQuery(
      req.clinicId!,
      message,
      sessionId,
      patientContext
    );

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * GET /api/v1/ai/receptionist/conversation/:sessionId
 * Get conversation history
 */
router.get(
  '/receptionist/conversation/:sessionId',
  asyncHandler(async (req, res: Response) => {
    const result = await aiReceptionistService.getConversationHistory(
      req.clinicId!,
      req.params.sessionId
    );

    res.json(result);
  })
);

/**
 * POST /api/v1/ai/voice/call
 * Initiate a voice call
 */
router.post(
  '/voice/call',
  authenticate,
  asyncHandler(async (req, res: Response) => {
    const { to, patientId, appointmentId, agent = 'receptionist' } = req.body;

    if (!to) {
      res.status(400).json({ success: false, error: 'Phone number (to) is required' });
      return;
    }

    const result = await voiceService.initiateCall(
      req.clinicId!,
      to,
      patientId,
      appointmentId,
      agent
    );

    res.json(result);
  })
);

/**
 * POST /api/v1/ai/voice/call/:callId/analyze
 * Analyze a completed call
 */
router.post(
  '/voice/call/:callId/analyze',
  authenticate,
  asyncHandler(async (req, res: Response) => {
    const { transcript, duration } = req.body;

    if (!transcript) {
      res.status(400).json({ success: false, error: 'Transcript is required' });
      return;
    }

    const result = await aiReceptionistService.processCallTranscript(
      req.clinicId!,
      transcript,
      duration || 0
    );

    res.json({ success: true, data: result });
  })
);

/**
 * GET /api/v1/ai/voice/calls
 * Get voice call history
 */
router.get(
  '/voice/calls',
  authenticate,
  asyncHandler(async (req, res: Response) => {
    const options = {
      patientId: req.query.patientId as string,
      status: req.query.status as string,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
    };

    const result = await voiceService.getCallHistory(req.clinicId!, options);

    res.json(result);
  })
);

/**
 * GET /api/v1/ai/voice/calls/stats
 * Get voice call statistics
 */
router.get(
  '/voice/calls/stats',
  authenticate,
  asyncHandler(async (req, res: Response) => {
    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : new Date(new Date().setDate(new Date().getDate() - 30));
    const endDate = req.query.endDate
      ? new Date(req.query.endDate as string)
      : new Date();

    const stats = await voiceService.getCallStats(req.clinicId!, startDate, endDate);

    res.json({ success: true, data: stats });
  })
);

export default router;
