import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { Maintenance } from '../models/Maintenance';
import { Asset } from '../models/Asset';

const router = Router();

// Validation schemas
const createMaintenanceSchema = z.object({
  assetId: z.string().min(1),
  maintenanceType: z.enum([
    'preventive', 'corrective', 'predictive', 'inspective',
    'emergency', 'calibration', 'software_update', 'cleaning', 'parts_replacement'
  ]),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  scheduledDate: z.string().datetime().optional(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  symptoms: z.array(z.string()).optional(),
  performedBy: z.object({
    technicianId: z.string().optional(),
    technicianName: z.string().optional(),
    department: z.string().optional(),
    vendorName: z.string().optional()
  }).optional()
});

const updateMaintenanceSchema = z.object({
  status: z.enum(['scheduled', 'in_progress', 'on_hold', 'completed', 'cancelled', 'pending_parts']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  startDate: z.string().datetime().optional(),
  completedDate: z.string().datetime().optional(),
  description: z.string().optional(),
  symptoms: z.array(z.string()).optional(),
  rootCause: z.string().optional(),
  workDetails: z.object({
    workPerformed: z.array(z.string()).optional(),
    partsUsed: z.array(z.object({
      partName: z.string(),
      partNumber: z.string().optional(),
      quantity: z.number(),
      cost: z.number().optional()
    })).optional(),
    laborHours: z.number().optional(),
    laborCost: z.number().optional()
  }).optional(),
  performedBy: z.object({
    technicianId: z.string().optional(),
    technicianName: z.string().optional(),
    department: z.string().optional(),
    vendorName: z.string().optional()
  }).optional(),
  downtime: z.object({
    startTime: z.string().datetime().optional(),
    endTime: z.string().datetime().optional(),
    durationHours: z.number().optional(),
    assetDown: z.boolean().optional()
  }).optional()
});

// Middleware to extract tenantId
const extractTenantId = (req: Request, res: Response, next: NextFunction) => {
  req.body.tenantId = req.headers['x-tenant-id'] as string || 'default';
  next();
};

// GET /maintenance - List all maintenance records
router.get('/', extractTenantId, async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.tenantId;
    const { assetId, status, maintenanceType, priority, limit = 50, offset = 0 } = req.query;

    const filter: Record<string, unknown> = { tenantId };
    if (assetId) filter.assetId = assetId;
    if (status) filter.status = status;
    if (maintenanceType) filter.maintenanceType = maintenanceType;
    if (priority) filter.priority = priority;

    const records = await Maintenance.find(filter)
      .populate('assetId', 'name assetType')
      .skip(Number(offset))
      .limit(Number(limit))
      .sort({ scheduledDate: -1 });

    const total = await Maintenance.countDocuments(filter);

    res.json({
      success: true,
      data: records,
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

// GET /maintenance/:id - Get single maintenance record
router.get('/:id', extractTenantId, async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.tenantId;
    const record = await Maintenance.findOne({ tenantId, _id: req.params.id })
      .populate('assetId', 'name assetType category');

    if (!record) {
      return res.status(404).json({ success: false, error: 'Maintenance record not found' });
    }

    res.json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// POST /maintenance - Create maintenance record
router.post('/', extractTenantId, async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.tenantId;
    const validatedData = createMaintenanceSchema.parse(req.body);

    const maintenanceId = `MNT-${uuidv4().substring(0, 8).toUpperCase()}`;

    const record = new Maintenance({
      ...validatedData,
      tenantId,
      maintenanceId,
      status: 'scheduled',
      priority: validatedData.priority || 'medium'
    });

    await record.save();

    // Update asset's last scheduled maintenance
    if (validatedData.scheduledDate) {
      await Asset.findOneAndUpdate(
        { tenantId, assetId: validatedData.assetId },
        { 'metrics.lastMaintenance': validatedData.scheduledDate }
      );
    }

    res.status(201).json({ success: true, data: record });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors });
    }
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// PUT /maintenance/:id - Update maintenance record
router.put('/:id', extractTenantId, async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.tenantId;
    const validatedData = updateMaintenanceSchema.parse(req.body);

    const record = await Maintenance.findOneAndUpdate(
      { tenantId, _id: req.params.id },
      validatedData,
      { new: true, runValidators: true }
    );

    if (!record) {
      return res.status(404).json({ success: false, error: 'Maintenance record not found' });
    }

    // If maintenance is completed, update asset metrics
    if (validatedData.status === 'completed' && validatedData.completedDate) {
      await updateAssetAfterMaintenance(tenantId, record);
    }

    res.json({ success: true, data: record });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors });
    }
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// DELETE /maintenance/:id - Delete maintenance record
router.delete('/:id', extractTenantId, async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.tenantId;
    const record = await Maintenance.findOneAndDelete({ tenantId, _id: req.params.id });

    if (!record) {
      return res.status(404).json({ success: false, error: 'Maintenance record not found' });
    }

    res.json({ success: true, message: 'Maintenance record deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// GET /maintenance/scheduled/upcoming - Get upcoming scheduled maintenance
router.get('/scheduled/upcoming', extractTenantId, async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.tenantId;
    const { days = 30 } = req.query;

    const upcomingDate = new Date(Date.now() + Number(days) * 24 * 60 * 60 * 1000);

    const records = await Maintenance.find({
      tenantId,
      status: 'scheduled',
      scheduledDate: { $gte: new Date(), $lte: upcomingDate }
    })
      .populate('assetId', 'name assetType location')
      .sort({ scheduledDate: 1 });

    res.json({ success: true, data: records });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// GET /maintenance/stats/:assetId - Get maintenance statistics for an asset
router.get('/stats/:assetId', extractTenantId, async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.tenantId;
    const { assetId } = req.params;

    const [totalCount, byType, byStatus, overdueCount] = await Promise.all([
      Maintenance.countDocuments({ tenantId, assetId }),
      Maintenance.aggregate([
        { $match: { tenantId, assetId } },
        { $group: { _id: '$maintenanceType', count: { $sum: 1 } } }
      ]),
      Maintenance.aggregate([
        { $match: { tenantId, assetId } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Maintenance.countDocuments({
        tenantId,
        assetId,
        status: 'scheduled',
        scheduledDate: { $lt: new Date() }
      })
    ]);

    const totalCost = await Maintenance.aggregate([
      { $match: { tenantId, assetId, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$costs.totalCost' } } }
    ]);

    res.json({
      success: true,
      data: {
        totalCount,
        overdueCount,
        totalCost: totalCost[0]?.total || 0,
        byType: byType.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {}),
        byStatus: byStatus.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {})
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Helper function to update asset after maintenance completion
async function updateAssetAfterMaintenance(tenantId: string, maintenance: InstanceType<typeof Maintenance>): Promise<void> {
  const asset = await Asset.findOne({ tenantId, assetId: maintenance.assetId });
  if (!asset) return;

  // Calculate downtime if applicable
  let downtimeHours = 0;
  if (maintenance.downtime?.startTime && maintenance.downtime?.endTime) {
    downtimeHours = (new Date(maintenance.downtime.endTime).getTime() -
      new Date(maintenance.downtime.startTime).getTime()) / (1000 * 60 * 60);
  }

  // Update metrics
  const updates: Record<string, unknown> = {
    'metrics.lastMaintenance': maintenance.completedDate,
    'metrics.totalDowntime': (asset.metrics?.totalDowntime || 0) + downtimeHours
  };

  // If it was a failure, update failure count and last failure date
  if (maintenance.maintenanceType === 'corrective' || maintenance.maintenanceType === 'emergency') {
    updates['metrics.totalFailures'] = (asset.metrics?.totalFailures || 0) + 1;
    updates['metrics.lastFailure'] = maintenance.startDate;
  }

  // Update asset status back to active if it was under maintenance
  if (asset.status === 'maintenance') {
    updates['status'] = 'active';
  }

  await Asset.updateOne({ tenantId, assetId: maintenance.assetId }, { $set: updates });
}

export default router;
