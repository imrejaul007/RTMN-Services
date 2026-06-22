import { Router, Response } from 'express';
import { patientService } from '../services';
import { authenticate, asyncHandler } from '../middleware';
import { IPatientCreate, IPatientUpdate, IQueryParams } from '../types';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * POST /api/v1/patients
 * Register a new patient
 */
router.post(
  '/',
  asyncHandler(async (req, res: Response) => {
    const data: IPatientCreate = req.body;
    const clinicId = req.clinicId!;

    const result = await patientService.create(clinicId, data);

    res.status(201).json(result);
  })
);

/**
 * GET /api/v1/patients
 * List patients with pagination and filters
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
    };

    const result = await patientService.list(req.clinicId!, params);

    res.json(result);
  })
);

/**
 * GET /api/v1/patients/search
 * Search patients for autocomplete
 */
router.get(
  '/search',
  asyncHandler(async (req, res: Response) => {
    const query = req.query.q as string;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

    if (!query || query.length < 2) {
      res.json({ success: true, data: [] });
      return;
    }

    const patients = await patientService.search(req.clinicId!, query, limit);

    res.json({ success: true, data: patients });
  })
);

/**
 * GET /api/v1/patients/stats
 * Get patient statistics
 */
router.get(
  '/stats',
  asyncHandler(async (req, res: Response) => {
    const stats = await patientService.getStatistics(req.clinicId!);

    res.json({ success: true, data: stats });
  })
);

/**
 * GET /api/v1/patients/:id
 * Get patient by ID
 */
router.get(
  '/:id',
  asyncHandler(async (req, res: Response) => {
    const result = await patientService.getById(req.clinicId!, req.params.id);

    res.json(result);
  })
);

/**
 * PUT /api/v1/patients/:id
 * Update patient
 */
router.put(
  '/:id',
  asyncHandler(async (req, res: Response) => {
    const data: IPatientUpdate = req.body;

    const result = await patientService.update(req.clinicId!, req.params.id, data);

    res.json(result);
  })
);

/**
 * DELETE /api/v1/patients/:id
 * Archive patient (soft delete)
 */
router.delete(
  '/:id',
  asyncHandler(async (req, res: Response) => {
    const result = await patientService.archive(req.clinicId!, req.params.id);

    res.json(result);
  })
);

/**
 * POST /api/v1/patients/:id/allergies
 * Add allergy to patient
 */
router.post(
  '/:id/allergies',
  asyncHandler(async (req, res: Response) => {
    const { allergy } = req.body;

    if (!allergy) {
      res.status(400).json({ success: false, error: 'Allergy is required' });
      return;
    }

    const result = await patientService.addAllergy(req.clinicId!, req.params.id, allergy);

    res.json(result);
  })
);

/**
 * POST /api/v1/patients/:id/medical-history
 * Add medical history entry
 */
router.post(
  '/:id/medical-history',
  asyncHandler(async (req, res: Response) => {
    const { history } = req.body;

    if (!history) {
      res.status(400).json({ success: false, error: 'Medical history entry is required' });
      return;
    }

    const result = await patientService.addMedicalHistory(req.clinicId!, req.params.id, history);

    res.json(result);
  })
);

export default router;
