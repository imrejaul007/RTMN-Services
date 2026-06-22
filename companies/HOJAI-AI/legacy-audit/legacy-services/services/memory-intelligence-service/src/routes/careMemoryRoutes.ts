// Care Memory Routes - Healthcare longitudinal memory

import { Router, Request, Response, NextFunction } from 'express';
import { careMemoryService } from '../services/careMemoryService.js';
import { logger } from '../utils/logger.js';

export const careMemoryRoutes = Router();

/**
 * POST /api/care/visit - Add care visit
 */
careMemoryRoutes.post('/visit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const visitData = req.body;

    if (!visitData.profileId || !visitData.date || !visitData.type) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'profileId, date, and type are required' },
      });
      return;
    }

    const visit = await careMemoryService.addCareVisit({
      ...visitData,
      date: new Date(visitData.date),
      provider: visitData.provider || { id: '', name: 'Unknown' },
      keyPoints: visitData.keyPoints || [],
      diagnoses: visitData.diagnoses || [],
      medications: visitData.medications || [],
      instructions: visitData.instructions || [],
      followUps: visitData.followUps || [],
      questionsForNextVisit: visitData.questionsForNextVisit || [],
      redFlags: visitData.redFlags || [],
      sentiment: visitData.sentiment || 0,
      source: visitData.source || 'manual_entry',
    });

    res.status(201).json({
      success: true,
      data: visit,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/care/timeline/:profileId - Get care timeline
 */
careMemoryRoutes.get('/timeline/:profileId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { profileId } = req.params;
    const { startDate, endDate, types, limit } = req.query;

    const timeline = await careMemoryService.getCareTimeline(profileId, {
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      types: types ? (types as string).split(',') : undefined,
      limit: limit ? Number(limit) : undefined,
    });

    res.json({
      success: true,
      data: timeline,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/care/visits/:profileId - Get visit history
 */
careMemoryRoutes.get('/visits/:profileId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { profileId } = req.params;
    const { type, limit } = req.query;

    const visits = await careMemoryService.getVisitHistory(profileId, {
      type: type as string,
      limit: limit ? Number(limit) : undefined,
    });

    res.json({
      success: true,
      data: {
        visits,
        count: visits.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/care/diagnoses/:profileId - Get active diagnoses
 */
careMemoryRoutes.get('/diagnoses/:profileId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { profileId } = req.params;

    const diagnoses = await careMemoryService.getActiveDiagnoses(profileId);

    res.json({
      success: true,
      data: {
        diagnoses,
        count: diagnoses.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/care/medications/:profileId - Get active medications
 */
careMemoryRoutes.get('/medications/:profileId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { profileId } = req.params;

    const medications = await careMemoryService.getActiveMedications(profileId);

    res.json({
      success: true,
      data: {
        medications,
        count: medications.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/care/followups/:profileId - Get upcoming follow-ups
 */
careMemoryRoutes.get('/followups/:profileId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { profileId } = req.params;

    const followUps = await careMemoryService.getUpcomingFollowUps(profileId);

    res.json({
      success: true,
      data: {
        followUps,
        count: followUps.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/care/actions/:profileId - Get pending action items
 */
careMemoryRoutes.get('/actions/:profileId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { profileId } = req.params;

    const actions = await careMemoryService.getPendingActionItems(profileId);

    res.json({
      success: true,
      data: {
        actions,
        count: actions.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/care/actions - Create action item
 */
careMemoryRoutes.post('/actions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { profileId, type, title, description, dueDate, priority, visitId } = req.body;

    if (!profileId || !type || !title) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'profileId, type, and title are required' },
      });
      return;
    }

    const action = await careMemoryService.createActionItem({
      id: `action_${Date.now()}`,
      profileId,
      visitId,
      type,
      title,
      description,
      status: 'pending',
      dueDate: dueDate ? new Date(dueDate) : undefined,
      priority: priority || 'medium',
      reminders: [],
    });

    res.status(201).json({
      success: true,
      data: action,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/care/actions/:id/complete - Complete action item
 */
careMemoryRoutes.post('/actions/:id/complete', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const action = await careMemoryService.completeActionItem(id);

    if (!action) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Action item not found' },
      });
      return;
    }

    res.json({
      success: true,
      data: action,
    });
  } catch (error) {
    next(error);
  }
});
