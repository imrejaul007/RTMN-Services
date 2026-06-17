import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Mention } from '../models/Mention';
import { Brand } from '../models/Brand';

const router = Router();

// Get mentions for a brand
router.get('/brand/:brandId', async (req: Request, res: Response) => {
  try {
    const { source, sentiment, startDate, endDate, page = 1, limit = 50 } = req.query;
    const query: any = { brandId: req.params.brandId };

    if (source) query.source = source;
    if (sentiment) query['sentiment.label'] = sentiment;
    if (startDate || endDate) {
      query.publishedAt = {};
      if (startDate) query.publishedAt.$gte = new Date(startDate as string);
      if (endDate) query.publishedAt.$lte = new Date(endDate as string);
    }

    const mentions = await Mention.find(query)
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .sort({ publishedAt: -1 });

    const total = await Mention.countDocuments(query);

    res.json({
      mentions,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch mentions' });
  }
});

// Get mention by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const mention = await Mention.findOne({ mentionId: req.params.id });
    if (!mention) {
      return res.status(404).json({ error: 'Mention not found' });
    }
    res.json(mention);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch mention' });
  }
});

// Create mention manually
router.post('/', async (req: Request, res: Response) => {
  try {
    const mentionId = `MEN-${uuidv4().slice(0, 12).toUpperCase()}`;

    const mention = new Mention({
      mentionId,
      ...req.body,
      processedAt: new Date()
    });

    await mention.save();
    res.status(201).json(mention);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create mention' });
  }
});

// Bulk create mentions
router.post('/bulk', async (req: Request, res: Response) => {
  try {
    const mentions = req.body.mentions.map((m: any) => ({
      mentionId: `MEN-${uuidv4().slice(0, 12).toUpperCase()}`,
      ...m,
      processedAt: new Date()
    }));

    await Mention.insertMany(mentions);
    res.status(201).json({ inserted: mentions.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create mentions' });
  }
});

// Get crisis mentions
router.get('/crisis/:brandId', async (req: Request, res: Response) => {
  try {
    const mentions = await Mention.find({
      brandId: req.params.brandId,
      isCrisis: true
    }).sort({ publishedAt: -1 });

    res.json({
      count: mentions.length,
      mentions
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch crisis mentions' });
  }
});

// Get mentions by source
router.get('/sources/:brandId/:source', async (req: Request, res: Response) => {
  try {
    const mentions = await Mention.find({
      brandId: req.params.brandId,
      source: req.params.source
    })
      .limit(100)
      .sort({ publishedAt: -1 });

    res.json(mentions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch mentions' });
  }
});

// Get high-engagement mentions
router.get('/trending/:brandId', async (req: Request, res: Response) => {
  try {
    const { limit = 20 } = req.query;

    const mentions = await Mention.find({
      brandId: req.params.brandId
    })
      .sort({ 'engagement.reach': -1, 'author.followers': -1 })
      .limit(Number(limit));

    res.json(mentions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch trending mentions' });
  }
});

// Mark mention as crisis
router.patch('/:id/crisis', async (req: Request, res: Response) => {
  try {
    const mention = await Mention.findOneAndUpdate(
      { mentionId: req.params.id },
      { $set: { isCrisis: true } },
      { new: true }
    );

    if (!mention) {
      return res.status(404).json({ error: 'Mention not found' });
    }
    res.json(mention);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update crisis status' });
  }
});

// Delete mention
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const mention = await Mention.findOneAndDelete({ mentionId: req.params.id });
    if (!mention) {
      return res.status(404).json({ error: 'Mention not found' });
    }
    res.json({ message: 'Mention deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete mention' });
  }
});

export default router;
