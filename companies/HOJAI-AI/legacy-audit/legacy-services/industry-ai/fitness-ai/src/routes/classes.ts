/**
 * Fitness AI - Class Routes
 *
 * REST API endpoints for fitness class management
 */

import { Router, Request, Response, NextFunction } from 'express';
import { classService } from '../services/class.service';
import { ClassType, ClassStatus, WorkoutDifficulty } from '../models';

const router = Router();

/**
 * GET /api/classes
 * List all classes with filters
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      page,
      limit,
      type,
      status,
      instructorId,
      startDate,
      endDate,
      difficulty,
      availableOnly,
    } = req.query;

    const result = await classService.getClasses({
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      type: type as ClassType,
      status: status as ClassStatus,
      instructorId: instructorId as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      difficulty: difficulty as WorkoutDifficulty,
      availableOnly: availableOnly === 'true',
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/classes/:classId
 * Get class by ID
 */
router.get('/:classId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const fitnessClass = await classService.getClassById(req.params.classId);

    if (!fitnessClass) {
      res.status(404).json({ error: 'Class not found' });
      return;
    }

    res.json(fitnessClass);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/classes/date/:date
 * Get classes for a specific date
 */
router.get('/date/:date', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const date = new Date(req.params.date);
    const classes = await classService.getClassesByDate(date);
    res.json({ date, classes, count: classes.length });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/classes/type/:type
 * Get classes by type
 */
router.get('/type/:type', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit } = req.query;
    const classes = await classService.getClassesByType(
      req.params.type as ClassType,
      limit ? parseInt(limit as string) : 10
    );
    res.json({ type: req.params.type, classes, count: classes.length });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/classes
 * Create a new class
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const fitnessClass = await classService.createClass(req.body);
    res.status(201).json(fitnessClass);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/classes/:classId
 * Update class
 */
router.patch('/:classId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const fitnessClass = await classService.updateClass(req.params.classId, req.body);

    if (!fitnessClass) {
      res.status(404).json({ error: 'Class not found' });
      return;
    }

    res.json(fitnessClass);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/classes/:classId/cancel
 * Cancel class
 */
router.post('/:classId/cancel', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reason } = req.body;
    const fitnessClass = await classService.cancelClass(req.params.classId, reason || 'No reason provided');

    if (!fitnessClass) {
      res.status(404).json({ error: 'Class not found or already cancelled' });
      return;
    }

    res.json(fitnessClass);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/classes/:classId/enroll
 * Enroll member in class
 */
router.post('/:classId/enroll', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { memberId } = req.body;
    const enrollment = await classService.enrollMember(req.params.classId, memberId);
    res.status(201).json(enrollment);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/classes/:classId/cancel-enrollment
 * Cancel enrollment
 */
router.post('/:classId/cancel-enrollment', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { memberId } = req.body;
    await classService.cancelEnrollment(req.params.classId, memberId);
    res.json({ success: true, message: 'Enrollment cancelled' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/classes/:classId/check-in
 * Check in member
 */
router.post('/:classId/check-in', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { memberId } = req.body;
    const enrollment = await classService.checkInMember(req.params.classId, memberId);

    if (!enrollment) {
      res.status(404).json({ error: 'Enrollment not found' });
      return;
    }

    res.json(enrollment);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/classes/:classId/check-out
 * Check out member
 */
router.post('/:classId/check-out', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { memberId } = req.body;
    const enrollment = await classService.checkOutMember(req.params.classId, memberId);

    if (!enrollment) {
      res.status(404).json({ error: 'Enrollment not found' });
      return;
    }

    res.json(enrollment);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/classes/:classId/enrollments
 * Get class enrollments
 */
router.get('/:classId/enrollments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const enrollments = await classService.getClassEnrollments(req.params.classId);
    res.json({ classId: req.params.classId, enrollments, count: enrollments.length });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/classes/stats
 * Get class statistics
 */
router.get('/stats/overview', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query;
    const stats = await classService.getStatistics({
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
    });
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/classes/:classId
 * Delete class
 */
router.delete('/:classId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deleted = await classService.deleteClass(req.params.classId);

    if (!deleted) {
      res.status(404).json({ error: 'Class not found' });
      return;
    }

    res.json({ success: true, message: 'Class deleted' });
  } catch (error) {
    next(error);
  }
});

export default router;
