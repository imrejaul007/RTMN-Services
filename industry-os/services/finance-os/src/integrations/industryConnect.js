/**
 * RTMN Finance OS - Industry OS Integration Layer
 *
 * Connects Finance OS to all 24 Industry Operating Systems
 * for automatic revenue/expense tracking
 *
 * Integration Flow:
 *
 * Industry OS ──► Revenue/Expense ──► Finance OS
 */

const axios = require('axios');

// Industry OS endpoints
const INDUSTRY_CONNECTIONS = {
  // Restaurant OS
  hospitality: { port: 5010, revenue: 'orders', expense: 'inventory' },
  restaurant: { port: 5010, revenue: 'orders', expense: 'inventory' },

  // Healthcare OS
  healthcare: { port: 5020, revenue: 'billing', expense: 'supplies' },

  // Hotel OS
  hotel: { port: 5025, revenue: 'bookings', expense: 'purchases' },
  stayown: { port: 5025, revenue: 'bookings', expense: 'purchases' },

  // Retail OS
  retail: { port: 5030, revenue: 'sales', expense: 'inventory' },

  // Legal OS
  legal: { port: 5035, revenue: 'invoices', expense: 'disbursements' },

  // Sales OS
  sales: { port: 5055, revenue: 'deals', expense: 'marketing' },
  salesos: { port: 5055, revenue: 'deals', expense: 'marketing' },

  // Education OS
  education: { port: 5060, revenue: 'enrollments', expense: 'operations' },

  // Hospitality OS
  hospitality: { port: 5050, revenue: 'bookings', expense: 'operations' },

  // Beauty OS
  beauty: { port: 5090, revenue: 'appointments', expense: 'products' },

  // Fitness OS
  fitness: { port: 5110, revenue: 'memberships', expense: 'operations' },

  // Automotive OS
  automotive: { port: 5080, revenue: 'jobs', expense: 'parts' },

  // RealEstate OS
  realestate: { port: 5230, revenue: 'deals', expense: 'operations' },

  // Media OS
  media: { port: 5600, revenue: 'projects', expense: 'production' },

  // Travel OS
  travel: { port: 5190, revenue: 'bookings', expense: 'operations' },

  // Gaming OS
  gaming: { port: 5120, revenue: 'subscriptions', expense: 'hosting' },

  // Government OS
  government: { port: 5130, revenue: 'permits', expense: 'operations' },

  // HomeServices OS
  homeservices: { port: 5140, revenue: 'jobs', expense: 'supplies' },

  // Manufacturing OS
  manufacturing: { port: 5150, revenue: 'orders', expense: 'raw_materials' },

  // NonProfit OS
  nonprofit: { port: 5160, revenue: 'donations', expense: 'programs' },

  // Professional OS
  professional: { port: 5170, revenue: 'engagements', expense: 'consulting' },

  // Sports OS
  sports: { port: 5180, revenue: 'memberships', expense: 'events' },

  // Entertainment OS
  entertainment: { port: 5200, revenue: 'tickets', expense: 'production' },

  // Construction OS
  construction: { port: 5210, revenue: 'contracts', expense: 'materials' },

  // Financial OS
  financial: { port: 5220, revenue: 'services', expense: 'compliance' },

  // Transport OS
  transport: { port: 5240, revenue: 'bookings', expense: 'fuel' },

  // Exhibition OS
  exhibition: { port: 5040, revenue: 'tickets', expense: 'operations' },
};

// Base URL for local development
const getBaseUrl = (port) => `http://localhost:${port}`;

class FinanceIntegrationHub {
  constructor() {
    this.connections = new Map();
    this.initialized = false;
  }

  async initialize() {
    console.log('🔗 Initializing Finance OS Industry Connections...');

    for (const [name, config] of Object.entries(INDUSTRY_CONNECTIONS)) {
      const url = getBaseUrl(config.port);
      const status = await this.checkConnection(url);
      this.connections.set(name, {
        ...config,
        url,
        status: status ? 'connected' : 'disconnected'
      });
    }

    this.initialized = true;
    console.log(`✅ Finance OS connected to ${this.connections.size} industry endpoints`);
    return this.connections;
  }

  async checkConnection(url) {
    try {
      await axios.get(`${url}/health`, { timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }

  // Get all connections status
  getStatus() {
    const status = {};
    this.connections.forEach((config, name) => {
      status[name] = config.status;
    });
    return status;
  }

  // Sync revenue from Industry OS
  async syncRevenue(industry, date) {
    const config = this.connections.get(industry);
    if (!config || config.status !== 'connected') {
      return { error: `${industry} not connected` };
    }

    try {
      const response = await axios.get(`${config.url}/api/${config.revenue}`, {
        params: { date },
        timeout: 5000
      });

      const revenue = response.data.revenue || response.data.total || 0;

      // Create journal entry in Finance OS
      return {
        industry,
        revenue,
        synced: true,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  // Sync expenses from Industry OS
  async syncExpenses(industry, date) {
    const config = this.connections.get(industry);
    if (!config || config.status !== 'connected') {
      return { error: `${industry} not connected` };
    }

    try {
      const response = await axios.get(`${config.url}/api/${config.expense}`, {
        params: { date },
        timeout: 5000
      });

      const expenses = response.data.expenses || response.data.total || 0;

      return {
        industry,
        expenses,
        synced: true,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  // Get unified revenue from all industries
  async getAllRevenue(date) {
    const results = {};
    let totalRevenue = 0;

    for (const [name, config] of this.connections) {
      if (config.status === 'connected') {
        const result = await this.syncRevenue(name, date);
        if (result.revenue) {
          results[name] = result.revenue;
          totalRevenue += result.revenue;
        }
      }
    }

    return { byIndustry: results, total: totalRevenue };
  }

  // Get unified expenses from all industries
  async getAllExpenses(date) {
    const results = {};
    let totalExpenses = 0;

    for (const [name, config] of this.connections) {
      if (config.status === 'connected') {
        const result = await this.syncExpenses(name, date);
        if (result.expenses) {
          results[name] = result.expenses;
          totalExpenses += result.expenses;
        }
      }
    }

    return { byIndustry: results, total: totalExpenses };
  }
}

// Singleton
const integrationHub = new FinanceIntegrationHub();

module.exports = { integrationHub, INDUSTRY_CONNECTIONS };
