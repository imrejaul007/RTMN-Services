import { Router, Request, Response } from 'express';
import { searchService } from '../services/search';
import logger from '../logger';

const router = Router();

/**
 * GET /api/marketplace/categories
 * Get all categories with workflow counts
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const categories = await searchService.getCategoriesWithCounts();

    const allCategories = [
      { category: 'refund', label: 'Refunds', icon: '💰', description: 'Process refunds and returns' },
      { category: 'cancellation', label: 'Cancellations', icon: '❌', description: 'Handle booking and order cancellations' },
      { category: 'upgrade', label: 'Upgrades', icon: '⬆️', description: 'Upgrade requests and processes' },
      { category: 'claim', label: 'Claims', icon: '📋', description: 'Insurance and warranty claims' },
      { category: 'support', label: 'Support', icon: '🎧', description: 'Customer support workflows' },
      { category: 'onboarding', label: 'Onboarding', icon: '🚀', description: 'New customer/employee onboarding' },
      { category: 'checkout', label: 'Checkout', icon: '🛒', description: 'Purchase and checkout flows' },
      { category: 'feedback', label: 'Feedback', icon: '💬', description: 'Collect and process feedback' },
      { category: 'loyalty', label: 'Loyalty', icon: '⭐', description: 'Loyalty and rewards programs' },
      { category: 'compliance', label: 'Compliance', icon: '✅', description: 'Regulatory compliance workflows' },
      { category: 'general', label: 'General', icon: '📦', description: 'General purpose workflows' },
    ];

    const enrichedCategories = allCategories.map((cat) => {
      const countData = categories.find((c) => c.category === cat.category);
      return {
        ...cat,
        count: countData?.count || 0,
      };
    });

    res.json({
      success: true,
      data: enrichedCategories,
    });
  } catch (error) {
    logger.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch categories',
    });
  }
});

/**
 * GET /api/marketplace/categories/industries
 * Get all industries with workflow counts
 */
router.get('/industries', async (req: Request, res: Response) => {
  try {
    const industries = await searchService.getIndustriesWithCounts();

    const allIndustries = [
      { industry: 'retail', label: 'Retail', icon: '🏪', description: 'Retail and e-commerce' },
      { industry: 'restaurant', label: 'Restaurant', icon: '🍽️', description: 'Foodservice and dining' },
      { industry: 'hotel', label: 'Hotel', icon: '🏨', description: 'Hotels and hospitality' },
      { industry: 'healthcare', label: 'Healthcare', icon: '🏥', description: 'Medical and health services' },
      { industry: 'insurance', label: 'Insurance', icon: '🛡️', description: 'Insurance services' },
      { industry: 'fitness', label: 'Fitness', icon: '💪', description: 'Gyms and fitness centers' },
      { industry: 'beauty', label: 'Beauty', icon: '💇', description: 'Salons and beauty services' },
      { industry: 'automotive', label: 'Automotive', icon: '🚗', description: 'Auto sales and service' },
      { industry: 'realestate', label: 'Real Estate', icon: '🏠', description: 'Property and real estate' },
      { industry: 'legal', label: 'Legal', icon: '⚖️', description: 'Legal services' },
      { industry: 'education', label: 'Education', icon: '🎓', description: 'Schools and training' },
      { industry: 'general', label: 'General', icon: '📦', description: 'Cross-industry workflows' },
    ];

    const enrichedIndustries = allIndustries.map((ind) => {
      const countData = industries.find((i) => i.industry === ind.industry);
      return {
        ...ind,
        count: countData?.count || 0,
      };
    });

    res.json({
      success: true,
      data: enrichedIndustries,
    });
  } catch (error) {
    logger.error('Error fetching industries:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch industries',
    });
  }
});

export default router;
