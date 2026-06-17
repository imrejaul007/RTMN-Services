import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { Partner, PartnerType, PartnerStatus } from '../models/Partner';

const router = Router();

// Validation Schemas
const createPartnerSchema = z.object({
  name: z.string().min(1).max(200),
  legalName: z.string().optional(),
  type: z.enum(['vendor', 'supplier', 'service_provider', 'courier', 'integrator']),
  status: z.enum(['active', 'inactive', 'pending', 'suspended', 'blacklisted']).optional(),
  category: z.object({
    primary: z.string().min(1),
    secondary: z.array(z.string()).optional(),
  }),
  description: z.string().optional(),
  website: z.string().url().optional(),
  taxId: z.string().optional(),
  registrationNumber: z.string().optional(),
  primaryContact: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
    role: z.string().min(1),
  }),
  contacts: z.array(z.object({
    name: z.string(),
    email: z.string().email(),
    phone: z.string().optional(),
    role: z.string(),
    isPrimary: z.boolean().optional(),
  })).optional(),
  billingAddress: z.object({
    street: z.string(),
    city: z.string(),
    state: z.string().optional(),
    country: z.string(),
    postalCode: z.string().optional(),
  }).optional(),
  shippingAddress: z.object({
    street: z.string(),
    city: z.string(),
    state: z.string().optional(),
    country: z.string(),
    postalCode: z.string().optional(),
  }).optional(),
  paymentTerms: z.string().optional(),
  creditLimit: z.number().optional(),
  integrationStatus: z.enum(['none', 'basic', 'standard', 'advanced', 'real_time']).optional(),
  partnership: z.object({
    startDate: z.string().or(z.date()),
    endDate: z.string().or(z.date()).optional(),
    trialEndDate: z.string().or(z.date()).optional(),
    renewalTerms: z.string().optional(),
    exclusivity: z.boolean().optional(),
  }),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
});

const updatePartnerSchema = createPartnerSchema.partial();

// Middleware to extract tenantId
const extractTenantId = (req: Request, res: Response, next: NextFunction) => {
  req.body.tenantId = req.headers['x-tenant-id'] as string || 'default';
  next();
};

// Create Partner
router.post('/', extractTenantId, async (req: Request, res: Response) => {
  try {
    const validationResult = createPartnerSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationResult.error.errors,
      });
    }

    const data = validationResult.data;
    const partnerId = `PART-${uuidv4().substring(0, 8).toUpperCase()}`;

    const partner = new Partner({
      ...data,
      partnerId,
      tenantId: req.body.tenantId,
      partnership: {
        ...data.partnership,
        startDate: new Date(data.partnership.startDate),
        endDate: data.partnership.endDate ? new Date(data.partnership.endDate) : undefined,
        trialEndDate: data.partnership.trialEndDate ? new Date(data.partnership.trialEndDate) : undefined,
      },
      status: data.status || 'pending',
      integrationStatus: data.integrationStatus || 'none',
    });

    await partner.save();

    res.status(201).json({
      success: true,
      data: partner,
      message: 'Partner created successfully',
    });
  } catch (error: any) {
    console.error('Create partner error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create partner',
    });
  }
});

// Get All Partners
router.get('/', extractTenantId, async (req: Request, res: Response) => {
  try {
    const {
      page = '1',
      limit = '20',
      type,
      status,
      category,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const tenantId = req.headers['x-tenant-id'] as string || 'default';
    const query: any = { tenantId, isDeleted: false };

    if (type) query.type = type;
    if (status) query.status = status;
    if (category) query['category.primary'] = category;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { partnerId: { $regex: search, $options: 'i' } },
        { 'primaryContact.email': { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const sort: any = { [sortBy as string]: sortOrder === 'asc' ? 1 : -1 };

    const [partners, total] = await Promise.all([
      Partner.find(query).sort(sort).skip(skip).limit(limitNum),
      Partner.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: partners,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error('Get partners error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get partners',
    });
  }
});

// Get Partner by ID
router.get('/:id', extractTenantId, async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || 'default';
    const partner = await Partner.findOne({
      $or: [{ partnerId: req.params.id }, { _id: req.params.id }],
      tenantId,
      isDeleted: false,
    });

    if (!partner) {
      return res.status(404).json({
        success: false,
        error: 'Partner not found',
      });
    }

    res.json({
      success: true,
      data: partner,
    });
  } catch (error: any) {
    console.error('Get partner error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get partner',
    });
  }
});

// Update Partner
router.put('/:id', extractTenantId, async (req: Request, res: Response) => {
  try {
    const validationResult = updatePartnerSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationResult.error.errors,
      });
    }

    const tenantId = req.headers['x-tenant-id'] as string || 'default';
    const data = validationResult.data;

    // Handle date conversions
    if (data.partnership) {
      if (data.partnership.startDate) {
        (data.partnership as any).startDate = new Date(data.partnership.startDate);
      }
      if (data.partnership.endDate) {
        (data.partnership as any).endDate = new Date(data.partnership.endDate);
      }
      if (data.partnership.trialEndDate) {
        (data.partnership as any).trialEndDate = new Date(data.partnership.trialEndDate);
      }
    }

    const partner = await Partner.findOneAndUpdate(
      {
        $or: [{ partnerId: req.params.id }, { _id: req.params.id }],
        tenantId,
        isDeleted: false,
      },
      { ...data, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!partner) {
      return res.status(404).json({
        success: false,
        error: 'Partner not found',
      });
    }

    res.json({
      success: true,
      data: partner,
      message: 'Partner updated successfully',
    });
  } catch (error: any) {
    console.error('Update partner error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update partner',
    });
  }
});

// Delete Partner (Soft Delete)
router.delete('/:id', extractTenantId, async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    const partner = await Partner.findOneAndUpdate(
      {
        $or: [{ partnerId: req.params.id }, { _id: req.params.id }],
        tenantId,
        isDeleted: false,
      },
      { isDeleted: true, deletedAt: new Date() },
      { new: true }
    );

    if (!partner) {
      return res.status(404).json({
        success: false,
        error: 'Partner not found',
      });
    }

    res.json({
      success: true,
      message: 'Partner deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete partner error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete partner',
    });
  }
});

// Get Partner by Type
router.get('/type/:type', extractTenantId, async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || 'default';
    const { page = '1', limit = '20' } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const query = {
      tenantId,
      type: req.params.type,
      isDeleted: false,
    };

    const [partners, total] = await Promise.all([
      Partner.find(query).skip(skip).limit(limitNum).sort({ createdAt: -1 }),
      Partner.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: partners,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error('Get partners by type error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get partners',
    });
  }
});

// Update Partner Status
router.patch('/:id/status', extractTenantId, async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    if (!status || !['active', 'inactive', 'pending', 'suspended', 'blacklisted'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status',
      });
    }

    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    const partner = await Partner.findOneAndUpdate(
      {
        $or: [{ partnerId: req.params.id }, { _id: req.params.id }],
        tenantId,
        isDeleted: false,
      },
      { status, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!partner) {
      return res.status(404).json({
        success: false,
        error: 'Partner not found',
      });
    }

    res.json({
      success: true,
      data: partner,
      message: 'Partner status updated successfully',
    });
  } catch (error: any) {
    console.error('Update partner status error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update partner status',
    });
  }
});

// Get Partners Summary/Stats
router.get('/stats/summary', extractTenantId, async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    const [total, byType, byStatus, topByTrust] = await Promise.all([
      Partner.countDocuments({ tenantId, isDeleted: false }),
      Partner.aggregate([
        { $match: { tenantId, isDeleted: false } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
      Partner.aggregate([
        { $match: { tenantId, isDeleted: false } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Partner.find({ tenantId, isDeleted: false })
        .sort({ trustScore: -1 })
        .limit(10)
        .select('partnerId name type trustScore status'),
    ]);

    const byTypeMap = byType.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {} as Record<string, number>);

    const byStatusMap = byStatus.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {} as Record<string, number>);

    res.json({
      success: true,
      data: {
        total,
        byType: byTypeMap,
        byStatus: byStatusMap,
        topByTrust,
      },
    });
  } catch (error: any) {
    console.error('Get partner stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get partner stats',
    });
  }
});

// Update Trust Score
router.patch('/:id/trust-score', extractTenantId, async (req: Request, res: Response) => {
  try {
    const { trustScore, breakdown } = req.body;

    if (trustScore === undefined || trustScore < 0 || trustScore > 100) {
      return res.status(400).json({
        success: false,
        error: 'Trust score must be between 0 and 100',
      });
    }

    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    const updateData: any = { trustScore, updatedAt: new Date() };
    if (breakdown) {
      updateData.trustScoreBreakdown = breakdown;
    }

    const partner = await Partner.findOneAndUpdate(
      {
        $or: [{ partnerId: req.params.id }, { _id: req.params.id }],
        tenantId,
        isDeleted: false,
      },
      updateData,
      { new: true, runValidators: true }
    );

    if (!partner) {
      return res.status(404).json({
        success: false,
        error: 'Partner not found',
      });
    }

    res.json({
      success: true,
      data: partner,
      message: 'Trust score updated successfully',
    });
  } catch (error: any) {
    console.error('Update trust score error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update trust score',
    });
  }
});

export default router;
