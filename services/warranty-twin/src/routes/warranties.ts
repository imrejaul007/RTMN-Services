import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Warranty, IWarranty, IWarrantyClaim, WarrantyType } from '../models/Warranty';
import { Claim } from '../models/Claim';
import { Repair } from '../models/Repair';
import { validateWarranty, validateWarrantyUpdate } from '../services/validator';

const router = Router();

// Get tenant ID from header (multi-tenant support)
const getTenantId = (req: Request): string => {
  return req.headers['x-tenant-id'] as string || 'default';
};

// GET /api/warranties - List all warranties with filtering
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const {
      customerId,
      productId,
      isValid,
      type,
      page = '1',
      limit = '20'
    } = req.query;

    const query: any = { tenantId };

    if (customerId) query.customerId = customerId;
    if (productId) query.productId = productId;
    if (isValid !== undefined) query.isValid = isValid === 'true';
    if (type) query.type = type;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [warranties, total] = await Promise.all([
      Warranty.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Warranty.countDocuments(query)
    ]);

    res.json({
      data: warranties,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/warranties/expiring - Get warranties expiring soon
router.get('/expiring', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { days = '30' } = req.query;
    const daysNum = parseInt(days as string, 10);

    const now = new Date();
    const futureDate = new Date(now.getTime() + daysNum * 24 * 60 * 60 * 1000);

    const warranties = await Warranty.find({
      tenantId,
      isValid: true,
      isActive: true,
      endDate: { $gte: now, $lte: futureDate }
    }).sort({ endDate: 1 }).lean();

    res.json({
      data: warranties,
      count: warranties.length,
      daysThreshold: daysNum
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/warranties/stats - Get warranty statistics
router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);

    const stats = await Warranty.aggregate([
      { $match: { tenantId } },
      {
        $facet: {
          total: [{ $count: 'count' }],
          byType: [
            { $group: { _id: '$type', count: { $sum: 1 } } }
          ],
          byStatus: [
            { $group: { _id: '$isValid', count: { $sum: 1 } } }
          ],
          byCoverage: [
            { $group: { _id: '$coverage.type', count: { $sum: 1 } } }
          ],
          totalClaims: [
            { $project: { claimsCount: { $size: '$claims' } } },
            { $group: { _id: null, total: { $sum: '$claimsCount' } } }
          ],
          activeCount: [
            { $match: { isValid: true, isActive: true } },
            { $count: 'count' }
          ]
        }
      }
    ]);

    res.json({
      data: stats[0],
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/warranties/:warrantyId - Get single warranty
router.get('/:warrantyId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { warrantyId } = req.params;

    const warranty = await Warranty.findOne({ warrantyId, tenantId })
      .populate('customerId', 'name email phone')
      .lean();

    if (!warranty) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Warranty ${warrantyId} not found`
      });
    }

    res.json({ data: warranty });
  } catch (error) {
    next(error);
  }
});

// POST /api/warranties - Create new warranty
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);

    // Validate request body
    const validationResult = validateWarranty(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation Error',
        details: validationResult.errors
      });
    }

    const warrantyId = `WTY-${uuidv4().substring(0, 8).toUpperCase()}`;

    const warranty = new Warranty({
      ...req.body,
      warrantyId,
      tenantId,
      isValid: true,
      isActive: true,
      claims: [],
      repairs: [],
      serviceHistory: [{
        date: new Date(),
        type: 'purchase',
        description: 'Warranty created',
        performedBy: req.body.createdBy || 'system'
      }]
    });

    await warranty.save();

    res.status(201).json({
      message: 'Warranty created successfully',
      data: warranty
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/warranties/:warrantyId - Update warranty
router.put('/:warrantyId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { warrantyId } = req.params;

    // Validate update data
    const validationResult = validateWarrantyUpdate(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation Error',
        details: validationResult.errors
      });
    }

    const warranty = await Warranty.findOne({ warrantyId, tenantId });

    if (!warranty) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Warranty ${warrantyId} not found`
      });
    }

    // Update allowed fields
    const allowedUpdates = [
      'productName', 'productModel', 'productSerial', 'manufacturer',
      'type', 'startDate', 'endDate', 'coverage', 'isActive', 'notes'
    ];

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        (warranty as any)[field] = req.body[field];
      }
    });

    await warranty.save();

    res.json({
      message: 'Warranty updated successfully',
      data: warranty
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/warranties/:warrantyId/activate - Activate warranty
router.patch('/:warrantyId/activate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { warrantyId } = req.params;

    const warranty = await Warranty.findOne({ warrantyId, tenantId });

    if (!warranty) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Warranty ${warrantyId} not found`
      });
    }

    warranty.isActive = true;
    warranty.serviceHistory.push({
      date: new Date(),
      type: 'renewal',
      description: 'Warranty activated',
      performedBy: req.body.performedBy || 'system'
    });

    await warranty.save();

    res.json({
      message: 'Warranty activated successfully',
      data: warranty
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/warranties/:warrantyId/deactivate - Deactivate warranty
router.patch('/:warrantyId/deactivate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { warrantyId } = req.params;

    const warranty = await Warranty.findOne({ warrantyId, tenantId });

    if (!warranty) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Warranty ${warrantyId} not found`
      });
    }

    warranty.isActive = false;
    warranty.serviceHistory.push({
      date: new Date(),
      type: 'renewal',
      description: 'Warranty deactivated',
      performedBy: req.body.performedBy || 'system'
    });

    await warranty.save();

    res.json({
      message: 'Warranty deactivated successfully',
      data: warranty
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/warranties/:warrantyId/renew - Renew warranty
router.post('/:warrantyId/renew', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { warrantyId } = req.params;
    const { newEndDate, extendedCoverage } = req.body;

    const warranty = await Warranty.findOne({ warrantyId, tenantId });

    if (!warranty) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Warranty ${warrantyId} not found`
      });
    }

    if (!new Date(newEndDate) || new Date(newEndDate) <= new Date(warranty.endDate)) {
      return res.status(400).json({
        error: 'Invalid End Date',
        message: 'New end date must be in the future and after current end date'
      });
    }

    warranty.endDate = new Date(newEndDate);
    warranty.isValid = true;
    warranty.isActive = true;

    if (extendedCoverage) {
      warranty.coverage = { ...warranty.coverage, ...extendedCoverage };
    }

    warranty.serviceHistory.push({
      date: new Date(),
      type: 'renewal',
      description: `Warranty renewed until ${newEndDate}`,
      performedBy: req.body.performedBy || 'system',
      referenceId: warrantyId
    });

    await warranty.save();

    res.json({
      message: 'Warranty renewed successfully',
      data: warranty
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/warranties/:warrantyId - Delete warranty
router.delete('/:warrantyId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { warrantyId } = req.params;

    const warranty = await Warranty.findOneAndDelete({ warrantyId, tenantId });

    if (!warranty) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Warranty ${warrantyId} not found`
      });
    }

    res.json({
      message: 'Warranty deleted successfully',
      warrantyId
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/warranties/:warrantyId/claims - Get warranty claims
router.get('/:warrantyId/claims', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { warrantyId } = req.params;

    const warranty = await Warranty.findOne({ warrantyId, tenantId });

    if (!warranty) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Warranty ${warrantyId} not found`
      });
    }

    // Also get standalone claims for this warranty
    const standaloneClaims = await Claim.find({ warrantyId, tenantId }).lean();

    res.json({
      embeddedClaims: warranty.claims,
      standaloneClaims,
      total: warranty.claims.length + standaloneClaims.length
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/warranties/:warrantyId/repairs - Get warranty repairs
router.get('/:warrantyId/repairs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { warrantyId } = req.params;

    const warranty = await Warranty.findOne({ warrantyId, tenantId });

    if (!warranty) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Warranty ${warrantyId} not found`
      });
    }

    // Also get standalone repairs for this warranty
    const standaloneRepairs = await Repair.find({ warrantyId, tenantId }).lean();

    res.json({
      embeddedRepairs: warranty.repairs,
      standaloneRepairs,
      total: warranty.repairs.length + standaloneRepairs.length
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/warranties/:warrantyId/service-history - Get service history
router.get('/:warrantyId/service-history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { warrantyId } = req.params;

    const warranty = await Warranty.findOne({ warrantyId, tenantId });

    if (!warranty) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Warranty ${warrantyId} not found`
      });
    }

    res.json({
      warrantyId,
      serviceHistory: warranty.serviceHistory.sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      )
    });
  } catch (error) {
    next(error);
  }
});

export default router;
