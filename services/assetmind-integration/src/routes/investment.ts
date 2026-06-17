import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { CustomerOpsBridge } from '../services/customerOpsBridge';
import { WealthSync } from '../services/wealthSync';
import { wealthProfileStore, WealthProfile, InvestmentAccount } from '../models/WealthProfile';

export function investmentRoutes(
  customerOps: CustomerOpsBridge,
  wealthSync: WealthSync,
  logger: any
): Router {
  const router = Router();

  // Get all investments for a customer
  router.get('/customer/:customerId', async (req: Request, res: Response) => {
    try {
      const { customerId } = req.params;
      const profile = wealthProfileStore.findByCustomerId(customerId);

      if (!profile) {
        return res.status(404).json({ error: 'Wealth profile not found for customer' });
      }

      res.json({
        customerId,
        investments: profile.accounts,
        totalValue: profile.accounts.reduce((sum, acc) => sum + acc.balance, 0),
        count: profile.accounts.length
      });
    } catch (error: any) {
      logger.error('Error fetching investments:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get specific investment account
  router.get('/:accountId', async (req: Request, res: Response) => {
    try {
      const { accountId } = req.params;
      const profiles = wealthProfileStore.findAll();

      for (const profile of profiles) {
        const account = profile.accounts.find(acc => acc.id === accountId);
        if (account) {
          return res.json({ account, customerId: profile.customerId });
        }
      }

      res.status(404).json({ error: 'Investment account not found' });
    } catch (error: any) {
      logger.error('Error fetching account:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create new investment account
  router.post('/', async (req: Request, res: Response) => {
    try {
      const { customerId, type, name, provider, balance, currency, accountNumber } = req.body;

      if (!customerId || !type || !name || !provider) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      let profile = wealthProfileStore.findByCustomerId(customerId);

      const newAccount: InvestmentAccount = {
        id: `INV-${uuidv4().split('-')[0]}`,
        type,
        name,
        provider,
        balance: balance || 0,
        currency: currency || 'USD',
        lastSync: new Date(),
        accountNumber
      };

      if (!profile) {
        // Create new profile
        profile = wealthProfileStore.create({
          customerId,
          customerName: '', // To be filled from customer twin
          email: '',
          totalAssets: balance || 0,
          totalLiabilities: 0,
          netWorth: balance || 0,
          riskProfile: 'moderate',
          accounts: [newAccount],
          portfolio: {
            totalValue: balance || 0,
            dayChange: 0,
            dayChangePercent: 0,
            ytdReturn: 0,
            ytdReturnPercent: 0,
            sinceInception: 0,
            sinceInceptionPercent: 0,
            allocations: [],
            holdings: []
          },
          financialGoals: [],
          status: 'active'
        });
      } else {
        // Add account to existing profile
        profile.accounts.push(newAccount);
        profile.totalAssets += balance || 0;
        profile.netWorth = profile.totalAssets - profile.totalLiabilities;
        wealthProfileStore.update(profile.id, profile);
      }

      // Sync to twins
      await wealthSync.syncInvestmentToTwins(newAccount, profile.customerId);

      logger.info(`Investment account created: ${newAccount.id} for customer ${customerId}`);

      res.status(201).json({
        account: newAccount,
        profileId: profile.id,
        synced: true
      });
    } catch (error: any) {
      logger.error('Error creating investment account:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update investment account
  router.put('/:accountId', async (req: Request, res: Response) => {
    try {
      const { accountId } = req.params;
      const updates = req.body;
      const profiles = wealthProfileStore.findAll();

      for (const profile of profiles) {
        const accountIndex = profile.accounts.findIndex(acc => acc.id === accountId);
        if (accountIndex !== -1) {
          const oldBalance = profile.accounts[accountIndex].balance;
          profile.accounts[accountIndex] = {
            ...profile.accounts[accountIndex],
            ...updates,
            id: accountId,
            lastSync: new Date()
          };

          // Update totals
          const balanceDiff = profile.accounts[accountIndex].balance - oldBalance;
          profile.totalAssets += balanceDiff;
          profile.netWorth = profile.totalAssets - profile.totalLiabilities;

          wealthProfileStore.update(profile.id, profile);

          // Sync to twins
          await wealthSync.syncInvestmentToTwins(profile.accounts[accountIndex], profile.customerId);

          logger.info(`Investment account updated: ${accountId}`);

          return res.json({
            account: profile.accounts[accountIndex],
            updated: true
          });
        }
      }

      res.status(404).json({ error: 'Investment account not found' });
    } catch (error: any) {
      logger.error('Error updating investment account:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Delete investment account
  router.delete('/:accountId', async (req: Request, res: Response) => {
    try {
      const { accountId } = req.params;
      const profiles = wealthProfileStore.findAll();

      for (const profile of profiles) {
        const accountIndex = profile.accounts.findIndex(acc => acc.id === accountId);
        if (accountIndex !== -1) {
          const removedAccount = profile.accounts[accountIndex];
          profile.accounts.splice(accountIndex, 1);

          // Update totals
          profile.totalAssets -= removedAccount.balance;
          profile.netWorth = profile.totalAssets - profile.totalLiabilities;

          if (profile.accounts.length === 0) {
            profile.status = 'inactive';
          }

          wealthProfileStore.update(profile.id, profile);

          // Notify twins
          await wealthSync.removeInvestmentFromTwins(accountId, profile.customerId);

          logger.info(`Investment account removed: ${accountId}`);

          return res.json({
            deleted: true,
            accountId
          });
        }
      }

      res.status(404).json({ error: 'Investment account not found' });
    } catch (error: any) {
      logger.error('Error deleting investment account:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get investment performance
  router.get('/:accountId/performance', async (req: Request, res: Response) => {
    try {
      const { accountId } = req.params;
      const { period = '30d' } = req.query;
      const profiles = wealthProfileStore.findAll();

      for (const profile of profiles) {
        const account = profile.accounts.find(acc => acc.id === accountId);
        if (account) {
          // Generate mock performance data
          const performance = generatePerformanceData(account.balance, period as string);

          return res.json({
            accountId,
            accountType: account.type,
            currentBalance: account.balance,
            period,
            performance
          });
        }
      }

      res.status(404).json({ error: 'Investment account not found' });
    } catch (error: any) {
      logger.error('Error fetching performance:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

// Helper function to generate performance data
function generatePerformanceData(currentValue: number, period: string): any {
  const periods: { [key: string]: number } = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
    '1y': 365,
    'all': 730
  };

  const days = periods[period] || 30;
  const dailyReturn = (Math.random() * 0.02 - 0.005); // -0.5% to +1.5% daily
  const totalReturn = Math.pow(1 + dailyReturn, days) - 1;

  return {
    totalReturn: currentValue * totalReturn,
    totalReturnPercent: totalReturn * 100,
    annualizedReturn: Math.pow(1 + totalReturn, 365 / days) - 1,
    dataPoints: days
  };
}
