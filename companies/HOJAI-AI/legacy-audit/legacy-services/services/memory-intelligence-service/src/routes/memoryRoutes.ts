// Memory Routes - General memory operations

import { Router, Request, Response, NextFunction } from 'express';
import { customerMemoryService } from '../services/customerMemoryService.js';
import { logger } from '../utils/logger.js';

export const memoryRoutes = Router();

/**
 * POST /api/memory - Add memory event
 */
memoryRoutes.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { customerId, company, date, category, type, title, description, value, sentiment } = req.body;

    if (!customerId || !company || !date || !category || !type || !title) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'customerId, company, date, category, type, and title are required' },
      });
      return;
    }

    const event = await customerMemoryService.addMemoryEvent({
      customerId,
      company,
      date: new Date(date),
      category,
      type,
      title,
      description,
      value,
      sentiment,
    });

    res.status(201).json({
      success: true,
      data: event,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/memory/:customerId - Get customer memory
 */
memoryRoutes.get('/:customerId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { customerId } = req.params;
    const { company = 'unified' } = req.query;

    const memory = await customerMemoryService.getOrCreateCustomerMemory(customerId, company as string);

    res.json({
      success: true,
      data: memory,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/memory/:customerId/events - Get memory events
 */
memoryRoutes.get('/:customerId/events', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { customerId } = req.params;
    const { category, limit = 50 } = req.query;

    const query: any = { customerId };
    if (category) query.category = category;

    // For now, return empty events (would fetch from MongoDB in production)
    res.json({
      success: true,
      data: {
        events: [],
        pagination: { total: 0, limit: Number(limit) },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/memory/search - Search memories
 */
memoryRoutes.post('/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { customerId, query, categories, startDate, endDate } = req.body;

    if (!customerId || !query) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'customerId and query are required' },
      });
      return;
    }

    // Semantic search would be implemented here
    // For now, return mock results
    res.json({
      success: true,
      data: {
        results: [],
        query,
        count: 0,
      },
    });
  } catch (error) {
    next(error);
  }
});
