/**
 * GENIE Meeting Service - Meeting Routes
 * Version: 1.0.0 | Date: June 13, 2026
 */

import { Router, Request, Response, NextFunction } from 'express';
import {
  CreateMeetingSchema,
  UpdateMeetingSchema,
  AddTranscriptSchema,
  ListMeetingsQuerySchema,
  UpdateActionItemSchema,
  ErrorResponse,
} from '../types.js';
import { tenantMiddleware } from '../middleware/tenant.js';
import * as meetingService from '../services/meetingService.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('meeting-routes');
const router = Router();

// ============================================================================
// Helper Functions
// ============================================================================

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function createResponse<T>(success: boolean, data?: T, error?: ErrorResponse['error'], meta?: Record<string, unknown>) {
  return {
    success,
    ...(data !== undefined && { data }),
    ...(error && { error }),
    meta: {
      timestamp: new Date().toISOString(),
      requestId: generateRequestId(),
      ...meta,
    },
  };
}

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// ============================================================================
// Middleware
// ============================================================================

router.use(tenantMiddleware());

// ============================================================================
// GET /api/meetings/stats - Get meeting statistics
// ============================================================================

router.get(
  '/stats',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;
    const tenantId = req.tenantContext!.tenant_id;

    logger.info('get_meeting_stats', { userId, tenantId });

    const stats = await meetingService.getMeetingStats(userId);

    res.json(createResponse(true, stats, undefined, { tenantId }));
  })
);

// ============================================================================
// GET /api/meetings/briefing - Get daily briefing meetings
// ============================================================================

router.get(
  '/briefing',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;
    const tenantId = req.tenantContext!.tenant_id;

    const date = req.query.date ? new Date(req.query.date as string) : new Date();

    logger.info('get_daily_briefing_meetings', { userId, tenantId, date });

    const meetings = await meetingService.getDailyBriefingMeetings(userId, date);

    res.json(createResponse(true, { meetings, date: date.toISOString() }, undefined, { tenantId }));
  })
);

// ============================================================================
// GET /api/meetings - List meetings
// ============================================================================

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;
    const tenantId = req.tenantContext!.tenant_id;

    const queryResult = ListMeetingsQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
      res.status(400).json(
        createResponse(false, undefined, {
          code: 'INVALID_QUERY',
          message: 'Invalid query parameters',
          details: queryResult.error.flatten(),
        })
      );
      return;
    }

    const query = queryResult.data;

    logger.info('list_meetings', { userId, tenantId, query });

    const result = await meetingService.listMeetings(userId, query);

    res.json({
      success: true,
      data: result.meetings,
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        hasMore: result.page * result.pageSize < result.total,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: generateRequestId(),
        tenantId,
      },
    });
  })
);

// ============================================================================
// POST /api/meetings - Create a new meeting
// ============================================================================

router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;
    const tenantId = req.tenantContext!.tenant_id;

    const parseResult = CreateMeetingSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json(
        createResponse(false, undefined, {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: parseResult.error.flatten(),
        })
      );
      return;
    }

    const input = parseResult.data;

    logger.info('create_meeting', { userId, tenantId, title: input.title });

    const meeting = await meetingService.createMeeting(userId, input);

    res.status(201).json(createResponse(true, meeting, undefined, { tenantId }));
  })
);

// ============================================================================
// GET /api/meetings/:id - Get a specific meeting
// ============================================================================

router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;
    const tenantId = req.tenantContext!.tenant_id;
    const meetingId = req.params.id;

    logger.info('get_meeting', { userId, tenantId, meetingId });

    const meeting = await meetingService.getMeetingById(meetingId, userId);

    if (!meeting) {
      res.status(404).json(
        createResponse(false, undefined, {
          code: 'MEETING_NOT_FOUND',
          message: 'Meeting not found',
        })
      );
      return;
    }

    res.json(createResponse(true, meeting, undefined, { tenantId }));
  })
);

// ============================================================================
// PATCH /api/meetings/:id - Update a meeting
// ============================================================================

router.patch(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;
    const tenantId = req.tenantContext!.tenant_id;
    const meetingId = req.params.id;

    const parseResult = UpdateMeetingSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json(
        createResponse(false, undefined, {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: parseResult.error.flatten(),
        })
      );
      return;
    }

    const input = parseResult.data;

    logger.info('update_meeting', { userId, tenantId, meetingId });

    const meeting = await meetingService.updateMeeting(meetingId, userId, input);

    if (!meeting) {
      res.status(404).json(
        createResponse(false, undefined, {
          code: 'MEETING_NOT_FOUND',
          message: 'Meeting not found',
        })
      );
      return;
    }

    res.json(createResponse(true, meeting, undefined, { tenantId }));
  })
);

// ============================================================================
// DELETE /api/meetings/:id - Delete a meeting
// ============================================================================

router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;
    const tenantId = req.tenantContext!.tenant_id;
    const meetingId = req.params.id;

    logger.info('delete_meeting', { userId, tenantId, meetingId });

    const deleted = await meetingService.deleteMeeting(meetingId, userId);

    if (!deleted) {
      res.status(404).json(
        createResponse(false, undefined, {
          code: 'MEETING_NOT_FOUND',
          message: 'Meeting not found',
        })
      );
      return;
    }

    res.json(
      createResponse(true, { deleted: true, id: meetingId }, undefined, { tenantId })
    );
  })
);

// ============================================================================
// POST /api/meetings/:id/transcript - Add transcript
// ============================================================================

router.post(
  '/:id/transcript',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;
    const tenantId = req.tenantContext!.tenant_id;
    const meetingId = req.params.id;

    const parseResult = AddTranscriptSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json(
        createResponse(false, undefined, {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: parseResult.error.flatten(),
        })
      );
      return;
    }

    const input = parseResult.data;

    logger.info('add_transcript', { userId, tenantId, meetingId });

    const meeting = await meetingService.addTranscript(meetingId, userId, input);

    if (!meeting) {
      res.status(404).json(
        createResponse(false, undefined, {
          code: 'MEETING_NOT_FOUND',
          message: 'Meeting not found',
        })
      );
      return;
    }

    res.json(createResponse(true, meeting, undefined, { tenantId }));
  })
);

// ============================================================================
// GET /api/meetings/:id/summary - Generate AI summary
// ============================================================================

router.get(
  '/:id/summary',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;
    const tenantId = req.tenantContext!.tenant_id;
    const meetingId = req.params.id;

    logger.info('generate_summary', { userId, tenantId, meetingId });

    const summary = await meetingService.generateSummary(meetingId, userId);

    if (!summary) {
      res.status(404).json(
        createResponse(false, undefined, {
          code: 'MEETING_NOT_FOUND',
          message: 'Meeting not found',
        })
      );
      return;
    }

    res.json(createResponse(true, summary, undefined, { tenantId }));
  })
);

// ============================================================================
// GET /api/meetings/:id/actions - Get action items
// ============================================================================

router.get(
  '/:id/actions',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;
    const tenantId = req.tenantContext!.tenant_id;
    const meetingId = req.params.id;

    logger.info('get_action_items', { userId, tenantId, meetingId });

    const actionItems = await meetingService.getActionItems(meetingId, userId);

    res.json(createResponse(true, { actionItems }, undefined, { tenantId }));
  })
);

// ============================================================================
// PATCH /api/meetings/:id/actions/:actionId - Update action item
// ============================================================================

router.patch(
  '/:id/actions/:actionId',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;
    const tenantId = req.tenantContext!.tenant_id;
    const meetingId = req.params.id;
    const actionItemId = req.params.actionId;

    const parseResult = UpdateActionItemSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json(
        createResponse(false, undefined, {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: parseResult.error.flatten(),
        })
      );
      return;
    }

    const updates = parseResult.data;

    logger.info('update_action_item', { userId, tenantId, meetingId, actionItemId });

    const meeting = await meetingService.updateActionItem(meetingId, userId, actionItemId, updates);

    if (!meeting) {
      res.status(404).json(
        createResponse(false, undefined, {
          code: 'MEETING_NOT_FOUND',
          message: 'Meeting or action item not found',
        })
      );
      return;
    }

    res.json(createResponse(true, meeting, undefined, { tenantId }));
  })
);

// ============================================================================
// GET /api/meetings/:id/decisions - Get decisions
// ============================================================================

router.get(
  '/:id/decisions',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;
    const tenantId = req.tenantContext!.tenant_id;
    const meetingId = req.params.id;

    logger.info('get_decisions', { userId, tenantId, meetingId });

    const meeting = await meetingService.getMeetingById(meetingId, userId);

    if (!meeting) {
      res.status(404).json(
        createResponse(false, undefined, {
          code: 'MEETING_NOT_FOUND',
          message: 'Meeting not found',
        })
      );
      return;
    }

    res.json(createResponse(true, { decisions: meeting.decisions }, undefined, { tenantId }));
  })
);

export default router;
