import { Router, Response } from 'express';
import { Brand } from '../models/index.js';
import { internalAuth, AuthRequest } from '../middleware/auth.js';
import { CreateBrandSchema, UpdateBrandSchema } from '../middleware/validation.js';

const router = Router();

// Apply internal auth to all routes
router.use(internalAuth);

/**
 * Create a new brand
 */
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const data = CreateBrandSchema.parse(req.body);

    // Check if brand already exists
    const existing = await Brand.findOne({ brandId: data.brandId });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Brand already exists'
      });
    }

    const brand = await Brand.create(data);

    res.status(201).json({
      success: true,
      data: brand
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
    }

    console.error('[Brand Routes] Error creating brand:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create brand'
    });
  }
});

/**
 * Get brand by ID
 */
router.get('/:brandId', async (req: AuthRequest, res: Response) => {
  try {
    const { brandId } = req.params;
    const brand = await Brand.findOne({ brandId });

    if (!brand) {
      return res.status(404).json({
        success: false,
        error: 'Brand not found'
      });
    }

    res.json({
      success: true,
      data: brand
    });
  } catch (error) {
    console.error('[Brand Routes] Error getting brand:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get brand'
    });
  }
});

/**
 * Get brand by slug
 */
router.get('/slug/:slug', async (req: AuthRequest, res: Response) => {
  try {
    const { slug } = req.params;
    const brand = await Brand.findOne({ slug: slug.toLowerCase() });

    if (!brand) {
      return res.status(404).json({
        success: false,
        error: 'Brand not found'
      });
    }

    res.json({
      success: true,
      data: brand
    });
  } catch (error) {
    console.error('[Brand Routes] Error getting brand:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get brand'
    });
  }
});

/**
 * Update brand
 */
router.patch('/:brandId', async (req: AuthRequest, res: Response) => {
  try {
    const { brandId } = req.params;
    const data = UpdateBrandSchema.parse(req.body);

    const brand = await Brand.findOneAndUpdate(
      { brandId },
      { $set: data },
      { new: true }
    );

    if (!brand) {
      return res.status(404).json({
        success: false,
        error: 'Brand not found'
      });
    }

    res.json({
      success: true,
      data: brand
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
    }

    console.error('[Brand Routes] Error updating brand:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update brand'
    });
  }
});

/**
 * Delete brand (soft delete)
 */
router.delete('/:brandId', async (req: AuthRequest, res: Response) => {
  try {
    const { brandId } = req.params;

    const brand = await Brand.findOneAndUpdate(
      { brandId },
      { $set: { isActive: false } },
      { new: true }
    );

    if (!brand) {
      return res.status(404).json({
        success: false,
        error: 'Brand not found'
      });
    }

    res.json({
      success: true,
      message: 'Brand deactivated'
    });
  } catch (error) {
    console.error('[Brand Routes] Error deleting brand:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete brand'
    });
  }
});

/**
 * List brands for tenant
 */
router.get('/tenant/:tenantId', async (req: AuthRequest, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const [brands, total] = await Promise.all([
      Brand.find({ tenantId, isActive: true })
        .skip(skip)
        .limit(Number(limit))
        .sort({ createdAt: -1 }),
      Brand.countDocuments({ tenantId, isActive: true })
    ]);

    res.json({
      success: true,
      data: brands,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('[Brand Routes] Error listing brands:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list brands'
    });
  }
});

/**
 * Update brand settings
 */
router.patch('/:brandId/settings', async (req: AuthRequest, res: Response) => {
  try {
    const { brandId } = req.params;
    const { settings } = req.body;

    const brand = await Brand.findOneAndUpdate(
      { brandId },
      { $set: { settings: { ...settings } } },
      { new: true }
    );

    if (!brand) {
      return res.status(404).json({
        success: false,
        error: 'Brand not found'
      });
    }

    res.json({
      success: true,
      data: brand.settings
    });
  } catch (error) {
    console.error('[Brand Routes] Error updating settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update settings'
    });
  }
});

/**
 * Update brand integrations
 */
router.patch('/:brandId/integrations', async (req: AuthRequest, res: Response) => {
  try {
    const { brandId } = req.params;
    const { integrations } = req.body;

    const brand = await Brand.findOneAndUpdate(
      { brandId },
      { $set: { integrations: { ...integrations } } },
      { new: true }
    );

    if (!brand) {
      return res.status(404).json({
        success: false,
        error: 'Brand not found'
      });
    }

    res.json({
      success: true,
      data: brand.integrations
    });
  } catch (error) {
    console.error('[Brand Routes] Error updating integrations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update integrations'
    });
  }
});

export default router;