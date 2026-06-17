import { Router, Request, Response } from 'express';
import { Product, ProductStatus, WarrantyType, WarrantyStatus } from '../models/Product';
import { Specification } from '../models/Specification';
import { KnownIssue } from '../models/KnownIssue';
import { Part } from '../models/Part';
import { Documentation } from '../models/Documentation';
import { FAQ } from '../models/FAQ';
import { generateProductInsights } from '../services/insights';
import mongoose from 'mongoose';

const router = Router();

// List products with pagination
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      tenantId,
      page = '1',
      limit = '20',
      category,
      brand,
      status = 'active',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    const query: any = { tenantId };
    if (category) query.category = category;
    if (brand) query.brand = brand;
    if (status) query.status = status;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const sort: any = { [sortBy as string]: sortOrder === 'desc' ? -1 : 1 };

    const [products, total] = await Promise.all([
      Product.find(query).sort(sort).skip(skip).limit(limitNum).lean(),
      Product.countDocuments(query)
    ]);

    res.json({
      data: products,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

// Get single product by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.query;
    const { id } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    const product = await Product.findOne({ _id: id, tenantId }).lean();

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Get related data
    const [specifications, knownIssues, parts, documentations, faqs] = await Promise.all([
      Specification.find({ tenantId, productId: id }),
      KnownIssue.find({ tenantId, productId: id }),
      Part.find({ tenantId, 'compatibleProducts.productId': id }),
      Documentation.find({ tenantId, productId: id, isPublished: true }),
      FAQ.find({ tenantId, productId: id, status: 'published' })
    ]);

    res.json({
      ...product,
      specifications,
      knownIssues,
      parts,
      documentations,
      faqs
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

// Create product
router.post('/', async (req: Request, res: Response) => {
  try {
    const productData = req.body;

    if (!productData.tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    const product = new Product(productData);
    await product.save();

    res.status(201).json(product);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

// Update product
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.body;
    const { id } = req.params;
    const updates = req.body;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    delete updates.tenantId;
    delete updates._id;

    const product = await Product.findOneAndUpdate(
      { _id: id, tenantId },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

// Delete product
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.query;
    const { id } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    const product = await Product.findOneAndDelete({ _id: id, tenantId });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Optionally delete related data
    await Promise.all([
      Specification.deleteMany({ tenantId, productId: id }),
      KnownIssue.deleteMany({ tenantId, productId: id }),
      Documentation.deleteMany({ tenantId, productId: id }),
      FAQ.deleteMany({ tenantId, productId: id })
    ]);

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

// Search products
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { tenantId, q, category, brand, minPrice, maxPrice, tags, page = '1', limit = '20' } = req.query;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    const query: any = { tenantId };

    if (q) {
      query.$text = { $search: q as string };
    }
    if (category) query.category = category;
    if (brand) query.brand = brand;
    if (tags) {
      query.tags = { $in: (tags as string).split(',') };
    }
    if (minPrice || maxPrice) {
      query['price.base'] = {};
      if (minPrice) query['price.base'].$gte = parseFloat(minPrice as string);
      if (maxPrice) query['price.base'].$lte = parseFloat(maxPrice as string);
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [products, total] = await Promise.all([
      Product.find(query).skip(skip).limit(limitNum).lean(),
      Product.countDocuments(query)
    ]);

    res.json({
      data: products,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

// Get related products
router.get('/:id/related', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.query;
    const { id } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    const product = await Product.findOne({ _id: id, tenantId });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const relatedProductIds = product.relatedProducts.map(rp => rp.productId);

    const relatedProducts = await Product.find({
      _id: { $in: relatedProductIds },
      tenantId
    }).lean();

    // Sort by relationship strength
    const sortedRelated = relatedProducts.sort((a, b) => {
      const aStrength = product.relatedProducts.find(rp => rp.productId.equals(a._id))?.strength || 0;
      const bStrength = product.relatedProducts.find(rp => rp.productId.equals(b._id))?.strength || 0;
      return bStrength - aStrength;
    });

    res.json(sortedRelated);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

// Get product insights
router.get('/:id/insights', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.query;
    const { id } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    const product = await Product.findOne({ _id: id, tenantId });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const insights = await generateProductInsights(tenantId as string, id);

    res.json(insights);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

// Get product metrics
router.get('/:id/metrics', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.query;
    const { id } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    const product = await Product.findOne({ _id: id, tenantId });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Get additional metrics
    const [issueStats, partCount, docCount, faqStats] = await Promise.all([
      KnownIssue.getStats(tenantId as string, new mongoose.Types.ObjectId(id)),
      Part.countDocuments({ tenantId, 'compatibleProducts.productId': id }),
      Documentation.countDocuments({ tenantId, productId: id, isPublished: true }),
      FAQ.getStats(tenantId as string, new mongoose.Types.ObjectId(id))
    ]);

    res.json({
      supportMetrics: product.supportMetrics,
      issues: issueStats,
      partsCount: partCount,
      documentationCount: docCount,
      faqs: faqStats
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

// Update warranty
router.patch('/:id/warranty', async (req: Request, res: Response) => {
  try {
    const { tenantId, ...warrantyData } = req.body;
    const { id } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    const product = await Product.findOneAndUpdate(
      { _id: id, tenantId },
      { $set: { warranty: warrantyData } },
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product.warranty);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

// Update support metrics
router.patch('/:id/metrics', async (req: Request, res: Response) => {
  try {
    const { tenantId, ...metrics } = req.body;
    const { id } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    const product = await Product.findOne({ _id: id, tenantId });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    product.updateSupportMetrics(metrics);
    await product.save();

    res.json(product.supportMetrics);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

// Add related product
router.post('/:id/related', async (req: Request, res: Response) => {
  try {
    const { tenantId, relatedProductId, relationshipType, strength = 0.5 } = req.body;
    const { id } = req.params;

    if (!tenantId || !relatedProductId || !relationshipType) {
      return res.status(400).json({ error: 'tenantId, relatedProductId, and relationshipType are required' });
    }

    const product = await Product.findOne({ _id: id, tenantId });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check if already exists
    const exists = product.relatedProducts.some(
      rp => rp.productId.toString() === relatedProductId
    );

    if (exists) {
      return res.status(400).json({ error: 'Related product already exists' });
    }

    product.relatedProducts.push({
      productId: new mongoose.Types.ObjectId(relatedProductId),
      relationshipType,
      strength
    });

    await product.save();

    res.json(product.relatedProducts);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

// Get categories
router.get('/meta/categories', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.query;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    const categories = await Product.distinct('category', { tenantId });

    res.json(categories);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

// Get brands
router.get('/meta/brands', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.query;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    const brands = await Product.distinct('brand', { tenantId });

    res.json(brands);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

export default router;
