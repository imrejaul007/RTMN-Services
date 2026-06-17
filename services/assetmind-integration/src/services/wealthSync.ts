import axios, { AxiosInstance } from 'axios';
import { WealthProfile, InvestmentAccount } from '../models/WealthProfile';

export interface SyncResult {
  twin: string;
  success: boolean;
  timestamp: Date;
  error?: string;
}

export interface TwinData {
  type: 'investment' | 'portfolio' | 'analytics';
  customerId: string;
  data: any;
  lastSync: Date;
}

export class WealthSync {
  private logger: any;
  private http: AxiosInstance;

  // Twin URLs
  private industryTwinUrl: string;
  private paymentTwinUrl: string;
  private customerTwinUrl: string;

  // Sync cache
  private syncCache: Map<string, TwinData> = new Map();

  constructor(logger: any) {
    this.logger = logger;

    this.http = axios.create({
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    this.industryTwinUrl = process.env.INDUSTRY_TWIN_URL || 'http://localhost:3018';
    this.paymentTwinUrl = process.env.PAYMENT_TWIN_URL || 'http://localhost:4004';
    this.customerTwinUrl = process.env.CUSTOMER_TWIN_URL || 'http://localhost:3017';
  }

  /**
   * Sync investment account to all relevant twins
   */
  async syncInvestmentToTwins(account: InvestmentAccount, customerId: string): Promise<SyncResult[]> {
    const results: SyncResult[] = [];

    // Sync to Industry Twin (Finance)
    results.push(await this.syncToIndustryTwin(account, customerId));

    // Sync to Payment Twin
    results.push(await this.syncToPaymentTwin(account, customerId));

    // Sync to Customer Twin
    results.push(await this.syncToCustomerTwin(account, customerId));

    return results;
  }

  /**
   * Sync to Industry Twin (Finance) - Deal Twin
   */
  private async syncToIndustryTwin(account: InvestmentAccount, customerId: string): Promise<SyncResult> {
    const cacheKey = `industry-${account.id}`;
    try {
      // Prepare finance data for Industry Twin
      const financeData = {
        customerId,
        accountId: account.id,
        accountType: account.type,
        balance: account.balance,
        currency: account.currency,
        provider: account.provider,
        category: 'investment',
        source: 'assetmind'
      };

      await this.http.patch(`${this.industryTwinUrl}/api/twin/finance/${account.id}`, financeData);

      this.updateSyncCache(cacheKey, {
        type: 'investment',
        customerId,
        data: financeData,
        lastSync: new Date()
      });

      this.logger.info(`Synced investment to Industry Twin: ${account.id}`);

      return {
        twin: 'industry-finance',
        success: true,
        timestamp: new Date()
      };
    } catch (error: any) {
      this.logger.warn(`Failed to sync to Industry Twin: ${error.message}`);

      return {
        twin: 'industry-finance',
        success: false,
        timestamp: new Date(),
        error: error.message
      };
    }
  }

  /**
   * Sync to Payment Twin
   */
  private async syncToPaymentTwin(account: InvestmentAccount, customerId: string): Promise<SyncResult> {
    try {
      // Prepare payment data
      const paymentData = {
        customerId,
        linkedAccountId: account.id,
        accountType: account.type,
        balance: account.balance,
        currency: account.currency,
        source: 'assetmind'
      };

      await this.http.patch(`${this.paymentTwinUrl}/api/linked-accounts/${account.id}`, paymentData);

      this.logger.info(`Synced investment to Payment Twin: ${account.id}`);

      return {
        twin: 'payment',
        success: true,
        timestamp: new Date()
      };
    } catch (error: any) {
      this.logger.warn(`Failed to sync to Payment Twin: ${error.message}`);

      return {
        twin: 'payment',
        success: false,
        timestamp: new Date(),
        error: error.message
      };
    }
  }

  /**
   * Sync to Customer Twin
   */
  private async syncToCustomerTwin(account: InvestmentAccount, customerId: string): Promise<SyncResult> {
    try {
      // Prepare customer wealth data
      const customerData = {
        customerId,
        investmentAccounts: [{
          id: account.id,
          type: account.type,
          balance: account.balance,
          currency: account.currency,
          provider: account.provider
        }],
        lastUpdated: new Date().toISOString(),
        source: 'assetmind'
      };

      await this.http.patch(`${this.customerTwinUrl}/api/twin/wealth/${customerId}`, customerData);

      this.logger.info(`Synced investment to Customer Twin: ${account.id}`);

      return {
        twin: 'customer',
        success: true,
        timestamp: new Date()
      };
    } catch (error: any) {
      this.logger.warn(`Failed to sync to Customer Twin: ${error.message}`);

      return {
        twin: 'customer',
        success: false,
        timestamp: new Date(),
        error: error.message
      };
    }
  }

  /**
   * Sync entire portfolio to all twins
   */
  async syncPortfolioToTwins(profile: WealthProfile): Promise<{ [key: string]: SyncResult }> {
    const results: { [key: string]: SyncResult } = {};

    // Prepare comprehensive portfolio data
    const portfolioData = {
      customerId: profile.customerId,
      customerName: profile.customerName,
      email: profile.email,
      netWorth: profile.netWorth,
      totalAssets: profile.totalAssets,
      totalLiabilities: profile.totalLiabilities,
      riskProfile: profile.riskProfile,
      accounts: profile.accounts.map(acc => ({
        id: acc.id,
        type: acc.type,
        balance: acc.balance,
        currency: acc.currency,
        provider: acc.provider
      })),
      portfolio: {
        totalValue: profile.portfolio.totalValue,
        dayChange: profile.portfolio.dayChange,
        ytdReturn: profile.portfolio.ytdReturnPercent,
        allocations: profile.portfolio.allocations,
        holdings: profile.portfolio.holdings.map(h => ({
          symbol: h.symbol,
          name: h.name,
          value: h.value,
          assetClass: h.assetClass
        }))
      },
      goals: profile.financialGoals.map(g => ({
        name: g.name,
        targetAmount: g.targetAmount,
        currentAmount: g.currentAmount,
        progress: g.progress,
        status: g.status
      })),
      lastUpdated: new Date().toISOString(),
      source: 'assetmind'
    };

    // Sync to all twins in parallel
    const [industryResult, paymentResult, customerResult] = await Promise.all([
      this.syncPortfolioToIndustryTwin(profile, portfolioData),
      this.syncPortfolioToPaymentTwin(profile, portfolioData),
      this.syncPortfolioToCustomerTwin(profile, portfolioData)
    ]);

    results['industry-finance'] = industryResult;
    results['payment'] = paymentResult;
    results['customer'] = customerResult;

    // Update cache
    this.updateSyncCache(`portfolio-${profile.customerId}`, {
      type: 'portfolio',
      customerId: profile.customerId,
      data: portfolioData,
      lastSync: new Date()
    });

    return results;
  }

  private async syncPortfolioToIndustryTwin(profile: WealthProfile, data: any): Promise<SyncResult> {
    try {
      await this.http.patch(`${this.industryTwinUrl}/api/twin/portfolio/${profile.customerId}`, {
        type: 'wealth-portfolio',
        data
      });

      this.logger.info(`Portfolio synced to Industry Twin: ${profile.customerId}`);

      return { twin: 'industry-finance', success: true, timestamp: new Date() };
    } catch (error: any) {
      return { twin: 'industry-finance', success: false, timestamp: new Date(), error: error.message };
    }
  }

  private async syncPortfolioToPaymentTwin(profile: WealthProfile, data: any): Promise<SyncResult> {
    try {
      await this.http.patch(`${this.paymentTwinUrl}/api/wealth-portfolio/${profile.customerId}`, {
        netWorth: data.netWorth,
        totalAssets: data.totalAssets,
        accounts: data.accounts
      });

      this.logger.info(`Portfolio synced to Payment Twin: ${profile.customerId}`);

      return { twin: 'payment', success: true, timestamp: new Date() };
    } catch (error: any) {
      return { twin: 'payment', success: false, timestamp: new Date(), error: error.message };
    }
  }

  private async syncPortfolioToCustomerTwin(profile: WealthProfile, data: any): Promise<SyncResult> {
    try {
      await this.http.patch(`${this.customerTwinUrl}/api/twin/wealth-profile/${profile.customerId}`, {
        wealthProfile: data
      });

      this.logger.info(`Portfolio synced to Customer Twin: ${profile.customerId}`);

      return { twin: 'customer', success: true, timestamp: new Date() };
    } catch (error: any) {
      return { twin: 'customer', success: false, timestamp: new Date(), error: error.message };
    }
  }

  /**
   * Remove investment from twins
   */
  async removeInvestmentFromTwins(accountId: string, customerId: string): Promise<SyncResult[]> {
    const results: SyncResult[] = [];

    // Remove from all twins
    const twins = [
      { url: this.industryTwinUrl, name: 'industry-finance' },
      { url: this.paymentTwinUrl, name: 'payment' },
      { url: this.customerTwinUrl, name: 'customer' }
    ];

    for (const twin of twins) {
      try {
        await this.http.delete(`${twin.url}/api/twin/investment/${accountId}`);

        results.push({
          twin: twin.name,
          success: true,
          timestamp: new Date()
        });

        this.logger.info(`Removed investment ${accountId} from ${twin.name}`);
      } catch (error: any) {
        results.push({
          twin: twin.name,
          success: false,
          timestamp: new Date(),
          error: error.message
        });
      }
    }

    // Clear from cache
    this.syncCache.delete(`industry-${accountId}`);
    this.syncCache.delete(`payment-${accountId}`);
    this.syncCache.delete(`customer-${accountId}`);

    return results;
  }

  /**
   * Sync analytics data to twins
   */
  async syncAnalyticsToTwins(customerId: string, analytics: any): Promise<SyncResult[]> {
    const results: SyncResult[] = [];

    try {
      // Sync to Customer Twin for enrichment
      await this.http.patch(`${this.customerTwinUrl}/api/twin/analytics/${customerId}`, {
        source: 'assetmind',
        analytics,
        timestamp: new Date().toISOString()
      });

      results.push({
        twin: 'customer',
        success: true,
        timestamp: new Date()
      });
    } catch (error: any) {
      results.push({
        twin: 'customer',
        success: false,
        timestamp: new Date(),
        error: error.message
      });
    }

    // Update cache
    this.updateSyncCache(`analytics-${customerId}`, {
      type: 'analytics',
      customerId,
      data: analytics,
      lastSync: new Date()
    });

    return results;
  }

  /**
   * Get last sync status from cache
   */
  getLastSync(customerId: string): TwinData | null {
    return this.syncCache.get(`portfolio-${customerId}`) || null;
  }

  /**
   * Update sync cache
   */
  private updateSyncCache(key: string, data: TwinData): void {
    this.syncCache.set(key, data);

    // Cleanup old entries (keep last 100)
    if (this.syncCache.size > 100) {
      const firstKey = this.syncCache.keys().next().value;
      this.syncCache.delete(firstKey);
    }
  }

  /**
   * Get sync cache statistics
   */
  getSyncStats(): { totalEntries: number; entries: TwinData[] } {
    return {
      totalEntries: this.syncCache.size,
      entries: Array.from(this.syncCache.values())
    };
  }
}
