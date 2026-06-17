import { Router, Request, Response } from 'express';
import { Knowledge } from '../models/Knowledge';
import { Category, ApiResponse } from '../types';

const router = Router();

// Industry icons mapping
const industryIcons: Record<string, string> = {
  hospitality: '🍽️',
  healthcare: '🏥',
  retail: '🛒',
  hotel: '🏨',
  legal: '⚖️',
  education: '🎓',
  agriculture: '🌾',
  automotive: '🚗',
  beauty: '💄',
  fashion: '👗',
  fitness: '💪',
  gaming: '🎮',
  government: '🏛️',
  'home-services': '🔧',
  manufacturing: '🏭',
  'non-profit': '❤️',
  professional: '💼',
  sports: '⚽',
  travel: '✈️',
  entertainment: '🎭',
  construction: '🏗️',
  financial: '💰',
  'real-estate': '🏠',
  transport: '🚚'
};

// Type labels
const typeLabels: Record<string, string> = {
  sop: 'Standard Operating Procedures',
  compliance: 'Compliance Guides',
  training: 'Training Courses',
  manual: 'Vendor Manuals',
  guide: 'How-To Guides'
};

// Industry labels
const industryLabels: Record<string, string> = {
  hospitality: 'Hospitality & Food Service',
  healthcare: 'Healthcare & Medical',
  retail: 'Retail & E-commerce',
  hotel: 'Hotel Management',
  legal: 'Legal Services',
  education: 'Education & Training',
  agriculture: 'Agriculture & Farming',
  automotive: 'Automotive',
  beauty: 'Beauty & Wellness',
  fashion: 'Fashion & Apparel',
  fitness: 'Fitness & Sports',
  gaming: 'Gaming & Esports',
  government: 'Government & Public Sector',
  'home-services': 'Home Services',
  manufacturing: 'Manufacturing',
  'non-profit': 'Non-Profit',
  professional: 'Professional Services',
  sports: 'Sports & Recreation',
  travel: 'Travel & Tourism',
  entertainment: 'Entertainment & Media',
  construction: 'Construction & Real Estate',
  financial: 'Financial Services',
  'real-estate': 'Real Estate',
  transport: 'Transportation & Logistics'
};

// GET /api/marketplace/categories - Get all categories with counts
router.get('/', async (req: Request, res: Response) => {
  try {
    const { industry } = req.query;

    // Build aggregation pipeline
    const matchStage: any = { isPublished: true };
    if (industry) matchStage.industry = industry;

    const categories = await Knowledge.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { industry: '$industry', type: '$type' },
          count: { $sum: 1 },
          totalInstalls: { $sum: '$installs' },
          avgRating: { $avg: '$rating' }
        }
      },
      {
        $sort: { '_id.industry': 1, '_id.type': 1 }
      }
    ]);

    // Transform to category format
    const result: Category[] = categories.map(cat => ({
      id: `${cat._id.industry}-${cat._id.type}`,
      name: typeLabels[cat._id.type] || cat._id.type,
      industry: cat._id.industry as any,
      type: cat._id.type as any,
      count: cat.count,
      icon: industryIcons[cat._id.industry] || '📋',
      description: `${typeLabels[cat._id.type] || cat._id.type} for ${industryLabels[cat._id.industry] || cat._id.industry}`
    }));

    const response: ApiResponse<Category[]> = { success: true, data: result };
    res.json(response);
  } catch (error) {
    console.error('Categories error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/marketplace/categories/industries - Get all industries
router.get('/industries', async (req: Request, res: Response) => {
  try {
    const industries = await Knowledge.aggregate([
      { $match: { isPublished: true } },
      {
        $group: {
          _id: '$industry',
          count: { $sum: 1 },
          types: { $addToSet: '$type' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const result = industries.map(ind => ({
      id: ind._id,
      name: industryLabels[ind._id] || ind._id,
      icon: industryIcons[ind._id] || '📋',
      count: ind.count,
      types: ind.types
    }));

    const response: ApiResponse<typeof result> = { success: true, data: result };
    res.json(response);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/marketplace/categories/types - Get all knowledge types
router.get('/types', async (req: Request, res: Response) => {
  try {
    const types = await Knowledge.aggregate([
      { $match: { isPublished: true } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const result = types.map(t => ({
      id: t._id,
      name: typeLabels[t._id] || t._id,
      count: t.count
    }));

    const response: ApiResponse<typeof result> = { success: true, data: result };
    res.json(response);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
