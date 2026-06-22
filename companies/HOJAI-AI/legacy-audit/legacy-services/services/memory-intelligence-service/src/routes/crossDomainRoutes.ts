// Cross-Domain Routes - Cross-business customer intelligence

import { Router, Request, Response, NextFunction } from 'express';
import { customerMemoryService } from '../services/customerMemoryService.js';
import { logger } from '../utils/logger.js';

export const crossDomainRoutes = Router();

/**
 * POST /api/cross-domain/link - Create cross-domain link
 */
crossDomainRoutes.post('/link', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sourceId, sourceType, sourceCompany, targetId, targetType, targetCompany, relationship } = req.body;

    if (!sourceId || !targetId || !relationship) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'sourceId, targetId, and relationship are required' },
      });
      return;
    }

    const link = await customerMemoryService.linkCrossDomain({
      sourceId,
      sourceType: sourceType || 'customer',
      sourceCompany: sourceCompany || 'unknown',
      targetId,
      targetType: targetType || 'customer',
      targetCompany: targetCompany || 'unknown',
      relationship,
      linkedBy: 'system',
      verified: false,
    });

    res.status(201).json({
      success: true,
      data: link,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/cross-domain/:customerId/links - Get linked accounts
 */
crossDomainRoutes.get('/:customerId/links', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { customerId } = req.params;

    const links = await customerMemoryService.getLinkedAccounts(customerId);

    res.json({
      success: true,
      data: {
        links,
        count: links.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/cross-domain/:customerId/unified - Get unified profile
 */
crossDomainRoutes.get('/:customerId/unified', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { customerId } = req.params;

    const unified = await customerMemoryService.getUnifiedProfile(customerId);

    res.json({
      success: true,
      data: unified,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/cross-domain/:customerId/journey - Add journey event
 */
crossDomainRoutes.post('/:customerId/journey', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { customerId } = req.params;
    const { domain, eventType, title, description, value, sentiment, resolved, resolution, date } = req.body;

    if (!domain || !eventType || !title) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'domain, eventType, and title are required' },
      });
      return;
    }

    const event = await customerMemoryService.addJourneyEvent({
      customerId,
      date: date ? new Date(date) : new Date(),
      domain,
      eventType,
      title,
      description,
      value,
      sentiment,
      resolved: resolved || false,
      resolution,
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
 * GET /api/cross-domain/:customerId/journey - Get customer journey
 */
crossDomainRoutes.get('/:customerId/journey', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { customerId } = req.params;
    const { startDate, endDate, domains, limit } = req.query;

    const journey = await customerMemoryService.getCustomerJourney(customerId, {
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      domains: domains ? (domains as string).split(',') : undefined,
      limit: limit ? Number(limit) : undefined,
    });

    res.json({
      success: true,
      data: journey,
    });
  } catch (error) {
    next(error);
  }
});
