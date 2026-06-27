/**
 * Widget Command - AI Business Advisor Tests
 *
 * Tests cover:
 * 1. AI Business Advisor endpoints
 * 2. Campaign Auto-Creation
 * 3. Coupon Auto-Optimization
 * 4. Dynamic Pricing
 * 5. Budget Auto-Allocation
 * 6. Command Center Execution
 */

const { app } = require('../src/index.js');

// Simple mock HTTP client for testing without starting server
const BASE_URL = 'http://localhost:5412';

// Mock data for testing
const mockEvents = [
  { id: '1', type: 'revenue', action: 'order', value: 1000, timestamp: new Date().toISOString() },
  { id: '2', type: 'cart', action: 'abandon', value: 150, timestamp: new Date().toISOString() },
  { id: '3', type: 'revenue', action: 'order', value: 800, timestamp: new Date().toISOString() }
];

// Helper to make HTTP requests
async function request(method, path, body = null) {
  const http = require('http');

  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            body: JSON.parse(data)
          });
        } catch {
          resolve({
            status: res.statusCode,
            body: data
          });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// =============================================================================
// TEST SUITE
// =============================================================================

describe('Widget Command - AI Business Advisor', () => {

  // Start server before tests
  beforeAll(() => {
    // Server should be running from npm start
    // In real tests, we'd use supertest or start the server
  }, 10000);

  // =============================================================================
  // MODULE 1: AI BUSINESS ADVISOR
  // =============================================================================

  describe('AI Business Advisor', () => {
    test('should respond to revenue question with insights', async () => {
      const response = await request('POST', '/api/command/ask', {
        question: 'Why did revenue drop this week?',
        businessId: 'test-business-001'
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('answer');
      expect(response.body).toHaveProperty('insights');
      expect(response.body).toHaveProperty('rootCause');
      expect(response.body).toHaveProperty('recommendations');
      expect(response.body).toHaveProperty('confidence');
      expect(response.body.confidence).toBeGreaterThan(0);
    });

    test('should respond to churn question', async () => {
      const response = await request('POST', '/api/command/ask', {
        question: 'What is the churn rate?',
        businessId: 'test-business-001'
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('insights');
      expect(Array.isArray(response.body.insights)).toBe(true);
    });

    test('should respond to cart abandonment question', async () => {
      const response = await request('POST', '/api/command/ask', {
        question: 'How many carts were abandoned today?',
        businessId: 'test-business-001'
      });

      expect(response.status).toBe(200);
      expect(response.body.insights).toBeDefined();
      const churnInsight = response.body.insights.find(i => i.type === 'conversion');
      expect(churnInsight).toBeDefined();
    });

    test('should respond to ROAS question', async () => {
      const response = await request('POST', '/api/command/ask', {
        question: 'Why did ROAS drop this week?',
        businessId: 'test-business-001'
      });

      expect(response.status).toBe(200);
      const marketingInsight = response.body.insights.find(i => i.type === 'marketing');
      expect(marketingInsight).toBeDefined();
    });

    test('should require question parameter', async () => {
      const response = await request('POST', '/api/command/ask', {});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('should return current insights summary', async () => {
      const response = await request('GET', '/api/command/insights?businessId=test-business-001');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('businessId');
      expect(response.body).toHaveProperty('insights');
      expect(response.body).toHaveProperty('summary');
      expect(response.body.summary).toHaveProperty('totalInsights');
    });
  });

  // =============================================================================
  // MODULE 2: CAMPAIGN AUTO-CREATION
  // =============================================================================

  describe('Campaign Auto-Creation', () => {
    test('should auto-create retention campaign', async () => {
      const response = await request('POST', '/api/command/campaign/create', {
        reason: '60+ days inactive',
        type: 'inactivity',
        inactiveDays: 60,
        ltvThreshold: 500
      });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('campaign');
      expect(response.body.campaign).toHaveProperty('id');
      expect(response.body.campaign).toHaveProperty('type', 'retention');
      expect(response.body.campaign).toHaveProperty('segments');
      expect(response.body.campaign).toHaveProperty('content');
      expect(response.body.campaign.content).toHaveProperty('email');
      expect(response.body.campaign.content).toHaveProperty('whatsapp');
      expect(response.body.campaign).toHaveProperty('coupon');
      expect(response.body.campaign).toHaveProperty('schedule');
    });

    test('should create campaign with all required fields', async () => {
      const response = await request('POST', '/api/command/campaign/create', {
        reason: 'High churn detected',
        inactiveDays: 45,
        ltvThreshold: 300,
        suggestedDiscount: 12
      });

      expect(response.status).toBe(201);
      expect(response.body.campaign.coupon.discount).toBe(12);
      expect(response.body.campaign.segments[0].criteria.inactiveDays.$gte).toBe(45);
    });

    test('should require churn signal', async () => {
      const response = await request('POST', '/api/command/campaign/create', {});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('should get campaign status', async () => {
      // First create a campaign
      const createResponse = await request('POST', '/api/command/campaign/create', {
        reason: 'Test campaign'
      });

      const campaignId = createResponse.body.campaign.id;
      const statusResponse = await request('GET', `/api/command/campaign/${campaignId}/status`);

      expect(statusResponse.status).toBe(200);
      expect(statusResponse.body).toHaveProperty('id', campaignId);
      expect(statusResponse.body).toHaveProperty('metrics');
    });

    test('should return 404 for non-existent campaign', async () => {
      const response = await request('GET', '/api/command/campaign/non-existent-id/status');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    test('should list all campaigns', async () => {
      const response = await request('GET', '/api/command/campaigns');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('campaigns');
      expect(Array.isArray(response.body.campaigns)).toBe(true);
    });
  });

  // =============================================================================
  // MODULE 3: COUPON AUTO-OPTIMIZATION
  // =============================================================================

  describe('Coupon Auto-Optimization', () => {
    test('should analyze coupon performance', async () => {
      const response = await request('POST', '/api/command/coupon/optimize', {});

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('analysis');
      expect(response.body.analysis).toHaveProperty('analyzedCoupons');
      expect(response.body.analysis).toHaveProperty('discountLevels');
      expect(response.body.analysis).toHaveProperty('recommendations');
      expect(Array.isArray(response.body.analysis.discountLevels)).toBe(true);
    });

    test('should find minimum effective discount', async () => {
      const response = await request('POST', '/api/command/coupon/optimize', {});

      expect(response.body.summary).toHaveProperty('minimumEffectiveDiscount');
      expect(response.body.summary).toHaveProperty('potentialSavings');
      expect(typeof response.body.summary.minimumEffectiveDiscount).toBe('number');
    });

    test('should return discount levels sorted', async () => {
      const response = await request('POST', '/api/command/coupon/optimize', {});

      const levels = response.body.analysis.discountLevels;
      for (let i = 1; i < levels.length; i++) {
        expect(levels[i].discount).toBeGreaterThan(levels[i - 1].discount);
      }
    });

    test('should return coupon recommendations', async () => {
      const response = await request('GET', '/api/command/coupon/recommendations');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('recommendations');
      expect(Array.isArray(response.body.recommendations)).toBe(true);
      expect(response.body.recommendations.length).toBeGreaterThan(0);

      // Check recommendation structure
      const recommendation = response.body.recommendations[0];
      expect(recommendation).toHaveProperty('type');
      expect(recommendation).toHaveProperty('reason');
    });
  });

  // =============================================================================
  // MODULE 4: DYNAMIC PRICING
  // =============================================================================

  describe('Dynamic Pricing', () => {
    test('should apply demand-based pricing', async () => {
      const response = await request('POST', '/api/command/pricing/dynamic', {
        productId: 'PROD-001',
        basePrice: 99.99,
        demandLevel: 'high',
        stockLevel: 'low'
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('pricing');
      expect(response.body.pricing).toHaveProperty('productId', 'PROD-001');
      expect(response.body.pricing).toHaveProperty('basePrice', 99.99);
      expect(response.body.pricing).toHaveProperty('finalPrice');
      expect(response.body.pricing).toHaveProperty('adjustments');
      expect(response.body.pricing).toHaveProperty('appliedRules');
    });

    test('should apply competitor pricing adjustment', async () => {
      const response = await request('POST', '/api/command/pricing/dynamic', {
        productId: 'PROD-002',
        basePrice: 149.99,
        competitorPrice: 120.00,
        demandLevel: 'normal',
        stockLevel: 'normal'
      });

      expect(response.status).toBe(200);
      expect(response.body.pricing.finalPrice).toBeLessThan(149.99);
    });

    test('should apply inventory aging discount', async () => {
      const response = await request('POST', '/api/command/pricing/dynamic', {
        productId: 'PROD-003',
        basePrice: 79.99,
        daysInStock: 45,
        stockLevel: 'high',
        demandLevel: 'low'
      });

      expect(response.status).toBe(200);
      const agingAdjustment = response.body.pricing.adjustments.find(a => a.rule === 'inventory_aging');
      expect(agingAdjustment).toBeDefined();
      expect(agingAdjustment.percentage).toBeGreaterThan(0);
    });

    test('should require product ID', async () => {
      const response = await request('POST', '/api/command/pricing/dynamic', {
        basePrice: 99.99
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('should get pricing recommendations', async () => {
      const response = await request('GET', '/api/command/pricing/recommendations');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('recommendations');
      expect(Array.isArray(response.body.recommendations)).toBe(true);
    });
  });

  // =============================================================================
  // MODULE 5: BUDGET AUTO-ALLOCATION
  // =============================================================================

  describe('Budget Auto-Allocation', () => {
    test('should analyze and reallocate budget', async () => {
      const channelData = {
        channels: [
          { name: 'Google Ads', spend: 3000, roas: 3.5, conversions: 45 },
          { name: 'Facebook Ads', spend: 2500, roas: 2.1, conversions: 32 },
          { name: 'Email', spend: 500, roas: 4.2, conversions: 62 }
        ],
        totalBudget: 6000
      };

      const response = await request('POST', '/api/command/budget/allocate', channelData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('analysis');
      expect(response.body.analysis).toHaveProperty('channels');
      expect(response.body.analysis).toHaveProperty('reallocations');
      expect(response.body.analysis).toHaveProperty('summary');
    });

    test('should classify channel performance', async () => {
      const response = await request('POST', '/api/command/budget/allocate', {
        channels: [
          { name: 'High ROAS', spend: 1000, roas: 4.0, conversions: 50 },
          { name: 'Low ROAS', spend: 1000, roas: 0.8, conversions: 10 }
        ],
        totalBudget: 2000
      });

      const channels = response.body.analysis.channels;
      const highPerformer = channels.find(c => c.name === 'High ROAS');
      const lowPerformer = channels.find(c => c.name === 'Low ROAS');

      expect(highPerformer.performance).toBe('excellent');
      expect(lowPerformer.performance).toBe('poor');
    });

    test('should generate reallocation recommendations', async () => {
      const response = await request('POST', '/api/command/budget/allocate', {
        channels: [
          { name: 'Good Channel', spend: 2000, roas: 3.0, conversions: 40 },
          { name: 'Bad Channel', spend: 2000, roas: 1.0, conversions: 15 }
        ],
        totalBudget: 4000
      });

      expect(response.body.analysis.reallocations.length).toBeGreaterThan(0);

      const decrease = response.body.analysis.reallocations.find(r => r.action === 'decrease');
      const increase = response.body.analysis.reallocations.find(r => r.action === 'increase');

      expect(decrease).toBeDefined();
      expect(increase).toBeDefined();
    });

    test('should use sample data if not provided', async () => {
      const response = await request('POST', '/api/command/budget/allocate', {});

      expect(response.status).toBe(200);
      expect(response.body.analysis.channels.length).toBeGreaterThan(0);
    });

    test('should calculate projected improvement', async () => {
      const response = await request('POST', '/api/command/budget/allocate', {
        channels: [
          { name: 'Channel 1', spend: 5000, roas: 3.0, conversions: 50 },
          { name: 'Channel 2', spend: 5000, roas: 1.5, conversions: 30 }
        ],
        totalBudget: 10000
      });

      expect(response.body.summary).toHaveProperty('currentAvgRoas');
      expect(response.body.summary).toHaveProperty('projectedAvgRoas');
      expect(response.body.summary).toHaveProperty('expectedImprovement');
    });
  });

  // =============================================================================
  // MODULE 6: COMMAND CENTER EXECUTION
  // =============================================================================

  describe('Command Center Execution', () => {
    test('should execute retention campaign action', async () => {
      const response = await request('POST', '/api/command/execute', {
        action: 'Send retention campaign to inactive users'
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('execution');
      expect(response.body.execution).toHaveProperty('status', 'completed');
      expect(response.body.execution).toHaveProperty('steps');
      expect(Array.isArray(response.body.execution.steps)).toBe(true);
    });

    test('should execute coupon creation action', async () => {
      const response = await request('POST', '/api/command/execute', {
        action: 'Create a 10% discount coupon'
      });

      expect(response.status).toBe(200);
      expect(response.body.execution.status).toBe('completed');
      expect(response.body.execution.result).toHaveProperty('couponCode');
    });

    test('should execute budget reallocation', async () => {
      const response = await request('POST', '/api/command/execute', {
        action: 'Reallocate marketing budget to high ROAS channels'
      });

      expect(response.status).toBe(200);
      expect(response.body.execution.status).toBe('completed');
    });

    test('should require action parameter', async () => {
      const response = await request('POST', '/api/command/execute', {});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('should get execution history', async () => {
      const response = await request('GET', '/api/command/executions');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('executions');
      expect(Array.isArray(response.body.executions)).toBe(true);
    });
  });

  // =============================================================================
  // COMMAND CENTER QUERY
  // =============================================================================

  describe('Command Center Query', () => {
    test('should answer cart abandonment query', async () => {
      const response = await request('GET', '/api/command/query?q=How%20many%20carts%20abandoned%20today%3F');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('query');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('type', 'cart_abandonment');
    });

    test('should answer ROAS query', async () => {
      const response = await request('GET', '/api/command/query?q=What%20is%20the%20ROAS%3F');

      expect(response.status).toBe(200);
      expect(response.body.type).toBe('marketing_performance');
      expect(response.body.data).toHaveProperty('avgRoas');
    });

    test('should answer campaign performance query', async () => {
      const response = await request('GET', '/api/command/query?q=Which%20campaign%20performed%20best%3F');

      expect(response.status).toBe(200);
      expect(response.body.type).toBe('campaign_performance');
    });

    test('should answer revenue query', async () => {
      const response = await request('GET', '/api/command/query?q=What%20is%20today%27s%20revenue%3F');

      expect(response.status).toBe(200);
      expect(response.body.type).toBe('revenue');
    });

    test('should answer churn query', async () => {
      const response = await request('GET', '/api/command/query?q=What%20is%20the%20churn%20rate%3F');

      expect(response.status).toBe(200);
      expect(response.body.type).toBe('churn');
    });

    test('should handle unknown queries', async () => {
      const response = await request('GET', '/api/command/query?q=What%20is%20the%20weather%3F');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('suggestion');
    });

    test('should require query parameter', async () => {
      const response = await request('GET', '/api/command/query');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  // =============================================================================
  // HEALTH CHECK
  // =============================================================================

  describe('Health Check', () => {
    test('should return healthy status', async () => {
      const response = await request('GET', '/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('service', 'widget-command');
      expect(response.body).toHaveProperty('port');
      expect(response.body.port).toBe(5412);
    });
  });
});
