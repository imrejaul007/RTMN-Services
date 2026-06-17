import { Router, Request, Response } from 'express';
import { CustomerOpsBridge } from '../services/customerOpsBridge';
import { WealthSync } from '../services/wealthSync';
import { wealthProfileStore } from '../models/WealthProfile';

export function portfolioRoutes(
  customerOps: CustomerOpsBridge,
  wealthSync: WealthSync,
  logger: any
): Router {
  const router = Router();

  // Get full portfolio for customer
  router.get('/customer/:customerId', async (req: Request, res: Response) => {
    try {
      const { customerId } = req.params;
      const profile = wealthProfileStore.findByCustomerId(customerId);

      if (!profile) {
        return res.status(404).json({ error: 'Wealth profile not found' });
      }

      // Enrich with customer data from Customer Twin
      const customerData = await customerOps.getCustomerFromTwin(customerId);

      res.json({
        customerId,
        customer: customerData,
        portfolio: profile.portfolio,
        accounts: profile.accounts,
        netWorth: profile.netWorth,
        totalAssets: profile.totalAssets,
        totalLiabilities: profile.totalLiabilities,
        riskProfile: profile.riskProfile,
        status: profile.status
      });
    } catch (error: any) {
      logger.error('Error fetching portfolio:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get portfolio summary
  router.get('/summary', async (req: Request, res: Response) => {
    try {
      const profiles = wealthProfileStore.findAll();

      const summary = {
        totalCustomers: profiles.length,
        totalAUM: profiles.reduce((sum, p) => sum + p.netWorth, 0),
        totalAssets: profiles.reduce((sum, p) => sum + p.totalAssets, 0),
        totalLiabilities: profiles.reduce((sum, p) => sum + p.totalLiabilities, 0),
        averageNetWorth: profiles.length > 0
          ? profiles.reduce((sum, p) => sum + p.netWorth, 0) / profiles.length
          : 0,
        byRiskProfile: {
          conservative: profiles.filter(p => p.riskProfile === 'conservative').length,
          moderate: profiles.filter(p => p.riskProfile === 'moderate').length,
          aggressive: profiles.filter(p => p.riskProfile === 'aggressive').length,
          'very-aggressive': profiles.filter(p => p.riskProfile === 'very-aggressive').length
        },
        byStatus: {
          active: profiles.filter(p => p.status === 'active').length,
          inactive: profiles.filter(p => p.status === 'inactive').length,
          'pending-review': profiles.filter(p => p.status === 'pending-review').length
        }
      };

      res.json(summary);
    } catch (error: any) {
      logger.error('Error fetching portfolio summary:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Sync portfolio to Industry Twin
  router.post('/sync/:customerId', async (req: Request, res: Response) => {
    try {
      const { customerId } = req.params;
      const profile = wealthProfileStore.findByCustomerId(customerId);

      if (!profile) {
        return res.status(404).json({ error: 'Wealth profile not found' });
      }

      // Sync to all relevant twins
      const syncResults = await wealthSync.syncPortfolioToTwins(profile);

      logger.info(`Portfolio synced for customer ${customerId}`, syncResults);

      res.json({
        customerId,
        synced: true,
        results: syncResults
      });
    } catch (error: any) {
      logger.error('Error syncing portfolio:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update portfolio allocation
  router.put('/allocation/:customerId', async (req: Request, res: Response) => {
    try {
      const { customerId } = req.params;
      const { allocations } = req.body;

      if (!allocations || !Array.isArray(allocations)) {
        return res.status(400).json({ error: 'Invalid allocations format' });
      }

      const profile = wealthProfileStore.findByCustomerId(customerId);

      if (!profile) {
        return res.status(404).json({ error: 'Wealth profile not found' });
      }

      // Validate allocation percentages sum to 100
      const totalPercent = allocations.reduce((sum: number, a: any) => sum + a.percentage, 0);
      if (Math.abs(totalPercent - 100) > 0.01) {
        return res.status(400).json({ error: 'Allocation percentages must sum to 100' });
      }

      // Update portfolio allocations
      profile.portfolio.allocations = allocations.map((a: any) => ({
        ...a,
        value: (profile.portfolio.totalValue * a.percentage) / 100
      }));

      wealthProfileStore.update(profile.id, profile);

      // Sync updated allocation to twins
      await wealthSync.syncPortfolioToTwins(profile);

      logger.info(`Portfolio allocation updated for customer ${customerId}`);

      res.json({
        customerId,
        updated: true,
        allocations: profile.portfolio.allocations
      });
    } catch (error: any) {
      logger.error('Error updating allocation:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get holdings breakdown
  router.get('/holdings/:customerId', async (req: Request, res: Response) => {
    try {
      const { customerId } = req.params;
      const profile = wealthProfileStore.findByCustomerId(customerId);

      if (!profile) {
        return res.status(404).json({ error: 'Wealth profile not found' });
      }

      const holdings = profile.portfolio.holdings;

      // Group by asset class
      const byAssetClass = groupBy(holdings, 'assetClass');

      // Group by sector
      const bySector = groupBy(holdings.filter(h => h.sector), 'sector');

      // Top gainers and losers
      const sortedByGain = [...holdings].sort((a, b) => b.gainPercent - a.gainPercent);

      res.json({
        customerId,
        totalHoldings: holdings.length,
        totalValue: profile.portfolio.totalValue,
        byAssetClass,
        bySector,
        topGainers: sortedByGain.slice(0, 5),
        topLosers: sortedByGain.slice(-5).reverse()
      });
    } catch (error: any) {
      logger.error('Error fetching holdings:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Rebalance portfolio
  router.post('/rebalance/:customerId', async (req: Request, res: Response) => {
    try {
      const { customerId } = req.params;
      const { targetAllocations } = req.body;

      const profile = wealthProfileStore.findByCustomerId(customerId);

      if (!profile) {
        return res.status(404).json({ error: 'Wealth profile not found' });
      }

      const totalValue = profile.portfolio.totalValue;

      // Calculate new holdings based on target allocations
      const rebalancePlan = targetAllocations.map((target: any) => ({
        category: target.category,
        targetPercent: target.percentage,
        currentPercent: profile.portfolio.allocations.find(a => a.category === target.category)?.percentage || 0,
        targetValue: (totalValue * target.percentage) / 100,
        currentValue: profile.portfolio.allocations.find(a => a.category === target.category)?.value || 0,
        tradeValue: ((target.percentage - (profile.portfolio.allocations.find(a => a.category === target.category)?.percentage || 0)) * totalValue) / 100,
        action: target.percentage > (profile.portfolio.allocations.find(a => a.category === target.category)?.percentage || 0) ? 'BUY' : 'SELL'
      }));

      // Update allocations
      profile.portfolio.allocations = targetAllocations.map((a: any) => ({
        category: a.category,
        percentage: a.percentage,
        value: (totalValue * a.percentage) / 100,
        change: 0
      }));

      wealthProfileStore.update(profile.id, profile);

      // Sync rebalanced portfolio
      await wealthSync.syncPortfolioToTwins(profile);

      logger.info(`Portfolio rebalanced for customer ${customerId}`);

      res.json({
        customerId,
        rebalanced: true,
        plan: rebalancePlan,
        totalValue
      });
    } catch (error: any) {
      logger.error('Error rebalancing portfolio:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

// Helper function to group array by key
function groupBy(array: any[], key: string): { [key: string]: any[] } {
  return array.reduce((result: { [key: string]: any[] }, item) => {
    const group = item[key] || 'Other';
    if (!result[group]) {
      result[group] = [];
    }
    result[group].push(item);
    return result;
  }, {});
}
