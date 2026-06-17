import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { Asset, IAsset } from '../models/Asset';
import { Warranty } from '../models/Warranty';
import { AMC } from '../models/AMC';
import { Maintenance } from '../models/Maintenance';
import { IoTStatus } from '../models/IoTStatus';
import { calculateHealthScore, getHealthStatus } from '../services/healthScore';

const router = Router();

// Validation schemas
const createAssetSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  assetType: z.enum(['machine', 'vehicle', 'device', 'equipment']),
  category: z.enum([
    'electronics', 'machinery', 'vehicles', 'furniture',
    'it_hardware', 'office_equipment', 'plant_equipment', 'other'
  ]),
  serialNumber: z.string().optional(),
  modelNumber: z.string().optional(),
  manufacturer: z.string().optional(),
  brand: z.string().optional(),
  location: z.object({
    building: z.string().optional(),
    floor: z.string().optional(),
    room: z.string().optional(),
    address: z.string().optional(),
    coordinates: z.object({
      latitude: z.number(),
      longitude: z.number()
    }).optional()
  }).optional(),
  assignedTo: z.object({
    department: z.string().optional(),
    employeeId: z.string().optional(),
    employeeName: z.string().optional()
  }).optional(),
  purchaseInfo: z.object({
    purchaseDate: z.string().datetime().optional(),
    purchaseCost: z.number().optional(),
    vendor: z.string().optional(),
    invoiceNumber: z.string().optional(),
    warrantyExpiry: z.string().datetime().optional()
  }).optional(),
  specifications: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  iotEnabled: z.boolean().optional(),
  iotDeviceId: z.string().optional()
});

const updateAssetSchema = createAssetSchema.partial();

// Middleware to extract tenantId
const extractTenantId = (req: Request, res: Response, next: NextFunction) => {
  req.body.tenantId = req.headers['x-tenant-id'] as string || 'default';
  next();
};

// GET /assets - List all assets
router.get('/', extractTenantId, async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.tenantId;
    const { status, assetType, category, department, limit = 50, offset = 0 } = req.query;

    const filter: Record<string, unknown> = { tenantId };
    if (status) filter.status = status;
    if (assetType) filter.assetType = assetType;
    if (category) filter.category = category;
    if (department) filter['assignedTo.department'] = department;

    const assets = await Asset.find(filter)
      .skip(Number(offset))
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await Asset.countDocuments(filter);

    res.json({
      success: true,
      data: assets,
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

// GET /assets/:id - Get single asset
router.get('/:id', extractTenantId, async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.tenantId;
    const asset = await Asset.findOne({ tenantId, _id: req.params.id });

    if (!asset) {
      return res.status(404).json({ success: false, error: 'Asset not found' });
    }

    // Get related data
    const [warranty, amc, recentMaintenance, iotStatus] = await Promise.all([
      Warranty.findOne({ tenantId, assetId: asset.assetId }),
      AMC.findOne({ tenantId, assetId: asset.assetId, status: 'active' }),
      Maintenance.find({ tenantId, assetId: asset.assetId })
        .sort({ completedDate: -1 })
        .limit(10),
      IoTStatus.findOne({ tenantId, assetId: asset.assetId })
    ]);

    // Calculate health score
    const healthScore = await calculateHealthScore(asset, recentMaintenance, iotStatus);

    res.json({
      success: true,
      data: {
        ...asset.toObject(),
        warranty,
        amc,
        recentMaintenance,
        iotStatus,
        healthScore: {
          ...healthScore,
          status: getHealthStatus(healthScore.overallScore)
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// POST /assets - Create asset
router.post('/', extractTenantId, async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.tenantId;
    const validatedData = createAssetSchema.parse(req.body);

    const assetId = `AST-${uuidv4().substring(0, 8).toUpperCase()}`;

    const asset = new Asset({
      ...validatedData,
      tenantId,
      assetId,
      status: 'active',
      metrics: {
        totalUptime: 0,
        totalDowntime: 0,
        mtbf: 0,
        mttr: 0,
        totalFailures: 0
      }
    });

    await asset.save();

    res.status(201).json({
      success: true,
      data: asset
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors });
    }
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// PUT /assets/:id - Update asset
router.put('/:id', extractTenantId, async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.tenantId;
    const validatedData = updateAssetSchema.parse(req.body);

    const asset = await Asset.findOneAndUpdate(
      { tenantId, _id: req.params.id },
      { ...validatedData, updatedBy: req.headers['x-user-id'] as string },
      { new: true, runValidators: true }
    );

    if (!asset) {
      return res.status(404).json({ success: false, error: 'Asset not found' });
    }

    res.json({ success: true, data: asset });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors });
    }
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// DELETE /assets/:id - Delete asset
router.delete('/:id', extractTenantId, async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.tenantId;
    const asset = await Asset.findOneAndDelete({ tenantId, _id: req.params.id });

    if (!asset) {
      return res.status(404).json({ success: false, error: 'Asset not found' });
    }

    // Optionally delete related records
    await Promise.all([
      Warranty.deleteMany({ tenantId, assetId: asset.assetId }),
      AMC.deleteMany({ tenantId, assetId: asset.assetId }),
      Maintenance.deleteMany({ tenantId, assetId: asset.assetId }),
      IoTStatus.deleteMany({ tenantId, assetId: asset.assetId })
    ]);

    res.json({ success: true, message: 'Asset deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// GET /assets/:id/health - Get health score
router.get('/:id/health', extractTenantId, async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.tenantId;
    const asset = await Asset.findOne({ tenantId, _id: req.params.id });

    if (!asset) {
      return res.status(404).json({ success: false, error: 'Asset not found' });
    }

    const recentMaintenance = await Maintenance.find({
      tenantId,
      assetId: asset.assetId
    }).sort({ completedDate: -1 }).limit(20);

    const iotStatus = await IoTStatus.findOne({ tenantId, assetId: asset.assetId });

    const healthScore = await calculateHealthScore(asset, recentMaintenance, iotStatus);

    res.json({
      success: true,
      data: {
        ...healthScore,
        status: getHealthStatus(healthScore.overallScore)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// PATCH /assets/:id/metrics - Update metrics
router.patch('/:id/metrics', extractTenantId, async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.tenantId;
    const { totalUptime, totalDowntime, mtbf, mttr, totalFailures, lastFailure, lastMaintenance } = req.body;

    const asset = await Asset.findOneAndUpdate(
      { tenantId, _id: req.params.id },
      {
        $set: {
          'metrics.totalUptime': totalUptime,
          'metrics.totalDowntime': totalDowntime,
          'metrics.mtbf': mtbf,
          'metrics.mttr': mttr,
          'metrics.totalFailures': totalFailures,
          'metrics.lastFailure': lastFailure,
          'metrics.lastMaintenance': lastMaintenance
        }
      },
      { new: true, runValidators: true }
    );

    if (!asset) {
      return res.status(404).json({ success: false, error: 'Asset not found' });
    }

    res.json({ success: true, data: asset.metrics });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// GET /assets/stats/summary - Get asset statistics
router.get('/stats/summary', extractTenantId, async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.tenantId;

    const [totalAssets, byStatus, byType, byCategory, expiringWarranties, activeAMCs] = await Promise.all([
      Asset.countDocuments({ tenantId }),
      Asset.aggregate([
        { $match: { tenantId } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Asset.aggregate([
        { $match: { tenantId } },
        { $group: { _id: '$assetType', count: { $sum: 1 } } }
      ]),
      Asset.aggregate([
        { $match: { tenantId } },
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ]),
      Warranty.countDocuments({
        tenantId,
        status: 'active',
        endDate: { $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
      }),
      AMC.countDocuments({ tenantId, status: 'active' })
    ]);

    res.json({
      success: true,
      data: {
        totalAssets,
        byStatus: byStatus.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {}),
        byType: byType.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {}),
        byCategory: byCategory.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {}),
        expiringWarranties,
        activeAMCs
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;
