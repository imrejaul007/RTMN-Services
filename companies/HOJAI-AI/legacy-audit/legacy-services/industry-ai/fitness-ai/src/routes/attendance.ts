/**
 * Fitness AI - Attendance Routes
 *
 * REST API endpoints for attendance tracking
 */

import { Router, Request, Response, NextFunction } from 'express';
import { attendanceService } from '../services/attendance.service';

const router = Router();

/**
 * POST /api/attendance/check-in
 * Check in member
 */
router.post('/check-in', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { memberId, source } = req.body;
    const attendance = await attendanceService.checkIn({ memberId, source });
    res.status(201).json(attendance);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/attendance/check-out
 * Check out member
 */
router.post('/check-out', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { memberId } = req.body;
    const attendance = await attendanceService.checkOut(memberId);
    if (!attendance) {
      res.status(404).json({ error: 'No active check-in found' });
      return;
    }
    res.json(attendance);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/attendance
 * Get member's attendance records
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { memberId, startDate, endDate, limit } = req.query;
    const records = await attendanceService.getMemberAttendance(memberId as string, {
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    res.json({ records, count: records.length });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/attendance/today
 * Get today's attendance
 */
router.get('/today', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const records = await attendanceService.getTodayAttendance();
    res.json({ records, count: records.length });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/attendance/stats
 * Get attendance statistics
 */
router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { memberId, startDate, endDate } = req.query;
    const stats = await attendanceService.getStatistics({
      memberId: memberId as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
    });
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/attendance/weekly
 * Get weekly attendance summary
 */
router.get('/weekly', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { memberId } = req.query;
    if (!memberId) {
      res.status(400).json({ error: 'memberId is required' });
      return;
    }
    const summary = await attendanceService.getWeeklySummary(memberId as string);
    res.json(summary);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/attendance/:attendanceId
 * Delete attendance record
 */
router.delete('/:attendanceId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deleted = await attendanceService.deleteRecord(req.params.attendanceId);
    if (!deleted) {
      res.status(404).json({ error: 'Attendance record not found' });
      return;
    }
    res.json({ success: true, message: 'Attendance record deleted' });
  } catch (error) {
    next(error);
  }
});

export default router;