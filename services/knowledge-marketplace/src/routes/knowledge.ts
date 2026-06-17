import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { Knowledge } from '../models/Knowledge';
import { ApiResponse, PaginatedResponse, KnowledgeBase } from '../types';

const router = Router();

// Validation schemas
const PaginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20)
});

const BrowseQuerySchema = PaginationSchema.extend({
  industry: z.string().optional(),
  type: z.enum(['sop', 'compliance', 'training', 'manual', 'guide']).optional(),
  sort: z.enum(['rating', 'installs', 'newest', 'title']).default('rating')
});

const AddReviewSchema = z.object({
  userId: z.string().optional(),
  userName: z.string().optional(),
  rating: z.number().min(1).max(5),
  comment: z.string().min(10)
});

// GET /api/marketplace - Browse all knowledge
router.get('/', async (req: Request, res: Response) => {
  try {
    const query = BrowseQuerySchema.parse(req.query);
    const { page, limit, industry, type, sort } = query;

    const filter: any = { isPublished: true };
    if (industry) filter.industry = industry;
    if (type) filter.type = type;

    let sortOption: any = { rating: -1 };
    switch (sort) {
      case 'installs': sortOption = { installs: -1 }; break;
      case 'newest': sortOption = { createdAt: -1 }; break;
      case 'title': sortOption = { title: 1 }; break;
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Knowledge.find(filter).sort(sortOption).skip(skip).limit(limit),
      Knowledge.countDocuments(filter)
    ]);

    const response: PaginatedResponse<KnowledgeBase> = {
      success: true,
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };

    res.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: error.errors });
    } else {
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
});

// GET /api/marketplace/:knowledgeId - Get single knowledge item
router.get('/:knowledgeId', async (req: Request, res: Response) => {
  try {
    const { knowledgeId } = req.params;
    const item = await Knowledge.findOne({ knowledgeId, isPublished: true });

    if (!item) {
      const response: ApiResponse<null> = { success: false, error: 'Knowledge not found' };
      return res.status(404).json(response);
    }

    const response: ApiResponse<KnowledgeBase> = { success: true, data: item };
    res.json(response);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/marketplace/:knowledgeId/reviews - Add a review
router.post('/:knowledgeId/reviews', async (req: Request, res: Response) => {
  try {
    const { knowledgeId } = req.params;
    const reviewData = AddReviewSchema.parse(req.body);

    const item = await Knowledge.findOne({ knowledgeId });
    if (!item) {
      return res.status(404).json({ success: false, error: 'Knowledge not found' });
    }

    // Add review
    item.reviews.push({
      ...reviewData,
      createdAt: new Date()
    });

    // Recalculate average rating
    const totalRating = item.reviews.reduce((sum, r) => sum + r.rating, 0);
    item.rating = Math.round((totalRating / item.reviews.length) * 10) / 10;

    await item.save();

    const response: ApiResponse<typeof item> = {
      success: true,
      data: item,
      message: 'Review added successfully'
    };
    res.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: error.errors });
    } else {
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
});

// GET /api/marketplace/:knowledgeId/related - Get related knowledge
router.get('/:knowledgeId/related', async (req: Request, res: Response) => {
  try {
    const { knowledgeId } = req.params;
    const { limit = 5 } = req.query;

    const item = await Knowledge.findOne({ knowledgeId });
    if (!item) {
      return res.status(404).json({ success: false, error: 'Knowledge not found' });
    }

    const related = await Knowledge.find({
      knowledgeId: { $ne: knowledgeId },
      isPublished: true,
      $or: [
        { industry: item.industry },
        { type: item.type },
        { tags: { $in: item.tags } }
      ]
    })
    .sort({ rating: -1 })
    .limit(Number(limit));

    const response: ApiResponse<KnowledgeBase[]> = { success: true, data: related };
    res.json(response);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
