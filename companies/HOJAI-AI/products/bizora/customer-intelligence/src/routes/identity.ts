import { Router, Request, Response } from 'express';
import { identityResolutionService } from '../services/identityResolution';
import { asyncHandler } from '../utils/helpers';
import logger from '../utils/logger';

const router = Router();

/**
 * POST /api/identity/resolve
 * Resolve customer identity and get/create master record
 */
router.post('/resolve', asyncHandler(async (req: Request, res: Response) => {
  const { email, phone, deviceId, cookieId, externalId } = req.body;
  const source = req.body.source || 'api';

  if (!email && !phone && !deviceId && !cookieId && !externalId) {
    res.status(400).json({
      success: false,
      error: 'At least one identity (email, phone, deviceId, cookieId, or externalId) is required'
    });
    return;
  }

  const result = await identityResolutionService.resolveIdentity(
    { email, phone, deviceId, cookieId, externalId },
    source
  );

  logger.info('Identity resolved', {
    customerId: result.masterCustomer.customerId,
    action: result.action,
    wasResolved: result.wasResolved
  });

  res.json({
    success: true,
    data: {
      customer: result.masterCustomer,
      linkedCustomers: result.linkedCustomers,
      allIdentities: result.allIdentities,
      wasResolved: result.wasResolved,
      action: result.action
    }
  });
}));

/**
 * POST /api/identity/link
 * Link two customer records
 */
router.post('/link', asyncHandler(async (req: Request, res: Response) => {
  const { masterId, linkedId, linkType, confidence, matchedFields } = req.body;

  if (!masterId || !linkedId) {
    res.status(400).json({
      success: false,
      error: 'masterId and linkedId are required'
    });
    return;
  }

  if (!['merged', 'resolved', 'associated'].includes(linkType)) {
    res.status(400).json({
      success: false,
      error: 'linkType must be one of: merged, resolved, associated'
    });
    return;
  }

  const link = await identityResolutionService.linkCustomers(
    masterId,
    linkedId,
    linkType,
    confidence || 0.85,
    matchedFields || [],
    'api'
  );

  logger.info('Customers linked', { masterId, linkedId, linkType });

  res.json({
    success: true,
    data: link
  });
}));

/**
 * GET /api/identity/:customerId
 * Get all linked customers for a master customer
 */
router.get('/:customerId', asyncHandler(async (req: Request, res: Response) => {
  try {
    const result = await identityResolutionService.getLinkedCustomers(req.params.customerId);

    res.json({
      success: true,
      data: {
        master: result.master,
        linked: result.linked,
        allIdentities: result.allIdentities
      }
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: (error as Error).message
    });
  }
}));

/**
 * POST /api/identity/match-score
 * Calculate match score between two potential duplicate customers
 */
router.post('/match-score', asyncHandler(async (req: Request, res: Response) => {
  const { customer1, customer2 } = req.body;

  if (!customer1 || !customer2) {
    res.status(400).json({
      success: false,
      error: 'customer1 and customer2 data are required'
    });
    return;
  }

  const result = identityResolutionService.calculateMatchScore(customer1, customer2);

  res.json({
    success: true,
    data: result
  });
}));

/**
 * POST /api/identity/compare
 * Compare two customer records by their IDs
 */
router.post('/compare', asyncHandler(async (req: Request, res: Response) => {
  const { customerId1, customerId2 } = req.body;

  if (!customerId1 || !customerId2) {
    res.status(400).json({
      success: false,
      error: 'Both customerId1 and customerId2 are required'
    });
    return;
  }

  const { Customer } = await import('../models/Customer');

  const [customer1, customer2] = await Promise.all([
    Customer.findByCustomerId(customerId1),
    Customer.findByCustomerId(customerId2)
  ]);

  if (!customer1 || !customer2) {
    res.status(404).json({
      success: false,
      error: 'One or both customers not found'
    });
    return;
  }

  const matchResult = identityResolutionService.calculateMatchScore(
    customer1.toObject(),
    customer2.toObject()
  );

  res.json({
    success: true,
    data: {
      customer1: {
        id: customer1.customerId,
        email: customer1.email,
        phone: customer1.phone,
        name: customer1.getFullName()
      },
      customer2: {
        id: customer2.customerId,
        email: customer2.email,
        phone: customer2.phone,
        name: customer2.getFullName()
      },
      match: matchResult
    }
  });
}));

export default router;
