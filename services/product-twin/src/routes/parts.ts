import { Router, Request, Response } from 'express';
import { Part, PartType, PartStatus } from '../models/Part';
import mongoose from 'mongoose';

const router = Router();

// List all parts with pagination
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      tenantId,
      page = '1',
      limit = '20',
      type,
      status,
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    const query: any = { tenantId };
    if (type) query.type = type;
    if (status) query.status = status;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const sort: any = { [sortBy as string]: sortOrder === 'asc' ? 1 : -1 };

    const [parts, total] = await Promise.all([
      Part.find(query).sort(sort).skip(skip).limit(limitNum).lean(),
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

// Get single part by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.query;
    const { id } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    const part = await Part.findOne({ _id: id, tenantId }).lean();

    if (!part) {
      return res.status(404).json({ error: 'Part not found' });
    }

    res.json(part);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

// Create part
router.post('/', async (req: Request, res: Response) => {
  try {
    const partData = req.body;

    if (!partData.tenantId || !partData.sku) {
      return res.status(400).json({ error: 'tenantId and sku are required' });
    }

    const part = new Part(partData);
    await part.save();

    res.status(201).json(part);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

// Update part
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

    const part = await Part.findOneAndUpdate(
      { _id: id, tenantId },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!part) {
      return res.status(404).json({ error: 'Part not found' });
    }

    res.json(part);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

// Delete part
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.query;
    const { id } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    const part = await Part.findOneAndDelete({ _id: id, tenantId });

    if (!part) {
      return res.status(404).json({ error: 'Part not found' });
    }

    res.json({ message: 'Part deleted successfully' });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

// Get parts by product
router.get('/product/:productId', async (req: Request, res: Response) => {
  try {
    const { tenantId, type, status } = req.query;
    const { productId } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    const query: any = {
      tenantId,
      'compatibleProducts.productId': productId,
      'compatibleProducts.isCompatible': true
    };

    if (type) query.type = type;
    if (status) query.status = status;

    const parts = await Part.find(query).sort({ name: 1 }).lean();

    res.json(parts);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

// Get compatible parts for a product
router.get('/compatible/:productId', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.query;
    const { productId } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    const parts = await Part.findCompatible(
      tenantId as string,
      new mongoose.Types.ObjectId(productId)
    );

    res.json(parts);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

// Get low stock parts
router.get('/inventory/low-stock', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.query;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    const parts = await Part.findLowStock(tenantId as string);

    res.json(parts);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

// Reserve inventory
router.post('/:id/reserve', async (req: Request, res: Response) => {
  try {
    const { tenantId, quantity } = req.body;
    const { id } = req.params;

    if (!tenantId || !quantity) {
      return res.status(400).json({ error: 'tenantId and quantity are required' });
    }

    const part = await Part.findOne({ _id: id, tenantId });

    if (!part) {
      return res.status(404).json({ error: 'Part not found' });
    }

    const success = part.reserve(quantity);

    if (!success) {
      return res.status(400).json({
        error: 'Insufficient inventory',
        available: part.inventory.available
      });
    }

    await part.save();

    res.json({
      success: true,
      reserved: quantity,
      inventory: part.inventory
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

// Release reservation
router.post('/:id/release', async (req: Request, res: Response) => {
  try {
    const { tenantId, quantity } = req.body;
    const { id } = req.params;

    if (!tenantId || !quantity) {
      return res.status(400).json({ error: 'tenantId and quantity are required' });
    }

    const part = await Part.findOne({ _id: id, tenantId });

    if (!part) {
      return res.status(404).json({ error: 'Part not found' });
    }

    part.releaseReservation(quantity);
    await part.save();

    res.json({
      success: true,
      released: quantity,
      inventory: part.inventory
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

// Fulfill reservation (ship/use part)
router.post('/:id/fulfill', async (req: Request, res: Response) => {
  try {
    const { tenantId, quantity } = req.body;
    const { id } = req.params;

    if (!tenantId || !quantity) {
      return res.status(400).json({ error: 'tenantId and quantity are required' });
    }

    const part = await Part.findOne({ _id: id, tenantId });

    if (!part) {
      return res.status(404).json({ error: 'Part not found' });
    }

    if (part.inventory.reserved < quantity) {
      return res.status(400).json({
        error: 'Insufficient reserved inventory',
        reserved: part.inventory.reserved
      });
    }

    part.fulfillReservation(quantity);
    await part.save();

    res.json({
      success: true,
      fulfilled: quantity,
      inventory: part.inventory
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

// Restock part
router.post('/:id/restock', async (req: Request, res: Response) => {
  try {
    const { tenantId, quantity } = req.body;
    const { id } = req.params;

    if (!tenantId || !quantity) {
      return res.status(400).json({ error: 'tenantId and quantity are required' });
    }

    const part = await Part.findOne({ _id: id, tenantId });

    if (!part) {
      return res.status(404).json({ error: 'Part not found' });
    }

    part.restock(quantity);
    await part.save();

    res.json({
      success: true,
      added: quantity,
      inventory: part.inventory
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

// Add compatible product
router.post('/:id/compatible', async (req: Request, res: Response) => {
  try {
    const { tenantId, productId, productSku, versionFrom, versionTo, isCompatible = true, notes } = req.body;
    const { id } = req.params;

    if (!tenantId || !productId) {
      return res.status(400).json({ error: 'tenantId and productId are required' });
    }

    const part = await Part.findOne({ _id: id, tenantId });

    if (!part) {
      return res.status(404).json({ error: 'Part not found' });
    }

    // Check if already exists
    const exists = part.compatibleProducts.some(
      cp => cp.productId.toString() === productId
    );

    if (exists) {
      return res.status(400).json({ error: 'Product compatibility already exists' });
    }

    part.compatibleProducts.push({
      productId: new mongoose.Types.ObjectId(productId),
      productSku,
      versionFrom,
      versionTo,
      isCompatible,
      notes
    });

    await part.save();

    res.json(part.compatibleProducts);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

// Get parts by type
router.get('/type/:type', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.query;
    const { type } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    if (!Object.values(PartType).includes(type as PartType)) {
      return res.status(400).json({ error: 'Invalid part type' });
    }

    const parts = await Part.findByType(tenantId as string, type as PartType);

    res.json(parts);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

// Search parts
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { tenantId, q, type, inStock, page = '1', limit = '20' } = req.query;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    const query: any = { tenantId };

    if (q) {
      query.$text = { $search: q as string };
    }
    if (type) query.type = type;
    if (inStock === 'true') {
      query['inventory.available'] = { $gt: 0 };
      query.status = { $ne: PartStatus.OUT_OF_STOCK };
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [parts, total] = await Promise.all([
      Part.find(query).skip(skip).limit(limitNum).lean(),
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

export default router;
