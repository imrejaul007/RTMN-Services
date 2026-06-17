import { Router, Request, Response } from 'express';
import { Product } from '../models/Product';
import { Specification } from '../models/Specification';
import { KnownIssue } from '../models/KnownIssue';
import { Part } from '../models/Part';
import { Documentation } from '../models/Documentation';
import { FAQ } from '../models/FAQ';
import mongoose from 'mongoose';

const router = Router();

// Unified search across all entities
router.get('/all', async (req: Request, res: Response) => {
  try {
    const { tenantId, q, types, page = '1', limit = '20' } = req.query;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    if (!q) {
      return res.status(400).json({ error: 'Search query (q) is required' });
    }

    const searchTypes = types ? (types as string).split(',') : ['products', 'issues', 'parts', 'docs', 'faqs'];
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const results: any = {};
    const promises: Promise<any>[] = [];

    if (searchTypes.includes('products')) {
      promises.push(
        Product.find({
          tenantId,
          $text: { $search: q as string }
        })
          .select('name description category brand sku')
          .limit(limitNum)
          .then((data) => {
            results.products = data;
          })
      );
    }

    if (searchTypes.includes('issues')) {
      promises.push(
        KnownIssue.find({
          tenantId,
          $text: { $search: q as string }
        })
          .select('title description severity status')
          .limit(limitNum)
          .then((data) => {
            results.issues = data;
          })
      );
    }

    if (searchTypes.includes('parts')) {
      promises.push(
        Part.find({
          tenantId,
          $text: { $search: q as string }
        })
          .select('name description sku type status')
          .limit(limitNum)
          .then((data) => {
            results.parts = data;
          })
      );
    }

    if (searchTypes.includes('docs')) {
      promises.push(
        Documentation.find({
          tenantId,
          $text: { $search: q as string }
        })
          .select('title description type format')
          .limit(limitNum)
          .then((data) => {
            results.documentation = data;
          })
      );
    }

    if (searchTypes.includes('faqs')) {
      promises.push(
        FAQ.find({
          tenantId,
          $text: { $search: q as string }
        })
          .select('question answer category')
          .limit(limitNum)
          .then((data) => {
            results.faqs = data;
          })
      );
    }

    await Promise.all(promises);

    // Count totals
    const total = Object.values(results).reduce((sum: number, arr: any) => sum + (arr?.length || 0), 0);

    res.json({
      query: q,
      results,
      summary: {
        total,
        byType: {
          products: results.products?.length || 0,
          issues: results.issues?.length || 0,
          parts: results.parts?.length || 0,
          documentation: results.documentation?.length || 0,
          faqs: results.faqs?.length || 0
        }
      }
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

// Search products
router.get('/products', async (req: Request, res: Response) => {
  try {
    const {
      tenantId,
      q,
      category,
      brand,
      minPrice,
      maxPrice,
      tags,
      status,
      page = '1',
      limit = '20'
    } = req.query;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    const query: any = { tenantId };

    if (q) {
      query.$text = { $search: q as string };
    }
    if (category) query.category = category;
    if (brand) query.brand = brand;
    if (tags) query.tags = { $in: (tags as string).split(',') };
    if (status) query.status = status;
    if (minPrice || maxPrice) {
      query['price.base'] = {};
      if (minPrice) query['price.base'].$gte = parseFloat(minPrice as string);
      if (maxPrice) query['price.base'].$lte = parseFloat(maxPrice as string);
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    let queryBuilder = Product.find(query);

    if (q) {
      queryBuilder = queryBuilder.select({ score: { $meta: 'textScore' } }).sort({ score: { $meta: 'textScore' } });
    }

    const [products, total] = await Promise.all([
      queryBuilder.skip(skip).limit(limitNum).lean(),
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

// Search issues
router.get('/issues', async (req: Request, res: Response) => {
  try {
    const {
      tenantId,
      q,
      productId,
      severity,
      status,
      page = '1',
      limit = '20'
    } = req.query;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    const query: any = { tenantId };

    if (q) {
      query.$text = { $search: q as string };
    }
    if (productId) query.productId = productId;
    if (severity) query.severity = severity;
    if (status) query.status = status;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    let queryBuilder = KnownIssue.find(query);

    if (q) {
      queryBuilder = queryBuilder.select({ score: { $meta: 'textScore' } }).sort({ score: { $meta: 'textScore' } });
    }

    const [issues, total] = await Promise.all([
      queryBuilder.skip(skip).limit(limitNum).lean(),
      KnownIssue.countDocuments(query)
    ]);

    res.json({
      data: issues,
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

// Search parts
router.get('/parts', async (req: Request, res: Response) => {
  try {
    const {
      tenantId,
      q,
      type,
      productId,
      inStock,
      page = '1',
      limit = '20'
    } = req.query;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    const query: any = { tenantId };

    if (q) {
      query.$text = { $search: q as string };
    }
    if (type) query.type = type;
    if (productId) query['compatibleProducts.productId'] = productId;
    if (inStock === 'true') {
      query['inventory.available'] = { $gt: 0 };
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    let queryBuilder = Part.find(query);

    if (q) {
      queryBuilder = queryBuilder.select({ score: { $meta: 'textScore' } }).sort({ score: { $meta: 'textScore' } });
    }

    const [parts, total] = await Promise.all([
      queryBuilder.skip(skip).limit(limitNum).lean(),
      Part.countDocuments(query)
    ]);

    res.json({
      data: parts,
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

// Search documentation
router.get('/docs', async (req: Request, res: Response) => {
  try {
    const {
      tenantId,
      q,
      productId,
      type,
      publishedOnly = 'true',
      page = '1',
      limit = '20'
    } = req.query;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    const query: any = { tenantId };

    if (q) {
      query.$text = { $search: q as string };
    }
    if (productId) query.productId = productId;
    if (type) query.type = type;
    if (publishedOnly === 'true') query.isPublished = true;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    let queryBuilder = Documentation.find(query);

    if (q) {
      queryBuilder = queryBuilder.select({ score: { $meta: 'textScore' } }).sort({ score: { $meta: 'textScore' } });
    }

    const [docs, total] = await Promise.all([
      queryBuilder.skip(skip).limit(limitNum).lean(),
      Documentation.countDocuments(query)
    ]);

    res.json({
      data: docs,
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

// Search FAQs
router.get('/faqs', async (req: Request, res: Response) => {
  try {
    const {
      tenantId,
      q,
      productId,
      category,
      publishedOnly = 'true',
      page = '1',
      limit = '20'
    } = req.query;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    const query: any = { tenantId };

    if (q) {
      query.$text = { $search: q as string };
    }
    if (productId) query.productId = productId;
    if (category) query.category = category;
    if (publishedOnly === 'true') query.status = 'published';

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    let queryBuilder = FAQ.find(query);

    if (q) {
      queryBuilder = queryBuilder.select({ score: { $meta: 'textScore' } }).sort({ score: { $meta: 'textScore' } });
    }

    const [faqs, total] = await Promise.all([
      queryBuilder.skip(skip).limit(limitNum).lean(),
      FAQ.countDocuments(query)
    ]);

    res.json({
      data: faqs,
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

// Search specifications
router.get('/specs', async (req: Request, res: Response) => {
  try {
    const { tenantId, q, productId, category, page = '1', limit = '20' } = req.query;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    const query: any = { tenantId };

    if (q) {
      query.name = { $regex: q as string, $options: 'i' };
    }
    if (productId) query.productId = productId;
    if (category) query.category = category;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [specs, total] = await Promise.all([
      Specification.find(query).sort({ displayOrder: 1 }).skip(skip).limit(limitNum).lean(),
      Specification.countDocuments(query)
    ]);

    res.json({
      data: specs,
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

// Find products with similar specifications
router.post('/similar-specs', async (req: Request, res: Response) => {
  try {
    const { tenantId, productId, specs } = req.body;

    if (!tenantId || !productId) {
      return res.status(400).json({ error: 'tenantId and productId are required' });
    }

    // Get specs to match
    const productSpecs = specs || await Specification.find({ tenantId, productId }).lean();

    if (!productSpecs.length) {
      return res.json([]);
    }

    // Build match query
    const specMatches = productSpecs.map((spec) => ({
      productId: { $ne: new mongoose.Types.ObjectId(productId) },
      category: spec.category,
      name: spec.name,
      value: spec.value
    }));

    // Find matching product IDs
    const matches = await Specification.aggregate([
      { $match: { tenantId, $or: specMatches } },
      {
        $group: {
          _id: '$productId',
          matchCount: { $sum: 1 }
        }
      },
      { $sort: { matchCount: -1 } },
      { $limit: 10 }
    ]);

    const productIds = matches.map((m) => m._id);

    const products = await Product.find({
      _id: { $in: productIds },
      tenantId
    }).lean();

    // Add match count to results
    const results = products.map((p) => {
      const match = matches.find((m) => m._id.equals(p._id));
      return {
        ...p,
        specMatchCount: match?.matchCount || 0
      };
    });

    res.json(results);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

// Autocomplete endpoint
router.get('/autocomplete', async (req: Request, res: Response) => {
  try {
    const { tenantId, q, limit = '10' } = req.query;

    if (!tenantId || !q) {
      return res.status(400).json({ error: 'tenantId and q are required' });
    }

    const limitNum = parseInt(limit as string, 10);

    const [products, parts] = await Promise.all([
      Product.find({
        tenantId,
        name: { $regex: q as string, $options: 'i' }
      })
        .select('name sku category brand')
        .limit(limitNum)
        .lean(),
      Part.find({
        tenantId,
        name: { $regex: q as string, $options: 'i' }
      })
        .select('name sku type')
        .limit(limitNum)
        .lean()
    ]);

    res.json({
      suggestions: [
        ...products.map((p) => ({ type: 'product', ...p })),
        ...parts.map((p) => ({ type: 'part', ...p }))
      ]
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

export default router;
