import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Brand, IBrand } from '../models/Brand';

const router = Router();

// Get all brands
router.get('/', async (req: Request, res: Response) => {
  try {
    const { industry, search, page = 1, limit = 20 } = req.query;
    const query: any = {};

    if (industry) query.industry = industry;
    if (search) {
      query.$text = { $search: search as string };
    }

    const brands = await Brand.find(query)
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .sort({ 'currentHealth.score': -1 });

    const total = await Brand.countDocuments(query);

    res.json({
      brands,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch brands' });
  }
});

// Get brand by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const brand = await Brand.findOne({ brandId: req.params.id });
    if (!brand) {
      return res.status(404).json({ error: 'Brand not found' });
    }
    res.json(brand);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch brand' });
  }
});

// Create brand
router.post('/', async (req: Request, res: Response) => {
  try {
    const brandId = `BRAND-${uuidv4().slice(0, 8).toUpperCase()}`;
    const slug = req.body.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const brand = new Brand({
      brandId,
      slug,
      ...req.body
    });

    await brand.save();
    res.status(201).json(brand);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create brand' });
  }
});

// Update brand
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const brand = await Brand.findOneAndUpdate(
      { brandId: req.params.id },
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );

    if (!brand) {
      return res.status(404).json({ error: 'Brand not found' });
    }
    res.json(brand);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update brand' });
  }
});

// Delete brand
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const brand = await Brand.findOneAndDelete({ brandId: req.params.id });
    if (!brand) {
      return res.status(404).json({ error: 'Brand not found' });
    }
    res.json({ message: 'Brand deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete brand' });
  }
});

// Update brand settings
router.patch('/:id/settings', async (req: Request, res: Response) => {
  try {
    const brand = await Brand.findOneAndUpdate(
      { brandId: req.params.id },
      { $set: { settings: { ...req.body } } },
      { new: true }
    );

    if (!brand) {
      return res.status(404).json({ error: 'Brand not found' });
    }
    res.json(brand.settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Add competitor
router.post('/:id/competitors', async (req: Request, res: Response) => {
  try {
    const brand = await Brand.findOneAndUpdate(
      { brandId: req.params.id },
      { $addToSet: { competitors: { $each: req.body.competitors } } },
      { new: true }
    );

    if (!brand) {
      return res.status(404).json({ error: 'Brand not found' });
    }
    res.json(brand.competitors);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add competitors' });
  }
});

// Get competitor comparison
router.get('/:id/competitors', async (req: Request, res: Response) => {
  try {
    const brand = await Brand.findOne({ brandId: req.params.id });
    if (!brand) {
      return res.status(404).json({ error: 'Brand not found' });
    }

    const competitorBrands = await Brand.find({
      name: { $in: brand.competitors }
    });

    res.json({
      brand: {
        name: brand.name,
        healthScore: brand.currentHealth.score,
        industry: brand.industry
      },
      competitors: competitorBrands.map(c => ({
        name: c.name,
        healthScore: c.currentHealth.score,
        industry: c.industry
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch competitors' });
  }
});

export default router;
