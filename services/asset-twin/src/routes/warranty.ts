import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { Warranty } from '../models/Warranty';

const router = Router();

// Validation schemas
const createWarrantySchema = z.object({
  assetId: z.string().min(1),
  warrantyType: z.enum(['full', 'limited', 'extended', 'manufacturer', 'third_party']),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  coverageDetails: z.object({
    coveredParts: z.array(z.string()).optional(),
    coveredLabor: z.boolean().optional(),
    coveredTransportation: z.boolean().optional(),
    maximumClaims: z.number().optional(),
    maximumClaimAmount: z.number().optional()
  }).optional(),
  provider: z.object({
    name: z.string(),
    contactNumber: z.string().optional(),
    email: z.string().email().optional(),
    address: z.string().optional(),
    policyNumber: z.string().optional()
  }).optional(),
  cost: z.object({
    amount: z.number(),
    currency: z.string().optional()
  }).optional(),
  alerts: z.object({
    expirationAlert: z.boolean().optional(),
    alertDaysBefore: z.number().optional()
  }).optional(),
  notes: z.string().optional()
});

const updateWarrantySchema = createWarrantySchema.partial().omit({ assetId: true });

// Middleware to extract tenantId
const extractTenantId = (req: Request, res: Response, next: NextFunction) => {
  req.body.tenantId = req.headers['x-tenant-id'] as string || 'default';
  next();
};

// GET /warranties - List all warranties
router.get('/', extractTenantId, async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.tenantId;
    const { assetId, status, limit = 50, offset = 0 } = req.query;

    const filter: Record<string, unknown> = { tenantId };
    if (assetId) filter.assetId = assetId;
    if (status) filter.status = status;

    const warranties = await Warranty.find(filter)
      .skip(Number(offset))
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await Warranty.countDocuments(filter);

    res.json({
      success: true,
      data: warranties,
      pagination: { total, limit: Number(limit), offset: Number(offset) }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// GET /warranties/expiring - Get expiring warranties
router.get('/expiring', extractTenantId, async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.tenantId;
    const { days = 30 } = req.query;

    const expiryDate = new Date(Date.now() + Number(days) * 24 * 60 * 60 * 1000);

    const warranties = await Warranty.find({
      tenantId,
      status: 'active',
      endDate: { $lte: expiryDate, $gt: new Date() }
    }).sort({ endDate: 1 });

    res.json({ success: true, data: warranties });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// GET /warranties/:id - Get single warranty
router.get('/:id', extractTenantId, async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.tenantId;
    const warranty = await Warranty.findOne({ tenantId, _id: req.params.id });

    if (!warranty) {
      return res.status(404).json({ success: false, error: 'Warranty not found' });
    }

    res.json({ success: true, data: warranty });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// GET /warranties/asset/:assetId - Get warranty by asset
router.get('/asset/:assetId', extractTenantId, async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.tenantId;
    const warranty = await Warranty.findOne({ tenantId, assetId: req.params.assetId });

    if (!warranty) {
      return res.status(404).json({ success: false, error: 'Warranty not found for this asset' });
    }

    res.json({ success: true, data: warranty });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// POST /warranties - Create warranty
router.post('/', extractTenantId, async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.tenantId;
    const validatedData = createWarrantySchema.parse(req.body);

    // Check if warranty already exists for this asset
    const existing = await Warranty.findOne({ tenantId, assetId: validatedData.assetId });
    if (existing) {
      return res.status(400).json({ success: false, error: 'Warranty already exists for this asset' });
    }

    const warrantyId = `WRNT-${uuidv4().substring(0, 8).toUpperCase()}`;

    const warranty = new Warranty({
      ...validatedData,
      startDate: new Date(validatedData.startDate),
      endDate: new Date(validatedData.endDate),
      tenantId,
      warrantyId,
      status: 'active',
      alerts: {
        expirationAlert: validatedData.alerts?.expirationAlert ?? true,
        alertDaysBefore: validatedData.alerts?.alertDaysBefore ?? 30
      }
    });

    await warranty.save();

    res.status(201).json({ success: true, data: warranty });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors });
    }
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// PUT /warranties/:id - Update warranty
router.put('/:id', extractTenantId, async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.tenantId;
    const validatedData = updateWarrantySchema.parse(req.body);

    if (validatedData.startDate) validatedData.startDate = new Date(validatedData.startDate);
    if (validatedData.endDate) validatedData.endDate = new Date(validatedData.endDate);

    const warranty = await Warranty.findOneAndUpdate(
      { tenantId, _id: req.params.id },
      validatedData,
      { new: true, runValidators: true }
    );

    if (!warranty) {
      return res.status(404).json({ success: false, error: 'Warranty not found' });
    }

    res.json({ success: true, data: warranty });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors });
    }
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// POST /warranties/:id/extend - Extend warranty
router.post('/:id/extend', extractTenantId, async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.tenantId;
    const { extendedEndDate, extensionCost, reason } = req.body;

    const warranty = await Warranty.findOne({ tenantId, _id: req.params.id });

    if (!warranty) {
      return res.status(404).json({ success: false, error: 'Warranty not found' });
    }

    if (warranty.status === 'expired') {
      return res.status(400).json({ success: false, error: 'Cannot extend an expired warranty' });
    }

    const extension = {
      extendedEndDate: new Date(extendedEndDate),
      extendedBy: req.headers['x-user-id'] as string || 'system',
      extensionCost: extensionCost,
      reason: reason,
      createdAt: new Date()
    };

    warranty.extensions = warranty.extensions || [];
    warranty.extensions.push(extension);
    warranty.endDate = new Date(extendedEndDate);
    warranty.status = 'extended';

    await warranty.save();

    res.json({ success: true, data: warranty });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// DELETE /warranties/:id - Delete warranty
router.delete('/:id', extractTenantId, async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.tenantId;
    const warranty = await Warranty.findOneAndDelete({ tenantId, _id: req.params.id });

    if (!warranty) {
      return res.status(404).json({ success: false, error: 'Warranty not found' });
    }

    res.json({ success: true, message: 'Warranty deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;
