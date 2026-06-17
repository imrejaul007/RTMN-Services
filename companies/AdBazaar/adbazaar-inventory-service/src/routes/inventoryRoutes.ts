/**
 * Inventory Routes
 *
 * REST API for managing DOOH inventory (screens, locations)
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { z } from 'zod';
import { ScreenModel, IScreen, ScreenType, NetworkType } from '../models/index.js';
import { asyncHandler, ValidationError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import axios from 'axios';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const CreateScreenSchema = z.object({
  name: z.string().min(1),
  type: z.string(),
  networkType: z.string(),
  ownerId: z.string().min(1),
  ownerType: z.enum(['partner', 'adBazaar', 'media_owner']).default('partner'),
  location: z.object({
    address: z.string().min(1),
    city: z.string().min(1),
    state: z.string().min(1),
    pincode: z.string().optional(),
    area: z.string().optional(),
    landmark: z.string().optional(),
    coordinates: z.object({
      lat: z.number(),
      lng: z.number(),
    }),
  }),
  specifications: z.object({
    width: z.number().optional(),
    height: z.number().optional(),
    orientation: z.enum(['landscape', 'portrait', 'square']).optional(),
    resolution: z.string().optional(),
    screenSize: z.number().optional(),
  }).optional(),
  pricing: z.object({
    cpm: z.number().positive(),
    minBookingHours: z.number().positive().optional(),
    formats: z.array(z.enum(['image', 'video', 'interactive'])).optional(),
  }),
  audience: z.object({
    dailyFootfall: z.number().optional(),
    peakHours: z.array(z.number()).optional(),
    avgDwellTime: z.number().optional(),
  }).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const UpdateScreenSchema = z.object({
  name: z.string().min(1).optional(),
  status: z.enum(['active', 'inactive', 'maintenance', 'pending']).optional(),
  pricing: z.object({
    cpm: z.number().positive().optional(),
    minBookingHours: z.number().positive().optional(),
  }).optional(),
  metadata: z.record(z.unknown()).optional(),
});

// ============================================================================
// SCREEN ROUTES
// ============================================================================

/**
 * POST /api/inventory/screens
 * Register a new screen
 */
router.post('/screens', asyncHandler(async (req: Request, res: Response) => {
  const validationResult = CreateScreenSchema.safeParse(req.body);
  if (!validationResult.success) {
    throw new ValidationError('Invalid screen data', validationResult.error.errors);
  }

  const data = validationResult.data;

  // Generate screen ID
  const screenId = `screen_${uuidv4()}`;

  // Generate API key
  const apiKey = `adb_sk_${crypto.randomBytes(16).toString('hex')}`;

  // Get default CPM if not provided
  const defaultCPM: Record<string, number> = {
    billboard_digital: 50,
    bus_shelter: 20,
    metro_screen: 25,
    airport_display: 35,
    airport_gate: 40,
    airport_lounge: 60,
    mall_kiosk: 22,
    restaurant_tv: 10,
    hotel_lobby: 15,
    gym_screen: 12,
    office_elevator: 18,
    cab_tablet: 15,
  };

  const screen = new ScreenModel({
    screenId,
    apiKey,
    name: data.name,
    type: data.type as ScreenType,
    networkType: data.networkType as NetworkType,
    ownerId: data.ownerId,
    ownerType: data.ownerType,
    status: 'pending',
    location: {
      ...data.location,
      area: data.location.area || data.location.landmark || 'Unknown',
    },
    specifications: data.specifications || {},
    pricing: {
      cpm: data.pricing.cpm || defaultCPM[data.type] || 15,
      minBookingHours: data.pricing.minBookingHours || 1,
      formats: data.pricing.formats || ['image', 'video'],
    },
    audience: {
      dailyFootfall: data.audience?.dailyFootfall || 0,
      peakHours: data.audience?.peakHours || [9, 10, 11, 12, 18, 19, 20],
      avgDwellTime: data.audience?.avgDwellTime || 30,
      demographics: {
        ageGroups: [
          { range: '18-24', percentage: 25 },
          { range: '25-34', percentage: 35 },
          { range: '35-44', percentage: 25 },
          { range: '45+', percentage: 15 },
        ],
        genderSplit: { male: 55, female: 45 },
      },
    },
    media: {
      formats: data.pricing.formats || ['image', 'video'],
      maxDuration: 30,
      isHD: true,
      hasAudio: false,
    },
    metadata: data.metadata,
  });

  await screen.save();

  logger.info('Screen registered', { screenId, type: data.type, city: data.location.city });

  res.status(201).json({
    success: true,
    data: {
      screenId,
      apiKey, // Return API key only once
      name: screen.name,
      type: screen.type,
      status: screen.status,
      location: screen.location,
      pricing: screen.pricing,
    },
  });
}));

/**
 * GET /api/inventory/screens
 * List screens with filters
 */
router.get('/screens', asyncHandler(async (req: Request, res: Response) => {
  const {
    city,
    area,
    type,
    status,
    networkType,
    minCpm,
    maxCpm,
    minFootfall,
    page = '1',
    limit = '50',
  } = req.query;

  const filter: Record<string, unknown> = {};

  if (city) filter['location.city'] = city;
  if (area) filter['location.area'] = area;
  if (type) filter.type = type;
  if (status) filter.status = status;
  if (networkType) filter.networkType = networkType;
  if (minCpm) filter['pricing.cpm'] = { $gte: Number(minCpm) };
  if (maxCpm) filter['pricing.cpm'] = { ...filter['pricing.cpm'] as object, $lte: Number(maxCpm) };
  if (minFootfall) filter['audience.dailyFootfall'] = { $gte: Number(minFootfall) };

  const pageNum = Math.max(1, parseInt(page as string));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
  const skip = (pageNum - 1) * limitNum;

  const [screens, total] = await Promise.all([
    ScreenModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    ScreenModel.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: {
      screens: screens.map((s) => ({
        screenId: s.screenId,
        name: s.name,
        type: s.type,
        networkType: s.networkType,
        status: s.status,
        location: s.location,
        pricing: s.pricing,
        audience: s.audience,
        totalImpressions: s.totalImpressions,
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
 * GET /api/inventory/screens/:screenId
 * Get screen details
 */
router.get('/screens/:screenId', asyncHandler(async (req: Request, res: Response) => {
  const { screenId } = req.params;

  const screen = await ScreenModel.findOne({ screenId }).lean();

  if (!screen) {
    res.status(404).json({
      success: false,
      error: 'Screen not found',
    });
    return;
  }

  res.json({
    success: true,
    data: screen,
  });
}));

/**
 * PUT /api/inventory/screens/:screenId
 * Update screen
 */
router.put('/screens/:screenId', asyncHandler(async (req: Request, res: Response) => {
  const { screenId } = req.params;

  const validationResult = UpdateScreenSchema.safeParse(req.body);
  if (!validationResult.success) {
    throw new ValidationError('Invalid update data', validationResult.error.errors);
  }

  const screen = await ScreenModel.findOneAndUpdate(
    { screenId },
    { $set: validationResult.data },
    { new: true }
  ).lean();

  if (!screen) {
    res.status(404).json({
      success: false,
      error: 'Screen not found',
    });
    return;
  }

  logger.info('Screen updated', { screenId });

  res.json({
    success: true,
    data: screen,
  });
}));

/**
 * POST /api/inventory/screens/:screenId/heartbeat
 * Screen heartbeat (for screen apps)
 */
router.post('/screens/:screenId/heartbeat', asyncHandler(async (req: Request, res: Response) => {
  const { screenId } = req.params;
  const apiKey = req.headers['x-screen-api-key'] as string;

  const screen = await ScreenModel.findOne({ screenId }).lean();

  if (!screen) {
    res.status(404).json({
      success: false,
      error: 'Screen not found',
    });
    return;
  }

  // Verify API key
  if (screen.apiKey && screen.apiKey !== apiKey) {
    res.status(401).json({
      success: false,
      error: 'Invalid API key',
    });
    return;
  }

  // Update heartbeat
  screen.lastHeartbeat = new Date();

  await ScreenModel.updateOne({ screenId }, { lastHeartbeat: new Date() });

  res.json({
    success: true,
    timestamp: new Date().toISOString(),
  });
}));

/**
 * GET /api/inventory/screens/:screenId/stats
 * Get screen statistics
 */
router.get('/screens/:screenId/stats', asyncHandler(async (req: Request, res: Response) => {
  const { screenId } = req.params;

  const screen = await ScreenModel.findOne({ screenId }).lean();

  if (!screen) {
    res.status(404).json({
      success: false,
      error: 'Screen not found',
    });
    return;
  }

  // Get audience insights from HOJAI AI Gateway
  let audienceInsights = null;
  try {
    const hojaiUrl = process.env.HOJAI_GATEWAY_URL || 'http://localhost:4560';
    const response = await axios.post(
      `${hojaiUrl}/api/audience/segments`,
      {
        criteria: {
          city: screen.location.city,
          area: screen.location.area,
        },
      },
      {
        headers: {
          'X-Admin-Token': process.env.ADMIN_TOKEN || 'dev-token',
        },
        timeout: 5000,
      }
    );
    audienceInsights = response.data.data;
  } catch (error) {
    logger.warn('Failed to get audience insights', { screenId, error });
  }

  res.json({
    success: true,
    data: {
      screenId: screen.screenId,
      name: screen.name,
      location: screen.location,
      totalImpressions: screen.totalImpressions,
      totalScans: screen.totalScans,
      scanRate: screen.totalImpressions > 0
        ? (screen.totalScans / screen.totalImpressions * 100).toFixed(2)
        : '0',
      audience: screen.audience,
      earnings: {
        balance: screen.earningsBalance,
        paid: screen.earningsPaid,
      },
      lastHeartbeat: screen.lastHeartbeat,
      audienceInsights,
    },
  });
}));

/**
 * GET /api/inventory/search
 * Search screens by location or type
 */
router.get('/search', asyncHandler(async (req: Request, res: Response) => {
  const { q, lat, lng, radius = '10' } = req.query;

  let screens;

  if (lat && lng) {
    // Geo search
    const radiusInKm = parseFloat(radius as string);
    screens = await ScreenModel.find({
      status: 'active',
      'location.coordinates': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng as string), parseFloat(lat as string)],
          },
          $maxDistance: radiusInKm * 1000, // Convert to meters
        },
      },
    }).limit(50).lean();
  } else if (q) {
    // Text search
    screens = await ScreenModel.find({
      status: 'active',
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { 'location.city': { $regex: q, $options: 'i' } },
        { 'location.area': { $regex: q, $options: 'i' } },
        { 'location.landmark': { $regex: q, $options: 'i' } },
      ],
    }).limit(50).lean();
  } else {
    res.status(400).json({
      success: false,
      error: 'Provide search query (q) or coordinates (lat, lng)',
    });
    return;
  }

  res.json({
    success: true,
    data: {
      screens: screens.map((s) => ({
        screenId: s.screenId,
        name: s.name,
        type: s.type,
        location: s.location,
        pricing: s.pricing,
        audience: s.audience,
      })),
      count: screens.length,
    },
  });
}));

/**
 * GET /api/inventory/stats
 * Get inventory statistics
 */
router.get('/stats', asyncHandler(async (_req: Request, res: Response) => {
  const [totalScreens, byType, byCity, byStatus] = await Promise.all([
    ScreenModel.countDocuments(),
    ScreenModel.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    ScreenModel.aggregate([
      { $group: { _id: '$location.city', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    ScreenModel.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
  ]);

  res.json({
    success: true,
    data: {
      totalScreens,
      byType,
      byCity,
      byStatus,
    },
  });
}));

export default router;
