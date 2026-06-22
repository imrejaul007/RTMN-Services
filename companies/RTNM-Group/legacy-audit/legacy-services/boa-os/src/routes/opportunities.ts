import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Opportunity } from '../models/Strategy';

const router = Router();

/**
 * Create opportunity
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'X-Tenant-Id required' });
    }

    const opportunityId = `OPP-${uuidv4().substring(0, 8).toUpperCase()}`;

    const opportunity = new Opportunity({
      opportunityId,
      ...req.body,
      status: 'identified',
      tenantId
    });

    await opportunity.save();

    res.status(201).json({ success: true, data: opportunity });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * List opportunities
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'X-Tenant-Id required' });
    }

    const { status, type, page = 1, limit = 20 } = req.query;
    const filter: Record<string, unknown> = { tenantId };

    if (status) filter.status = status;
    if (type) filter.type = type;

    const opportunities = await Opportunity.find(filter)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await Opportunity.countDocuments(filter);

    res.json({
      success: true,
      data: opportunities,
      pagination: { total, page: Number(page), limit: Number(limit) }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * Get opportunity
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const opportunity = await Opportunity.findOne({
      opportunityId: req.params.id,
      tenantId
    });

    if (!opportunity) {
      return res.status(404).json({ success: false, error: 'Opportunity not found' });
    }

    res.json({ success: true, data: opportunity });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * Update opportunity
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const opportunity = await Opportunity.findOneAndUpdate(
      { opportunityId: req.params.id, tenantId },
      req.body,
      { new: true }
    );

    if (!opportunity) {
      return res.status(404).json({ success: false, error: 'Opportunity not found' });
    }

    res.json({ success: true, data: opportunity });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * Approve opportunity
 */
router.post('/:id/approve', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const opportunity = await Opportunity.findOneAndUpdate(
      { opportunityId: req.params.id, tenantId },
      { status: 'approved' },
      { new: true }
    );

    if (!opportunity) {
      return res.status(404).json({ success: false, error: 'Opportunity not found' });
    }

    res.json({ success: true, data: opportunity });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * Pursue opportunity
 */
router.post('/:id/pursue', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const opportunity = await Opportunity.findOneAndUpdate(
      { opportunityId: req.params.id, tenantId },
      { status: 'pursuing' },
      { new: true }
    );

    if (!opportunity) {
      return res.status(404).json({ success: false, error: 'Opportunity not found' });
    }

    res.json({ success: true, data: opportunity });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
