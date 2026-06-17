/**
 * Location Routes
 *
 * REST API for managing geographic areas and locations
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { AreaModel, IArea, AreaType } from '../models/index.js';
import { asyncHandler, ValidationError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const CreateAreaSchema = z.object({
  name: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  type: z.enum(['residential', 'commercial', 'mixed', 'industrial', 'it_park', 'market', 'transit_hub', 'educational', 'hospital_zone', 'mall_area']),
  center: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
  audience: z.object({
    totalPopulation: z.number().optional(),
    workingPopulation: z.number().optional(),
    avgIncome: z.number().optional(),
  }).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const UpdateAreaSchema = z.object({
  audience: z.object({
    totalPopulation: z.number().optional(),
    workingPopulation: z.number().optional(),
    avgIncome: z.number().optional(),
    dominantAgeGroups: z.array(z.object({
      range: z.string(),
      percentage: z.number(),
    })).optional(),
    dominantInterests: z.array(z.string()).optional(),
  }).optional(),
  intentSignals: z.object({
    dining: z.number().optional(),
    retail: z.number().optional(),
    travel: z.number().optional(),
    healthcare: z.number().optional(),
    general: z.number().optional(),
  }).optional(),
  metadata: z.record(z.unknown()).optional(),
});

// ============================================================================
// AREA ROUTES
// ============================================================================

/**
 * POST /api/locations/areas
 * Create a new area
 */
router.post('/areas', asyncHandler(async (req: Request, res: Response) => {
  const validationResult = CreateAreaSchema.safeParse(req.body);
  if (!validationResult.success) {
    throw new ValidationError('Invalid area data', validationResult.error.errors);
  }

  const data = validationResult.data;

  const areaId = `area_${uuidv4()}`;

  const area = new AreaModel({
    areaId,
    name: data.name,
    city: data.city,
    state: data.state,
    type: data.type as AreaType,
    center: data.center,
    audience: {
      totalPopulation: data.audience?.totalPopulation || 0,
      workingPopulation: data.audience?.workingPopulation || 0,
      avgIncome: data.audience?.avgIncome || 0,
      dominantAgeGroups: [
        { range: '18-24', percentage: 25 },
        { range: '25-34', percentage: 35 },
        { range: '35-44', percentage: 25 },
        { range: '45+', percentage: 15 },
      ],
      dominantInterests: [],
    },
    pointsOfInterest: [],
    transit: {
      metroStations: 0,
      busStops: 0,
      autoStand: 0,
    },
    business: {
      restaurants: 0,
      shops: 0,
      offices: 0,
      clinics: 0,
      gyms: 0,
    },
    intentSignals: {
      dining: 0,
      retail: 0,
      travel: 0,
      healthcare: 0,
      general: 0,
    },
    screenCount: 0,
    avgFootfall: 0,
    metadata: data.metadata,
  });

  await area.save();

  logger.info('Area created', { areaId, name: data.name, city: data.city });

  res.status(201).json({
    success: true,
    data: area,
  });
}));

/**
 * GET /api/locations/areas
 * List areas with filters
 */
router.get('/areas', asyncHandler(async (req: Request, res: Response) => {
  const { city, type, page = '1', limit = '50' } = req.query;

  const filter: Record<string, unknown> = {};
  if (city) filter.city = city;
  if (type) filter.type = type;

  const pageNum = Math.max(1, parseInt(page as string));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
  const skip = (pageNum - 1) * limitNum;

  const [areas, total] = await Promise.all([
    AreaModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    AreaModel.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: {
      areas,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    },
  });
}));

/**
 * GET /api/locations/areas/:areaId
 * Get area details
 */
router.get('/areas/:areaId', asyncHandler(async (req: Request, res: Response) => {
  const { areaId } = req.params;

  const area = await AreaModel.findOne({ areaId }).lean();

  if (!area) {
    res.status(404).json({
      success: false,
      error: 'Area not found',
    });
    return;
  }

  res.json({
    success: true,
    data: area,
  });
}));

/**
 * PUT /api/locations/areas/:areaId
 * Update area
 */
router.put('/areas/:areaId', asyncHandler(async (req: Request, res: Response) => {
  const { areaId } = req.params;

  const validationResult = UpdateAreaSchema.safeParse(req.body);
  if (!validationResult.success) {
    throw new ValidationError('Invalid update data', validationResult.error.errors);
  }

  const area = await AreaModel.findOneAndUpdate(
    { areaId },
    { $set: validationResult.data },
    { new: true }
  ).lean();

  if (!area) {
    res.status(404).json({
      success: false,
      error: 'Area not found',
    });
    return;
  }

  logger.info('Area updated', { areaId });

  res.json({
    success: true,
    data: area,
  });
}));

/**
 * GET /api/locations/areas/:areaId/screens
 * Get screens in an area
 */
router.get('/areas/:areaId/screens', asyncHandler(async (req: Request, res: Response) => {
  const { areaId } = req.params;
  const { page = '1', limit = '50' } = req.query;

  const area = await AreaModel.findOne({ areaId }).lean();

  if (!area) {
    res.status(404).json({
      success: false,
      error: 'Area not found',
    });
    return;
  }

  // Import here to avoid circular dependency
  const { ScreenModel } = await import('../models/index.js');

  const pageNum = Math.max(1, parseInt(page as string));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
  const skip = (pageNum - 1) * limitNum;

  const [screens, total] = await Promise.all([
    ScreenModel.find({
      status: 'active',
      'location.city': area.city,
      'location.area': area.name,
    })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    ScreenModel.countDocuments({
      status: 'active',
      'location.city': area.city,
      'location.area': area.name,
    }),
  ]);

  res.json({
    success: true,
    data: {
      area: {
        areaId: area.areaId,
        name: area.name,
        city: area.city,
      },
      screens: screens.map((s) => ({
        screenId: s.screenId,
        name: s.name,
        type: s.type,
        pricing: s.pricing,
        audience: s.audience,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    },
  });
}));

/**
 * GET /api/locations/cities
 * List all cities with screen counts
 */
router.get('/cities', asyncHandler(async (_req: Request, res: Response) => {
  const cities = await AreaModel.aggregate([
    {
      $group: {
        _id: '$city',
        state: { $first: '$state' },
        areaCount: { $sum: 1 },
        totalPopulation: { $sum: '$audience.totalPopulation' },
        avgIncome: { $avg: '$audience.avgIncome' },
        intentSignals: {
          $sum: {
            $add: [
              '$intentSignals.dining',
              '$intentSignals.retail',
              '$intentSignals.travel',
              '$intentSignals.healthcare',
              '$intentSignals.general',
            ],
          },
        },
      },
    },
    { $sort: { areaCount: -1 } },
    {
      $project: {
        _id: 0,
        city: '$_id',
        state: 1,
        areaCount: 1,
        totalPopulation: 1,
        avgIncome: { $round: ['$avgIncome', 0] },
        intentSignals: 1,
      },
    },
  ]);

  res.json({
    success: true,
    data: {
      cities,
      count: cities.length,
    },
  });
}));

export default router;
