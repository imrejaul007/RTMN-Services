import { Router, Request, Response } from 'express';
import { subscriptionAnalytics } from '../services/analytics';
import { logger } from '../services/logger';

const router = Router();

// Get all analytics for a tenant
router.get('/:tenantId', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const analytics = await subscriptionAnalytics.getTenantAnalytics(tenantId);
    res.json(analytics);
  } catch (error) {
    logger.error('Failed to fetch tenant analytics', { error });
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Get subscription metrics
router.get('/:tenantId/subscriptions', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const metrics = await subscriptionAnalytics.getSubscriptionMetrics(tenantId);
    res.json(metrics);
  } catch (error) {
    logger.error('Failed to fetch subscription metrics', { error });
    res.status(500).json({ error: 'Failed to fetch subscription metrics' });
  }
});

// Get billing metrics
router.get('/:tenantId/billing', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const metrics = await subscriptionAnalytics.getBillingMetrics(tenantId);
    res.json(metrics);
  } catch (error) {
    logger.error('Failed to fetch billing metrics', { error });
    res.status(500).json({ error: 'Failed to fetch billing metrics' });
  }
});

// Get usage metrics
router.get('/:tenantId/usage', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const metrics = await subscriptionAnalytics.getUsageMetrics(tenantId);
    res.json(metrics);
  } catch (error) {
    logger.error('Failed to fetch usage metrics', { error });
    res.status(500).json({ error: 'Failed to fetch usage metrics' });
  }
});

// Get subscription trends
router.get('/:tenantId/trends', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { days = 30 } = req.query;
    const trends = await subscriptionAnalytics.getSubscriptionTrends(tenantId, Number(days));
    res.json(trends);
  } catch (error) {
    logger.error('Failed to fetch subscription trends', { error });
    res.status(500).json({ error: 'Failed to fetch trends' });
  }
});

// Get plan distribution
router.get('/:tenantId/plans', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const distribution = await subscriptionAnalytics.getPlanDistribution(tenantId);
    res.json({ data: distribution });
  } catch (error) {
    logger.error('Failed to fetch plan distribution', { error });
    res.status(500).json({ error: 'Failed to fetch plan distribution' });
  }
});

// Get customer lifetime value
router.get('/customer/:customerId/ltv', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const ltv = await subscriptionAnalytics.getCustomerLifetimeValue(customerId);
    res.json(ltv);
  } catch (error) {
    logger.error('Failed to fetch customer LTV', { error });
    res.status(500).json({ error: 'Failed to fetch customer LTV' });
  }
});

export default router;
