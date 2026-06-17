/**
 * Touchpoint Routes
 * API endpoints for touchpoint tracking and management
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { journeyTracker } from '../services/tracker';
import {
  TrackTouchpointRequest,
  TouchpointType,
  AttributionModel,
  ApiResponse,
  PaginatedResponse
} from '../types';
import { Touchpoint } from '../models/Touchpoint';

const router = Router();

// Validation schemas
const trackTouchpointSchema = z.object({
  customerId: z.string().min(1),
  tenantId: z.string().optional(),
  type: z.nativeEnum(TouchpointType),
  source: z.object({
    type: z.nativeEnum(TouchpointType),
    channel: z.string().optional(),
    campaign: z.string().optional(),
    content: z.string().optional(),
    medium: z.string().optional(),
    source: z.string().optional(),
    referrer: z.string().optional()
  }),
  timestamp: z.string().datetime().optional(),
  revenue: z.number().min(0).optional(),
  duration: z.number().min(0).optional(),
  metadata: z.record(z.unknown()).optional(),
  properties: z.object({
    url: z.string().optional(),
    pageTitle: z.string().optional(),
    searchQuery: z.string().optional(),
    adId: z.string().optional(),
    adGroup: z.string().optional(),
    keyword: z.string().optional(),
    placement: z.string().optional(),
    conversionValue: z.number().optional(),
    eventType: z.string().optional(),
    elementId: z.string().optional()
  }).optional(),
  deviceInfo: z.object({
    userAgent: z.string().optional(),
    browser: z.string().optional(),
    os: z.string().optional(),
    device: z.string().optional(),
    screenWidth: z.number().optional(),
    screenHeight: z.number().optional()
  }).optional(),
  location: z.object({
    ip: z.string().optional(),
    country: z.string().optional(),
    region: z.string().optional(),
    city: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional()
  }).optional(),
  sessionId: z.string().optional()
});

/**
 * Track a touchpoint
 * POST /api/touchpoints
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const validation = trackTouchpointSchema.safeParse(req.body);

    if (!validation.success) {
      const response: ApiResponse = {
        success: false,
        error: validation.error.errors[0].message,
        timestamp: new Date()
      };
      return res.status(400).json(response);
    }

    const request: TrackTouchpointRequest = {
      ...validation.data,
      timestamp: validation.data.timestamp
        ? new Date(validation.data.timestamp)
        : undefined
    };

    const touchpoint = await journeyTracker.trackTouchpoint(request);

    const response: ApiResponse<typeof touchpoint> = {
      success: true,
      data: touchpoint,
      message: 'Touchpoint tracked successfully',
      timestamp: new Date()
    };

    res.status(201).json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    };
    res.status(500).json(response);
  }
});

/**
 * Get touchpoints for a customer
 * GET /api/touchpoints/customer/:customerId
 */
router.get('/customer/:customerId', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const tenantId = req.query.tenantId as string || 'public';
    const type = req.query.type as TouchpointType | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const touchpoints = await journeyTracker.getTouchpoints(customerId, tenantId, {
      limit,
      type,
      dateRange: req.query.start && req.query.end
        ? {
            start: new Date(req.query.start as string),
            end: new Date(req.query.end as string)
          }
        : undefined
    });

    const total = await Touchpoint.countDocuments({
      customerId,
      tenantId,
      ...(type ? { type } : {})
    }).exec();

    const paginatedResponse: PaginatedResponse<typeof touchpoints[0]> = {
      data: touchpoints,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };

    const response: ApiResponse<PaginatedResponse<typeof touchpoints[0]>> = {
      success: true,
      data: paginatedResponse,
      timestamp: new Date()
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    };
    res.status(500).json(response);
  }
});

/**
 * Get touchpoint by ID
 * GET /api/touchpoints/:touchpointId
 */
router.get('/:touchpointId', async (req: res: Response) => {
  try {
    const { touchpointId } = req.params;

    const touchpoint = await Touchpoint.findOne({ touchpointId });

    if (!touchpoint) {
      const response: ApiResponse = {
        success: false,
        error: 'Touchpoint not found',
        timestamp: new Date()
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse<typeof touchpoint> = {
      success: true,
      data: touchpoint,
      timestamp: new Date()
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    };
    res.status(500).json(response);
  }
});

/**
 * Get touchpoints by session
 * GET /api/touchpoints/session/:sessionId
 */
router.get('/session/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const tenantId = req.query.tenantId as string || 'public';

    const touchpoints = await Touchpoint.findBySession(sessionId, tenantId);

    const response: ApiResponse<typeof touchpoints> = {
      success: true,
      data: touchpoints,
      timestamp: new Date()
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    };
    res.status(500).json(response);
  }
});

/**
 * Get touchpoint statistics
 * GET /api/touchpoints/stats
 */
router.get('/stats/conversion', async (req: Request, res: Response) => {
  try {
    const tenantId = req.query.tenantId as string || 'public';

    const stats = await Touchpoint.getConversionStats(tenantId);

    const response: ApiResponse<typeof stats> = {
      success: true,
      data: stats,
      timestamp: new Date()
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    };
    res.status(500).json(response);
  }
});

/**
 * Get channel attribution
 * GET /api/touchpoints/attribution/channel
 */
router.get('/attribution/channel', async (req: Request, res: Response) => {
  try {
    const tenantId = req.query.tenantId as string || 'public';

    const attribution = await Touchpoint.getChannelAttribution(tenantId);

    const response: ApiResponse<typeof attribution> = {
      success: true,
      data: attribution,
      timestamp: new Date()
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    };
    res.status(500).json(response);
  }
});

/**
 * Get attribution for a customer
 * GET /api/touchpoints/attribution/:customerId
 */
router.get('/attribution/:customerId', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const tenantId = req.query.tenantId as string || 'public';
    const model = (req.query.model as AttributionModel) || AttributionModel.LAST_TOUCH;

    const attribution = await journeyTracker.calculateAttribution(
      customerId,
      tenantId,
      model
    );

    const response: ApiResponse<typeof attribution> = {
      success: true,
      data: {
        customerId,
        model,
        attribution
      },
      timestamp: new Date()
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    };
    res.status(500).json(response);
  }
});

/**
 * Get touchpoints by type
 * GET /api/touchpoints/type/:type
 */
router.get('/type/:type', async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    const tenantId = req.query.tenantId as string || 'public';
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const touchpoints = await Touchpoint.findByType(
      type as TouchpointType,
      tenantId,
      req.query.start && req.query.end
        ? {
            start: new Date(req.query.start as string),
            end: new Date(req.query.end as string)
          }
        : undefined
    )
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();

    const total = await Touchpoint.countDocuments({
      type,
      tenantId
    }).exec();

    const paginatedResponse: PaginatedResponse<typeof touchpoints[0]> = {
      data: touchpoints,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };

    const response: ApiResponse<PaginatedResponse<typeof touchpoints[0]>> = {
      success: true,
      data: paginatedResponse,
      timestamp: new Date()
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    };
    res.status(500).json(response);
  }
});

export default router;
