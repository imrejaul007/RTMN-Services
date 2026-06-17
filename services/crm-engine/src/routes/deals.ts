import { Router, Response } from 'express';
import { z } from 'zod';
import { Deal, DealStage, STAGE_PROBABILITY } from '../models';
import { AuthRequest, requireTenantId } from '../middleware';
import { hubspotSyncDeals } from '../services/hubspot';
import { zohoSyncDeals } from '../services/zoho';

const router = Router();

const dealSchema = z.object({
  title: z.string().min(1),
  value: z.number().min(0),
  stage: z.nativeEnum(DealStage).optional(),
  contactId: z.string().min(1),
  expectedClose: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const updateDealSchema = dealSchema.partial().omit({ contactId: true });

const updateStageSchema = z.object({
  stage: z.nativeEnum(DealStage),
});

// Get all deals
router.get('/', requireTenantId, async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '20', stage, contactId } = req.query;
    const tenantId = req.tenantId!;

    const query: Record<string, unknown> = { tenantId };

    if (stage) {
      query.stage = stage;
    }

    if (contactId) {
      query.contactId = contactId;
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [deals, total] = await Promise.all([
      Deal.find(query)
        .populate('contactId', 'name email company')
        .skip(skip)
        .limit(limitNum)
        .sort({ createdAt: -1 }),
      Deal.countDocuments(query),
    ]);

    res.json({
      data: deals,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Error fetching deals:', error);
    res.status(500).json({ error: 'Failed to fetch deals' });
  }
});

// Get pipeline stats
router.get('/pipeline', requireTenantId, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;

    const stats = await Deal.aggregate([
      { $match: { tenantId } },
      {
        $group: {
          _id: '$stage',
          count: { $sum: 1 },
          totalValue: { $sum: '$value' },
        },
      },
    ]);

    // Calculate totals
    const pipelineStats = Object.values(DealStage).map((stage) => {
      const found = stats.find((s) => s._id === stage);
      return {
        stage,
        probability: STAGE_PROBABILITY[stage],
        count: found?.count || 0,
        value: found?.totalValue || 0,
      };
    });

    const totalOpenValue = pipelineStats
      .filter((s) => s.stage !== DealStage.CLOSED_WON && s.stage !== DealStage.CLOSED_LOST)
      .reduce((sum, s) => sum + s.value, 0);

    const totalWonValue = pipelineStats
      .filter((s) => s.stage === DealStage.CLOSED_WON)
      .reduce((sum, s) => sum + s.value, 0);

    res.json({
      stages: pipelineStats,
      summary: {
        totalOpenValue,
        totalWonValue,
      },
    });
  } catch (error) {
    console.error('Error fetching pipeline stats:', error);
    res.status(500).json({ error: 'Failed to fetch pipeline stats' });
  }
});

// Get deal by ID
router.get('/:id', requireTenantId, async (req: AuthRequest, res: Response) => {
  try {
    const deal = await Deal.findOne({
      _id: req.params.id,
      tenantId: req.tenantId,
    }).populate('contactId', 'name email company phone');

    if (!deal) {
      res.status(404).json({ error: 'Deal not found' });
      return;
    }

    res.json({ data: deal });
  } catch (error) {
    console.error('Error fetching deal:', error);
    res.status(500).json({ error: 'Failed to fetch deal' });
  }
});

// Create deal
router.post('/', requireTenantId, async (req: AuthRequest, res: Response) => {
  try {
    const validated = dealSchema.parse(req.body);
    const tenantId = req.tenantId!;

    const stage = validated.stage || DealStage.PROSPECT;
    const probability = STAGE_PROBABILITY[stage];

    const deal = new Deal({
      ...validated,
      tenantId,
      stage,
      probability,
      expectedClose: validated.expectedClose
        ? new Date(validated.expectedClose)
        : undefined,
    });

    await deal.save();

    // Populate contact for response
    await deal.populate('contactId', 'name email company');

    res.status(201).json({ data: deal });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
      return;
    }
    console.error('Error creating deal:', error);
    res.status(500).json({ error: 'Failed to create deal' });
  }
});

// Update deal
router.put('/:id', requireTenantId, async (req: AuthRequest, res: Response) => {
  try {
    const validated = updateDealSchema.parse(req.body);

    const updateData: Record<string, unknown> = { ...validated };
    if (validated.expectedClose) {
      updateData.expectedClose = new Date(validated.expectedClose);
    }

    const deal = await Deal.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('contactId', 'name email company');

    if (!deal) {
      res.status(404).json({ error: 'Deal not found' });
      return;
    }

    res.json({ data: deal });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
      return;
    }
    console.error('Error updating deal:', error);
    res.status(500).json({ error: 'Failed to update deal' });
  }
});

// Update deal stage
router.patch('/:id/stage', requireTenantId, async (req: AuthRequest, res: Response) => {
  try {
    const validated = updateStageSchema.parse(req.body);
    const newStage = validated.stage;
    const newProbability = STAGE_PROBABILITY[newStage];

    const deal = await Deal.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      { $set: { stage: newStage, probability: newProbability } },
      { new: true, runValidators: true }
    ).populate('contactId', 'name email company');

    if (!deal) {
      res.status(404).json({ error: 'Deal not found' });
      return;
    }

    res.json({ data: deal });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
      return;
    }
    console.error('Error updating deal stage:', error);
    res.status(500).json({ error: 'Failed to update deal stage' });
  }
});

// Delete deal
router.delete('/:id', requireTenantId, async (req: AuthRequest, res: Response) => {
  try {
    const deal = await Deal.findOneAndDelete({
      _id: req.params.id,
      tenantId: req.tenantId,
    });

    if (!deal) {
      res.status(404).json({ error: 'Deal not found' });
      return;
    }

    res.json({ message: 'Deal deleted successfully' });
  } catch (error) {
    console.error('Error deleting deal:', error);
    res.status(500).json({ error: 'Failed to delete deal' });
  }
});

// Sync with HubSpot
router.post('/sync/hubspot', requireTenantId, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await hubspotSyncDeals(tenantId);
    res.json({ message: 'HubSpot sync completed', ...result });
  } catch (error) {
    console.error('HubSpot sync error:', error);
    res.status(500).json({ error: 'Failed to sync with HubSpot' });
  }
});

// Sync with Zoho
router.post('/sync/zoho', requireTenantId, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await zohoSyncDeals(tenantId);
    res.json({ message: 'Zoho sync completed', ...result });
  } catch (error) {
    console.error('Zoho sync error:', error);
    res.status(500).json({ error: 'Failed to sync with Zoho' });
  }
});

export default router;
