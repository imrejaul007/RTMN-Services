import { Router, Request, Response } from 'express';
import { Briefing } from '../models/Briefing';
import { generateBriefing } from '../services/briefingGenerator';
import { ApiResponse, ExecutiveBriefing } from '../types';

const router = Router();

/**
 * GET /api/executive/briefing
 * Get the latest daily briefing
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { date, limit = '1' } = req.query;
    const limitNum = parseInt(limit as string, 10);

    let query = {};
    if (date) {
      query = { date: date as string };
    }

    const briefings = await Briefing.find(query)
      .sort({ date: -1 })
      .limit(limitNum)
      .exec();

    const response: ApiResponse<ExecutiveBriefing[]> = {
      success: true,
      data: briefings
    };

    res.json(response);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({
      success: false,
      error: 'Failed to fetch briefing',
      message: err.message
    });
  }
});

/**
 * GET /api/executive/briefing/history
 * Get briefing history
 */
router.get('/history', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, page = '1', limit = '30' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const query: Record<string, unknown> = {};

    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        (query.date as Record<string, string>).$gte = startDate as string;
      }
      if (endDate) {
        (query.date as Record<string, string>).$lte = endDate as string;
      }
    }

    const total = await Briefing.countDocuments(query);
    const briefings = await Briefing.find(query)
      .sort({ date: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .exec();

    res.json({
      success: true,
      data: briefings,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({
      success: false,
      error: 'Failed to fetch briefing history',
      message: err.message
    });
  }
});

/**
 * POST /api/executive/briefing/generate
 * Generate a new daily briefing
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { date } = req.body;
    const briefingDate = date || new Date().toISOString().split('T')[0];

    // Check if briefing already exists for this date
    const existing = await Briefing.findOne({ date: briefingDate });
    if (existing) {
      res.status(409).json({
        success: false,
        error: 'Briefing already exists for this date',
        data: existing
      });
      return;
    }

    // Generate new briefing
    const briefing = await generateBriefing(briefingDate);

    res.status(201).json({
      success: true,
      data: briefing,
      message: 'Briefing generated successfully'
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({
      success: false,
      error: 'Failed to generate briefing',
      message: err.message
    });
  }
});

/**
 * GET /api/executive/briefing/:id
 * Get a specific briefing by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const briefing = await Briefing.findOne({ id });

    if (!briefing) {
      res.status(404).json({
        success: false,
        error: 'Briefing not found'
      });
      return;
    }

    res.json({
      success: true,
      data: briefing
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({
      success: false,
      error: 'Failed to fetch briefing',
      message: err.message
    });
  }
});

export default router;
