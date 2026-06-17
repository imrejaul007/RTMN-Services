import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { AMC } from '../models/AMC';

const router = Router();

// Validation schemas
const createAMCSchema = z.object({
  assetId: z.string().min(1),
  amcType: z.enum(['comprehensive', 'non_comprehensive', 'annual', 'quarterly', 'monthly']),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  serviceDetails: z.object({
    frequency: z.enum(['weekly', 'biweekly', 'monthly', 'quarterly', 'semi_annual', 'annual', 'on_demand']),
    includedServices: z.array(z.string()),
    excludedServices: z.array(z.string()).optional(),
    responseTime: z.number().optional(),
    resolutionTime: z.number().optional(),
    numberOfVisits: z.number().optional()
  }).optional(),
  provider: z.object({
    name: z.string(),
    contactPerson: z.string().optional(),
    contactNumber: z.string().optional(),
    email: z.string().email().optional(),
    address: z.string().optional(),
    contractNumber: z.string().optional()
  }).optional(),
  cost: z.object({
    amount: z.number(),
    currency: z.string().optional(),
    paymentTerms: z.string().optional(),
    paymentDate: z.string().datetime().optional(),
    nextPaymentDue: z.string().datetime().optional()
  }).optional(),
  terms: z.object({
    maximumClaims: z.number().optional(),
    maximumClaimAmount: z.number().optional(),
    minimumClaimAmount: z.number().optional(),
    deductibles: z.number().optional(),
    exclusions: z.array(z.string()).optional(),
    specialConditions: z.string().optional()
  }).optional(),
  renewal: z.object({
    autoRenew: z.boolean().optional(),
    renewalReminder: z.boolean().optional(),
    reminderDaysBefore: z.number().optional()
  }).optional(),
  notes: z.string().optional()
});

const updateAMCSchema = createAMCSchema.partial().omit({ assetId: true });

// Middleware to extract tenantId
const extractTenantId = (req: Request, res: Response, next: NextFunction) => {
  req.body.tenantId = req.headers['x-tenant-id'] as string || 'default';
  next();
};

// GET /amc - List all AMCs
router.get('/', extractTenantId, async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.tenantId;
    const { assetId, status, amcType, limit = 50, offset = 0 } = req.query;

    const filter: Record<string, unknown> = { tenantId };
    if (assetId) filter.assetId = assetId;
    if (status) filter.status = status;
    if (amcType) filter.amcType = amcType;

    const amcs = await AMC.find(filter)
      .skip(Number(offset))
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await AMC.countDocuments(filter);

    res.json({
      success: true,
      data: amcs,
      pagination: { total, limit: Number(limit), offset: Number(offset) }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// GET /amc/expiring - Get expiring AMCs
router.get('/expiring', extractTenantId, async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.tenantId;
    const { days = 30 } = req.query;

    const expiryDate = new Date(Date.now() + Number(days) * 24 * 60 * 60 * 1000);

    const amcs = await AMC.find({
      tenantId,
      status: 'active',
      endDate: { $lte: expiryDate, $gt: new Date() }
    }).sort({ endDate: 1 });

    res.json({ success: true, data: amcs });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// GET /amc/:id - Get single AMC
router.get('/:id', extractTenantId, async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.tenantId;
    const amc = await AMC.findOne({ tenantId, _id: req.params.id });

    if (!amc) {
      return res.status(404).json({ success: false, error: 'AMC not found' });
    }

    res.json({ success: true, data: amc });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// GET /amc/asset/:assetId - Get AMC by asset
router.get('/asset/:assetId', extractTenantId, async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.tenantId;
    const { active } = req.query;

    const filter: Record<string, unknown> = { tenantId, assetId: req.params.assetId };
    if (active === 'true') filter.status = 'active';

    const amcs = await AMC.find(filter).sort({ createdAt: -1 });

    if (amcs.length === 0) {
      return res.status(404).json({ success: false, error: 'No AMC found for this asset' });
    }

    res.json({ success: true, data: active === 'true' ? amcs[0] : amcs });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// POST /amc - Create AMC
router.post('/', extractTenantId, async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.tenantId;
    const validatedData = createAMCSchema.parse(req.body);

    const amcId = `AMC-${uuidv4().substring(0, 8).toUpperCase()}`;

    const amc = new AMC({
      ...validatedData,
      startDate: new Date(validatedData.startDate),
      endDate: new Date(validatedData.endDate),
      tenantId,
      amcId,
      status: 'active',
      serviceDetails: {
        ...validatedData.serviceDetails,
        visitsCompleted: 0
      },
      renewal: {
        autoRenew: validatedData.renewal?.autoRenew ?? false,
        renewalReminder: validatedData.renewal?.renewalReminder ?? true,
        reminderDaysBefore: validatedData.renewal?.reminderDaysBefore ?? 30
      },
      sla: {
        responseTimeSla: validatedData.serviceDetails?.responseTime ?? 24,
        resolutionTimeSla: validatedData.serviceDetails?.resolutionTime ?? 48,
        slaViolations: 0
      },
      alerts: {
        expirationAlert: true,
        alertDaysBefore: 30,
        renewalAlert: true
      }
    });

    if (validatedData.cost?.paymentDate) {
      amc.cost!.paymentDate = new Date(validatedData.cost.paymentDate);
    }
    if (validatedData.cost?.nextPaymentDue) {
      amc.cost!.nextPaymentDue = new Date(validatedData.cost.nextPaymentDue);
    }

    await amc.save();

    res.status(201).json({ success: true, data: amc });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors });
    }
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// PUT /amc/:id - Update AMC
router.put('/:id', extractTenantId, async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.tenantId;
    const validatedData = updateAMCSchema.parse(req.body);

    if (validatedData.startDate) validatedData.startDate = new Date(validatedData.startDate) as unknown as string;
    if (validatedData.endDate) validatedData.endDate = new Date(validatedData.endDate) as unknown as string;

    const amc = await AMC.findOneAndUpdate(
      { tenantId, _id: req.params.id },
      validatedData,
      { new: true, runValidators: true }
    );

    if (!amc) {
      return res.status(404).json({ success: false, error: 'AMC not found' });
    }

    res.json({ success: true, data: amc });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors });
    }
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// POST /amc/:id/renew - Renew AMC
router.post('/:id/renew', extractTenantId, async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.tenantId;
    const { newEndDate, newCost, newAmcType } = req.body;

    const existingAMC = await AMC.findOne({ tenantId, _id: req.params.id });

    if (!existingAMC) {
      return res.status(404).json({ success: false, error: 'AMC not found' });
    }

    // Mark old AMC as expired
    existingAMC.status = 'expired';
    existingAMC.renewal = {
      ...existingAMC.renewal,
      renewedBy: req.headers['x-user-id'] as string,
      renewedOn: new Date()
    };
    await existingAMC.save();

    // Create new AMC
    const newAmcId = `AMC-${uuidv4().substring(0, 8).toUpperCase()}`;

    const newAMC = new AMC({
      tenantId,
      assetId: existingAMC.assetId,
      amcId: newAmcId,
      amcType: newAmcType || existingAMC.amcType,
      startDate: existingAMC.endDate,
      endDate: new Date(newEndDate),
      status: 'active',
      serviceDetails: existingAMC.serviceDetails,
      provider: existingAMC.provider,
      cost: {
        amount: newCost || existingAMC.cost?.amount || 0,
        currency: existingAMC.cost?.currency || 'USD'
      },
      terms: existingAMC.terms,
      renewal: existingAMC.renewal,
      sla: existingAMC.sla,
      alerts: existingAMC.alerts
    });

    await newAMC.save();

    // Update old AMC with reference to new AMC
    existingAMC.renewal!.newAmcId = newAmcId;
    await existingAMC.save();

    res.status(201).json({ success: true, data: newAMC });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// POST /amc/:id/cancel - Cancel AMC
router.post('/:id/cancel', extractTenantId, async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.tenantId;
    const { reason } = req.body;

    const amc = await AMC.findOneAndUpdate(
      { tenantId, _id: req.params.id, status: { $in: ['active', 'pending_renewal'] } },
      {
        status: 'cancelled',
        notes: amc => amc.notes ? `${amc.notes}\n\nCancellation reason: ${reason}` : `Cancellation reason: ${reason}`
      },
      { new: true }
    );

    if (!amc) {
      return res.status(404).json({ success: false, error: 'AMC not found or cannot be cancelled' });
    }

    res.json({ success: true, data: amc });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// DELETE /amc/:id - Delete AMC
router.delete('/:id', extractTenantId, async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.tenantId;
    const amc = await AMC.findOneAndDelete({ tenantId, _id: req.params.id });

    if (!amc) {
      return res.status(404).json({ success: false, error: 'AMC not found' });
    }

    res.json({ success: true, message: 'AMC deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;
