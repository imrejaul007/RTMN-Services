import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Repair, IPartUsed, ILaborEntry, RepairStatus } from '../models/Repair';
import { Warranty } from '../models/Warranty';
import { Claim } from '../models/Claim';
import { validateRepair, validateRepairUpdate, validatePart, validateLabor } from '../services/validator';

const router = Router();

// Get tenant ID from header (multi-tenant support)
const getTenantId = (req: Request): string => {
  return req.headers['x-tenant-id'] as string || 'default';
};

// GET /api/repairs - List all repairs with filtering
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const {
      warrantyId,
      claimId,
      customerId,
      productId,
      status,
      technician,
      fromDate,
      toDate,
      page = '1',
      limit = '50'
    } = req.query;

    const query: any = { tenantId };

    if (warrantyId) query.warrantyId = warrantyId;
    if (claimId) query.claimId = claimId;
    if (customerId) query.customerId = customerId;
    if (productId) query.productId = productId;
    if (status) query.status = status;
    if (technician) query.technician = technician;

    if (fromDate || toDate) {
      query.date = {};
      if (fromDate) query.date.$gte = new Date(fromDate as string);
      if (toDate) query.date.$lte = new Date(toDate as string);
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [repairs, total] = await Promise.all([
      Repair.find(query)
        .sort({ date: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Repair.countDocuments(query)
    ]);

    res.json({
      data: repairs,
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

// GET /api/repairs/stats - Get repair statistics
router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { fromDate, toDate } = req.query;

    const matchStage: any = { tenantId };
    if (fromDate || toDate) {
      matchStage.date = {};
      if (fromDate) matchStage.date.$gte = new Date(fromDate as string);
      if (toDate) matchStage.date.$lte = new Date(toDate as string);
    }

    const stats = await Repair.aggregate([
      { $match: matchStage },
      {
        $facet: {
          total: [{ $count: 'count' }],
          byStatus: [
            { $group: { _id: '$status', count: { $sum: 1 } } }
          ],
          byCategory: [
            { $group: { _id: '$category', count: { $sum: 1 } } }
          ],
          totalCost: [
            { $group: { _id: null, total: { $sum: '$totalCost' } } }
          ],
          warrantyCoveredCost: [
            { $match: { isWarrantyCovered: true } },
            { $group: { _id: null, total: { $sum: '$totalCost' } } }
          ],
          averageRepairTime: [
            {
              $match: {
                completedAt: { $exists: true },
                startedAt: { $exists: true }
              }
            },
            {
              $project: {
                duration: {
                  $subtract: ['$completedAt', '$startedAt']
                }
              }
            },
            {
              $group: {
                _id: null,
                avgTime: { $avg: '$duration' }
              }
            }
          ],
          topTechnicians: [
            { $match: { technician: { $exists: true, $ne: null } } },
            {
              $group: {
                _id: '$technician',
                count: { $sum: 1 },
                totalRevenue: { $sum: '$customerPaidAmount' }
              }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
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

// GET /api/repairs/scheduled - Get scheduled repairs
router.get('/scheduled', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { fromDate, toDate, technician } = req.query;

    const query: any = {
      tenantId,
      status: 'scheduled'
    };

    if (technician) query.technician = technician;

    const repairs = await Repair.find(query)
      .populate('customerId', 'name email phone')
      .sort({ scheduledDate: 1 })
      .lean();

    res.json({
      data: repairs,
      count: repairs.length
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/repairs/:repairId - Get single repair
router.get('/:repairId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { repairId } = req.params;

    const repair = await Repair.findOne({ repairId, tenantId }).lean();

    if (!repair) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Repair ${repairId} not found`
      });
    }

    // Get associated warranty and claim if exists
    const [warranty, claim] = await Promise.all([
      repair.warrantyId ?
        Warranty.findOne({ warrantyId: repair.warrantyId, tenantId })
          .select('warrantyId productName type coverage isValid')
          .lean() : null,
      repair.claimId ?
        Claim.findOne({ claimId: repair.claimId, tenantId })
          .select('claimId issue status approvedAmount')
          .lean() : null
    ]);

    res.json({
      data: repair,
      warranty: warranty || null,
      claim: claim || null
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/repairs - Create new repair
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);

    // Validate request body
    const validationResult = validateRepair(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation Error',
        details: validationResult.errors
      });
    }

    const repairId = `REP-${uuidv4().substring(0, 8).toUpperCase()}`;

    // If warrantyId provided, verify it exists
    if (req.body.warrantyId) {
      const warranty = await Warranty.findOne({
        warrantyId: req.body.warrantyId,
        tenantId
      });

      if (!warranty) {
        return res.status(404).json({
          error: 'Warranty Not Found',
          message: `Warranty ${req.body.warrantyId} not found`
        });
      }
    }

    // If claimId provided, verify it exists
    if (req.body.claimId) {
      const claim = await Claim.findOne({
        claimId: req.body.claimId,
        tenantId
      });

      if (!claim) {
        return res.status(404).json({
          error: 'Claim Not Found',
          message: `Claim ${req.body.claimId} not found`
        });
      }

      if (claim.status !== 'approved' && claim.status !== 'in_progress') {
        return res.status(400).json({
          error: 'Invalid Claim Status',
          message: 'Claim must be approved or in progress'
        });
      }
    }

    const repair = new Repair({
      ...req.body,
      repairId,
      tenantId,
      status: 'scheduled',
      partsUsed: [],
      laborEntries: [],
      totalPartsCost: 0,
      totalLaborCost: 0,
      totalCost: 0,
      attachments: []
    });

    await repair.save();

    // Add embedded repair to warranty if applicable
    if (req.body.warrantyId) {
      await Warranty.updateOne(
        {
          warrantyId: req.body.warrantyId,
          tenantId
        },
        {
          $push: {
            repairs: {
              repairId,
              claimId: req.body.claimId,
              date: repair.date,
              type: repair.type,
              description: repair.description,
              status: 'scheduled' as RepairStatus
            }
          }
        }
      );
    }

    res.status(201).json({
      message: 'Repair created successfully',
      data: repair
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/repairs/:repairId/start - Start repair
router.patch('/:repairId/start', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { repairId } = req.params;

    const repair = await Repair.findOne({ repairId, tenantId });

    if (!repair) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Repair ${repairId} not found`
      });
    }

    if (repair.status !== 'scheduled') {
      return res.status(400).json({
        error: 'Invalid Status',
        message: `Cannot start repair with status: ${repair.status}`
      });
    }

    repair.start();
    if (req.body.technician) {
      repair.technician = req.body.technician;
    }
    if (req.body.technicianNotes) {
      repair.technicianNotes = req.body.technicianNotes;
    }

    await repair.save();

    // Update warranty embedded repair
    if (repair.warrantyId) {
      await Warranty.updateOne(
        {
          warrantyId: repair.warrantyId,
          tenantId,
          'repairs.repairId': repairId
        },
        {
          $set: { 'repairs.$.status': 'in_progress' }
        }
      );
    }

    res.json({
      message: 'Repair started',
      data: repair
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/repairs/:repairId/complete - Complete repair
router.patch('/:repairId/complete', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { repairId } = req.params;
    const { technicianNotes, diagnosis } = req.body;

    const repair = await Repair.findOne({ repairId, tenantId });

    if (!repair) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Repair ${repairId} not found`
      });
    }

    if (repair.status !== 'in_progress') {
      return res.status(400).json({
        error: 'Invalid Status',
        message: 'Repair must be in progress to complete'
      });
    }

    repair.complete(technicianNotes);
    if (diagnosis) {
      repair.diagnosis = {
        ...diagnosis,
        diagnosedAt: new Date(),
        diagnosedBy: req.headers['x-user-id'] as string || 'system'
      };
    }

    await repair.save();

    // Update warranty embedded repair
    if (repair.warrantyId) {
      await Warranty.updateOne(
        {
          warrantyId: repair.warrantyId,
          tenantId,
          'repairs.repairId': repairId
        },
        {
          $set: {
            'repairs.$.status': 'completed',
            'repairs.$.completedAt': repair.completedAt,
            'repairs.$.cost': repair.totalCost
          }
        }
      );
    }

    // Update associated claim if exists
    if (repair.claimId) {
      await Claim.updateOne(
        {
          claimId: repair.claimId,
          tenantId
        },
        {
          $set: { status: 'completed' }
        }
      );
    }

    res.json({
      message: 'Repair completed successfully',
      data: repair
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/repairs/:repairId/cancel - Cancel repair
router.patch('/:repairId/cancel', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { repairId } = req.params;
    const { reason } = req.body;

    const repair = await Repair.findOne({ repairId, tenantId });

    if (!repair) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Repair ${repairId} not found`
      });
    }

    if (repair.status === 'completed' || repair.status === 'cancelled') {
      return res.status(400).json({
        error: 'Invalid Status',
        message: `Cannot cancel repair with status: ${repair.status}`
      });
    }

    repair.cancel(reason || 'Cancelled by user');
    await repair.save();

    res.json({
      message: 'Repair cancelled',
      data: repair
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/repairs/:repairId/parts - Add part to repair
router.post('/:repairId/parts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { repairId } = req.params;

    const validationResult = validatePart(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation Error',
        details: validationResult.errors
      });
    }

    const repair = await Repair.findOne({ repairId, tenantId });

    if (!repair) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Repair ${repairId} not found`
      });
    }

    const part: IPartUsed = {
      partId: req.body.partId || uuidv4(),
      partName: req.body.partName,
      partNumber: req.body.partNumber,
      quantity: req.body.quantity || 1,
      unitCost: req.body.unitCost || 0,
      totalCost: (req.body.quantity || 1) * (req.body.unitCost || 0),
      isWarrantyCovered: req.body.isWarrantyCovered !== false
    };

    repair.addPart(part);
    await repair.save();

    res.json({
      message: 'Part added successfully',
      data: repair
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/repairs/:repairId/labor - Add labor entry to repair
router.post('/:repairId/labor', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { repairId } = req.params;

    const validationResult = validateLabor(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation Error',
        details: validationResult.errors
      });
    }

    const repair = await Repair.findOne({ repairId, tenantId });

    if (!repair) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Repair ${repairId} not found`
      });
    }

    const labor: ILaborEntry = {
      technicianId: req.body.technicianId,
      technicianName: req.body.technicianName,
      startTime: new Date(req.body.startTime),
      endTime: req.body.endTime ? new Date(req.body.endTime) : undefined,
      hourlyRate: req.body.hourlyRate,
      notes: req.body.notes
    };

    repair.addLabor(labor);
    await repair.save();

    res.json({
      message: 'Labor entry added successfully',
      data: repair
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/repairs/:repairId/attachments - Add attachment to repair
router.post('/:repairId/attachments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { repairId } = req.params;
    const { type, url, description } = req.body;

    if (!url || !type) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'URL and type are required'
      });
    }

    const validTypes = ['image', 'document', 'video'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: `Invalid type. Must be one of: ${validTypes.join(', ')}`
      });
    }

    const repair = await Repair.findOne({ repairId, tenantId });

    if (!repair) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Repair ${repairId} not found`
      });
    }

    repair.attachments.push({
      attachmentId: uuidv4(),
      type,
      url,
      description,
      uploadedAt: new Date()
    });

    await repair.save();

    res.json({
      message: 'Attachment added successfully',
      data: repair
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/repairs/:repairId - Update repair
router.patch('/:repairId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { repairId } = req.params;

    const validationResult = validateRepairUpdate(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation Error',
        details: validationResult.errors
      });
    }

    const repair = await Repair.findOne({ repairId, tenantId });

    if (!repair) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Repair ${repairId} not found`
      });
    }

    const allowedUpdates = [
      'type', 'category', 'description', 'priority',
      'scheduledDate', 'estimatedCompletionDate', 'technician', 'technicianNotes'
    ];

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        (repair as any)[field] = req.body[field];
      }
    });

    await repair.save();

    res.json({
      message: 'Repair updated successfully',
      data: repair
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/repairs/:repairId/feedback - Submit customer feedback
router.post('/:repairId/feedback', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { repairId } = req.params;
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Rating must be between 1 and 5'
      });
    }

    const repair = await Repair.findOne({ repairId, tenantId });

    if (!repair) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Repair ${repairId} not found`
      });
    }

    if (repair.status !== 'completed') {
      return res.status(400).json({
        error: 'Invalid Status',
        message: 'Can only submit feedback for completed repairs'
      });
    }

    repair.customerFeedback = {
      rating,
      comment,
      submittedAt: new Date()
    };

    await repair.save();

    res.json({
      message: 'Feedback submitted successfully',
      data: repair
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/repairs/:repairId - Delete repair
router.delete('/:repairId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { repairId } = req.params;

    const repair = await Repair.findOne({ repairId, tenantId });

    if (!repair) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Repair ${repairId} not found`
      });
    }

    // Only allow deletion of scheduled repairs
    if (repair.status !== 'scheduled') {
      return res.status(400).json({
        error: 'Invalid Status',
        message: 'Only scheduled repairs can be deleted'
      });
    }

    await Repair.deleteOne({ repairId, tenantId });

    // Remove from warranty
    if (repair.warrantyId) {
      await Warranty.updateOne(
        {
          warrantyId: repair.warrantyId,
          tenantId
        },
        {
          $pull: {
            repairs: { repairId }
          }
        }
      );
    }

    res.json({
      message: 'Repair deleted successfully',
      repairId
    });
  } catch (error) {
    next(error);
  }
});

export default router;
