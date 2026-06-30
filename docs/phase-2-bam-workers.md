# Phase 2: Real BAM Workers
> **Duration:** Weeks 13-24
> **Purpose:** Build the AI workforce that powers every commerce Nexha
> **Depends on:** Phase 1 completion

---

## Overview

BAM (Business Automation & Management) Workers are AI agents that do the work of commerce operations.

Currently:
- BLR AI Marketplace has 8 services (mostly scaffolds)
- No real AI workers exist
- Worker marketplace is just concepts

**Goal:** Build 5 core BAM workers that power commerce operations.

---

## BAM Worker Architecture

```
BAM PLATFORM
│
├── Vendor Acquisition Worker
│   ├── Prospect discovery
│   ├── Outreach automation
│   ├── Qualification
│   ├── Contract generation
│   └── Onboarding
│
├── Catalog Normalization Worker
│   ├── Image processing
│   ├── Description generation
│   ├── Spec extraction
│   ├── Category mapping
│   └── Quality scoring
│
├── Recommendation Worker
│   ├── User profiling
│   ├── Collaborative filtering
│   ├── Content matching
│   └── Real-time ranking
│
├── Growth Worker
│   ├── Campaign creation
│   ├── Audience targeting
│   ├── A/B testing
│   └── Conversion optimization
│
└── BAM Gateway
    ├── Worker registry
    ├── Skill catalog
    ├── Usage tracking
    └── Billing integration
```

---

## Directory Structure

```bash
companies/HOJAI-AI/platform/bam/
│
├── bam-gateway/                  # BAM platform gateway
│   ├── src/
│   │   ├── index.js
│   │   ├── routes/
│   │   │   ├── workers.js
│   │   │   ├── catalog.js
│   │   │   ├── skills.js
│   │   │   └── billing.js
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   ├── rateLimit.js
│   │   │   └── logging.js
│   │   └── services/
│   │       ├── worker-registry.js
│   │       ├── skill-catalog.js
│   │       └── usage-tracker.js
│   └── tests/
│
├── vendor-acquisition-worker/       # Worker 1
│   ├── src/
│   │   ├── index.js
│   │   ├── prospector.js
│   │   ├── outreach.js
│   │   ├── qualifier.js
│   │   ├── onboarder.js
│   │   └── contracts.js
│   └── tests/
│
├── catalog-normalization-worker/    # Worker 2
│   ├── src/
│   │   ├── index.js
│   │   ├── image-processor.js
│   │   ├── description-generator.js
│   │   ├── spec-extractor.js
│   │   └── quality-scorer.js
│   └── tests/
│
├── recommendation-worker/            # Worker 3
│   ├── src/
│   │   ├── index.js
│   │   ├── user-profiler.js
│   │   ├── collaborative-filter.js
│   │   ├── content-matcher.js
│   │   └── ranker.js
│   └── tests/
│
├── growth-worker/                  # Worker 4
│   ├── src/
│   │   ├── index.js
│   │   ├── campaign-creator.js
│   │   ├── audience-selector.js
│   │   ├── ab-tester.js
│   │   └── conversion-optimizer.js
│   └── tests/
│
├── fraud-worker/                   # Worker 5
│   ├── src/
│   │   ├── index.js
│   │   ├── pattern-analyzer.js
│   │   ├── anomaly-detector.js
│   │   └── risk-scorer.js
│   └── tests/
│
├── support-worker/                 # Worker 6
│   └── ... (use SiteOS support-widget)
│
└── shared/
    ├── models/
    ├── utils/
    └── constants/
```

---

## Week 13-16: Vendor Acquisition Worker

### Architecture

```
VENDOR ACQUISITION WORKER
│
├── Prospect Discovery Module
│   ├── Web scraping
│   ├── Directory search
│   ├── Social discovery
│   └── Lead scoring
│
├── Outreach Module
│   ├── Email automation
│   ├── WhatsApp integration
│   ├── Follow-up scheduler
│   └── Response parser
│
├── Qualification Module
│   ├── Capability matching
│   ├── Trust scoring
│   ├── Compliance check
│   └── Capacity assessment
│
├── Contract Generation Module
│   ├── Template selection
│   ├── Terms customization
│   ├── E-sign integration
│   └── Document storage
│
└── Onboarding Module
    ├── Document collection
    ├── Catalog setup
    ├── Training wizard
    └── Activation
```

### Implementation

```javascript
// vendor-acquisition-worker/src/index.js

const express = require('express');
const app = express();

const Prospector = require('./prospector');
const Outreach = require('./outreach');
const Qualifier = require('./qualifier');
const ContractGen = require('./contracts');
const Onboarder = require('./onboarder');

app.post('/acquire', async (req, res) => {
  const { industry, criteria, target } = req.body;
  
  // Step 1: Discover prospects
  const prospects = await Prospector.discover({
    industry,
    criteria,
    limit: target || 100
  });
  
  // Step 2: Score and rank
  const scored = await Qualifier.score(prospects);
  
  // Step 3: Outreach to top prospects
  const outreach = await Outreach.send({
    prospects: scored.top(50),
    template: 'vendor-intro'
  });
  
  // Step 4: Track responses
  const responses = await Outreach.trackResponses(outreach.batchId);
  
  res.json({
    batchId: outreach.batchId,
    prospectsFound: prospects.length,
    prospectsContacted: outreach.sent,
    responses: responses.count
  });
});

app.post('/qualify/:prospectId', async (req, res) => {
  const { prospectId } = req.params;
  
  const qualification = await Qualifier.qualify(prospectId);
  
  res.json(qualification);
});

app.post('/onboard/:prospectId', async (req, res) => {
  const { prospectId } = req.params;
  
  // Generate contract
  const contract = await ContractGen.generate({
    vendorId: prospectId,
    terms: req.body.terms
  });
  
  // Start onboarding
  const onboarding = await Onboarder.start({
    vendorId: prospectId,
    contractId: contract.id
  });
  
  res.json({ contract, onboarding });
});

module.exports = app;
```

### Prospect Discovery

```javascript
// vendor-acquisition-worker/src/prospector.js

class VendorProspector {
  async discover({ industry, criteria, limit }) {
    const prospects = [];
    
    // Search directories
    const directories = await this.searchDirectories(industry);
    prospects.push(...directories);
    
    // Search social
    const social = await this.searchSocial(industry);
    prospects.push(...social);
    
    // Search web
    const web = await this.searchWeb(industry, criteria);
    prospects.push(...web);
    
    // Deduplicate and rank
    const unique = this.deduplicate(prospects);
    const scored = this.scoreProspects(unique);
    
    return scored.slice(0, limit);
  }
  
  async searchDirectories(industry) {
    // Search local directories
    const localNexha = await discovery.search({
      capability: 'supply',
      industry,
      limit: 50
    });
    
    // Search industry directories
    const industryDirs = await this.searchIndustryDirs(industry);
    
    return [...localNexha, ...industryDirs];
  }
  
  async searchSocial(industry) {
    // LinkedIn, Twitter, etc.
    const linkedin = await this.searchLinkedIn(industry);
    const twitter = await this.searchTwitter(industry);
    
    return [...linkedin, ...twitter];
  }
  
  scoreProspects(prospects) {
    return prospects.map(p => ({
      ...p,
      score: this.calculateScore(p),
      quality: this.categorize(p.score)
    })).sort((a, b) => b.score - a.score);
  }
  
  calculateScore(prospect) {
    // Trust score from Nexha
    const trustWeight = 0.3;
    const trust = prospect.aciScore || 50;
    
    // Capability match
    const capabilityWeight = 0.3;
    const capability = prospect.capabilityMatch || 50;
    
    // Activity level
    const activityWeight = 0.2;
    const activity = prospect.recentActivity || 50;
    
    // Response rate
    const responseWeight = 0.2;
    const response = prospect.responseRate || 50;
    
    return (trust * trustWeight) +
           (capability * capabilityWeight) +
           (activity * activityWeight) +
           (response * responseWeight);
  }
}

module.exports = new VendorProspector();
```

### Outreach Automation

```javascript
// vendor-acquisition-worker/src/outreach.js

class OutreachAutomation {
  async send({ prospects, template }) {
    const batch = {
      id: uuid(),
      template,
      sent: 0,
      failed: 0,
      responses: []
    };
    
    for (const prospect of prospects) {
      try {
        // Select channel based on preference
        if (prospect.email) {
          await this.sendEmail(prospect, template);
        }
        
        if (prospect.phone) {
          await this.sendWhatsApp(prospect, template);
        }
        
        batch.sent++;
      } catch (error) {
        batch.failed++;
        logger.error(`Failed to outreach ${prospect.id}:`, error);
      }
    }
    
    return batch;
  }
  
  async sendEmail(prospect, template) {
    const email = {
      to: prospect.email,
      subject: this.renderTemplate(template.subject, prospect),
      body: this.renderTemplate(template.body, prospect),
      tracking: true
    };
    
    return await emailService.send(email);
  }
  
  async sendWhatsApp(prospect, template) {
    const message = this.renderTemplate(template.whatsapp, prospect);
    
    return await whatsappService.send({
      to: prospect.phone,
      message
    });
  }
  
  async trackResponses(batchId) {
    const emails = await emailService.getTracked(batchId);
    const whatsapp = await whatsappService.getTracked(batchId);
    
    return {
      sent: emails.length + whatsapp.length,
      opened: emails.filter(e => e.opened).length,
      clicked: emails.filter(e => e.clicked).length,
      replied: emails.filter(e => e.replied).length + 
                whatsapp.filter(w => w.replied).length
    };
  }
}
```

---

## Week 17-20: Catalog Normalization Worker

### Architecture

```
CATALOG NORMALIZATION WORKER
│
├── Image Processing Module
│   ├── Background removal
│   ├── Quality enhancement
│   ├── Multi-angle generation
│   └── Compliance check
│
├── Description Generation Module
│   ├── Title generation
│   ├── Bullet creation
│   ├── SEO optimization
│   └── Multi-language
│
├── Spec Extraction Module
│   ├── OCR processing
│   ├── Attribute extraction
│   ├── Unit normalization
│   └── Comparison gen
│
└── Quality Scoring Module
    ├── Completeness check
    ├── Quality scoring
    ├── Compliance validation
    └── Improvement suggestions
```

### Implementation

```javascript
// catalog-normalization-worker/src/index.js

const express = require('express');
const app = express();

const ImageProcessor = require('./image-processor');
const DescriptionGen = require('./description-generator');
const SpecExtractor = require('./spec-extractor');
const QualityScorer = require('./quality-scorer');

app.post('/normalize', async (req, res) => {
  const { product, options } = req.body;
  
  const results = {
    productId: product.id,
    normalized: {}
  };
  
  // Process images
  if (options.images) {
    results.normalized.images = await ImageProcessor.process(product.images);
  }
  
  // Generate description
  if (options.description) {
    results.normalized.description = await DescriptionGen.generate({
      product,
      keywords: options.keywords,
      seo: options.seo
    });
  }
  
  // Extract specs
  if (options.specs) {
    results.normalized.specs = await SpecExtractor.extract(product.rawSpecs);
  }
  
  // Score quality
  results.quality = await QualityScorer.score(results.normalized);
  results.suggestions = QualityScorer.suggestions(results.quality);
  
  res.json(results);
});

app.post('/batch', async (req, res) => {
  const { products, options } = req.body;
  
  const results = await Promise.all(
    products.map(p => this.normalize({ product: p, options }))
  );
  
  res.json({
    processed: results.length,
    averageQuality: this.averageQuality(results),
    errors: results.filter(r => r.error).length
  });
});

module.exports = app;
```

### Image Processing

```javascript
// catalog-normalization-worker/src/image-processor.js

class ImageProcessor {
  async process(images) {
    const processed = [];
    
    for (const image of images) {
      const result = {
        original: image.url,
        processed: []
      };
      
      // Remove background
      const noBg = await this.removeBackground(image.url);
      result.processed.push({ type: 'no_background', url: noBg });
      
      // Enhance quality
      const enhanced = await this.enhance(image.url);
      result.processed.push({ type: 'enhanced', url: enhanced });
      
      // Generate multiple sizes
      const sizes = await this.generateSizes(image.url);
      result.processed.push(...sizes);
      
      // Compliance check
      const compliant = await this.checkCompliance(result.processed);
      result.compliant = compliant;
      
      processed.push(result);
    }
    
    return processed;
  }
  
  async removeBackground(url) {
    // Call AI image service
    const result = await aiVision.process(url, {
      operation: 'remove_background',
      model: 'background-removal-v2'
    });
    
    return result.url;
  }
  
  async enhance(url) {
    return await aiVision.process(url, {
      operation: 'enhance',
      brightness: 1.1,
      contrast: 1.2,
      sharpness: 1.3
    });
  }
  
  async generateSizes(url) {
    const sizes = [200, 400, 800, 1200];
    
    return Promise.all(
      sizes.map(size => aiVision.resize(url, { width: size, height: size }))
    );
  }
}
```

### Description Generation

```javascript
// catalog-normalization-worker/src/description-generator.js

class DescriptionGenerator {
  async generate({ product, keywords, seo }) {
    // Generate title
    const title = await this.generateTitle(product);
    
    // Generate bullets
    const bullets = await this.generateBullets(product);
    
    // Generate full description
    const description = await this.generateFullDescription(product);
    
    // SEO optimization
    let meta = {};
    if (seo) {
      meta = await this.generateSEO({
        title,
        description,
        keywords,
        product
      });
    }
    
    // Multi-language
    const translations = await this.translate({
      title,
      bullets,
      description
    }, ['ar', 'hi', 'zh', 'es', 'fr']);
    
    return {
      title,
      bullets,
      description,
      meta,
      translations
    };
  }
  
  async generateTitle(product) {
    const prompt = `
      Generate a product title for:
      - Brand: ${product.brand}
      - Name: ${product.name}
      - Key features: ${product.features?.slice(0, 5).join(', ')}
      
      Requirements:
      - Max 60 characters
      - Include brand name
      - Highlight key differentiator
      - SEO optimized
    `;
    
    const response = await llm.complete(prompt);
    return response.text.trim();
  }
  
  async generateBullets(product) {
    const prompt = `
      Generate 5 bullet points for:
      - Product: ${product.name}
      - Features: ${JSON.stringify(product.features)}
      - Specs: ${JSON.stringify(product.specs)}
      
      Format: Each bullet max 150 chars
      Start with action verb
    `;
    
    const response = await llm.complete(prompt);
    return response.text.split('\n').filter(b => b.trim());
  }
}
```

---

## Week 21-24: Recommendation + Growth Workers

### Recommendation Worker

```javascript
// recommendation-worker/src/index.js

class RecommendationWorker {
  constructor() {
    this.userProfiles = new Map();
    this.productEmbeddings = new Map();
  }
  
  // User profiling
  async buildUserProfile(userId) {
    const user = await this.getUserData(userId);
    
    const profile = {
      userId,
      demographics: user.demographics,
      preferences: this.extractPreferences(user.behavior),
      interests: this.extractInterests(user.browsing),
      purchaseHistory: user.orders,
      similarity: this.computeSimilarity(user)
    };
    
    this.userProfiles.set(userId, profile);
    
    return profile;
  }
  
  // Collaborative filtering
  async findSimilarUsers(userId) {
    const user = this.userProfiles.get(userId);
    
    const allUsers = Array.from(this.userProfiles.values());
    
    const similarities = allUsers
      .filter(u => u.userId !== userId)
      .map(u => ({
        userId: u.userId,
        similarity: cosineSimilarity(user.embedding, u.embedding)
      }))
      .sort((a, b) => b.similarity - a.similarity);
    
    return similarities.slice(0, 100);
  }
  
  // Get recommendations
  async recommend({ userId, context, limit = 20 }) {
    // Build user profile if not exists
    if (!this.userProfiles.has(userId)) {
      await this.buildUserProfile(userId);
    }
    
    const user = this.userProfiles.get(userId);
    
    // Get similar users' purchases
    const similarUsers = await this.findSimilarUsers(userId);
    const similarPurchases = await this.getSimilarPurchases(similarUsers);
    
    // Get content-based recommendations
    const contentBased = await this.contentBasedRecs(user, context);
    
    // Combine and rank
    const combined = this.combineAndRank(similarPurchases, contentBased, user);
    
    // Apply business rules
    const filtered = this.applyRules(combined, user, context);
    
    return filtered.slice(0, limit);
  }
  
  // Real-time ranking
  async rankForContext({ userId, products, context }) {
    const user = this.userProfiles.get(userId);
    
    const scored = await Promise.all(
      products.map(async product => {
        const scores = {
          relevance: await this.relevanceScore(user, product),
          price: await this.priceScore(user, product),
          availability: product.stock > 0 ? 1 : 0,
          recency: this.recencyScore(product),
          popularity: await this.popularityScore(product)
        };
        
        // Weighted combination
        const total = Object.entries(scores)
          .reduce((sum, [key, value]) => {
            const weight = this.weights[key] || 0;
            return sum + (value * weight);
          }, 0);
        
        return { product, score: total, scores };
      })
    );
    
    return scored
      .filter(p => p.score > 0.5)
      .sort((a, b) => b.score - a.score);
  }
}
```

### Growth Worker

```javascript
// growth-worker/src/index.js

class GrowthWorker {
  // Campaign creation
  async createCampaign({ type, target, objective }) {
    const campaign = {
      id: uuid(),
      type,
      objective,
      status: 'draft',
      created: Date.now()
    };
    
    // Create targeting
    campaign.targeting = await this.buildTargeting({
      type,
      target
    });
    
    // Create content
    campaign.content = await this.generateContent({
      type,
      objective
    });
    
    // Set budget and schedule
    campaign.budget = this.suggestBudget({ type, objective });
    campaign.schedule = this.suggestSchedule({ type, objective });
    
    return campaign;
  }
  
  // A/B testing
  async runABTest({ campaignId, variants, trafficSplit }) {
    const test = {
      id: uuid(),
      campaignId,
      variants,
      split: trafficSplit,
      status: 'running',
      results: {}
    };
    
    // Create variant campaigns
    for (const [name, config] of Object.entries(variants)) {
      await this.createVariant({
        baseCampaign: campaignId,
        name,
        ...config
      });
    }
    
    // Start tracking
    await analytics.track(test.id, {
      impressions: true,
      clicks: true,
      conversions: true
    });
    
    return test;
  }
  
  // Conversion optimization
  async optimize({ campaignId, goal }) {
    const current = await analytics.getCampaign(campaignId);
    const recommendations = [];
    
    // Analyze performance
    if (current.ctr < 0.02) {
      recommendations.push({
        type: 'creative',
        suggestion: 'Test new ad creatives with stronger CTAs',
        expectedLift: '15-25%'
      });
    }
    
    if (current.cvr < 0.03) {
      recommendations.push({
        type: 'landing_page',
        suggestion: 'Simplify checkout or landing page',
        expectedLift: '10-20%'
      });
    }
    
    if (current.cpa > goal.targetCost * 1.5) {
      recommendations.push({
        type: 'targeting',
        suggestion: 'Narrow audience to higher-intent segments',
        expectedLift: '20-30%'
      });
    }
    
    return recommendations;
  }
}
```

---

## BAM Gateway

```javascript
// bam-gateway/src/index.js

const express = require('express');
const app = express();

// Worker registry
const workers = {
  'vendor-acquisition': require('../vendor-acquisition-worker'),
  'catalog-normalization': require('../catalog-normalization-worker'),
  'recommendation': require('../recommendation-worker'),
  'growth': require('../growth-worker'),
  'fraud': require('../fraud-worker')
};

// Route to workers
app.use('/workers/:workerId', async (req, res, next) => {
  const { workerId } = req.params;
  const worker = workers[workerId];
  
  if (!worker) {
    return res.status(404).json({ error: 'Worker not found' });
  }
  
  req.worker = worker;
  next();
});

// Worker endpoints
app.post('/workers/:workerId/run', async (req, res) => {
  const { worker } = req;
  const { input, options } = req.body;
  
  // Track usage
  await usageTracker.track(req.user.id, worker, input);
  
  // Run worker
  const result = await worker.run({ ...input, ...options });
  
  res.json(result);
});

// List available workers
app.get('/workers', (req, res) => {
  res.json({
    workers: Object.keys(workers).map(id => ({
      id,
      name: workers[id].name,
      description: workers[id].description,
      inputs: workers[id].inputs,
      outputs: workers[id].outputs,
      pricing: workers[id].pricing
    }))
  });
});

// Get worker skill catalog
app.get('/skills', (req, res) => {
  const skills = [];
  
  for (const [workerId, worker] of Object.entries(workers)) {
    if (worker.skills) {
      skills.push(...worker.skills.map(s => ({
        ...s,
        workerId
      })));
    }
  }
  
  res.json({ skills });
});
```

---

## Skill Catalog

```yaml
# bam-gateway/src/skills.yaml

skills:
  - id: vendor-discovery
    name: Vendor Discovery
    description: Find and qualify potential vendors
    worker: vendor-acquisition
    inputs:
      - industry
      - criteria
      - target_count
    outputs:
      - vendors[]
      - scores[]
    pricing:
      base: 999
      per_vendor: 10
  
  - id: catalog-normalize
    name: Catalog Normalization
    description: Normalize product catalogs
    worker: catalog-normalization
    inputs:
      - products[]
      - options
    outputs:
      - normalized_products[]
      - quality_scores[]
    pricing:
      base: 499
      per_product: 5
  
  - id: recommend
    name: Product Recommendations
    description: Personalize product recommendations
    worker: recommendation
    inputs:
      - user_id
      - context
      - limit
    outputs:
      - recommendations[]
      - scores[]
    pricing:
      per_request: 1
  
  - id: campaign-create
    name: Campaign Creation
    description: Create and optimize marketing campaigns
    worker: growth
    inputs:
      - type
      - target
      - objective
    outputs:
      - campaign
      - targeting
      - content
    pricing:
      base: 1999
      per_campaign: 500
```

---

## API Reference

### Worker Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `POST /workers/run` | POST | Run a worker task |
| `GET /workers` | GET | List all workers |
| `GET /skills` | GET | List all available skills |

### Vendor Acquisition

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `POST /vendor-acquisition/acquire` | POST | Start vendor acquisition |
| `POST /vendor-acquisition/qualify/:id` | POST | Qualify a prospect |
| `POST /vendor-acquisition/onboard/:id` | POST | Onboard a vendor |

### Catalog Normalization

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `POST /catalog-normalization/normalize` | POST | Normalize a product |
| `POST /catalog-normalization/batch` | POST | Batch normalize products |

### Recommendation

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `POST /recommendation/recommend` | POST | Get recommendations |
| `POST /recommendation/rank` | POST | Rank products for context |

### Growth

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `POST /growth/campaign` | POST | Create a campaign |
| `POST /growth/ab-test` | POST | Run A/B test |
| `POST /growth/optimize` | POST | Get optimization recommendations |

---

## Testing

```bash
# Test vendor acquisition
curl -X POST http://localhost:4399/api/bam/vendor-acquisition/acquire \
  -d '{"industry": "restaurant", "target": 50}'

# Test catalog normalization
curl -X POST http://localhost:4399/api/bam/catalog-normalization/normalize \
  -d '{"product": {"name": "iPhone", "brand": "Apple"}, "options": {"images": true, "description": true}}'

# Test recommendation
curl -X POST http://localhost:4399/api/bam/recommendation/recommend \
  -d '{"userId": "user123", "context": "homepage", "limit": 20}'

# Test growth
curl -X POST http://localhost:4399/api/bam/growth/campaign \
  -d '{"type": "retargeting", "target": "cart_abandoners", "objective": {"goal": "conversion"}}'
```

---

## Deliverables

| Deliverable | Week | Status |
|------------|------|--------|
| BAM Gateway | 14 | ⏳ |
| Vendor Acquisition Worker | 16 | ⏳ |
| Catalog Normalization Worker | 20 | ⏳ |
| Recommendation Worker | 22 | ⏳ |
| Growth Worker | 24 | ⏳ |
| Skill Catalog | 24 | ⏳ |

---

*Phase 2 Status: Ready to start after Phase 1*
*Estimated Completion: Week 24*
