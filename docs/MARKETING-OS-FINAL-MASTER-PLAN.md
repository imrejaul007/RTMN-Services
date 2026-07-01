# MarketingOS FINAL MASTER PLAN — July 2, 2026

> **Status:** MarketingOS is **85% built** across 15+ services
> **Goal:** Complete 100% integration + build missing modules
> **Timeline:** 10 weeks (Phase 0-6)

---

## PART 1: EXISTING SERVICES INVENTORY

### Production Services (12)

| # | Service | Location | Port | LOC | Purpose |
|---|---------|----------|------|-----|---------|
| 1 | Marketing OS | industry-os/services/marketing-os | 5500 | 3,813 | Brand, Campaign, Journey, Content, Audience |
| 2 | Intent Attribution | AdBazaar/intent-attribution | 4803 | 4,048 | Multi-touch attribution (6 models) |
| 3 | A/B Testing | AdBazaar/REZ-ab-testing | - | 4,088 | Statistical significance + power analysis |
| 4 | CDP | AdBazaar/adbazaar-cdp | 4961 | 1,006 | Identity resolution, profiles, segments |
| 5 | Marketing Agent | AdBazaar/adbazaar-marketing-agent | 4965 | 1,019 | Natural language commands, autopilot |
| 6 | Marketing OS (AdBazaar) | AdBazaar/adbazaar-marketing-os | 4960 | 875 | Goal parsing, cross-channel |
| 7 | Social Scheduler | AdBazaar/social-post-scheduler | - | 1,240 | Multi-channel scheduling |
| 8 | Social Analytics | AdBazaar/social-analytics-service | - | 143+ | Engagement analytics |
| 9 | Growth Orchestrator | AdBazaar/autonomous-growth-orchestrator | - | 2,961 | Autonomous growth |
| 10 | DOOH Attribution | RABTUL/REZ-dooh-attribution | - | 376 | Offline ad attribution |
| 11 | Unified Attribution | RABTUL/REZ-unified-attribution | - | 544 | Cross-channel attribution |
| 12 | Lead Scoring | HOJAI AI/products/lead-scoring | 5458 | 117 | 25 weighted signals |
| 13 | Marketing Automation | HOJAI AI/products/marketing-automation | 5459 | 219 | Abandoned cart, replenishment |

### Services Needing MongoDB (3)

| # | Service | Location | Port | LOC | Issue |
|---|---------|----------|------|-----|-------|
| 14 | Growth Engine | RTNM-REE/growth-engine | 3002 | 1,261 | In-memory → MongoDB |
| 15 | Attribution Engine | RTNM-REE/attribution-engine | 3004 | 1,005 | In-memory → MongoDB |
| 16 | WhatsApp Commerce | AdBazaar/REZ-marketing | - | 1,457 | In-memory → MongoDB |

### Missing Modules (2)

| # | Module | Status | Effort |
|---|--------|--------|--------|
| 17 | **RevenueOS** | NOT BUILT | 4 weeks |
| 18 | **CreatorOS** | NOT BUILT | 4 weeks |

**TOTAL: 18 services, 23,000+ LOC**

---

## PART 2: PHASE 0 — QUICK WINS (Week 0)

**Goal:** Wire existing services for immediate value

### Task 0.1: Marketing OS → Intent Attribution (2 days)

**File:** `industry-os/services/marketing-os/src/services/RTMNMarketingHub.js`

**Add:**
```javascript
// Attribution integration
async getAttributionReport(campaignId) {
  try {
    const response = await axios.get('http://localhost:4803/api/attribution/report', {
      params: { campaignId }
    });
    return response.data;
  } catch (error) {
    logger.error('Attribution fetch failed:', error);
    return null;
  }
}

async getAttributionROI(campaignId) {
  try {
    const response = await axios.get('http://localhost:4803/api/attribution/roi', {
      params: { campaignId }
    });
    return response.data;
  } catch (error) {
    logger.error('ROI fetch failed:', error);
    return null;
  }
}
```

**New endpoints in Marketing OS:**
```
GET /api/attribution/report/:campaignId
GET /api/attribution/roi/:campaignId
GET /api/attribution/journey/:userId
```

### Task 0.2: Marketing OS → A/B Testing (1 day)

**Add:**
```javascript
async getABTestResults(experimentId) {
  try {
    const response = await axios.get(`http://localhost:5001/api/experiments/${experimentId}/results`);
    return response.data;
  } catch (error) {
    logger.error('A/B test fetch failed:', error);
    return null;
  }
}
```

### Task 0.3: Marketing OS → CDP (1 day)

**Add:**
```javascript
async getAudienceInsights(audienceId) {
  try {
    const response = await axios.get(`http://localhost:4961/api/audiences/${audienceId}`);
    return response.data;
  } catch (error) {
    logger.error('CDP fetch failed:', error);
    return null;
  }
}
```

### Task 0.4: Marketing OS → Lead Scoring (1 day)

**Add:**
```javascript
async getLeadScore(leadId) {
  try {
    const response = await axios.get(`http://localhost:5458/api/leads/${leadId}/score`);
    return response.data;
  } catch (error) {
    logger.error('Lead scoring failed:', error);
    return null;
  }
}
```

**Deliverables:**
- Marketing OS has live data from all 4 services
- Unified dashboard endpoint
- No more mock data

---

## PART 3: PHASE 1 — INTEGRATION & WIRE UP (Week 1-2)

**Goal:** Connect all services to Marketing OS

### Week 1: Service Connections

#### Day 1-2: Marketing Agent Integration
```javascript
async getMarketingAgentInsights(command) {
  try {
    const response = await axios.post('http://localhost:4965/api/command', { command });
    return response.data;
  } catch (error) {
    logger.error('Marketing agent failed:', error);
    return null;
  }
}

async startAutopilot(merchantId) {
  try {
    const response = await axios.post('http://localhost:4965/api/autopilot/start', { merchantId });
    return response.data;
  } catch (error) {
    logger.error('Autopilot start failed:', error);
    return null;
  }
}
```

#### Day 3-4: Social Analytics Integration
```javascript
async getSocialAnalytics(channel) {
  try {
    const response = await axios.get('http://localhost:5003/api/analytics', {
      params: { channel }
    });
    return response.data;
  } catch (error) {
    logger.error('Social analytics failed:', error);
    return null;
  }
}
```

#### Day 5: Growth Engine Integration
```javascript
async getGrowthMetrics(campaignId) {
  try {
    const response = await axios.get('http://localhost:3002/api/growth-campaigns', {
      params: { campaignId }
    });
    return response.data;
  } catch (error) {
    logger.error('Growth metrics failed:', error);
    return null;
  }
}
```

### Week 2: Unified Dashboard

#### Day 1-3: Dashboard Endpoints

**New file:** `industry-os/services/marketing-os/src/routes/dashboard.js`

```javascript
router.get('/dashboard/overview', async (req, res) => {
  try {
    const [attribution, abTests, cdp, growth] = await Promise.all([
      rtmnHub.getAttributionReport(),
      rtmnHub.getABTestResults(),
      rtmnHub.getAudienceInsights(),
      rtmnHub.getGrowthMetrics()
    ]);
    
    res.json({
      success: true,
      data: { attribution, abTests, cdp, growth },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/dashboard/campaigns', async (req, res) => {
  try {
    const campaigns = await Campaign.find();
    const enriched = await Promise.all(campaigns.map(async (c) => {
      const [attribution, abTest, growth] = await Promise.all([
        rtmnHub.getAttributionReport(c._id),
        rtmnHub.getABTestResults(c._id),
        rtmnHub.getGrowthMetrics(c._id)
      ]);
      return { ...c.toObject(), analytics: { attribution, abTest, growth } };
    }));
    res.json({ success: true, data: enriched });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

#### Day 4-5: Cross-Service Analytics

```javascript
router.get('/dashboard/cross-analytics', async (req, res) => {
  try {
    const { startDate, endDate, campaignId } = req.query;
    
    const [attribution, abTests, cdp, growth] = await Promise.all([
      rtmnHub.getAttributionReport(campaignId),
      rtmnHub.getABTestResults(),
      rtmnHub.getAudienceInsights(),
      rtmnHub.getGrowthMetrics(campaignId)
    ]);
    
    // Combined analysis
    const analysis = {
      totalRevenue: attribution?.totalRevenue || 0,
      totalSpend: attribution?.totalSpend || 0,
      roi: calculateROI(attribution),
      winningVariants: abTests?.winningVariants || [],
      audienceOverlap: calculateAudienceOverlap(cdp),
      viralCoefficient: growth?.viralCoefficient || 0
    };
    
    res.json({ success: true, data: analysis });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

---

## PART 4: PHASE 2 — PERSISTENCE FIXES (Week 3)

**Goal:** Move in-memory services to MongoDB

### Task 2.1: Growth Engine → MongoDB

**File:** `RTNM-REE/growth-engine/src/models/Referral.js` (NEW)

```javascript
const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema({
  referrerId: { type: String, required: true, index: true },
  refereeId: { type: String, index: true },
  referralCode: { type: String, required: true, index: true },
  campaignId: { type: String, index: true },
  status: { 
    type: String, 
    enum: ['pending', 'converted', 'expired', 'cancelled'],
    default: 'pending',
    index: true
  },
  tier: { type: Number, default: 1 },
  rewardEarned: { type: Number, default: 0 },
  rewardPending: { type: Number, default: 0 },
  events: [{
    timestamp: { type: Date, default: Date.now },
    type: String,
    metadata: mongoose.Schema.Types.Mixed
  }],
  metadata: mongoose.Schema.Types.Mixed,
  convertedAt: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes
referralSchema.index({ referrerId: 1, status: 1 });
referralSchema.index({ campaignId: 1, status: 1 });
referralSchema.index({ createdAt: -1 });

// Methods
referralSchema.methods.convert = function(refereeId) {
  this.status = 'converted';
  this.refereeId = refereeId;
  this.convertedAt = new Date();
  return this;
};

referralSchema.methods.addReward = function(amount) {
  this.rewardEarned += amount;
  return this;
};

module.exports = mongoose.model('Referral', referralSchema);
```

**File:** `RTNM-REE/growth-engine/src/models/GrowthCampaign.js` (NEW)

```javascript
const mongoose = require('mongoose');

const growthCampaignSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  type: { 
    type: String, 
    enum: ['referral', 'viral', 'reward', 'promotion'],
    required: true
  },
  status: { 
    type: String, 
    enum: ['draft', 'active', 'paused', 'completed', 'cancelled'],
    default: 'draft',
    index: true
  },
  startDate: { type: Date, default: Date.now },
  endDate: Date,
  targetMetric: String,
  targetValue: Number,
  budget: { type: Number, default: 0 },
  spent: { type: Number, default: 0 },
  rewards: {
    referrerReward: Number,
    refereeReward: Number,
    tierMultipliers: [Number]
  },
  metrics: {
    totalReferrals: { type: Number, default: 0 },
    convertedReferrals: { type: Number, default: 0 },
    totalRewards: { type: Number, default: 0 },
    viralCoefficient: { type: Number, default: 0 }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

growthCampaignSchema.index({ status: 1, startDate: 1 });

module.exports = mongoose.model('GrowthCampaign', growthCampaignSchema);
```

### Task 2.2: Attribution Engine → MongoDB

**File:** `RTNM-REE/attribution-engine/src/models/Touchpoint.js` (NEW)

```javascript
const mongoose = require('mongoose');

const touchpointSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, index: true },
  customerId: { type: String, index: true },
  channel: { type: String, required: true, index: true },
  source: String,
  medium: String,
  campaign: String,
  content: String,
  keyword: String,
  timestamp: { type: Date, default: Date.now, index: true },
  revenue: { type: Number, default: 0 },
  interactionType: { 
    type: String, 
    enum: ['impression', 'click', 'engagement', 'conversion'],
    required: true
  },
  metadata: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now }
});

touchpointSchema.index({ customerId: 1, timestamp: -1 });
touchpointSchema.index({ campaign: 1, timestamp: -1 });

module.exports = mongoose.model('Touchpoint', touchpointSchema);
```

### Task 2.3: WhatsApp Commerce → MongoDB

**File:** `AdBazaar/REZ-marketing/src/models/CommerceCart.js` (NEW)

```javascript
const mongoose = require('mongoose');

const commerceCartSchema = new mongoose.Schema({
  customerId: { type: String, required: true, index: true },
  sessionId: String,
  items: [{
    productId: String,
    name: String,
    quantity: { type: Number, default: 1 },
    price: Number,
    attributes: mongoose.Schema.Types.Mixed
  }],
  total: { type: Number, default: 0 },
  campaignId: String,
  status: { 
    type: String, 
    enum: ['active', 'converted', 'abandoned', 'expired'],
    default: 'active'
  },
  expiresAt: { type: Date, index: true },
  convertedAt: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

commerceCartSchema.index({ customerId: 1, status: 1 });
commerceCartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

commerceCartSchema.methods.calculateTotal = function() {
  this.total = this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  return this.total;
};

module.exports = mongoose.model('CommerceCart', commerceCartSchema);
```

---

## PART 5: PHASE 3 — RevenueOS BUILD (Week 4-5)

**NEW SERVICE:** `industry-os/services/marketing-os/src/modules/revenue-os.js`

### Week 4: Core Revenue Engine

```javascript
/**
 * RevenueOS - Marketing Revenue Attribution
 * Features: CAC, LTV, ROI, Pipeline Influence, Forecasting
 */

class RevenueOS {
  constructor() {
    this.attributionClient = null; // Wired from Phase 1
    this.cdpClient = null;
    this.walletClient = null;
  }

  // ========================================
  // CAC Calculator
  // ========================================
  
  async calculateCAC(params = {}) {
    const { startDate, endDate, channel, campaign, segment } = params;
    
    // Get marketing spend
    const spend = await this.getMarketingSpend({ startDate, endDate, channel, campaign });
    
    // Get new customers acquired
    const customers = await this.getNewCustomers({ startDate, endDate, segment });
    
    // CAC = Total Spend / New Customers
    const cac = customers.count > 0 ? spend.total / customers.count : 0;
    
    return {
      cac,
      totalSpend: spend.total,
      newCustomers: customers.count,
      byChannel: spend.byChannel,
      byCampaign: spend.byCampaign,
      period: { startDate, endDate }
    };
  }

  async getMarketingSpend(params) {
    // Aggregate spend from campaigns, ads, content, team
    const campaigns = await Campaign.aggregate([
      { $match: { createdAt: { $gte: params.startDate, $lte: params.endDate } } },
      { $group: {
        _id: '$channel',
        total: { $sum: '$budget.spent' }
      }}
    ]);
    
    // Add AdBazaar spend
    const adSpend = await this.attributionClient?.getSpend(params) || 0;
    
    return {
      total: campaigns.reduce((sum, c) => sum + c.total, 0) + adSpend,
      byChannel: campaigns,
      byCampaign: await Campaign.find(params).select('name budget.spent')
    };
  }

  // ========================================
  // LTV Predictor
  // ========================================
  
  async calculateLTV(customerId) {
    const customer = await this.getCustomerHistory(customerId);
    const cohort = await this.getCohort(customerId);
    
    // LTV = ARPU × (1 / Churn Rate)
    // Or: Sum of all future expected revenue
    const arpu = customer.totalRevenue / customer.orderCount;
    const avgLifespan = cohort.avgLifespan || 12; // months
    const churnRate = cohort.churnRate || 0.05;
    
    const ltv = arpu * (1 / churnRate) || arpu * avgLifespan;
    
    return {
      customerId,
      ltv,
      arpu,
      avgOrderValue: arpu,
      orderCount: customer.orderCount,
      totalRevenue: customer.totalRevenue,
      avgLifespan,
      churnRate,
      predictedLTV: ltv,
      confidence: cohort.sampleSize > 100 ? 'high' : 'medium'
    };
  }

  async getCohort(customerId) {
    // Group similar customers by acquisition month
    const customer = await Customer.findById(customerId);
    if (!customer) return null;
    
    const cohortMonth = new Date(customer.createdAt).toISOString().slice(0, 7);
    
    const cohort = await Customer.aggregate([
      { $match: { 
        createdAt: { $gte: new Date(cohortMonth), $lt: new Date(cohortMonth + '-01') }
      }},
      { $group: {
        _id: null,
        count: { $sum: 1 },
        totalRevenue: { $sum: '$totalRevenue' },
        retention: { $avg: '$isActive' }
      }},
      { $addFields: {
        churnRate: { $subtract: [1, '$retention'] },
        avgLifespan: { $divide: [1, { $subtract: [1, '$retention'] }] }
      }}
    ]);
    
    return cohort[0] || { churnRate: 0.05, avgLifespan: 12, count: 0 };
  }

  // ========================================
  // ROI Analyzer
  // ========================================
  
  async calculateROI(params = {}) {
    const { campaignId, channel, startDate, endDate } = params;
    
    // Get revenue attributed to this campaign/channel
    const revenue = await this.getAttributedRevenue(params);
    
    // Get spend on this campaign/channel
    const spend = await this.getMarketingSpend(params);
    
    // Calculate ROI
    const roi = spend.total > 0 ? (revenue.total - spend.total) / spend.total : 0;
    const roas = spend.total > 0 ? revenue.total / spend.total : 0;
    
    return {
      roi: roi * 100, // percentage
      roas,
      revenue: revenue.total,
      spend: spend.total,
      profit: revenue.total - spend.total,
      period: { startDate, endDate },
      breakdown: revenue.byChannel
    };
  }

  async getAttributedRevenue(params) {
    // Query intent attribution for revenue data
    const attribution = await this.attributionClient?.getReport(params);
    
    return {
      total: attribution?.totalRevenue || 0,
      byChannel: attribution?.byChannel || [],
      byCampaign: attribution?.byCampaign || []
    };
  }

  // ========================================
  // Pipeline Influencer
  // ========================================
  
  async calculatePipelineInfluence() {
    // What % of pipeline had marketing touchpoints
    const totalDeals = await Deal.countDocuments();
    const marketingTouchedDeals = await Deal.countDocuments({ 
      'touchpoints.marketing': { $exists: true } 
    });
    
    const influence = totalDeals > 0 ? marketingTouchedDeals / totalDeals : 0;
    
    // Revenue influenced
    const totalPipeline = await Deal.aggregate([
      { $match: { stage: { $ne: 'closed_won' } } },
      { $group: { _id: null, total: { $sum: '$value' } }}
    ]);
    
    const influencedPipeline = await Deal.aggregate([
      { $match: { stage: { $ne: 'closed_won' }, 'touchpoints.marketing': { $exists: true } } },
      { $group: { _id: null, total: { $sum: '$value' } }}
    ]);
    
    return {
      influencePercent: influence * 100,
      totalDeals,
      marketingTouchedDeals,
      pipelineValue: totalPipeline[0]?.total || 0,
      influencedValue: influencedPipeline[0]?.total || 0,
      influencedPercent: totalPipeline[0]?.total > 0 
        ? (influencedPipeline[0]?.total / totalPipeline[0]?.total) * 100 
        : 0
    };
  }

  // ========================================
  // Revenue Dashboard
  // ========================================
  
  async getDashboard(params = {}) {
    const [cac, pipelineInfluence, roi] = await Promise.all([
      this.calculateCAC(params),
      this.calculatePipelineInfluence(),
      this.calculateROI(params)
    ]);
    
    // Get top performing channels
    const topChannels = await this.getTopChannels(params);
    
    // Get LTV distribution
    const ltvDistribution = await this.getLTVDistribution();
    
    return {
      summary: {
        cac: cac.cac,
        avgLTV: ltvDistribution.avg,
        ltvToCACRatio: cac.cac > 0 ? ltvDistribution.avg / cac.cac : 0,
        roi: roi.roi,
        roas: roi.roas
      },
      cac,
      ltv: ltvDistribution,
      pipeline: pipelineInfluence,
      roi,
      topChannels,
      period: params
    };
  }

  async getTopChannels(params) {
    const channels = await Campaign.aggregate([
      { $match: { status: 'active' }},
      { $group: {
        _id: '$channel',
        spend: { $sum: '$budget.spent' },
        revenue: { $sum: '$metrics.revenue' }
      }},
      { $addFields: {
        roi: { $cond: [{ $gt: ['$spend', 0] }, 
          { $divide: [{ $subtract: ['$revenue', '$spend'] }, '$spend'] }, 0] }
      }},
      { $sort: { roi: -1 }},
      { $limit: 5 }
    ]);
    
    return channels;
  }

  async getLTVDistribution() {
    const stats = await Customer.aggregate([
      { $group: {
        _id: null,
        avg: { $avg: '$totalRevenue' },
        median: { $avg: '$totalRevenue' },
        count: { $sum: 1 }
      }}
    ]);
    
    const percentiles = await Customer.aggregate([
      { $sort: { totalRevenue: 1 }},
      { $group: {
        _id: null,
        p25: { $push: '$totalRevenue' }
      }}
    ]);
    
    return {
      avg: stats[0]?.avg || 0,
      median: stats[0]?.avg || 0,
      total: stats[0]?.count || 0
    };
  }
}

module.exports = new RevenueOS();
```

### Week 5: API Endpoints

```javascript
// Add to Marketing OS routes
router.get('/api/revenue/dashboard', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dashboard = await RevenueOS.getDashboard({
      startDate: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: endDate || new Date()
    });
    res.json({ success: true, data: dashboard });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/api/revenue/cac', async (req, res) => {
  try {
    const cac = await RevenueOS.calculateCAC(req.query);
    res.json({ success: true, data: cac });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/api/revenue/ltv/:customerId', async (req, res) => {
  try {
    const ltv = await RevenueOS.calculateLTV(req.params.customerId);
    res.json({ success: true, data: ltv });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/api/revenue/roi', async (req, res) => {
  try {
    const roi = await RevenueOS.calculateROI(req.query);
    res.json({ success: true, data: roi });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/api/revenue/pipeline', async (req, res) => {
  try {
    const pipeline = await RevenueOS.calculatePipelineInfluence();
    res.json({ success: true, data: pipeline });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

---

## PART 6: PHASE 4 — CreatorOS BUILD (Week 6-7)

**NEW SERVICE:** `industry-os/services/marketing-os/src/modules/creator-os.js`

### Week 6: Creator Marketplace

```javascript
/**
 * CreatorOS - Creator Economy Platform
 */

class CreatorOS {
  constructor() {
    this.twinEngine = null;
    this.paymentProcessor = null;
  }

  // ========================================
  // Creator Management
  // ========================================
  
  async registerCreator(data) {
    const creator = new Creator({
      name: data.name,
      email: data.email,
      socialProfiles: data.socialProfiles,
      categories: data.categories,
      niche: data.niche,
      audience: {
        size: data.audienceSize || 0,
        demographics: data.demographics || {},
        engagementRate: data.engagementRate || 0
      },
      pricing: {
        minRate: data.minRate || 0,
        preferredRate: data.preferredRate || 0,
        currency: data.currency || 'INR'
      },
      trustScore: 50, // Start at 50
      status: 'active'
    });
    
    await creator.save();
    
    // Create Creator Twin
    await this.createCreatorTwin(creator);
    
    return creator;
  }

  async getCreators(filters = {}) {
    const { category, minFollowers, maxRate, verified, page = 1, limit = 20 } = filters;
    
    const query = { status: 'active' };
    if (category) query.categories = { $in: category };
    if (minFollowers) query['audience.size'] = { $gte: minFollowers };
    if (maxRate) query['pricing.preferredRate'] = { $lte: maxRate };
    if (verified) query['verification.status'] = 'verified';
    
    const creators = await Creator.find(query)
      .sort({ 'trustScore': -1, 'audience.size': -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    
    const total = await Creator.countDocuments(query);
    
    return { creators, total, page, pages: Math.ceil(total / limit) };
  }

  async getCreatorProfile(creatorId) {
    const creator = await Creator.findById(creatorId);
    if (!creator) throw new Error('Creator not found');
    
    // Enrich with twin data
    const twin = await this.getCreatorTwin(creatorId);
    const stats = await this.getCreatorStats(creatorId);
    const campaigns = await this.getCreatorCampaigns(creatorId);
    
    return { ...creator.toObject(), twin, stats, campaigns };
  }

  // ========================================
  // Creator Twin
  // ========================================
  
  async createCreatorTwin(creator) {
    const twin = {
      entityType: 'creator',
      entityId: creator._id,
      audienceTwin: {
        size: creator.audience.size,
        demographics: creator.audience.demographics,
        interests: creator.categories,
        engagementRate: creator.audience.engagementRate,
        growthRate: await this.calculateAudienceGrowth(creator._id)
      },
      performanceTwin: {
        avgReach: await this.calculateAvgReach(creator._id),
        avgEngagement: creator.audience.engagementRate,
        conversionRate: await this.calculateConversionRate(creator._id),
        brandSentiment: await this.calculateBrandSentiment(creator._id)
      },
      trustTwin: {
        score: creator.trustScore,
        completedCampaigns: creator.campaigns?.length || 0,
        avgRating: creator.avgRating || 0,
        responseRate: creator.responseRate || 100
      },
      priceTwin: {
        minAcceptable: creator.pricing.minRate,
        preferred: creator.pricing.preferredRate,
        marketAvg: await this.getMarketAvgRate(creator.categories)
      }
    };
    
    // Save to TwinOS
    await TwinOS.createOrUpdate(`creator:${creator._id}`, twin);
    
    return twin;
  }

  async matchCreatorsToCampaign(campaignId) {
    const campaign = await CreatorCampaign.findById(campaignId);
    if (!campaign) throw new Error('Campaign not found');
    
    // Find matching creators
    const creators = await Creator.find({
      status: 'active',
      categories: { $in: campaign.targetCategories },
      'audience.size': { $gte: campaign.minFollowers },
      'pricing.preferredRate': { $lte: campaign.maxBudget }
    });
    
    // Score each creator
    const scored = await Promise.all(creators.map(async (creator) => {
      const twin = await this.getCreatorTwin(creator._id);
      const score = this.calculateMatchScore(campaign, twin);
      return { creator, score, twin };
    }));
    
    // Sort by score and return top matches
    scored.sort((a, b) => b.score - a.score);
    
    return scored.slice(0, campaign.maxCreators || 10);
  }

  calculateMatchScore(campaign, twin) {
    let score = 0;
    
    // Audience fit (40%)
    const audienceFit = this.calculateAudienceOverlap(
      campaign.targetAudience, 
      twin.audienceTwin
    );
    score += audienceFit * 40;
    
    // Performance (30%)
    const perfScore = twin.performanceTwin.conversionRate * 30;
    score += perfScore;
    
    // Trust (20%)
    score += (twin.trustTwin.score / 100) * 20;
    
    // Price (10%)
    const priceFit = 1 - (twin.priceTwin.preferred / campaign.maxBudget);
    score += priceFit * 10;
    
    return Math.round(score);
  }

  // ========================================
  // Campaign Management
  // ========================================
  
  async createCampaign(data) {
    const campaign = new CreatorCampaign({
      brandId: data.brandId,
      name: data.name,
      description: data.description,
      targetCategories: data.categories,
      targetAudience: data.audience,
      minFollowers: data.minFollowers || 0,
      maxBudget: data.budget,
      deliverables: data.deliverables,
      deadline: data.deadline,
      status: 'draft'
    });
    
    await campaign.save();
    
    // Auto-match creators
    const matches = await this.matchCreatorsToCampaign(campaign._id);
    campaign.matchedCreators = matches.map(m => m.creator._id);
    await campaign.save();
    
    return campaign;
  }

  // ========================================
  // Contract Management
  // ========================================
  
  async createContract(campaignId, creatorId, terms) {
    const contract = new CreatorContract({
      campaign: campaignId,
      creator: creatorId,
      terms: {
        deliverables: terms.deliverables,
        compensation: terms.compensation,
        timeline: terms.timeline,
        exclusivity: terms.exclusivity,
        usageRights: terms.usageRights
      },
      status: 'pending',
      createdAt: new Date()
    });
    
    await contract.save();
    
    return contract;
  }

  async signContract(contractId, signature) {
    const contract = await CreatorContract.findById(contractId);
    if (!contract) throw new Error('Contract not found');
    
    contract.signatures = {
      creator: {
        signed: true,
        signature,
        signedAt: new Date()
      },
      brand: { signed: false }
    };
    contract.status = 'brand_pending';
    
    await contract.save();
    return contract;
  }

  // ========================================
  // Payment Processing
  // ========================================
  
  async processPayment(contractId, milestone) {
    const contract = await CreatorContract.findById(contractId);
    if (!contract) throw new Error('Contract not found');
    
    const milestoneData = contract.milestones.id(milestone);
    if (!milestoneData) throw new Error('Milestone not found');
    
    // Calculate fees
    const grossAmount = milestoneData.amount;
    const platformFee = grossAmount * 0.10; // 10% platform
    const paymentFee = grossAmount * 0.029 + 0.30; // Stripe fee
    const netAmount = grossAmount - platformFee - paymentFee;
    
    // Process payment via REZ Wallet
    await WalletService.transfer({
      from: 'platform',
      to: contract.creator,
      amount: netAmount,
      currency: 'INR',
      reference: `contract:${contractId}:milestone:${milestone}`
    });
    
    // Update milestone status
    milestoneData.status = 'paid';
    milestoneData.paidAt = new Date();
    milestoneData.netAmount = netAmount;
    
    await contract.save();
    
    // Update creator stats
    await this.updateCreatorStats(contract.creator);
    
    return { milestoneData, platformFee, paymentFee, netAmount };
  }

  // ========================================
  // UGC Library
  // ========================================
  
  async storeUGC(data) {
    const ugc = new UGC({
      contract: data.contractId,
      creator: data.creatorId,
      campaign: data.campaignId,
      type: data.type, // image, video, story, reel
      url: data.url,
      platform: data.platform,
      metrics: {
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        saves: 0
      },
      rights: {
        usage: data.usageRights || 'campaign_only',
        expiresAt: data.rightsExpires
      },
      status: 'pending_review'
    });
    
    await ugc.save();
    return ugc;
  }

  async approveUGC(ugcId, approved) {
    const ugc = await UGC.findById(ugcId);
    if (!ugc) throw new Error('UGC not found');
    
    ugc.status = approved ? 'approved' : 'rejected';
    ugc.reviewedAt = new Date();
    
    await ugc.save();
    return ugc;
  }
}

module.exports = new CreatorOS();
```

### Week 7: API Endpoints

```javascript
// Creator routes
router.post('/api/creators', async (req, res) => {
  try {
    const creator = await CreatorOS.registerCreator(req.body);
    res.json({ success: true, data: creator });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/api/creators', async (req, res) => {
  try {
    const creators = await CreatorOS.getCreators(req.query);
    res.json({ success: true, data: creators });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/api/creators/:id', async (req, res) => {
  try {
    const creator = await CreatorOS.getCreatorProfile(req.params.id);
    res.json({ success: true, data: creator });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Campaign routes
router.post('/api/creator-campaigns', async (req, res) => {
  try {
    const campaign = await CreatorOS.createCampaign(req.body);
    res.json({ success: true, data: campaign });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/api/creator-campaigns/:id/match', async (req, res) => {
  try {
    const matches = await CreatorOS.matchCreatorsToCampaign(req.params.id);
    res.json({ success: true, data: matches });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Contract routes
router.post('/api/contracts', async (req, res) => {
  try {
    const contract = await CreatorOS.createContract(
      req.body.campaignId,
      req.body.creatorId,
      req.body.terms
    );
    res.json({ success: true, data: contract });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Payment routes
router.post('/api/creator-payments', async (req, res) => {
  try {
    const payment = await CreatorOS.processPayment(
      req.body.contractId,
      req.body.milestoneId
    );
    res.json({ success: true, data: payment });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

---

## PART 7: PHASE 5 — INTELLIGENCE & SOCIAL (Week 8-9)

### Week 8: IntelligenceOS - Predictive AI

```javascript
/**
 * MarketingIntelligence - Predictive Marketing AI
 */

class MarketingIntelligence {
  constructor() {
    this.models = {};
  }

  // ========================================
  // Churn Prediction
  // ========================================
  
  async predictChurn(customerId) {
    const features = await this.extractChurnFeatures(customerId);
    
    // Rule-based prediction (replace with ML model)
    const score = this.calculateChurnScore(features);
    
    return {
      customerId,
      churnProbability: score.probability,
      riskLevel: score.level,
      factors: score.factors,
      recommendedAction: this.getChurnAction(score)
    };
  }

  async extractChurnFeatures(customerId) {
    const customer = await Customer.findById(customerId);
    const orders = await Order.find({ customer: customerId }).sort({ createdAt: -1 });
    const interactions = await Interaction.find({ customer: customerId }).sort({ createdAt: -1 });
    
    return {
      daysSinceLastOrder: this.daysBetween(orders[0]?.createdAt, new Date()),
      orderFrequency: orders.length / this.monthsSince(customer.createdAt),
      avgOrderValue: this.avg(orders.map(o => o.total)),
      supportTickets: interactions.filter(i => i.type === 'support').length,
      emailOpenRate: await this.getEmailOpenRate(customerId),
      websiteVisits: await this.getWebsiteVisits(customerId, 30),
      engagement: await this.getEngagementScore(customerId)
    };
  }

  calculateChurnScore(features) {
    let score = 0;
    const factors = [];
    
    // Recency (40%)
    if (features.daysSinceLastOrder > 60) {
      score += 40;
      factors.push({ factor: 'No order in 60+ days', impact: 40 });
    } else if (features.daysSinceLastOrder > 30) {
      score += 20;
      factors.push({ factor: 'No order in 30+ days', impact: 20 });
    }
    
    // Frequency (20%)
    if (features.orderFrequency < 0.5) {
      score += 20;
      factors.push({ factor: 'Low order frequency', impact: 20 });
    }
    
    // Engagement (20%)
    if (features.engagement < 0.3) {
      score += 20;
      factors.push({ factor: 'Low engagement', impact: 20 });
    }
    
    // Support (20%)
    if (features.supportTickets > 3) {
      score += 20;
      factors.push({ factor: 'High support tickets', impact: 20 });
    }
    
    return {
      probability: Math.min(score / 100, 1),
      level: score > 70 ? 'high' : score > 40 ? 'medium' : 'low',
      factors
    };
  }

  // ========================================
  // Conversion Prediction
  // ========================================
  
  async predictConversion(customerId, productId) {
    const features = await this.extractConversionFeatures(customerId, productId);
    const score = this.calculateConversionScore(features);
    
    return {
      customerId,
      productId,
      conversionProbability: score.probability,
      recommendedOffer: this.getOfferRecommendation(score),
      optimalChannel: this.getOptimalChannel(customerId),
      optimalTime: await this.getOptimalSendTime(customerId)
    };
  }

  // ========================================
  // Next Best Action
  // ========================================
  
  async getNextBestAction(customerId) {
    const [churn, intent, ltv] = await Promise.all([
      this.predictChurn(customerId),
      this.getIntentSignals(customerId),
      RevenueOS.calculateLTV(customerId)
    ]);
    
    // Decision tree
    if (churn.riskLevel === 'high') {
      return {
        action: 'win_back',
        channel: 'whatsapp',
        offer: '20% off next order',
        priority: 'urgent'
      };
    }
    
    if (intent.signals.length > 3) {
      return {
        action: 'convert',
        channel: 'whatsapp',
        offer: 'limited_time_discount',
        priority: 'high'
      };
    }
    
    if (ltv.ltv > 10000) {
      return {
        action: 'upsell',
        channel: 'email',
        offer: 'premium_membership',
        priority: 'medium'
      };
    }
    
    return {
      action: 'engage',
      channel: 'email',
      offer: 'new_arrivals',
      priority: 'low'
    };
  }

  // ========================================
  // Trend Detection
  // ========================================
  
  async detectTrends() {
    const now = new Date();
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    
    const [thisWeek, lastWeek] = await Promise.all([
      this.getKeywordTrends(weekAgo, now),
      this.getKeywordTrends(monthAgo, weekAgo)
    ]);
    
    const trends = thisWeek.filter(t => {
      const lastWeekTrend = lastWeek.find(l => l.keyword === t.keyword);
      return lastWeekTrend && t.volume > lastWeekTrend.volume * 1.5;
    });
    
    return trends;
  }
}
```

### Week 9: SocialOS - Real API Integration

```javascript
/**
 * SocialIntegration - Real Social Media APIs
 */

class SocialIntegration {
  constructor() {
    this.credentials = {};
    this.platforms = ['instagram', 'facebook', 'linkedin', 'twitter'];
  }

  // ========================================
  // OAuth & Authentication
  // ========================================
  
  async connectAccount(userId, platform, authCode) {
    const tokens = await this.exchangeAuthCode(platform, authCode);
    
    await this.storeCredentials(userId, platform, tokens);
    
    // Get account info
    const profile = await this.getProfile(platform, tokens.accessToken);
    
    return {
      platform,
      accountId: profile.id,
      username: profile.username,
      followers: profile.followers_count,
      connected: true
    };
  }

  // ========================================
  // Posting
  // ========================================
  
  async post(platform, accountId, content) {
    const credentials = await this.getCredentials(accountId, platform);
    
    switch (platform) {
      case 'instagram':
        return this.postToInstagram(credentials, content);
      case 'facebook':
        return this.postToFacebook(credentials, content);
      case 'linkedin':
        return this.postToLinkedIn(credentials, content);
      case 'twitter':
        return this.postToTwitter(credentials, content);
      default:
        throw new Error(`Platform ${platform} not supported`);
    }
  }

  async postToInstagram(credentials, content) {
    // Create media object
    const media = await axios.post(
      `https://graph.instagram.com/v18.0/${credentials.accountId}/media`,
      {
        image_url: content.imageUrl,
        caption: content.caption,
        access_token: credentials.accessToken
      }
    );
    
    // Publish
    const publish = await axios.post(
      `https://graph.instagram.com/v18.0/${credentials.accountId}/media_publish`,
      {
        creation_id: media.data.id,
        access_token: credentials.accessToken
      }
    );
    
    return { id: publish.data.id, platform: 'instagram' };
  }

  async postToLinkedIn(credentials, content) {
    const response = await axios.post(
      'https://api.linkedin.com/v2/ugcPosts',
      {
        author: `urn:li:person:${credentials.accountId}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: content.caption },
            shareMediaCategory: content.imageUrl ? 'IMAGE' : 'NONE',
            media: content.imageUrl ? [{ asset: content.imageUrl }] : []
          }
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
        }
      },
      { headers: { Authorization: `Bearer ${credentials.accessToken}` }}
    );
    
    return { id: response.data.id, platform: 'linkedin' };
  }

  // ========================================
  // Analytics
  // ========================================
  
  async getAnalytics(accountId, platform, period = 7) {
    const credentials = await this.getCredentials(accountId, platform);
    const since = new Date(Date.now() - period * 24 * 60 * 60 * 1000);
    
    switch (platform) {
      case 'instagram':
        return this.getInstagramAnalytics(credentials, since);
      case 'facebook':
        return this.getFacebookAnalytics(credentials, since);
      case 'linkedin':
        return this.getLinkedInAnalytics(credentials, since);
      case 'twitter':
        return this.getTwitterAnalytics(credentials, since);
    }
  }

  async getOptimalTime(platform, accountId) {
    const analytics = await this.getAnalytics(accountId, platform, 30);
    
    // Find best performing times
    const hourlyEngagement = {};
    analytics.posts.forEach(post => {
      const hour = new Date(post.created_at).getHours();
      hourlyEngagement[hour] = (hourlyEngagement[hour] || 0) + post.engagement;
    });
    
    const sorted = Object.entries(hourlyEngagement)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    
    return sorted.map(([hour]) => parseInt(hour));
  }

  // ========================================
  // Scheduling
  // ========================================
  
  async schedule(content, publishAt) {
    const scheduled = new ScheduledPost({
      content,
      publishAt,
      status: 'scheduled'
    });
    
    await scheduled.save();
    
    // Schedule job
    const delay = publishAt.getTime() - Date.now();
    setTimeout(() => this.publishScheduled(scheduled._id), delay);
    
    return scheduled;
  }

  async publishScheduled(postId) {
    const post = await ScheduledPost.findById(postId);
    if (!post || post.status !== 'scheduled') return;
    
    try {
      const result = await this.post(post.platform, post.accountId, post.content);
      post.status = 'published';
      post.publishedId = result.id;
      post.publishedAt = new Date();
    } catch (error) {
      post.status = 'failed';
      post.error = error.message;
    }
    
    await post.save();
    return post;
  }
}
```

---

## PART 8: PHASE 6 — TESTING & DOCS (Week 10)

### Unit Tests

```javascript
// __tests__/revenue-os.test.js
describe('RevenueOS', () => {
  describe('calculateCAC', () => {
    test('calculates CAC correctly', async () => {
      const result = await RevenueOS.calculateCAC({
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-06-30'),
        channel: 'whatsapp'
      });
      
      expect(result).toHaveProperty('cac');
      expect(result).toHaveProperty('totalSpend');
      expect(result).toHaveProperty('newCustomers');
      expect(result.cac).toBeGreaterThanOrEqual(0);
    });
  });

  describe('calculateLTV', () => {
    test('returns LTV prediction', async () => {
      const result = await RevenueOS.calculateLTV('test-customer-id');
      
      expect(result).toHaveProperty('ltv');
      expect(result).toHaveProperty('arpu');
      expect(result).toHaveProperty('churnRate');
    });
  });

  describe('calculateROI', () => {
    test('calculates ROI percentage', async () => {
      const result = await RevenueOS.calculateROI({ campaignId: 'test-campaign' });
      
      expect(result).toHaveProperty('roi');
      expect(result).toHaveProperty('roas');
      expect(result).toHaveProperty('revenue');
      expect(result).toHaveProperty('spend');
    });
  });
});

// __tests__/creator-os.test.js
describe('CreatorOS', () => {
  describe('registerCreator', () => {
    test('creates creator profile', async () => {
      const creator = await CreatorOS.registerCreator({
        name: 'Test Creator',
        email: 'test@example.com',
        categories: ['fashion', 'lifestyle']
      });
      
      expect(creator).toHaveProperty('_id');
      expect(creator.name).toBe('Test Creator');
      expect(creator.trustScore).toBe(50);
    });
  });

  describe('matchCreatorsToCampaign', () => {
    test('returns scored creators', async () => {
      const matches = await CreatorOS.matchCreatorsToCampaign('test-campaign-id');
      
      expect(Array.isArray(matches)).toBe(true);
      matches.forEach(m => {
        expect(m).toHaveProperty('score');
        expect(m.score).toBeGreaterThan(0);
      });
    });
  });
});
```

---

## SUMMARY

| Phase | Focus | Duration | Deliverables |
|-------|-------|----------|--------------|
| **Phase 0** | Quick Wins | 1 week | Wired Attribution, A/B, CDP, Lead Scoring |
| **Phase 1** | Integration | 2 weeks | All services connected, unified dashboard |
| **Phase 2** | Persistence | 1 week | MongoDB for Growth, Attribution, Commerce |
| **Phase 3** | RevenueOS | 2 weeks | NEW: CAC, LTV, ROI, Pipeline, Forecasting |
| **Phase 4** | CreatorOS | 2 weeks | NEW: Marketplace, Twins, Contracts, Payments |
| **Phase 5** | Intelligence | 2 weeks | Predictive AI, Real Social APIs |
| **Phase 6** | Testing | 1 week | Unit tests, integration tests, docs |
| **TOTAL** | | **11 weeks** | **100% complete** |

---

*Final Plan Date: July 2, 2026*
*Est. Completion: September 12, 2026*
