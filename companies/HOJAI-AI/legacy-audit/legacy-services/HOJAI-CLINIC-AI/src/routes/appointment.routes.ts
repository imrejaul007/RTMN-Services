import { Router, Response } from 'express';
import { appointmentService } from '../services';
import { authenticate, asyncHandler } from '../middleware';
import { IAppointmentCreate, IAppointmentUpdate, IQueryParams } from '../types';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * POST /api/v1/appointments
 * Book a new appointment
 */
router.post(
  '/',
  asyncHandler(async (req, res: Response) => {
    const data: IAppointmentCreate = req.body;

    const result = await appointmentService.create(req.clinicId!, data);

    res.status(201).json(result);
  })
);

/**
 * GET /api/v1/appointments
 * List appointments with filters
 */
router.get(
  '/',
  asyncHandler(async (req, res: Response) => {
    const params: IQueryParams = {
      page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      sort: req.query.sort as string,
      order: req.query.order as 'asc' | 'desc',
      search: req.query.search as string,
      status: req.query.status as string,
      doctorId: req.query.doctorId as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
    };

    const result = await appointmentService.list(req.clinicId!, params);

    res.json(result);
  })
);

/**
 * GET /api/v1/appointments/today
 * Get today's appointments
 */
router.get(
  '/today',
  asyncHandler(async (req, res: Response) => {
    const result = await appointmentService.getTodaysAppointments(req.clinicId!);

    res.json(result);
  })
);

/**
 * GET /api/v1/appointments/slots
 * Get available slots for a doctor on a date
 */
router.get(
  '/slots',
  asyncHandler(async (req, res: Response) => {
    const { doctorId, date } = req.query;

    if (!doctorId || !date) {
      res.status(400).json({
        success: false,
        error: 'doctorId and date are required',
      });
      return;
    }

    const result = await appointmentService.getAvailableSlots(
      req.clinicId!,
      doctorId as string,
      date as string
    );

    res.json(result);
  })
);

/**
 * GET /api/v1/appointments/stats
 * Get appointment statistics
 */
router.get(
  '/stats',
  asyncHandler(async (req, res: Response) => {
    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : new Date(new Date().setDate(new Date().getDate() - 30));
    const endDate = req.query.endDate
      ? new Date(req.query.endDate as string)
      : new Date();

    const stats = await appointmentService.getStatistics(req.clinicId!, startDate, endDate);

    res.json({ success: true, data: stats });
  })
);

/**
 * GET /api/v1/appointments/:id
 * Get appointment by ID
 */
router.get(
  '/:id',
  asyncHandler(async (req, res: Response) => {
    const result = await appointmentService.getById(req.clinicId!, req.params.id);

    res.json(result);
  })
);

/**
 * PUT /api/v1/appointments/:id
 * Update appointment
 */
router.put(
  '/:id',
  asyncHandler(async (req, res: Response) => {
    const data: IAppointmentUpdate = req.body;

    const result = await appointmentService.update(req.clinicId!, req.params.id, data);

    res.json(result);
  })
);

/**
 * POST /api/v1/appointments/:id/start
 * Start appointment (mark as in_progress)
 */
router.post(
  '/:id/start',
  asyncHandler(async (req, res: Response) => {
    const result = await appointmentService.startAppointment(req.clinicId!, req.params.id);

    res.json(result);
  })
);

/**
 * POST /api/v1/appointments/:id/complete
 * Complete appointment
 */
router.post(
  '/:id/complete',
  asyncHandler(async (req, res: Response) => {
    const { notes } = req.body;

    const result = await appointmentService.completeAppointment(req.clinicId!, req.params.id, notes);

    res.json(result);
  })
);

/**
 * POST /api/v1/appointments/:id/cancel
 * Cancel appointment
 */
router.post(
  '/:id/cancel',
  asyncHandler(async (req, res: Response) => {
    const { reason, cancelledBy = 'clinic' } = req.body;

    if (!reason) {
      res.status(400).json({ success: false, error: 'Cancellation reason is required' });
      return;
    }

    const result = await appointmentService.cancel(
      req.clinicId!,
      req.params.id,
      reason,
      cancelledBy
    );

    res.json(result);
  })
);

/**
 * POST /api/v1/appointments/:id/no-show
 * Mark appointment as no-show
 */
router.post(
  '/:id/no-show',
  asyncHandler(async (req, res: Response) => {
    const result = await appointmentService.markNoShow(req.clinicId!, req.params.id);

    res.json(result);
  })
);

export default router;
