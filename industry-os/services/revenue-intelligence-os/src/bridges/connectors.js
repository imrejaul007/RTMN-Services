/**
 * Service Bridges
 * Connect Revenue Intelligence OS to other RTMN services
 */

/**
 * Sales OS Bridge
 */
export class SalesOSBridge {
  constructor() {
    this.name = 'Sales OS';
    this.port = 5055;
    this.baseUrl = `http://localhost:${this.port}`;
  }

  async getHealth() {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok ? { status: 'connected', data: await response.json() } : { status: 'error' };
    } catch (error) {
      return { status: 'disconnected', error: error.message };
    }
  }

  async getPipelineRevenue() {
    try {
      const response = await fetch(`${this.baseUrl}/api/health`);
      if (response.ok) {
        const data = await response.json();
        return {
          opportunities: data.modules?.pipeline?.opportunities || 0,
          revenue: data.modules?.pipeline?.revenue || 0,
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  async getSubscriptions() {
    try {
      const response = await fetch(`${this.baseUrl}/api/health`);
      if (response.ok) {
        const data = await response.json();
        return {
          subscriptions: data.modules?.subscriptions?.subscriptions || 0,
          mrr: data.modules?.subscriptions?.mrr || 0,
          arr: data.modules?.subscriptions?.arr || 0,
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  async getForecasts() {
    try {
      const response = await fetch(`${this.baseUrl}/api/forecasts`);
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch {
      return null;
    }
  }
}

/**
 * Finance OS Bridge
 */
export class FinanceOSBridge {
  constructor() {
    this.name = 'Finance OS';
    this.port = 4801;
    this.baseUrl = `http://localhost:${this.port}`;
  }

  async getHealth() {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok ? { status: 'connected', data: await response.json() } : { status: 'error' };
    } catch (error) {
      return { status: 'disconnected', error: error.message };
    }
  }

  async getDashboard() {
    try {
      const response = await fetch(`${this.baseUrl}/api/dashboard/overview`);
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch {
      return null;
    }
  }

  async getAccounts() {
    try {
      const response = await fetch(`${this.baseUrl}/api/chart-of-accounts`);
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch {
      return null;
    }
  }

  async getIndustryRevenue() {
    try {
      const response = await fetch(`${this.baseUrl}/api/industries/dashboard`);
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch {
      return null;
    }
  }
}

/**
 * Marketing OS Bridge
 */
export class MarketingOSBridge {
  constructor() {
    this.name = 'Marketing OS';
    this.port = 5500;
    this.baseUrl = `http://localhost:${this.port}`;
  }

  async getHealth() {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok ? { status: 'connected', data: await response.json() } : { status: 'error' };
    } catch (error) {
      return { status: 'disconnected', error: error.message };
    }
  }

  async getCampaigns() {
    try {
      const response = await fetch(`${this.baseUrl}/api/campaigns`);
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch {
      return null;
    }
  }

  async getAttribution() {
    try {
      const response = await fetch(`${this.baseUrl}/api/adbazaar/attribution`);
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch {
      return null;
    }
  }
}

/**
 * Operations OS Bridge
 */
export class OperationsOSBridge {
  constructor() {
    this.name = 'Operations OS';
    this.port = 5250;
    this.baseUrl = `http://localhost:${this.port}`;
  }

  async getHealth() {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok ? { status: 'connected', data: await response.json() } : { status: 'error' };
    } catch (error) {
      return { status: 'disconnected', error: error.message };
    }
  }

  async getAnalytics() {
    try {
      const response = await fetch(`${this.baseUrl}/api/analytics/overview`);
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch {
      return null;
    }
  }

  async getProjects() {
    try {
      const response = await fetch(`${this.baseUrl}/api/projects`);
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch {
      return null;
    }
  }
}

/**
 * CXO OS Bridge
 */
export class CXOSBridge {
  constructor() {
    this.name = 'CXO OS';
    this.port = 5100;
    this.baseUrl = `http://localhost:${this.port}`;
  }

  async getHealth() {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok ? { status: 'connected', data: await response.json() } : { status: 'error' };
    } catch (error) {
      return { status: 'disconnected', error: error.message };
    }
  }

  async getKPIs() {
    try {
      const response = await fetch(`${this.baseUrl}/api/kpis`);
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch {
      return null;
    }
  }
}

/**
 * Industry OS Bridge
 */
export class IndustryOSBridge {
  constructor() {
    this.industries = [
      { code: 'restaurant', name: 'Restaurant OS', port: 5010 },
      { code: 'hotel', name: 'Hotel OS', port: 5025 },
      { code: 'healthcare', name: 'Healthcare OS', port: 5020 },
      { code: 'retail', name: 'Retail OS', port: 5030 },
      { code: 'legal', name: 'Legal OS', port: 5035 },
      { code: 'education', name: 'Education OS', port: 5060 },
      { code: 'automotive', name: 'Automotive OS', port: 5080 },
      { code: 'beauty', name: 'Beauty OS', port: 5090 },
      { code: 'fitness', name: 'Fitness OS', port: 5110 },
      { code: 'realestate', name: 'RealEstate OS', port: 5230 },
      { code: 'manufacturing', name: 'Manufacturing OS', port: 5150 },
      { code: 'travel', name: 'Travel OS', port: 5190 },
    ];
  }

  async getAllIndustryRevenue() {
    const results = [];
    let totalRevenue = 0;

    for (const industry of this.industries) {
      try {
        const response = await fetch(`http://localhost:${industry.port}/api/analytics/overview`);
        if (response.ok) {
          const data = await response.json();
          const revenue = data.revenue || data.totalRevenue || 0;
          results.push({
            ...industry,
            status: 'connected',
            revenue,
          });
          totalRevenue += revenue;
        } else {
          results.push({ ...industry, status: 'unavailable', revenue: 0 });
        }
      } catch {
        results.push({ ...industry, status: 'unreachable', revenue: 0 });
      }
    }

    return {
      industries: results,
      summary: {
        totalRevenue,
        connected: results.filter(i => i.status === 'connected').length,
        total: results.length,
      },
    };
  }

  async getIndustryRevenue(industryCode) {
    const industry = this.industries.find(i => i.code === industryCode);
    if (!industry) {
      return { error: 'Industry not found' };
    }

    try {
      const response = await fetch(`http://localhost:${industry.port}/api/analytics/overview`);
      if (response.ok) {
        const data = await response.json();
        return {
          ...industry,
          status: 'connected',
          revenue: data.revenue || data.totalRevenue || 0,
          data,
        };
      }
      return { ...industry, status: 'unavailable', revenue: 0 };
    } catch {
      return { ...industry, status: 'unreachable', revenue: 0 };
    }
  }
}

/**
 * Unified Bridge Manager
 */
export class BridgeManager {
  constructor() {
    this.bridges = {
      sales: new SalesOSBridge(),
      finance: new FinanceOSBridge(),
      marketing: new MarketingOSBridge(),
      operations: new OperationsOSBridge(),
      cxo: new CXOSBridge(),
      industry: new IndustryOSBridge(),
    };
  }

  async checkAllConnections() {
    const results = {};

    for (const [name, bridge] of Object.entries(this.bridges)) {
      const health = await bridge.getHealth();
      results[name] = {
        name: bridge.name || name,
        ...health,
      };
    }

    return {
      connections: results,
      summary: {
        connected: Object.values(results).filter(r => r.status === 'connected').length,
        disconnected: Object.values(results).filter(r => r.status === 'disconnected').length,
        total: Object.keys(results).length,
      },
    };
  }

  async collectAllRevenueData() {
    const data = {};

    // Collect from Sales OS
    const salesBridge = this.bridges.sales;
    data.sales = {
      pipeline: await salesBridge.getPipelineRevenue(),
      subscriptions: await salesBridge.getSubscriptions(),
      forecasts: await salesBridge.getForecasts(),
    };

    // Collect from Finance OS
    const financeBridge = this.bridges.finance;
    data.finance = {
      dashboard: await financeBridge.getDashboard(),
      accounts: await financeBridge.getAccounts(),
      industryRevenue: await financeBridge.getIndustryRevenue(),
    };

    // Collect from Marketing OS
    const marketingBridge = this.bridges.marketing;
    data.marketing = {
      campaigns: await marketingBridge.getCampaigns(),
      attribution: await marketingBridge.getAttribution(),
    };

    // Collect from Industry OS
    const industryBridge = this.bridges.industry;
    data.industry = await industryBridge.getAllIndustryRevenue();

    return data;
  }
}

export default {
  SalesOSBridge,
  FinanceOSBridge,
  MarketingOSBridge,
  OperationsOSBridge,
  CXOSBridge,
  IndustryOSBridge,
  BridgeManager,
};
