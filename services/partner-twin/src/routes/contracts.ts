import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { Contract, ContractType, ContractStatus } from '../models/Contract';

const router = Router();

// Validation Schemas
const createContractSchema = z.object({
  title: z.string().min(1).max(500),
  type: z.enum(['master', 'service', 'nda', 'sla', 'pricing', 'volume', 'exclusive']),
  status: z.enum(['draft', 'pending_approval', 'active', 'expired', 'terminated', 'renewed']).optional(),
  parties: z.object({
    partyA: z.object({
      name: z.string().min(1),
      signatory: z.string().min(1),
      email: z.string().email(),
    }),
    partyB: z.object({
      name: z.string().min(1),
      signatory: z.string().min(1),
      email: z.string().email(),
    }),
  }),
  effectiveDate: z.string().or(z.date()),
  expirationDate: z.string().or(z.date()).optional(),
  durationMonths: z.number().optional(),
  terms: z.object({
    paymentTerms: z.enum(['immediate', 'net15', 'net30', 'net45', 'net60', 'net90', 'custom']).optional(),
    paymentMethod: z.string().optional(),
    latePaymentPenalty: z.number().optional(),
    currency: z.string().optional(),
    minimumCommitment: z.number().optional(),
    maximumLiability: z.number().optional(),
  }).optional(),
  renewal: z.object({
    autoRenew: z.boolean().optional(),
    renewalPeriod: z.number().optional(),
    noticePeriod: z.number().optional(),
    renewalRate: z.number().optional(),
  }).optional(),
  totalValue: z.number().optional(),
  currency: z.string().optional(),
  lineItems: z.array(z.object({
    itemNumber: z.string(),
    description: z.string(),
    quantity: z.number().optional(),
    unit: z.string().optional(),
    unitPrice: z.number(),
    discount: z.number().optional(),
    tax: z.number().optional(),
    total: z.number(),
  })).optional(),
  scope: z.string().optional(),
  deliverables: z.array(z.string()).optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
});

const updateContractSchema = createContractSchema.partial();

// Middleware to extract tenantId and validate partnerId
const extractTenantAndPartnerId = (req: Request, res: Response, next: NextFunction) => {
  req.body.tenantId = req.headers['x-tenant-id'] as string || 'default';
  req.body.partnerId = req.params.partnerId || req.body.partnerId;
  next();
};

// Create Contract
router.post('/:partnerId', extractTenantAndPartnerId, async (req: Request, res: Response) => {
  try {
    const validationResult = createContractSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationResult.error.errors,
      });
    }

    const data = validationResult.data;
    const contractId = `CON-${uuidv4().substring(0, 8).toUpperCase()}`;

    const contract = new Contract({
      ...data,
      contractId,
      tenantId: req.body.tenantId,
      partnerId: req.params.partnerId,
      effectiveDate: new Date(data.effectiveDate),
      expirationDate: data.expirationDate ? new Date(data.expirationDate) : undefined,
      status: data.status || 'draft',
      terms: data.terms || {},
      renewal: data.renewal || { autoRenew: false },
    });

    // Calculate next renewal date if auto-renew is enabled
    if (contract.renewal?.autoRenew && contract.expirationDate) {
      const renewalPeriod = contract.renewal.renewalPeriod || 12;
      const nextDate = new Date(contract.expirationDate);
      nextDate.setMonth(nextDate.getMonth() + renewalPeriod);
      (contract as any).nextRenewalDate = nextDate;
    }

    await contract.save();

    res.status(201).json({
      success: true,
      data: contract,
      message: 'Contract created successfully',
    });
  } catch (error: any) {
    console.error('Create contract error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create contract',
    });
  }
});

// Get All Contracts
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      page = '1',
      limit = '20',
      type,
      status,
      partnerId,
      search,
      expiringSoon,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const tenantId = req.headers['x-tenant-id'] as string || 'default';
    const query: any = { tenantId, isDeleted: false };

    if (type) query.type = type;
    if (status) query.status = status;
    if (partnerId) query.partnerId = partnerId;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { contractId: { $regex: search, $options: 'i' } },
        { 'parties.partyB.name': { $regex: search, $options: 'i' } },
      ];
    }

    // Contracts expiring in next 30 days
    if (expiringSoon === 'true') {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      query.expirationDate = { $lte: thirtyDaysFromNow, $gt: new Date() };
      query.status = 'active';
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const sort: any = { [sortBy as string]: sortOrder === 'asc' ? 1 : -1 };

    const [contracts, total] = await Promise.all([
      Contract.find(query).sort(sort).skip(skip).limit(limitNum),
      Contract.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: contracts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error('Get contracts error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get contracts',
    });
  }
});

// Get Contract by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || 'default';
    const contract = await Contract.findOne({
      $or: [{ contractId: req.params.id }, { _id: req.params.id }],
      tenantId,
      isDeleted: false,
    });

    if (!contract) {
      return res.status(404).json({
        success: false,
        error: 'Contract not found',
      });
    }

    res.json({
      success: true,
      data: contract,
    });
  } catch (error: any) {
    console.error('Get contract error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get contract',
    });
  }
});

// Update Contract
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const validationResult = updateContractSchema.safeParse(req.body);
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
    if (data.effectiveDate) {
      (data as any).effectiveDate = new Date(data.effectiveDate);
    }
    if (data.expirationDate) {
      (data as any).expirationDate = new Date(data.expirationDate);
    }

    const contract = await Contract.findOneAndUpdate(
      {
        $or: [{ contractId: req.params.id }, { _id: req.params.id }],
        tenantId,
        isDeleted: false,
      },
      { ...data, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!contract) {
      return res.status(404).json({
        success: false,
        error: 'Contract not found',
      });
    }

    res.json({
      success: true,
      data: contract,
      message: 'Contract updated successfully',
    });
  } catch (error: any) {
    console.error('Update contract error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update contract',
    });
  }
});

// Delete Contract (Soft Delete)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    const contract = await Contract.findOneAndUpdate(
      {
        $or: [{ contractId: req.params.id }, { _id: req.params.id }],
        tenantId,
        isDeleted: false,
      },
      { isDeleted: true, deletedAt: new Date() },
      { new: true }
    );

    if (!contract) {
      return res.status(404).json({
        success: false,
        error: 'Contract not found',
      });
    }

    res.json({
      success: true,
      message: 'Contract deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete contract error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete contract',
    });
  }
});

// Get Contracts by Partner
router.get('/partner/:partnerId', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || 'default';
    const { page = '1', limit = '20', status } = req.query;

    const query: any = {
      tenantId,
      partnerId: req.params.partnerId,
      isDeleted: false,
    };

    if (status) query.status = status;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const [contracts, total] = await Promise.all([
      Contract.find(query).skip(skip).limit(limitNum).sort({ effectiveDate: -1 }),
      Contract.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: contracts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error('Get partner contracts error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get partner contracts',
    });
  }
});

// Update Contract Status
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    if (!status || !['draft', 'pending_approval', 'active', 'expired', 'terminated', 'renewed'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status',
      });
    }

    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    const contract = await Contract.findOneAndUpdate(
      {
        $or: [{ contractId: req.params.id }, { _id: req.params.id }],
        tenantId,
        isDeleted: false,
      },
      { status, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!contract) {
      return res.status(404).json({
        success: false,
        error: 'Contract not found',
      });
    }

    res.json({
      success: true,
      data: contract,
      message: 'Contract status updated successfully',
    });
  } catch (error: any) {
    console.error('Update contract status error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update contract status',
    });
  }
});

// Sign Contract
router.patch('/:id/sign', async (req: Request, res: Response) => {
  try {
    const { signedBy, signatureUrl } = req.body;

    if (!signedBy) {
      return res.status(400).json({
        success: false,
        error: 'Signed by information is required',
      });
    }

    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    const contract = await Contract.findOneAndUpdate(
      {
        $or: [{ contractId: req.params.id }, { _id: req.params.id }],
        tenantId,
        isDeleted: false,
      },
      {
        status: 'active',
        signedDate: new Date(),
        signedBy,
        signatureUrl,
        updatedAt: new Date(),
      },
      { new: true, runValidators: true }
    );

    if (!contract) {
      return res.status(404).json({
        success: false,
        error: 'Contract not found',
      });
    }

    res.json({
      success: true,
      data: contract,
      message: 'Contract signed successfully',
    });
  } catch (error: any) {
    console.error('Sign contract error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to sign contract',
    });
  }
});

// Renew Contract
router.post('/:id/renew', async (req: Request, res: Response) => {
  try {
    const { newExpirationDate, renewalRate } = req.body;

    const tenantId = req.headers['x-tenant-id'] as string || 'default';
    const existingContract = await Contract.findOne({
      $or: [{ contractId: req.params.id }, { _id: req.params.id }],
      tenantId,
      isDeleted: false,
    });

    if (!existingContract) {
      return res.status(404).json({
        success: false,
        error: 'Contract not found',
      });
    }

    // Mark old contract as renewed
    existingContract.status = 'renewed';
    existingContract.updatedAt = new Date();
    await existingContract.save();

    // Create new contract as renewal
    const newContractId = `CON-${uuidv4().substring(0, 8).toUpperCase()}`;
    const newContract = new Contract({
      contractId: newContractId,
      tenantId,
      partnerId: existingContract.partnerId,
      title: `${existingContract.title} (Renewal ${(existingContract.renewalCount || 0) + 1})`,
      type: existingContract.type,
      status: 'active',
      parties: existingContract.parties,
      effectiveDate: existingContract.expirationDate || new Date(),
      expirationDate: newExpirationDate ? new Date(newExpirationDate) : undefined,
      terms: existingContract.terms,
      renewal: existingContract.renewal,
      totalValue: renewalRate && existingContract.totalValue
        ? existingContract.totalValue * (1 + renewalRate / 100)
        : existingContract.totalValue,
      currency: existingContract.currency,
      scope: existingContract.scope,
      previousContractId: existingContract.contractId,
      renewalCount: (existingContract.renewalCount || 0) + 1,
    });

    await newContract.save();

    res.status(201).json({
      success: true,
      data: newContract,
      message: 'Contract renewed successfully',
    });
  } catch (error: any) {
    console.error('Renew contract error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to renew contract',
    });
  }
});

// Get Contract Stats
router.get('/stats/summary', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || 'default';
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const [total, byType, byStatus, expiringSoon, totalValue] = await Promise.all([
      Contract.countDocuments({ tenantId, isDeleted: false }),
      Contract.aggregate([
        { $match: { tenantId, isDeleted: false } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
      Contract.aggregate([
        { $match: { tenantId, isDeleted: false } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Contract.countDocuments({
        tenantId,
        isDeleted: false,
        status: 'active',
        expirationDate: { $lte: thirtyDaysFromNow, $gt: now },
      }),
      Contract.aggregate([
        { $match: { tenantId, isDeleted: false, status: 'active', totalValue: { $exists: true } } },
        { $group: { _id: null, total: { $sum: '$totalValue' } } },
      ]),
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
        expiringSoon,
        totalContractValue: totalValue[0]?.total || 0,
      },
    });
  } catch (error: any) {
    console.error('Get contract stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get contract stats',
    });
  }
});

export default router;
