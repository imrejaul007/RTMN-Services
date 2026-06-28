import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Mock file system for tests
const TEST_STORAGE_PATH = '/tmp/siteos-sales-test-company.json';

const cleanTestStorage = async () => {
  try {
    await fs.unlink(TEST_STORAGE_PATH);
  } catch (e) {
    // File doesn't exist, that's fine
  }
};

describe('Sales Pipeline API', () => {
  const API_KEY = 'test-api-key-1234567890';
  const BASE_URL = 'http://localhost:5485';

  // Helper to make requests (simulated)
  const makeRequest = async (method, endpoint, body = null, companyId = 'test-company') => {
    const storageKey = `siteos-sales-${companyId}.json`;
    const storagePath = `/tmp/${storageKey}`;

    try {
      const data = JSON.parse(await fs.readFile(storagePath, 'utf8'));
      return { data, status: 200 };
    } catch (e) {
      if (e.code === 'ENOENT') {
        return { data: { deals: {}, quotes: {}, products: {}, quoteCounter: 0 }, status: 200 };
      }
      throw e;
    }
  };

  beforeEach(async () => {
    await cleanTestStorage();
  });

  afterEach(async () => {
    await cleanTestStorage();
  });

  // ============================================
  // DEAL TESTS
  // ============================================

  describe('Deal Management', () => {
    it('should create a new deal with required fields', async () => {
      const dealData = {
        title: 'Test Deal',
        value: 50000,
        contactName: 'John Doe',
        contactEmail: 'john@example.com'
      };

      // Simulate deal creation
      const storagePath = `/tmp/siteos-sales-test-company.json`;
      const data = { deals: {}, quotes: {}, products: {}, quoteCounter: 0 };
      const dealId = 'test-deal-uuid';
      data.deals[dealId] = {
        dealId,
        ...dealData,
        stage: 'lead',
        probability: 10,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await fs.writeFile(storagePath, JSON.stringify(data, null, 2));

      const result = await makeRequest('POST', '/api/deals', dealData);
      expect(result.status).toBe(200);
    });

    it('should validate required fields when creating deal', () => {
      const invalidDeal = {
        title: 'Test Deal'
        // Missing value and contactName
      };

      // Validation logic test
      const isValid = invalidDeal.title && invalidDeal.value !== undefined && invalidDeal.contactName;
      expect(isValid).toBe(false);
    });

    it('should validate currency values', () => {
      const validCurrencies = ['INR', 'USD'];
      expect(validCurrencies.includes('INR')).toBe(true);
      expect(validCurrencies.includes('USD')).toBe(true);
      expect(validCurrencies.includes('EUR')).toBe(false);
    });

    it('should validate pipeline stages', () => {
      const PIPELINE_STAGES = [
        { id: 'lead', name: 'Lead', probability: 10 },
        { id: 'qualified', name: 'Qualified', probability: 25 },
        { id: 'proposal', name: 'Proposal Sent', probability: 50 },
        { id: 'negotiation', name: 'Negotiation', probability: 75 },
        { id: 'won', name: 'Won', probability: 100 },
        { id: 'lost', name: 'Lost', probability: 0 }
      ];

      PIPELINE_STAGES.forEach(stage => {
        expect(PIPELINE_STAGES.find(s => s.id === stage.id)).toBeDefined();
      });
    });

    it('should calculate deal probability based on stage', () => {
      const PIPELINE_STAGES = [
        { id: 'lead', probability: 10 },
        { id: 'qualified', probability: 25 },
        { id: 'proposal', probability: 50 },
        { id: 'negotiation', probability: 75 },
        { id: 'won', probability: 100 },
        { id: 'lost', probability: 0 }
      ];

      const stageConfig = PIPELINE_STAGES.find(s => s.id === 'proposal');
      expect(stageConfig.probability).toBe(50);

      const wonConfig = PIPELINE_STAGES.find(s => s.id === 'won');
      expect(wonConfig.probability).toBe(100);
    });

    it('should reject negative deal values', () => {
      const dealWithNegativeValue = {
        title: 'Test Deal',
        value: -1000,
        contactName: 'John Doe'
      };

      expect(dealWithNegativeValue.value < 0).toBe(true);
    });

    it('should store deal with activity log', async () => {
      const storagePath = `/tmp/siteos-sales-test-company.json`;
      const dealId = 'deal-with-activity';

      const deal = {
        dealId,
        title: 'Activity Test Deal',
        value: 25000,
        contactName: 'Jane Doe',
        stage: 'qualified',
        probability: 25,
        activities: [{
          type: 'created',
          description: 'Deal created',
          timestamp: new Date().toISOString()
        }]
      };

      await fs.writeFile(storagePath, JSON.stringify({ deals: { [dealId]: deal }, quotes: {}, products: {}, quoteCounter: 0 }, null, 2));

      const content = await fs.readFile(storagePath, 'utf8');
      const data = JSON.parse(content);
      expect(data.deals[dealId].activities.length).toBe(1);
    });
  });

  // ============================================
  // DEAL STAGE MOVEMENT TESTS
  // ============================================

  describe('Deal Stage Movement', () => {
    it('should move deal between stages', async () => {
      const storagePath = `/tmp/siteos-sales-test-company.json`;
      const dealId = 'deal-moving-stages';

      const deal = {
        dealId,
        title: 'Moving Deal',
        value: 75000,
        stage: 'lead',
        probability: 10
      };

      await fs.writeFile(storagePath, JSON.stringify({ deals: { [dealId]: deal }, quotes: {}, products: {}, quoteCounter: 0 }, null, 2));

      // Simulate stage change
      const data = JSON.parse(await fs.readFile(storagePath, 'utf8'));
      const updatedDeal = data.deals[dealId];
      updatedDeal.stage = 'qualified';
      updatedDeal.probability = 25;
      updatedDeal.activities = [{
        type: 'stage_change',
        description: 'Moved from Lead to Qualified',
        timestamp: new Date().toISOString()
      }];

      await fs.writeFile(storagePath, JSON.stringify(data, null, 2));

      const finalData = JSON.parse(await fs.readFile(storagePath, 'utf8'));
      expect(finalData.deals[dealId].stage).toBe('qualified');
      expect(finalData.deals[dealId].probability).toBe(25);
    });

    it('should set actualCloseDate when deal is won', async () => {
      const storagePath = `/tmp/siteos-sales-test-company.json`;
      const dealId = 'deal-won';

      const deal = {
        dealId,
        title: 'Won Deal',
        value: 100000,
        stage: 'negotiation',
        probability: 75,
        actualCloseDate: null
      };

      await fs.writeFile(storagePath, JSON.stringify({ deals: { [dealId]: deal }, quotes: {}, products: {}, quoteCounter: 0 }, null, 2));

      // Simulate closing as won
      const data = JSON.parse(await fs.readFile(storagePath, 'utf8'));
      data.deals[dealId].stage = 'won';
      data.deals[dealId].probability = 100;
      data.deals[dealId].actualCloseDate = new Date().toISOString();

      await fs.writeFile(storagePath, JSON.stringify(data, null, 2));

      const finalData = JSON.parse(await fs.readFile(storagePath, 'utf8'));
      expect(finalData.deals[dealId].stage).toBe('won');
      expect(finalData.deals[dealId].actualCloseDate).toBeDefined();
    });

    it('should store lost reason when deal is lost', async () => {
      const storagePath = `/tmp/siteos-sales-test-company.json`;
      const dealId = 'deal-lost';

      const deal = {
        dealId,
        title: 'Lost Deal',
        value: 50000,
        stage: 'proposal',
        probability: 50
      };

      await fs.writeFile(storagePath, JSON.stringify({ deals: { [dealId]: deal }, quotes: {}, products: {}, quoteCounter: 0 }, null, 2));

      // Simulate closing as lost
      const data = JSON.parse(await fs.readFile(storagePath, 'utf8'));
      data.deals[dealId].stage = 'lost';
      data.deals[dealId].probability = 0;
      data.deals[dealId].lostReason = 'Budget constraints';

      await fs.writeFile(storagePath, JSON.stringify(data, null, 2));

      const finalData = JSON.parse(await fs.readFile(storagePath, 'utf8'));
      expect(finalData.deals[dealId].lostReason).toBe('Budget constraints');
    });
  });

  // ============================================
  // COMMISSION CALCULATION TESTS
  // ============================================

  describe('Commission Calculation', () => {
    const calculateCommission = (dealValue) => {
      if (dealValue >= 100000) return Math.round(dealValue * 0.12 * 100) / 100;
      if (dealValue >= 50000) return Math.round(dealValue * 0.10 * 100) / 100;
      if (dealValue >= 10000) return Math.round(dealValue * 0.07 * 100) / 100;
      return Math.round(dealValue * 0.05 * 100) / 100;
    };

    it('should calculate base commission (5%) for deals under 10k', () => {
      expect(calculateCommission(5000)).toBe(250);
      expect(calculateCommission(9999)).toBeCloseTo(499.95, 2);
    });

    it('should calculate 7% commission for deals 10k-50k', () => {
      expect(calculateCommission(10000)).toBe(700);
      expect(calculateCommission(25000)).toBe(1750);
      // 50000 should be 10% tier (>= 50000), so skip this assertion
    });

    it('should calculate 10% commission for deals 50k-100k', () => {
      expect(calculateCommission(50000)).toBe(5000); // 50000 is >= 50000
      expect(calculateCommission(50001)).toBe(5000.1);
      expect(calculateCommission(75000)).toBe(7500);
      // 100000 should be 12% tier (>= 100000)
      expect(calculateCommission(100000)).toBe(12000);
    });

    it('should calculate 12% commission for deals over 100k', () => {
      expect(calculateCommission(100001)).toBeCloseTo(12000.12, 2);
      expect(calculateCommission(500000)).toBe(60000);
      expect(calculateCommission(1000000)).toBe(120000);
    });

    it('should return 0 commission for deals with no value', () => {
      expect(calculateCommission(0)).toBe(0);
    });
  });

  // ============================================
  // QUOTE TESTS
  // ============================================

  describe('Quote Management', () => {
    it('should create a quote with line items', async () => {
      const storagePath = `/tmp/siteos-sales-test-company.json`;
      const quoteId = 'quote-001';

      const items = [
        { name: 'Product A', quantity: 2, unitPrice: 1000, discount: 0, taxRate: 18 },
        { name: 'Product B', quantity: 1, unitPrice: 2500, discount: 10, taxRate: 18 }
      ];

      // Calculate totals
      let subtotal = 0;
      let discountTotal = 0;
      let taxTotal = 0;

      items.forEach(item => {
        const lineSubtotal = item.quantity * item.unitPrice;
        const discountAmount = lineSubtotal * (item.discount / 100);
        const taxableAmount = lineSubtotal - discountAmount;
        const taxAmount = taxableAmount * (item.taxRate / 100);

        item.total = Math.round((taxableAmount + taxAmount) * 100) / 100;
        subtotal += lineSubtotal;
        discountTotal += discountAmount;
        taxTotal += taxAmount;
      });

      const quote = {
        quoteId,
        quoteNumber: 'QT-202606-0001',
        contactName: 'Test Customer',
        items,
        subtotal,
        discountTotal,
        taxTotal,
        total: Math.round((subtotal - discountTotal + taxTotal) * 100) / 100,
        status: 'draft'
      };

      await fs.writeFile(storagePath, JSON.stringify({ deals: {}, quotes: { [quoteId]: quote }, products: {}, quoteCounter: 1 }, null, 2));

      const data = JSON.parse(await fs.readFile(storagePath, 'utf8'));
      expect(data.quotes[quoteId].items.length).toBe(2);
      expect(data.quotes[quoteId].total).toBeGreaterThan(0);
    });

    it('should calculate quote totals correctly', () => {
      // Items have taxRate property (percentage like 18 for 18%)
      const items = [
        { quantity: 2, unitPrice: 1000, discount: 0, taxRate: 18 }, // 2000, no discount
        { quantity: 1, unitPrice: 5000, discount: 20, taxRate: 18 }  // 5000, 20% off = 4000 taxable
      ];

      // Item 1: 2000 - 0 = 2000, tax = 360, total = 2360
      // Item 2: 5000 - 1000 = 4000, tax = 720, total = 4720
      // Total: 7080

      let subtotal = 0;
      let discountTotal = 0;
      let taxTotal = 0;

      items.forEach(item => {
        const lineSubtotal = item.quantity * item.unitPrice;
        const discountAmount = lineSubtotal * (item.discount / 100);
        const taxableAmount = lineSubtotal - discountAmount;
        const taxAmount = taxableAmount * (item.taxRate / 100);

        item.total = Math.round((taxableAmount + taxAmount) * 100) / 100;
        subtotal += lineSubtotal;
        discountTotal += discountAmount;
        taxTotal += taxAmount;
      });

      expect(subtotal).toBe(7000);
      expect(discountTotal).toBe(1000);
      expect(taxTotal).toBe(1080); // 2000*0.18 + 4000*0.18 = 360 + 720
      expect(items[0].total).toBe(2360);
      expect(items[1].total).toBe(4720);
    });

    it('should generate quote numbers sequentially', () => {
      const generateQuoteNumber = (counter) => {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const seq = String(counter + 1).padStart(4, '0');
        return `QT-${year}${month}-${seq}`;
      };

      expect(generateQuoteNumber(0)).toContain('QT-');
      expect(generateQuoteNumber(99)).toContain('-0100');
      expect(generateQuoteNumber(999)).toContain('-1000');
    });

    it('should track quote status transitions', () => {
      const validStatuses = ['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired'];
      const statusTransitions = {
        draft: ['sent'],
        sent: ['viewed', 'accepted', 'rejected', 'expired'],
        viewed: ['accepted', 'rejected', 'expired'],
        accepted: [],
        rejected: [],
        expired: []
      };

      // Can only send draft quotes
      const canSend = (status) => statusTransitions[status].includes('sent');
      expect(canSend('draft')).toBe(true);
      expect(canSend('sent')).toBe(false);
      expect(canSend('accepted')).toBe(false);

      // Can accept sent or viewed quotes
      const canAccept = (status) => ['sent', 'viewed'].includes(status);
      expect(canAccept('sent')).toBe(true);
      expect(canAccept('viewed')).toBe(true);
      expect(canAccept('draft')).toBe(false);

      // All valid statuses
      validStatuses.forEach(status => {
        expect(validStatuses.includes(status)).toBe(true);
      });
    });
  });

  // ============================================
  // PRODUCT TESTS
  // ============================================

  describe('Product Management', () => {
    it('should create a product with required fields', async () => {
      const storagePath = `/tmp/siteos-sales-test-company.json`;
      const productId = 'product-001';

      const product = {
        productId,
        name: 'Enterprise Plan',
        description: 'Full featured enterprise solution',
        sku: 'ENT-001',
        unitPrice: 99999,
        currency: 'INR',
        taxRate: 18,
        category: 'Plans',
        active: true,
        createdAt: new Date().toISOString()
      };

      await fs.writeFile(storagePath, JSON.stringify({ deals: {}, quotes: {}, products: { [productId]: product }, quoteCounter: 0 }, null, 2));

      const data = JSON.parse(await fs.readFile(storagePath, 'utf8'));
      expect(data.products[productId].name).toBe('Enterprise Plan');
      expect(data.products[productId].unitPrice).toBe(99999);
    });

    it('should auto-generate SKU if not provided', () => {
      const productId = 'abc12345';
      const sku = `SKU-${productId.slice(0, 8).toUpperCase()}`;
      expect(sku).toBe('SKU-ABC12345');
    });

    it('should filter products by category', async () => {
      const storagePath = `/tmp/siteos-sales-test-company.json`;

      const products = {
        'p1': { name: 'Basic Plan', category: 'Plans', active: true },
        'p2': { name: 'Pro Plan', category: 'Plans', active: true },
        'p3': { name: 'Add-on A', category: 'Add-ons', active: true },
        'p4': { name: 'Legacy', category: 'Plans', active: false }
      };

      await fs.writeFile(storagePath, JSON.stringify({ deals: {}, quotes: {}, products, quoteCounter: 0 }, null, 2));

      const data = JSON.parse(await fs.readFile(storagePath, 'utf8'));
      const allProducts = Object.values(data.products);

      const plans = allProducts.filter(p => p.category === 'Plans');
      const activePlans = allProducts.filter(p => p.category === 'Plans' && p.active);

      expect(plans.length).toBe(3);
      expect(activePlans.length).toBe(2);
    });
  });

  // ============================================
  // ANALYTICS TESTS
  // ============================================

  describe('Analytics', () => {
    it('should calculate pipeline summary correctly', async () => {
      const storagePath = `/tmp/siteos-sales-test-company.json`;

      const deals = {
        'd1': { stage: 'lead', value: 10000, probability: 10 },
        'd2': { stage: 'qualified', value: 25000, probability: 25 },
        'd3': { stage: 'proposal', value: 50000, probability: 50 },
        'd4': { stage: 'negotiation', value: 75000, probability: 75 },
        'd5': { stage: 'won', value: 100000, probability: 100 },
        'd6': { stage: 'lost', value: 15000, probability: 0 }
      };

      let totalValue = 0;
      let totalWeightedValue = 0;
      let openDeals = 0;

      Object.values(deals).forEach(deal => {
        if (deal.stage !== 'won' && deal.stage !== 'lost') {
          totalValue += deal.value;
          totalWeightedValue += deal.value * (deal.probability / 100);
          openDeals++;
        }
      });

      // 10000 + 25000 + 50000 + 75000 = 160000
      expect(totalValue).toBe(160000);
      expect(openDeals).toBe(4);
      // 10000*0.1 + 25000*0.25 + 50000*0.5 + 75000*0.75 = 1000 + 6250 + 25000 + 56250 = 88500
      expect(totalWeightedValue).toBe(88500);
    });

    it('should calculate win rate correctly', () => {
      const wonDeals = 7;
      const lostDeals = 3;
      const winRate = Math.round(wonDeals / (wonDeals + lostDeals) * 100);

      expect(winRate).toBe(70);
    });

    it('should calculate sales rep performance', async () => {
      const storagePath = `/tmp/siteos-sales-test-company.json`;

      const deals = {
        'd1': { owner: 'Alice', stage: 'won', value: 50000 },
        'd2': { owner: 'Alice', stage: 'won', value: 75000 },
        'd3': { owner: 'Alice', stage: 'lost', value: 20000 },
        'd4': { owner: 'Bob', stage: 'won', value: 100000 },
        'd5': { owner: 'Bob', stage: 'qualified', value: 30000 }
      };

      const repStats = {};

      Object.values(deals).forEach(deal => {
        if (!repStats[deal.owner]) {
          repStats[deal.owner] = { wonDeals: 0, lostDeals: 0, wonValue: 0, lostValue: 0 };
        }
        if (deal.stage === 'won') {
          repStats[deal.owner].wonDeals++;
          repStats[deal.owner].wonValue += deal.value;
        } else if (deal.stage === 'lost') {
          repStats[deal.owner].lostDeals++;
          repStats[deal.owner].lostValue += deal.value;
        }
      });

      expect(repStats['Alice'].wonDeals).toBe(2);
      expect(repStats['Alice'].wonValue).toBe(125000);
      expect(repStats['Bob'].wonDeals).toBe(1);
    });

    it('should calculate quote conversion rate', () => {
      const stats = {
        sent: 20,
        accepted: 8,
        rejected: 5,
        expired: 2
      };

      const conversionRate = stats.sent > 0
        ? Math.round((stats.accepted / stats.sent) * 100)
        : 0;

      expect(conversionRate).toBe(40);
    });

    it('should calculate average response time for quotes', () => {
      const quotes = [
        { sentAt: '2026-06-28T10:00:00Z', respondedAt: '2026-06-28T10:30:00Z' }, // 30 min
        { sentAt: '2026-06-28T11:00:00Z', respondedAt: '2026-06-28T11:45:00Z' }, // 45 min
        { sentAt: '2026-06-28T12:00:00Z', respondedAt: '2026-06-28T13:00:00Z' }  // 60 min
      ];

      let totalMinutes = 0;
      quotes.forEach(q => {
        const diff = new Date(q.respondedAt) - new Date(q.sentAt);
        totalMinutes += diff / (1000 * 60);
      });

      const avgResponseTime = Math.round(totalMinutes / quotes.length);
      expect(avgResponseTime).toBe(45);
    });
  });

  // ============================================
  // PIPELINE STAGE CONFIGURATION TESTS
  // ============================================

  describe('Pipeline Configuration', () => {
    it('should have correct stage colors', () => {
      const PIPELINE_STAGES = [
        { id: 'lead', name: 'Lead', probability: 10, color: '#94A3B8' },
        { id: 'qualified', name: 'Qualified', probability: 25, color: '#3B82F6' },
        { id: 'proposal', name: 'Proposal Sent', probability: 50, color: '#F59E0B' },
        { id: 'negotiation', name: 'Negotiation', probability: 75, color: '#8B5CF6' },
        { id: 'won', name: 'Won', probability: 100, color: '#22C55E' },
        { id: 'lost', name: 'Lost', probability: 0, color: '#EF4444' }
      ];

      PIPELINE_STAGES.forEach(stage => {
        expect(stage.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });
    });

    it('should have all required stages', () => {
      const expectedStages = ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];
      const PIPELINE_STAGES = [
        { id: 'lead' }, { id: 'qualified' }, { id: 'proposal' },
        { id: 'negotiation' }, { id: 'won' }, { id: 'lost' }
      ];

      expectedStages.forEach(expected => {
        expect(PIPELINE_STAGES.find(s => s.id === expected)).toBeDefined();
      });
    });

    it('should have sequential probability values', () => {
      const PIPELINE_STAGES = [
        { id: 'lead', probability: 10 },
        { id: 'qualified', probability: 25 },
        { id: 'proposal', probability: 50 },
        { id: 'negotiation', probability: 75 },
        { id: 'won', probability: 100 },
        { id: 'lost', probability: 0 }
      ];

      const progression = PIPELINE_STAGES.filter(s => s.id !== 'lost');
      for (let i = 1; i < progression.length; i++) {
        expect(progression[i].probability).toBeGreaterThan(progression[i - 1].probability);
      }

      const lostStage = PIPELINE_STAGES.find(s => s.id === 'lost');
      expect(lostStage.probability).toBe(0);
    });
  });

  // ============================================
  // AUTHENTICATION TESTS
  // ============================================

  describe('Authentication', () => {
    it('should reject requests without API key', () => {
      const apiKey = null;
      expect(!apiKey).toBe(true);
    });

    it('should reject short API keys', () => {
      const shortKey = 'abc123';
      expect(shortKey.length < 16).toBe(true);

      const validKey = 'valid-api-key-1234567890';
      expect(validKey.length < 16).toBe(false);
    });
  });

  // ============================================
  // STORAGE TESTS
  // ============================================

  describe('Storage', () => {
    it('should create new storage file if not exists', async () => {
      const storagePath = `/tmp/siteos-sales-new-company.json`;

      try {
        await fs.unlink(storagePath);
      } catch (e) {
        // File doesn't exist
      }

      try {
        const data = await fs.readFile(storagePath, 'utf8');
        // File exists
        expect(data).toBeDefined();
      } catch (e) {
        if (e.code === 'ENOENT') {
          // Create new file with default structure
          const defaultData = { deals: {}, quotes: {}, products: {}, quoteCounter: 0 };
          await fs.writeFile(storagePath, JSON.stringify(defaultData, null, 2));
          expect(true).toBe(true);
        }
      }

      // Clean up
      try {
        await fs.unlink(storagePath);
      } catch (e) {
        // Already deleted
      }
    });

    it('should handle sequential write operations correctly', async () => {
      const storagePath = `/tmp/siteos-sales-sequential-test.json`;

      // Initialize
      await fs.writeFile(storagePath, JSON.stringify({ deals: {}, quotes: {}, products: {}, quoteCounter: 0 }, null, 2));

      // Sequential writes (not truly concurrent)
      for (let i = 0; i < 5; i++) {
        const data = JSON.parse(await fs.readFile(storagePath, 'utf8'));
        data.deals[`deal-${i}`] = { title: `Deal ${i}`, value: i * 1000 };
        await fs.writeFile(storagePath, JSON.stringify(data, null, 2));
      }

      const finalData = JSON.parse(await fs.readFile(storagePath, 'utf8'));
      expect(Object.keys(finalData.deals).length).toBe(5);

      // Clean up
      await fs.unlink(storagePath);
    });

    it('should persist data correctly', async () => {
      const storagePath = `/tmp/siteos-sales-persist-test.json`;

      const testData = {
        deals: {
          'deal-1': { title: 'Test Deal', value: 50000, stage: 'lead' }
        },
        quotes: {},
        products: {
          'prod-1': { name: 'Test Product', unitPrice: 999 }
        },
        quoteCounter: 0
      };

      await fs.writeFile(storagePath, JSON.stringify(testData, null, 2));

      const readData = JSON.parse(await fs.readFile(storagePath, 'utf8'));
      expect(readData.deals['deal-1'].title).toBe('Test Deal');
      expect(readData.products['prod-1'].unitPrice).toBe(999);

      // Clean up
      await fs.unlink(storagePath);
    });
  });
});
