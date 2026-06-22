import { Router, Response } from 'express';
import { Clinic } from '../models';
import { authenticate, asyncHandler, authorize } from '../middleware';
import { IndustryVertical } from '../types';
import { Types } from 'mongoose';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/clinics
 * Get clinics for the authenticated user
 */
router.get(
  '/',
  asyncHandler(async (req, res: Response) => {
    const clinics = await Clinic.find({ ownerId: req.user?.id as unknown as Types.ObjectId })
      .select('-__v')
      .lean();

    res.json({ success: true, data: clinics });
  })
);

/**
 * POST /api/v1/clinics
 * Create a new clinic
 */
router.post(
  '/',
  asyncHandler(async (req, res: Response) => {
    const {
      name,
      phone,
      email,
      address,
      industryVertical,
      specialty,
      settings,
    } = req.body;

    const clinic = new Clinic({
      name,
      ownerId: req.user?.id as unknown as Types.ObjectId,
      phone,
      email,
      address,
      industryVertical: industryVertical || 'single_doctor' as IndustryVertical,
      specialty: specialty || [],
      settings: settings || {},
    });

    await clinic.save();

    res.status(201).json({
      success: true,
      data: clinic.toJSON(),
      message: 'Clinic created successfully',
    });
  })
);

/**
 * GET /api/v1/clinics/:id
 * Get clinic by ID
 */
router.get(
  '/:id',
  asyncHandler(async (req, res: Response) => {
    const clinic = await Clinic.findById(req.params.id).select('-__v');

    if (!clinic) {
      res.status(404).json({ success: false, error: 'Clinic not found' });
      return;
    }

    res.json({ success: true, data: clinic.toJSON() });
  })
);

/**
 * PUT /api/v1/clinics/:id
 * Update clinic
 */
router.put(
  '/:id',
  asyncHandler(async (req, res: Response) => {
    const clinic = await Clinic.findOne({
      _id: req.params.id,
      ownerId: req.user?.id as unknown as Types.ObjectId,
    });

    if (!clinic) {
      res.status(404).json({ success: false, error: 'Clinic not found' });
      return;
    }

    const allowedUpdates = [
      'name',
      'phone',
      'email',
      'logo',
      'address',
      'specialty',
      'workingHours',
      'slotDurationMinutes',
      'maxDailyAppointments',
      'appointmentBufferMinutes',
      'settings',
      'integrations',
    ];

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        (clinic as any)[field] = req.body[field];
      }
    });

    await clinic.save();

    res.json({
      success: true,
      data: clinic.toJSON(),
      message: 'Clinic updated successfully',
    });
  })
);

/**
 * PUT /api/v1/clinics/:id/settings
 * Update clinic settings
 */
router.put(
  '/:id/settings',
  asyncHandler(async (req, res: Response) => {
    const clinic = await Clinic.findOne({
      _id: req.params.id,
      ownerId: req.user?.id as unknown as Types.ObjectId,
    });

    if (!clinic) {
      res.status(404).json({ success: false, error: 'Clinic not found' });
      return;
    }

    const { settings } = req.body;

    if (settings) {
      clinic.settings = { ...clinic.settings, ...settings };
    }

    await clinic.save();

    res.json({
      success: true,
      data: clinic.toJSON(),
      message: 'Settings updated successfully',
    });
  })
);

/**
 * PUT /api/v1/clinics/:id/integrations
 * Update clinic integrations
 */
router.put(
  '/:id/integrations',
  asyncHandler(async (req, res: Response) => {
    const clinic = await Clinic.findOne({
      _id: req.params.id,
      ownerId: req.user?.id as unknown as Types.ObjectId,
    });

    if (!clinic) {
      res.status(404).json({ success: false, error: 'Clinic not found' });
      return;
    }

    const { integrations } = req.body;

    if (integrations) {
      clinic.integrations = { ...clinic.integrations, ...integrations };
    }

    await clinic.save();

    res.json({
      success: true,
      data: clinic.toJSON(),
      message: 'Integrations updated successfully',
    });
  })
);

export default router;
