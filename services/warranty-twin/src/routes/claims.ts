import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Claim, ClaimStatus, ClaimPriority, IClaimItem } from '../models/Claim';
import { Warranty } from '../models/Warranty';
import { validateClaim, validateClaimUpdate, validateClaimApproval } from '../services/validator';

const router = Router();

// Get tenant ID from header (multi-tenant support)
const getTenantId = (req: Request): string => {
  return req.headers['x-tenant-id'] as string || 'default';
};

// GET /api/claims - List all claims with filtering
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const {
      warrantyId,
      customerId,
      productId,
      status,
      priority,
      fromDate,
      toDate,
      page = '1',
      limit = '50'
    } = req.query;

    const query: any = { tenantId };

    if (warrantyId) query.warrantyId = warrantyId;
    if (customerId) query.customerId = customerId;
    if (productId) query.productId = productId;
    if (status) query.status = status;
    if (priority) query.priority = priority;

    if (fromDate || toDate) {
      query.date = {};
      if (fromDate) query.date.$gte = new Date(fromDate as string);
      if (toDate) query.date.$lte = new Date(toDate as string);
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [claims, total] = await Promise.all([
      Claim.find(query)
        .sort({ date: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Claim.countDocuments(query)
    ]);

    res.json({
      data: claims,
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

// GET /api/claims/stats - Get claim statistics
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

    const stats = await Claim.aggregate([
      { $match: matchStage },
      {
        $facet: {
          total: [{ $count: 'count' }],
          byStatus: [
            { $group: { _id: '$status', count: { $sum: 1 } } }
          ],
          byPriority: [
            { $group: { _id: '$priority', count: { $sum: 1 } } }
          ],
          totalClaimedAmount: [
            { $group: { _id: null, total: { $sum: '$claimAmount' } } }
          ],
          totalApprovedAmount: [
            { $group: { _id: null, total: { $sum: '$approvedAmount' } } }
          ],
          averageProcessingTime: [
            {
              $match: { processedAt: { $exists: true } }
            },
            {
              $project: {
                processingTime: {
                  $subtract: ['$processedAt', '$date']
                }
              }
            },
            {
              $group: {
                _id: null,
                avgTime: { $avg: '$processingTime' }
              }
            }
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

// GET /api/claims/:claimId - Get single claim
router.get('/:claimId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { claimId } = req.params;

    const claim = await Claim.findOne({ claimId, tenantId }).lean();

    if (!claim) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Claim ${claimId} not found`
      });
    }

    // Get associated warranty info
    const warranty = await Warranty.findOne({ warrantyId: claim.warrantyId, tenantId })
      .select('warrantyId productName type coverage isValid')
      .lean();

    res.json({
      data: claim,
      warranty: warranty || null
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/claims - Create new claim
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);

    // Validate request body
    const validationResult = validateClaim(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation Error',
        details: validationResult.errors
      });
    }

    // Check warranty exists and is valid
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

    if (!warranty.isValid || !warranty.isActive) {
      return res.status(400).json({
        error: 'Invalid Warranty',
        message: 'Warranty is not valid or active'
      });
    }

    // Check if warranty covers the claim type
    const now = new Date();
    if (now > new Date(warranty.endDate)) {
      return res.status(400).json({
        error: 'Warranty Expired',
        message: 'Cannot file claim on expired warranty'
      });
    }

    const claimId = `CLM-${uuidv4().substring(0, 8).toUpperCase()}`;

    const claim = new Claim({
      ...req.body,
      claimId,
      tenantId,
      status: 'pending',
      approvedAmount: 0,
      deductibleApplied: warranty.coverage.deductible || 0,
      notes: []
    });

    await claim.save();

    // Add embedded claim to warranty
    const warrantyClaim = {
      claimId,
      date: claim.date,
      issue: claim.issue,
      description: claim.description,
      status: 'pending' as ClaimStatus,
      claimAmount: claim.claimAmount
    };

    warranty.addClaim(warrantyClaim);
    await warranty.save();

    res.status(201).json({
      message: 'Claim created successfully',
      data: claim
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/claims/:claimId/approve - Approve claim
router.patch('/:claimId/approve', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { claimId } = req.params;
    const { approvedAmount, notes } = req.body;

    const claim = await Claim.findOne({ claimId, tenantId });

    if (!claim) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Claim ${claimId} not found`
      });
    }

    if (claim.status !== 'pending') {
      return res.status(400).json({
        error: 'Invalid Status',
        message: `Cannot approve claim with status: ${claim.status}`
      });
    }

    const validated = validateClaimApproval({
      claimAmount: claim.claimAmount,
      approvedAmount: approvedAmount || claim.claimAmount
    });

    if (!validated.success) {
      return res.status(400).json({
        error: 'Validation Error',
        details: validated.errors
      });
    }

    const approvedBy = req.headers['x-user-id'] as string || 'system';
    claim.approve(approvedBy, approvedAmount);

    if (notes) {
      claim.addNote(uuidv4(), notes, approvedBy, false);
    }

    await claim.save();

    // Update warranty embedded claim
    await Warranty.updateOne(
      {
        warrantyId: claim.warrantyId,
        tenantId,
        'claims.claimId': claimId
      },
      {
        $set: {
          'claims.$.status': 'approved',
          'claims.$.approvedAmount': claim.approvedAmount,
          'claims.$.approvedBy': approvedBy,
          'claims.$.processedAt': claim.processedAt
        }
      }
    );

    res.json({
      message: 'Claim approved successfully',
      data: claim
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/claims/:claimId/reject - Reject claim
router.patch('/:claimId/reject', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { claimId } = req.params;
    const { reason, notes } = req.body;

    if (!reason) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Rejection reason is required'
      });
    }

    const claim = await Claim.findOne({ claimId, tenantId });

    if (!claim) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Claim ${claimId} not found`
      });
    }

    if (claim.status !== 'pending') {
      return res.status(400).json({
        error: 'Invalid Status',
        message: `Cannot reject claim with status: ${claim.status}`
      });
    }

    const rejectedBy = req.headers['x-user-id'] as string || 'system';
    claim.reject(rejectedBy, reason);

    if (notes) {
      claim.addNote(uuidv4(), notes, rejectedBy, true);
    }

    await claim.save();

    // Update warranty embedded claim
    await Warranty.updateOne(
      {
        warrantyId: claim.warrantyId,
        tenantId,
        'claims.claimId': claimId
      },
      {
        $set: {
          'claims.$.status': 'rejected',
          'claims.$.resolution': reason
        }
      }
    );

    res.json({
      message: 'Claim rejected',
      data: claim
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/claims/:claimId/start - Start processing claim
router.patch('/:claimId/start', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { claimId } = req.params;

    const claim = await Claim.findOne({ claimId, tenantId });

    if (!claim) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Claim ${claimId} not found`
      });
    }

    if (claim.status !== 'approved') {
      return res.status(400).json({
        error: 'Invalid Status',
        message: 'Claim must be approved before starting processing'
      });
    }

    claim.startProcessing();
    if (req.body.scheduledDate) {
      claim.scheduledDate = new Date(req.body.scheduledDate);
    }
    if (req.body.estimatedCompletionDate) {
      claim.estimatedCompletionDate = new Date(req.body.estimatedCompletionDate);
    }

    await claim.save();

    res.json({
      message: 'Claim processing started',
      data: claim
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/claims/:claimId/complete - Complete claim
router.patch('/:claimId/complete', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { claimId } = req.params;
    const { resolution } = req.body;

    const claim = await Claim.findOne({ claimId, tenantId });

    if (!claim) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Claim ${claimId} not found`
      });
    }

    if (claim.status !== 'in_progress') {
      return res.status(400).json({
        error: 'Invalid Status',
        message: 'Claim must be in progress to complete'
      });
    }

    claim.complete(resolution || 'Claim resolved successfully');
    await claim.save();

    // Update warranty embedded claim
    await Warranty.updateOne(
      {
        warrantyId: claim.warrantyId,
        tenantId,
        'claims.claimId': claimId
      },
      {
        $set: {
          'claims.$.status': 'completed',
          'claims.$.resolution': resolution
        }
      }
    );

    res.json({
      message: 'Claim completed successfully',
      data: claim
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/claims/:claimId/notes - Add note to claim
router.post('/:claimId/notes', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { claimId } = req.params;
    const { content, isInternal } = req.body;

    if (!content) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Note content is required'
      });
    }

    const claim = await Claim.findOne({ claimId, tenantId });

    if (!claim) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Claim ${claimId} not found`
      });
    }

    const addedBy = req.headers['x-user-id'] as string || 'system';
    const noteId = uuidv4();
    claim.addNote(noteId, content, addedBy, isInternal || false);

    await claim.save();

    res.json({
      message: 'Note added successfully',
      noteId
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/claims/:claimId/documents - Add document to claim
router.post('/:claimId/documents', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { claimId } = req.params;
    const { documentUrl, documentType } = req.body;

    if (!documentUrl) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Document URL is required'
      });
    }

    const claim = await Claim.findOne({ claimId, tenantId });

    if (!claim) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Claim ${claimId} not found`
      });
    }

    claim.documents.push(documentUrl);
    await claim.save();

    res.json({
      message: 'Document added successfully',
      documents: claim.documents
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/claims/:claimId - Update claim
router.patch('/:claimId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { claimId } = req.params;

    const validationResult = validateClaimUpdate(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation Error',
        details: validationResult.errors
      });
    }

    const claim = await Claim.findOne({ claimId, tenantId });

    if (!claim) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Claim ${claimId} not found`
      });
    }

    const allowedUpdates = ['description', 'priority', 'items', 'scheduledDate'];
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        (claim as any)[field] = req.body[field];
      }
    });

    await claim.save();

    res.json({
      message: 'Claim updated successfully',
      data: claim
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/claims/:claimId - Delete claim
router.delete('/:claimId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { claimId } = req.params;

    const claim = await Claim.findOne({ claimId, tenantId });

    if (!claim) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Claim ${claimId} not found`
      });
    }

    // Only allow deletion of pending claims
    if (claim.status !== 'pending') {
      return res.status(400).json({
        error: 'Invalid Status',
        message: 'Only pending claims can be deleted'
      });
    }

    await Claim.deleteOne({ claimId, tenantId });

    // Remove from warranty
    await Warranty.updateOne(
      {
        warrantyId: claim.warrantyId,
        tenantId
      },
      {
        $pull: {
          claims: { claimId }
        }
      }
    );

    res.json({
      message: 'Claim deleted successfully',
      claimId
    });
  } catch (error) {
    next(error);
  }
});

export default router;
