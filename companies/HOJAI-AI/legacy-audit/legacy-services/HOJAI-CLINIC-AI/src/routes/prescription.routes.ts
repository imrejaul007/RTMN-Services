import { Router, Response } from 'express';
import { prescriptionService } from '../services';
import { authenticate, asyncHandler } from '../middleware';
import { IPrescriptionCreate, IPrescriptionUpdate, IQueryParams } from '../types';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * POST /api/v1/prescriptions
 * Create a new prescription
 */
router.post(
  '/',
  asyncHandler(async (req, res: Response) => {
    const data: IPrescriptionCreate = req.body;

    const result = await prescriptionService.create(req.clinicId!, data);

    res.status(201).json(result);
  })
);

/**
 * GET /api/v1/prescriptions
 * List prescriptions with filters
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
      status: req.query.doctorId as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
    };

    const result = await prescriptionService.list(req.clinicId!, params);

    res.json(result);
  })
);

/**
 * GET /api/v1/prescriptions/search-medications
 * Search medications for autocomplete
 */
router.get(
  '/search-medications',
  asyncHandler(async (req, res: Response) => {
    const query = req.query.q as string;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

    if (!query || query.length < 2) {
      res.json({ success: true, data: [] });
      return;
    }

    const medications = await prescriptionService.searchMedications(query, limit);

    res.json({ success: true, data: medications });
  })
);

/**
 * GET /api/v1/prescriptions/stats
 * Get prescription statistics
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

    const stats = await prescriptionService.getStatistics(req.clinicId!, startDate, endDate);

    res.json({ success: true, data: stats });
  })
);

/**
 * GET /api/v1/prescriptions/patient/:patientId
 * Get prescriptions for a patient
 */
router.get(
  '/patient/:patientId',
  asyncHandler(async (req, res: Response) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

    const result = await prescriptionService.getByPatient(
      req.clinicId!,
      req.params.patientId,
      limit
    );

    res.json(result);
  })
);

/**
 * GET /api/v1/prescriptions/appointment/:appointmentId
 * Get prescription for an appointment
 */
router.get(
  '/appointment/:appointmentId',
  asyncHandler(async (req, res: Response) => {
    const result = await prescriptionService.getByAppointment(
      req.clinicId!,
      req.params.appointmentId
    );

    res.json(result);
  })
);

/**
 * GET /api/v1/prescriptions/:id
 * Get prescription by ID
 */
router.get(
  '/:id',
  asyncHandler(async (req, res: Response) => {
    const result = await prescriptionService.getById(req.clinicId!, req.params.id);

    res.json(result);
  })
);

/**
 * GET /api/v1/prescriptions/:id/pdf
 * Generate prescription PDF data
 */
router.get(
  '/:id/pdf',
  asyncHandler(async (req, res: Response) => {
    const pdfData = await prescriptionService.generatePdfData(req.clinicId!, req.params.id);

    res.json({ success: true, data: pdfData });
  })
);

/**
 * PUT /api/v1/prescriptions/:id
 * Update prescription
 */
router.put(
  '/:id',
  asyncHandler(async (req, res: Response) => {
    const data: IPrescriptionUpdate = req.body;

    const result = await prescriptionService.update(req.clinicId!, req.params.id, data);

    res.json(result);
  })
);

/**
 * POST /api/v1/prescriptions/:id/medications
 * Add medication to prescription
 */
router.post(
  '/:id/medications',
  asyncHandler(async (req, res: Response) => {
    const medication = req.body;

    if (!medication.medicine || !medication.dosage || !medication.frequency || !medication.duration) {
      res.status(400).json({
        success: false,
        error: 'Medicine, dosage, frequency, and duration are required',
      });
      return;
    }

    const result = await prescriptionService.addMedication(
      req.clinicId!,
      req.params.id,
      medication
    );

    res.json(result);
  })
);

/**
 * DELETE /api/v1/prescriptions/:id/medications/:index
 * Remove medication from prescription
 */
router.delete(
  '/:id/medications/:index',
  asyncHandler(async (req, res: Response) => {
    const index = parseInt(req.params.index, 10);

    if (isNaN(index)) {
      res.status(400).json({ success: false, error: 'Invalid medication index' });
      return;
    }

    const result = await prescriptionService.removeMedication(
      req.clinicId!,
      req.params.id,
      index
    );

    res.json(result);
  })
);

export default router;
