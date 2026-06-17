/**
 * Budget Routes
 */

import { Router, Request, Response } from 'express';
import { budgetService } from '../services/budget';

const router = Router();

/**
 * GET /api/finance/budget
 * Get current budget status
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const budgets = await budgetService.getBudgetStatus();

    res.json({
      success: true,
      data: budgets,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Error fetching budgets:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch budgets',
      timestamp: new Date(),
    });
  }
});

/**
 * GET /api/finance/budget/summary
 * Get budget summary
 */
router.get('/summary', async (_req: Request, res: Response) => {
  try {
    const summary = await budgetService.getBudgetSummary();

    res.json({
      success: true,
      data: summary,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Error fetching budget summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch budget summary',
      timestamp: new Date(),
    });
  }
});

/**
 * GET /api/finance/budget/recommend
 * Get budget recommendations
 */
router.get('/recommend', async (_req: Request, res: Response) => {
  try {
    const recommendations = await budgetService.generateRecommendations();

    res.json({
      success: true,
      data: recommendations,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Error generating recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate budget recommendations',
      timestamp: new Date(),
    });
  }
});

/**
 * POST /api/finance/budget/allocation
 * Set budget allocation for a category
 */
router.post('/allocation', async (req: Request, res: Response) => {
  try {
    const { category, allocated, period } = req.body;

    if (!category || allocated === undefined) {
      res.status(400).json({
        success: false,
        error: 'Category and allocated amount are required',
        timestamp: new Date(),
      });
      return;
    }

    const budget = await budgetService.setBudgetAllocation(
      category,
      parseFloat(allocated),
      period || 'monthly'
    );

    res.json({
      success: true,
      data: budget,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Error setting budget allocation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to set budget allocation',
      timestamp: new Date(),
    });
  }
});

/**
 * GET /api/finance/budget/category/:name
 * Get budget for specific category
 */
router.get('/category/:name', async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const budgets = await budgetService.getBudgetStatus();
    const budget = budgets.find((b) => b.category.toLowerCase() === name.toLowerCase());

    if (!budget) {
      res.status(404).json({
        success: false,
        error: `Budget for category '${name}' not found`,
        timestamp: new Date(),
      });
      return;
    }

    res.json({
      success: true,
      data: budget,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Error fetching category budget:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch category budget',
      timestamp: new Date(),
    });
  }
});

export default router;
