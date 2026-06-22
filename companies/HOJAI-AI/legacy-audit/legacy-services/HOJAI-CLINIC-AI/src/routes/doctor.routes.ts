import { Router, Response } from 'express';
import { Doctor } from '../models';
import { authenticate, asyncHandler } from '../middleware';
import { Types } from 'mongoose';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/doctors
 * List doctors for the clinic
 */
router.get(
  '/',
  asyncHandler(async (req, res: Response) => {
    const doctors = await Doctor.find({
      clinicId: req.clinicId!,
      isActive: true,
    })
      .select('-__v')
      .lean();

    res.json({ success: true, data: doctors });
  })
);

/**
 * POST /api/v1/doctors
 * Create a new doctor
 */
router.post(
  '/',
  asyncHandler(async (req, res: Response) => {
    const {
      name,
      phone,
      email,
      specialization,
      qualifications,
      experienceYears,
      licenseNumber,
      bio,
      photo,
      availableDays,
      workingHours,
      consultationFee,
      teleconsultFee,
    } = req.body;

    const doctor = new Doctor({
      clinicId: req.clinicId!,
      name,
      phone,
      email,
      specialization,
      qualifications: qualifications || [],
      experienceYears,
      licenseNumber,
      bio,
      photo,
      availableDays: availableDays || [1, 2, 3, 4, 5, 6],
      workingHours: workingHours || { start: '09:00', end: '18:00' },
      consultationFee: consultationFee || 500,
      teleconsultFee,
    });

    await doctor.save();

    res.status(201).json({
      success: true,
      data: doctor.toJSON(),
      message: 'Doctor created successfully',
    });
  })
);

/**
 * GET /api/v1/doctors/:id
 * Get doctor by ID
 */
router.get(
  '/:id',
  asyncHandler(async (req, res: Response) => {
    const doctor = await Doctor.findOne({
      _id: req.params.id,
      clinicId: req.clinicId!,
    }).select('-__v');

    if (!doctor) {
      res.status(404).json({ success: false, error: 'Doctor not found' });
      return;
    }

    res.json({ success: true, data: doctor.toJSON() });
  })
);

/**
 * PUT /api/v1/doctors/:id
 * Update doctor
 */
router.put(
  '/:id',
  asyncHandler(async (req, res: Response) => {
    const doctor = await Doctor.findOne({
      _id: req.params.id,
      clinicId: req.clinicId!,
    });

    if (!doctor) {
      res.status(404).json({ success: false, error: 'Doctor not found' });
      return;
    }

    const allowedUpdates = [
      'name',
      'phone',
      'email',
      'specialization',
      'qualifications',
      'experienceYears',
      'licenseNumber',
      'bio',
      'photo',
      'availableDays',
      'workingHours',
      'consultationFee',
      'teleconsultFee',
    ];

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        (doctor as any)[field] = req.body[field];
      }
    });

    await doctor.save();

    res.json({
      success: true,
      data: doctor.toJSON(),
      message: 'Doctor updated successfully',
    });
  })
);

/**
 * DELETE /api/v1/doctors/:id
 * Archive doctor (soft delete)
 */
router.delete(
  '/:id',
  asyncHandler(async (req, res: Response) => {
    const doctor = await Doctor.findOne({
      _id: req.params.id,
      clinicId: req.clinicId!,
    });

    if (!doctor) {
      res.status(404).json({ success: false, error: 'Doctor not found' });
      return;
    }

    doctor.isActive = false;
    await doctor.save();

    res.json({
      success: true,
      message: 'Doctor archived successfully',
    });
  })
);

/**
 * GET /api/v1/doctors/:id/slots
 * Get available slots for a doctor on a specific date
 */
router.get(
  '/:id/slots',
  asyncHandler(async (req, res: Response) => {
    const { date } = req.query;

    if (!date) {
      res.status(400).json({ success: false, error: 'Date is required' });
      return;
    }

    const doctor = await Doctor.findOne({
      _id: req.params.id,
      clinicId: req.clinicId!,
    });

    if (!doctor) {
      res.status(404).json({ success: false, error: 'Doctor not found' });
      return;
    }

    const slots = doctor.getAvailableSlots(new Date(date as string));

    res.json({ success: true, data: slots });
  })
);

export default router;
