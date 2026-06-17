import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { Claim } from '../models/Claim';
import { Warranty } from '../models/Warranty';
import { AMC } from '../models/AMC';
import { Maintenance } from '../models/Maintenance';
import { Asset } from '../models/Asset';

const router = Router();

// Validation schemas
const createClaimSchema = z.object({
  assetId: z.string().min(1),
  claimType: z.enum(['warranty', 'amc', 'insurance', 'damage', 'defect', 'malfunction']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  title: z.string().min(1).max(255),
  description: z.string().min(1),
  incidentDate: z.string().datetime(),
  issue: z.object({
    category: z.string(),
    subcategory: z.string().optional(),
    symptoms: z.array(z.string()).optional(),
    severity: z.enum(['minor', 'moderate', 'major', 'critical']).optional(),
    affectedParts: z.array(z.string()).optional()
  }).optional(),
  warrantyId: z.string().optional(),
  amcId: z.string().optional(),
  provider: z.object({
    name: z.string(),
    contactPerson: z.string().optional(),
    contactNumber: z.string().optional(),
    email: z.string().email().optional(),
    claimNumber: z.string().optional()
  }).optional()
});

const updateClaimSchema = z.object({
  status: z.enum(['draft', 'submitted', 'under_review', 'approved', 'rejected', 'in_progress', 'completed', 'closed', 'cancelled']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  title: z.string().min(1).max(255).optional(),
  description: z.string().min(1).optional(),
  issue: z.object({
    category: z.string().optional(),
    subcategory: z.string().optional(),
    symptoms: z.array(z.string()).optional(),
    severity: z.enum(['minor', 'moderate', 'major', 'critical']).optional(),
    affectedParts: z.array(z.string()).optional()
  }).optional(),
  diagnosis: z.object({
    diagnosedBy: z.string().optional(),
    diagnosedDate: z.string().datetime().optional(),
    diagnosis: z.string().optional(),
    notes: z.string().optional()
  }).optional(),
  resolution: z.object({
    resolutionType: z.enum(['repair', 'replacement', 'refund', 'credit', 'other']).optional(),
    resolutionDetails: z.string().optional(),
    resolvedBy: z.string().optional(),
    resolvedDate: z.string().datetime().optional(),
    sparePartsUsed: z.array(z.object({
      partName: z.string(),
      partNumber: z.string().optional(),
      quantity: z.number(),
      cost: z.number().optional()
    })).optional()
  }).optional(),
  costs: z.object({
    estimatedCost: z.number().optional(),
    approvedCost: z.number().optional(),
    actualCost: z.number().optional()
  }).optional()
});

// Middleware to extract tenantId
const extractTenantId = (req: Request, res: Response, next: NextFunction) => {
  req.body.tenantId = req.headers['x-tenant-id'] as string || 'default';
  next();
};

// GET /claims - List all claims
router.get('/', extractTenantId, async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.tenantId;
    const { assetId, claimType, status, priority, limit = 50, offset = 0 } = req.query;

    const filter: Record<string, unknown> = { tenantId };
    if (assetId) filter.assetId = assetId;
    if (claimType) filter.claimType = claimType;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    const claims = await Claim.find(filter)
      .skip(Number(offset))
      .limit(Number(limit))
      .sort({ reportedDate: -1 });

    const total = await Claim.countDocuments(filter);

    res.json({
      success: true,
      data: claims,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// GET /claims/:id - Get single claim
router.get('/:id', extractTenantId, async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.tenantId;
    const claim = await Claim.findOne({ tenantId, _id: req.params.id });

    if (!claim) {
      return res.status(404).json({ success: false, error: 'Claim not found' });
    }

    // Get related data
    const [asset, warranty, amc, maintenanceRecord] = await Promise.all([
      Asset.findOne({ tenantId, assetId: claim.assetId }),
      claim.warrantyId ? Warranty.findOne({ tenantId, warrantyId: claim.warrantyId }) : null,
      claim.amcId ? AMC.findOne({ tenantId, amcId: claim.amcId }) : null,
      claim.claimId ? Maintenance.findOne({ tenantId, claimId: claim.claimId }) : null
    ]);

    res.json({
      success: true,
      data: {
        ...claim.toObject(),
        asset,
        warranty,
        amc,
        maintenanceRecord
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// POST /claims - Create claim
router.post('/', extractTenantId, async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.tenantId;
    const validatedData = createClaimSchema.parse(req.body);

    // Validate warranty/AMC if provided
    if (validatedData.warrantyId) {
      const warranty = await Warranty.findOne({ tenantId, warrantyId: validatedData.warrantyId });
      if (!warranty || warranty.status !== 'active') {
        return res.status(400).json({
          success: false,
          error: 'Warranty not found or not active'
        });
      }
    }

    if (validatedData.amcId) {
      const amc = await AMC.findOne({ tenantId, amcId: validatedData.amcId });
      if (!amc || amc.status !== 'active') {
        return res.status(400).json({
          success: false,
          error: 'AMC not found or not active'
        });
      }
    }

    const claimId = `CLM-${uuidv4().substring(0, 8).toUpperCase()}`;

    const claim = new Claim({
      ...validatedData,
      incidentDate: new Date(validatedData.incidentDate),
      tenantId,
      claimId,
      status: 'draft',
      priority: validatedData.priority || 'medium',
      reportedDate: new Date(),
      history: [{
        action: 'Claim created',
        performedAt: new Date(),
        notes: 'Initial claim creation'
      }]
    });

    await claim.save();

    res.status(201).json({ success: true, data: claim });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors });
    }
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// PUT /claims/:id - Update claim
router.put('/:id', extractTenantId, async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.tenantId;
    const validatedData = updateClaimSchema.parse(req.body);

    const existingClaim = await Claim.findOne({ tenantId, _id: req.params.id });
    if (!existingClaim) {
      return res.status(404).json({ success: false, error: 'Claim not found' });
    }

    // Track status changes in history
    const historyUpdate: Array<{
      action: string;
      performedBy?: string;
      performedAt: Date;
      notes?: string;
    }> = [];

    if (validatedData.status && validatedData.status !== existingClaim.status) {
      historyUpdate.push({
        action: `Status changed from ${existingClaim.status} to ${validatedData.status}`,
        performedBy: req.headers['x-user-id'] as string,
        performedAt: new Date()
      });
    }

    if (validatedData.resolution?.resolvedDate) {
      historyUpdate.push({
        action: 'Resolution completed',
        performedBy: validatedData.resolution.resolvedBy || req.headers['x-user-id'] as string,
        performedAt: new Date(validatedData.resolution.resolvedDate)
      });
    }

    const claim = await Claim.findOneAndUpdate(
      { tenantId, _id: req.params.id },
      {
        $set: validatedData,
        $push: { history: { $each: historyUpdate } }
      },
      { new: true, runValidators: true }
    );

    if (!claim) {
      return res.status(404).json({ success: false, error: 'Claim not found' });
    }

    res.json({ success: true, data: claim });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors });
    }
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// DELETE /claims/:id - Delete claim
router.delete('/:id', extractTenantId, async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.tenantId;
    const claim = await Claim.findOneAndDelete({ tenantId, _id: req.params.id });

    if (!claim) {
      return res.status(404).json({ success: false, error: 'Claim not found' });
    }

    res.json({ success: true, message: 'Claim deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// POST /claims/:id/submit - Submit claim for review
router.post('/:id/submit', extractTenantId, async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.tenantId;

    const claim = await Claim.findOneAndUpdate(
      { tenantId, _id: req.params.id, status: 'draft' },
      {
        $set: { status: 'submitted' },
        $push: {
          history: {
            action: 'Claim submitted for review',
            performedBy: req.headers['x-user-id'] as string,
            performedAt: new Date()
          }
        }
      },
      { new: true, runValidators: true }
    );

    if (!claim) {
      return res.status(404).json({
        success: false,
        error: 'Claim not found or cannot be submitted from current status'
      });
    }

    res.json({ success: true, data: claim });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// POST /claims/:id/approve - Approve claim
router.post('/:id/approve', extractTenantId, async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.tenantId;
    const { approvedCost } = req.body;

    const claim = await Claim.findOneAndUpdate(
      { tenantId, _id: req.params.id, status: 'under_review' },
      {
        $set: {
          status: 'approved',
          'costs.approvedCost': approvedCost
        },
        $push: {
          history: {
            action: 'Claim approved',
            performedBy: req.headers['x-user-id'] as string,
            performedAt: new Date(),
            notes: approvedCost ? `Approved cost: ${approvedCost}` : undefined
          }
        }
      },
      { new: true, runValidators: true }
    );

    if (!claim) {
      return res.status(404).json({
        success: false,
        error: 'Claim not found or not under review'
      });
    }

    res.json({ success: true, data: claim });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// POST /claims/:id/reject - Reject claim
router.post('/:id/reject', extractTenantId, async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.tenantId;
    const { reason } = req.body;

    const claim = await Claim.findOneAndUpdate(
      { tenantId, _id: req.params.id, status: { $in: ['submitted', 'under_review'] } },
      {
        $set: { status: 'rejected' },
        $push: {
          history: {
            action: 'Claim rejected',
            performedBy: req.headers['x-user-id'] as string,
            performedAt: new Date(),
            notes: reason
          }
        }
      },
      { new: true, runValidators: true }
    );

    if (!claim) {
      return res.status(404).json({
        success: false,
        error: 'Claim not found or cannot be rejected from current status'
      });
    }

    res.json({ success: true, data: claim });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// GET /claims/stats/summary - Get claim statistics
router.get('/stats/summary', extractTenantId, async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.tenantId;

    const [totalClaims, byStatus, byType, avgResolutionTime] = await Promise.all([
      Claim.countDocuments({ tenantId }),
      Claim.aggregate([
        { $match: { tenantId } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Claim.aggregate([
        { $match: { tenantId } },
        { $group: { _id: '$claimType', count: { $sum: 1 } } }
      ]),
      Claim.aggregate([
        {
          $match: {
            tenantId,
            status: { $in: ['completed', 'closed'] },
            'resolution.resolvedDate': { $exists: true }
          }
        },
        {
          $project: {
            resolutionTime: {
              $divide: [
                { $subtract: ['$resolution.resolvedDate', '$reportedDate'] },
                1000 * 60 * 60 * 24 // Convert to days
              ]
            }
          }
        },
        {
          $group: {
            _id: null,
            avgResolutionTimeDays: { $avg: '$resolutionTime' }
          }
        }
      ])
    ]);

    const totalCost = await Claim.aggregate([
      { $match: { tenantId } },
      {
        $group: {
          _id: null,
          estimated: { $sum: '$costs.estimatedCost' },
          approved: { $sum: '$costs.approvedCost' },
          actual: { $sum: '$costs.actualCost' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        totalClaims,
        avgResolutionTimeDays: avgResolutionTime[0]?.avgResolutionTimeDays || 0,
        totalCost: {
          estimated: totalCost[0]?.estimated || 0,
          approved: totalCost[0]?.approved || 0,
          actual: totalCost[0]?.actual || 0
        },
        byStatus: byStatus.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {}),
        byType: byType.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {})
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;
