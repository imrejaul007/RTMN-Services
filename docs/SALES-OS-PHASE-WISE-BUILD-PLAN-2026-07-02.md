# SalesOS Phase-Wise Build Plan

**Date:** July 2, 2026  
**Status:** Ready to Build  
**Estimated Duration:** 16 weeks

---

## Quick Start

```bash
# Start existing services
cd industry-os/services/sales-os && npm start  # Port 5055

# Check what's running
curl http://localhost:5055/health
curl http://localhost:4896/health  # Customer Intelligence
```

---

## Phase 0: Foundation (Week 1-2)

### P0.1: Create SalesOS Gateway ✅ AUDIT DONE

**Task:** Audit complete — Found 75% functionality already built

**Deliverables:**
- [x] Complete code audit across RTMN ecosystem
- [x] Integration map created
- [x] Gap analysis completed

### P0.2: Build Unified Gateway Service 🔲

**Location:** `companies/HOJAI-AI/platform/company-os/sales-os/sales-gateway/`

**File:** `src/index.ts`

```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 5055;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Service URLs
const SERVICES = {
  salesOs: process.env.SALES_OS_URL || 'http://localhost:5055',
  customerIntelligence: process.env.CUSTOMER_INTEL_URL || 'http://localhost:4896',
  twinPlatform: process.env.TWIN_PLATFORM_URL || 'http://localhost:5056',
  aiWorkforce: process.env.AI_WORKFORCE_URL || 'http://localhost:5057',
  siteosCrm: process.env.SITEOS_CRM_URL || 'http://localhost:5484',
  siteosPipeline: process.env.SITEOS_PIPELINE_URL || 'http://localhost:5485',
  twinOsHub: process.env.TWIN_OS_URL || 'http://localhost:4705',
  memoryOs: process.env.MEMORY_OS_URL || 'http://localhost:4703',
  agentOs: process.env.AGENT_OS_URL || 'http://localhost:4802',
};

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'SalesOS Gateway',
    version: '1.0.0',
    port: PORT,
    timestamp: new Date().toISOString(),
    services: Object.keys(SERVICES)
  });
});

// CRM Routes → Forward to Sales OS (5055)
app.use('/crm', require('./routes/crm'));

// Twin Routes → Twin Platform (5056)
app.use('/twins', require('./routes/twins'));

// Worker Routes → AI Workforce (5057)
app.use('/workers', require('./routes/workers'));

// Intelligence Routes → Customer Intelligence (4896)
app.use('/intelligence', require('./routes/intelligence'));

// Engagement Routes → New Service (5058)
app.use('/engagement', require('./routes/engagement'));

// Meetings Routes → New Service (5059)
app.use('/meetings', require('./routes/meetings'));

// Command Center → New Service (5060)
app.use('/command', require('./routes/command'));

// Unified Dashboard
app.get('/dashboard', async (req, res) => {
  const [salesHealth, twinHealth, workerStats, intelStats] = await Promise.all([
    fetch(`${SERVICES.salesOs}/health`).then(r => r.json()).catch(() => ({ status: 'unavailable' })),
    fetch(`${SERVICES.twinPlatform}/dashboard`).then(r => r.json()).catch(() => ({ status: 'unavailable' })),
    fetch(`${SERVICES.aiWorkforce}/stats`).then(r => r.json()).catch(() => ({ status: 'unavailable' })),
    fetch(`${SERVICES.customerIntelligence}/health`).then(r => r.json()).catch(() => ({ status: 'unavailable' })),
  ]);
  
  res.json({
    dashboard: 'SalesOS Unified',
    timestamp: new Date().toISOString(),
    services: { salesOs: salesHealth, twinPlatform: twinHealth, aiWorkforce: workerStats, customerIntelligence: intelStats },
    summary: {
      totalCustomers: twinHealth.dashboard?.summary?.totalCustomers || 0,
      totalOpportunities: twinHealth.dashboard?.summary?.totalOpportunities || 0,
      totalARR: twinHealth.dashboard?.summary?.totalARR || 0,
      totalPipeline: twinHealth.dashboard?.summary?.totalPipeline || 0,
    },
    health: {
      aiWorkers: workerStats.stats?.total || 0,
      activeWorkers: workerStats.stats?.sales?.active || 0,
    }
  });
});

app.listen(PORT, () => console.log(`SalesOS Gateway listening on ${PORT}`));
```

**Tasks:**
- [ ] Create gateway service
- [ ] Create route modules (crm.ts, twins.ts, workers.ts, intelligence.ts)
- [ ] Create health aggregation
- [ ] Create unified dashboard endpoint
- [ ] Add error handling
- [ ] Add request logging

### P0.3: Create Gateway Routes 🔲

**File:** `src/routes/crm.ts`

```typescript
import { Router } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const router = Router();
const SALES_OS_URL = process.env.SALES_OS_URL || 'http://localhost:5055';

// Proxy all CRM requests to Sales OS
router.use('/', createProxyMiddleware({
  target: SALES_OS_URL,
  changeOrigin: true,
  pathRewrite: { '^/crm': '/api' },
}));

export default router;
```

**Files to create:**
- [ ] `src/routes/crm.ts` — CRM proxy
- [ ] `src/routes/twins.ts` — Twin platform proxy
- [ ] `src/routes/workers.ts` — AI workforce proxy
- [ ] `src/routes/intelligence.ts` — Customer intelligence proxy

### P0.4: Verify Existing Services 🔲

**Tasks:**
- [ ] Test Industry OS SalesOS (5055)
- [ ] Test Customer Intelligence Gateway (4896)
- [ ] Test SiteOS Native CRM (5484)
- [ ] Test SiteOS Pipeline (5485)
- [ ] Verify connectivity

**Verification Script:**
```bash
#!/bin/bash
echo "Testing SalesOS Services..."
curl -s http://localhost:5055/health | jq '.status'
curl -s http://localhost:4896/health | jq '.status'
curl -s http://localhost:5484/health | jq '.status'
curl -s http://localhost:5485/health | jq '.status'
echo "All services verified!"
```

### P0.5: Start Scripts 🔲

**File:** `scripts/start-sales-os.sh`

```bash
#!/bin/bash
set -e

echo "🚀 Starting SalesOS Platform..."

# Start existing services
echo "📦 Starting Industry OS Sales..."
cd industry-os/services/sales-os && npm start &
sleep 2

echo "📦 Starting Customer Intelligence..."
cd companies/HOJAI-AI/services/customer-intelligence-gateway && npm start &
sleep 2

echo "📦 Starting SiteOS CRM..."
cd companies/HOJAI-AI/products/siteos-commerce/native-crm && npm start &
sleep 2

echo "📦 Starting SalesOS Gateway..."
cd companies/HOJAI-AI/platform/company-os/sales-os/sales-gateway && npm start &
sleep 2

echo "✅ SalesOS Platform started!"
echo "Gateway: http://localhost:5055"
echo "Dashboard: http://localhost:5055/dashboard"
```

---

## Phase 1: Twin Platform (Week 3-4)

### P1.1: Enhance Twin CRUD 🔲

**Location:** `platform/company-os/sales-os/sales-twin-platform/`

**Enhancements to add:**

#### Customer Twin Enhancements
```typescript
// POST /twins/customers/:id/behavior
router.post('/customers/:id/behavior', async (req, res) => {
  const twin = customerTwins.get(req.params.id);
  if (!twin) return res.status(404).json({ error: 'Not found' });
  
  twin.behavior.engagement = req.body.engagement;
  twin.behavior.lastActive = new Date();
  twin.behavior.preferredChannel = req.body.channel || twin.behavior.preferredChannel;
  twin.lastUpdated = new Date();
  twin.confidence = Math.min(100, twin.confidence + 5);
  
  customerTwins.set(req.params.id, twin);
  res.json({ success: true, twin });
});

// POST /twins/customers/:id/score
router.post('/customers/:id/score', async (req, res) => {
  const twin = customerTwins.get(req.params.id);
  if (!twin) return res.status(404).json({ error: 'Not found' });
  
  // AI-powered scoring
  const { churnRisk, expansionProbability } = calculateAIScores(twin);
  twin.intelligence.churnRisk = churnRisk;
  twin.intelligence.expansionProbability = expansionProbability;
  twin.intelligence.nextBestAction = recommendAction(twin);
  twin.lastUpdated = new Date();
  
  res.json({ success: true, twin });
});
```

**Endpoints to add:**
- [ ] `POST /twins/customers/:id/behavior` — Update behavior
- [ ] `POST /twins/customers/:id/score` — AI scoring
- [ ] `POST /twins/customers/:id/enrich` — Enrich from external sources
- [ ] `POST /twins/customers/:id/link` — Link related twins

#### Revenue Twin Enhancements
```typescript
// POST /twins/revenue/:id/simulate
router.post('/revenue/:id/simulate', async (req, res) => {
  const twin = revenueTwins.get(req.params.id);
  if (!twin) return res.status(404).json({ error: 'Not found' });
  
  const { scenarios } = req.body;
  const results = {};
  
  for (const scenario of scenarios) {
    results[scenario] = simulateScenario(twin, scenario);
  }
  
  res.json({
    success: true,
    baseline: twin,
    scenarios: results,
    generatedAt: new Date()
  });
});
```

**Endpoints to add:**
- [ ] `POST /twins/revenue/:id/simulate` — What-if simulation
- [ ] `POST /twins/revenue/:id/forecast` — AI forecasting
- [ ] `GET /twins/revenue/:id/trends` — Historical trends

### P1.2: Add Twin Relationships 🔲

```typescript
// Relationship types
interface TwinRelationship {
  id: string;
  sourceTwinId: string;
  sourceTwinType: 'customer' | 'account' | 'opportunity' | 'revenue';
  targetTwinId: string;
  targetTwinType: string;
  relationship: 'owns' | 'manages' | 'referenced_by' | 'competitor_of';
  strength: number; // 0-100
  createdAt: Date;
}

const twinRelationships = new Map<string, TwinRelationship[]>();

// POST /twins/relationships
router.post('/relationships', async (req, res) => {
  const { sourceId, sourceType, targetId, targetType, relationship, strength } = req.body;
  
  const rel: TwinRelationship = {
    id: crypto.randomUUID(),
    sourceTwinId: sourceId,
    sourceTwinType: sourceType,
    targetTwinId: targetId,
    targetTwinType: targetType,
    relationship,
    strength: strength || 50,
    createdAt: new Date(),
  };
  
  const key = `${sourceType}:${sourceId}`;
  const existing = twinRelationships.get(key) || [];
  existing.push(rel);
  twinRelationships.set(key, existing);
  
  res.status(201).json({ success: true, relationship: rel });
});

// GET /twins/:type/:id/relationships
router.get('/:type/:id/relationships', async (req, res) => {
  const key = `${req.params.type}:${req.params.id}`;
  const relationships = twinRelationships.get(key) || [];
  
  // Enrich with twin data
  const enriched = await Promise.all(relationships.map(async (rel) => {
    const targetTwin = await getTwin(rel.targetTwinType, rel.targetTwinId);
    return { ...rel, targetTwin };
  }));
  
  res.json({ success: true, relationships: enriched });
});
```

### P1.3: Add AI-Powered Twin Updates 🔲

```typescript
// Auto-update twins from events
async function updateTwinFromEvent(event: any) {
  switch (event.type) {
    case 'customer.purchased':
      const customer = customerTwins.get(event.customerId);
      if (customer) {
        customer.lifecycle.ltv += event.amount;
        customer.behavior.engagement = Math.min(100, customer.behavior.engagement + 5);
        customer.behavior.lastActive = new Date();
        customerTwins.set(event.customerId, customer);
      }
      break;
      
    case 'customer.support_ticket':
      const supportTwin = customerTwins.get(event.customerId);
      if (supportTwin) {
        supportTwin.intelligence.churnRisk = Math.min(100, supportTwin.intelligence.churnRisk + 10);
        customerTwins.set(event.customerId, supportTwin);
      }
      break;
      
    case 'deal.stage_changed':
      const oppTwin = opportunityTwins.get(event.opportunityId);
      if (oppTwin) {
        oppTwin.intelligence.health = calculateDealHealth(oppTwin);
        oppTwin.deal.stage = event.newStage;
        opportunityTwins.set(event.opportunityId, oppTwin);
      }
      break;
  }
}
```

### P1.4: Add Simulation Engine 🔲

```typescript
// Simulation endpoints
router.post('/simulate/customer/:id', async (req, res) => {
  const twin = customerTwins.get(req.params.id);
  if (!twin) return res.status(404).json({ error: 'Not found' });
  
  const { action, parameters } = req.body;
  
  // Clone twin for simulation
  const simTwin = JSON.parse(JSON.stringify(twin));
  
  switch (action) {
    case 'churn':
      simTwin.lifecycle.stage = 'churning';
      simTwin.intelligence.churnRisk = parameters.probability || 0.8;
      simTwin.lifecycle.ltv *= (1 - (parameters.revenueImpact || 0.3));
      break;
      
    case 'expand':
      simTwin.lifecycle.stage = 'expanding';
      simTwin.intelligence.expansionProbability = parameters.probability || 0.8;
      simTwin.lifecycle.ltv *= (1 + (parameters.revenueImpact || 0.2));
      break;
  }
  
  res.json({
    success: true,
    original: twin,
    simulated: simTwin,
    impact: {
      ltvChange: simTwin.lifecycle.ltv - twin.lifecycle.ltv,
      ltvChangePercent: ((simTwin.lifecycle.ltv - twin.lifecycle.ltv) / twin.lifecycle.ltv * 100).toFixed(2) + '%',
      riskChange: simTwin.intelligence.churnRisk - twin.intelligence.churnRisk,
    }
  });
});
```

---

## Phase 2: AI Workforce (Week 5-6)

### P2.1: Implement Worker Processing 🔲

**Location:** `platform/company-os/sales-os/sales-ai-workforce/`

**Enhancements:**

```typescript
// Enhanced worker processing with LLM integration
router.post('/process', async (req, res) => {
  const { type, context, priority, preferredWorker } = req.body;
  
  // Find best worker
  let worker = findBestWorker(type, preferredWorker);
  
  // Gather context from twins
  const twinContext = await gatherTwinContext(context);
  
  // Get AI analysis
  const analysis = await getAIAnalysis(worker, type, {
    ...context,
    ...twinContext
  });
  
  // Generate response
  const response = {
    workerId: worker.id,
    workerName: worker.name,
    analysis: analysis.narrative,
    recommendations: analysis.recommendations,
    actions: analysis.actions,
    confidence: worker.metrics.successRate,
    nextSteps: analysis.nextSteps,
    sources: analysis.sources,
  };
  
  // Update worker metrics
  worker.metrics.handled++;
  workers.set(worker.id, worker);
  
  res.json({ success: true, response });
});

async function getAIAnalysis(worker: SalesAIWorker, type: string, context: any): Promise<AIAnalysis> {
  // Connect to LLM (Claude/GPT)
  const prompt = buildPrompt(worker, type, context);
  
  const response = await fetch(process.env.LLM_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet',
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  
  const result = await response.json();
  return parseAIResponse(result);
}
```

### P2.2: Add Worker Delegation 🔲

```typescript
// Worker-to-worker delegation
router.post('/delegate', async (req, res) => {
  const { fromWorkerId, toWorkerType, task } = req.body;
  
  const fromWorker = workers.get(fromWorkerId);
  if (!fromWorker) return res.status(404).json({ error: 'Worker not found' });
  
  // Find suitable worker
  const toWorker = Array.from(workers.values())
    .find(w => w.specialization.some(s => s.includes(toWorkerType)));
  
  if (!toWorker) return res.status(404).json({ error: 'No suitable worker found' });
  
  // Delegate task
  const result = await toWorker.process(task);
  
  // Log delegation
  logDelegation(fromWorkerId, toWorker.id, task, result);
  
  res.json({
    success: true,
    from: fromWorker.name,
    to: toWorker.name,
    result
  });
});
```

### P2.3: Add Learning Feedback 🔲

```typescript
// Learning feedback loop
router.post('/learn', async (req, res) => {
  const { outcomeId, workerId, feedback } = req.body;
  
  const worker = workers.get(workerId);
  if (!worker) return res.status(404).json({ error: 'Worker not found' });
  
  // Update worker based on outcome
  if (feedback.success) {
    worker.metrics.successRate = Math.min(100, worker.metrics.successRate + 1);
    worker.metrics.handled++;
  } else {
    worker.metrics.successRate = Math.max(0, worker.metrics.successRate - 1);
  }
  
  // Store feedback for learning
  const learningEntry = {
    workerId,
    outcomeId,
    feedback,
    timestamp: new Date(),
    previousSuccessRate: worker.metrics.successRate,
  };
  
  learningHistory.push(learningEntry);
  
  workers.set(workerId, worker);
  res.json({ success: true, worker });
});

// Performance over time
router.get('/workers/:id/performance', async (req, res) => {
  const worker = workers.get(req.params.id);
  if (!worker) return res.status(404).json({ error: 'Worker not found' });
  
  const history = learningHistory.filter(h => h.workerId === req.params.id);
  const recentHistory = history.slice(-100); // Last 100 interactions
  
  const avgSuccessRate = recentHistory.reduce((sum, h) => sum + h.feedback.success ? 1 : 0, 0) / recentHistory.length * 100;
  const trend = worker.metrics.successRate - avgSuccessRate;
  
  res.json({
    worker,
    performance: {
      currentSuccessRate: worker.metrics.successRate,
      recentSuccessRate: avgSuccessRate.toFixed(1),
      trend: trend > 0 ? 'improving' : trend < 0 ? 'declining' : 'stable',
      totalHandled: worker.metrics.handled,
      historyCount: history.length,
    }
  });
});
```

---

## Phase 3: Intelligence (Week 7-8)

### P3.1: Enhance Customer Intelligence Gateway 🔲

**Location:** `companies/HOJAI-AI/services/customer-intelligence-gateway/`

**New Endpoints:**

```typescript
// Intent signal aggregation
app.post('/api/intelligence/intent-signals', (req, res) => {
  const { customerId, companyId } = req.body;
  
  // Aggregate signals from multiple sources
  const signals = {
    website: getWebsiteSignals(customerId),
    email: getEmailSignals(customerId),
    support: getSupportSignals(customerId),
    purchase: getPurchaseSignals(customerId),
  };
  
  const aggregatedIntent = calculateIntent(signals);
  
  res.json({
    customerId,
    intentScore: aggregatedIntent.score,
    intentLevel: aggregatedIntent.level, // cold, warm, hot, buying
    signals,
    recommendations: getIntentRecommendations(aggregatedIntent),
  });
});

// Predictive churn model
app.post('/api/intelligence/predict', (req, res) => {
  const { customerId, horizon = '30d' } = req.body;
  
  const customer = customerProfiles.get(customerId);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });
  
  // Run prediction model
  const predictions = {
    churn_probability: predictChurn(customer, horizon),
    expansion_probability: predictExpansion(customer),
    nps_prediction: predictNPS(customer),
    ltv_prediction: predictLTV(customer),
    next_purchase: predictNextPurchase(customer),
  };
  
  res.json({
    customerId,
    horizon,
    predictions,
    confidence: 0.85,
    generatedAt: new Date().toISOString(),
  });
});
```

### P3.2: Add Conversation Intelligence 🔲

**New Service:** `platform/company-os/sales-os/conversation-intelligence/`

**Location:** `companies/HOJAI-AI/platform/company-os/sales-os/conversation-intelligence/`

**File:** `src/index.ts`

```typescript
import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = process.env.PORT || 5059;

app.use(express.json());

// Transcripts storage
const transcripts = new Map<string, Transcript>();

interface Transcript {
  id: string;
  meetingId?: string;
  callId?: string;
  participants: string[];
  content: string;
  speakers: Speaker[];
  duration: number;
  sentiment: Sentiment;
  keyMoments: KeyMoment[];
  actionItems: ActionItem[];
  competitorMentions: CompetitorMention[];
  objections: Objection[];
  buyingSignals: BuyingSignal[];
  riskScore: number;
  createdAt: Date;
}

interface Sentiment {
  overall: 'positive' | 'neutral' | 'negative';
  score: number; // 0-100
  timeline: { timestamp: number; sentiment: number }[];
}

interface KeyMoment {
  timestamp: number;
  type: 'question' | 'objection' | 'commitment' | 'competitor' | 'pricing';
  description: string;
}

// Transcription endpoint
app.post('/transcribe', async (req, res) => {
  const { audioUrl, meetingId, participants } = req.body;
  
  // Call transcription service (Whisper/Deepgram)
  const transcript = await transcribeAudio(audioUrl);
  
  // Process transcript
  const processed = processTranscript(transcript, participants);
  
  transcripts.set(processed.id, processed);
  
  res.json({ success: true, transcript: processed });
});

// Analysis endpoint
app.post('/analyze', async (req, res) => {
  const { transcriptId } = req.body;
  
  const transcript = transcripts.get(transcriptId);
  if (!transcript) return res.status(404).json({ error: 'Transcript not found' });
  
  // AI analysis
  const analysis = {
    sentiment: analyzeSentiment(transcript.content),
    competitors: detectCompetitorMentions(transcript.content),
    objections: detectObjections(transcript.content),
    buyingSignals: detectBuyingSignals(transcript.content),
    keyMoments: extractKeyMoments(transcript),
    actionItems: extractActionItems(transcript),
    riskScore: calculateRiskScore(transcript),
  };
  
  // Update transcript
  Object.assign(transcript, analysis);
  transcripts.set(transcriptId, transcript);
  
  res.json({ success: true, analysis });
});

// Deal coaching endpoint
app.post('/coach', async (req, res) => {
  const { transcriptId, context } = req.body;
  
  const transcript = transcripts.get(transcriptId);
  if (!transcript) return res.status(404).json({ error: 'Transcript not found' });
  
  const coaching = {
    dealHealth: transcript.riskScore > 70 ? 'healthy' : transcript.riskScore > 40 ? 'at_risk' : 'critical',
    coachPoints: generateCoachPoints(transcript),
    objectionResponses: generateObjectionResponses(transcript.objections),
    nextSteps: generateNextSteps(transcript),
    talkingPoints: generateTalkingPoints(transcript),
  };
  
  res.json({ success: true, coaching });
});

app.listen(PORT, () => console.log(`Conversation Intelligence listening on ${PORT}`));
```

---

## Phase 4: Engagement (Week 9-10)

### P4.1: Build Sales Engagement Hub 🔲

**New Service:** `platform/company-os/sales-os/sales-engagement/`

**Location:** `companies/HOJAI-AI/platform/company-os/sales-os/sales-engagement/`

**File:** `src/index.ts`

```typescript
import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = process.env.PORT || 5058;

app.use(express.json());

// Sequence storage
const sequences = new Map<string, Sequence>();
const sentMessages = new Map<string, SentMessage>();

interface Sequence {
  id: string;
  name: string;
  type: 'email' | 'linkedin' | 'whatsapp' | 'sms';
  steps: SequenceStep[];
  status: 'draft' | 'active' | 'paused' | 'completed';
  createdAt: Date;
  stats: {
    sent: number;
    opened: number;
    replied: number;
    converted: number;
  };
}

interface SequenceStep {
  order: number;
  type: 'email' | 'linkedin' | 'whatsapp' | 'sms' | 'wait' | 'condition';
  template?: string;
  delayDays?: number;
  condition?: string;
}

// Create sequence
app.post('/sequences', (req, res) => {
  const { name, type, steps } = req.body;
  
  const sequence: Sequence = {
    id: uuidv4(),
    name,
    type,
    steps,
    status: 'draft',
    createdAt: new Date(),
    stats: { sent: 0, opened: 0, replied: 0, converted: 0 },
  };
  
  sequences.set(sequence.id, sequence);
  res.status(201).json({ success: true, sequence });
});

// Send message
app.post('/send', async (req, res) => {
  const { sequenceId, recipient, channel, template, variables } = req.body;
  
  const message: SentMessage = {
    id: uuidv4(),
    sequenceId,
    recipient,
    channel,
    content: await renderTemplate(template, variables),
    status: 'sent',
    sentAt: new Date(),
  };
  
  sentMessages.set(message.id, message);
  
  // Update sequence stats
  const sequence = sequences.get(sequenceId);
  if (sequence) {
    sequence.stats.sent++;
    sequences.set(sequenceId, sequence);
  }
  
  res.json({ success: true, message });
});

// AI Email Writer
app.post('/ai/write', async (req, res) => {
  const { context, goal, tone = 'professional' } = req.body;
  
  const prompt = buildEmailPrompt(context, goal, tone);
  const email = await getAIEmail(prompt);
  
  res.json({
    success: true,
    email: {
      subject: email.subject,
      body: email.body,
      preview: email.preview,
      personalization: email.personalization,
    },
  });
});

// Templates
app.get('/templates', (req, res) => {
  const templates = [
    { id: 'intro', name: 'Introduction', type: 'email', goal: 'first_contact' },
    { id: 'followup', name: 'Follow-up', type: 'email', goal: 'follow_up' },
    { id: 'linkedin-connect', name: 'LinkedIn Connect', type: 'linkedin', goal: 'connection' },
    { id: 'demo-request', name: 'Demo Request', type: 'email', goal: 'demo' },
    // ... more templates
  ];
  
  res.json({ success: true, templates });
});

app.listen(PORT, () => console.log(`Sales Engagement listening on ${PORT}`));
```

---

## Phase 5: Persistence (Week 11-12)

### P5.1: Add Database Layer 🔲

**Migration from in-memory to PostgreSQL:**

```typescript
// src/db/postgres.ts
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Tables
const CREATE_TABLES = `
-- Customers
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  company VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Opportunities
CREATE TABLE IF NOT EXISTS opportunities (
  id UUID PRIMARY KEY,
  customer_id UUID REFERENCES customers(id),
  title VARCHAR(255),
  value DECIMAL(15, 2),
  stage VARCHAR(50),
  close_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Twins
CREATE TABLE IF NOT EXISTS customer_twins (
  customer_id UUID PRIMARY KEY REFERENCES customers(id),
  data JSONB,
  confidence DECIMAL(5, 2),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Worker feedback
CREATE TABLE IF NOT EXISTS worker_feedback (
  id UUID PRIMARY KEY,
  worker_id VARCHAR(50),
  outcome_id VARCHAR(50),
  success BOOLEAN,
  feedback JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
`;

await pool.query(CREATE_TABLES);
```

### P5.2: Add Event Bus Integration 🔲

```typescript
// src/events/sales-events.ts
import { EventBus } from '@rtmn/event-bus';

const eventBus = new EventBus(process.env.EVENT_BUS_URL || 'http://localhost:4510');

// Subscribe to events
eventBus.subscribe('sales.lead.created', async (payload) => {
  // Update twin
  await updateCustomerTwin(payload.leadId);
  // Trigger workflow
  await triggerWorkflow('lead_nurture', payload);
  // Notify sales rep
  await notifySalesRep(payload.ownerId, 'New lead assigned');
});

eventBus.subscribe('sales.deal.stage_changed', async (payload) => {
  // Update opportunity twin
  await updateOpportunityTwin(payload.opportunityId);
  // Recalculate forecast
  await recalculateForecast(payload.region);
  // Trigger notifications
  await notifyManager(payload.ownerId, payload);
});

// Publish events
eventBus.publish('sales.customer.analyzed', {
  customerId: customer.id,
  analysis: result,
  timestamp: new Date(),
});
```

---

## Phase 6: Command Center (Week 13-14)

### P6.1: Build Command Center 🔲

**New Service:** `platform/company-os/sales-os/command-center/`

**File:** `src/index.ts`

```typescript
import express from 'express';

const app = express();
const PORT = process.env.PORT || 5060;

app.use(express.json());

// CEO Dashboard
app.get('/ceo', async (req, res) => {
  const dashboard = {
    revenue: await getRevenueMetrics(),
    customers: await getCustomerMetrics(),
    pipeline: await getPipelineMetrics(),
    team: await getTeamMetrics(),
    growth: await getGrowthMetrics(),
    alerts: await getAlerts(),
  };
  
  res.json({ success: true, dashboard });
});

// CRO Dashboard
app.get('/cro', async (req, res) => {
  const dashboard = {
    forecast: await getForecastMetrics(),
    pipeline: await getDetailedPipeline(),
    quotas: await getQuotaMetrics(),
    territories: await getTerritoryMetrics(),
    coaching: await getCoachingMetrics(),
    alerts: await getCROAlerts(),
  };
  
  res.json({ success: true, dashboard });
});

// AI Insights
app.get('/insights', async (req, res) => {
  const insights = await generateInsights();
  res.json({ success: true, insights });
});

async function generateInsights() {
  // Analyze data and generate AI insights
  const insights = [];
  
  // Check for at-risk deals
  const atRiskDeals = await getAtRiskDeals();
  if (atRiskDeals.length > 0) {
    insights.push({
      type: 'warning',
      category: 'pipeline',
      title: 'At-Risk Deals Detected',
      description: `${atRiskDeals.length} deals with health score below 40`,
      impact: calculateImpact(atRiskDeals),
      action: {
        type: 'schedule_review',
        targets: atRiskDeals.map(d => d.ownerId),
        priority: 'high',
      },
    });
  }
  
  // Check for growth opportunities
  const expansionOpportunities = await getExpansionOpportunities();
  if (expansionOpportunities.length > 0) {
    insights.push({
      type: 'opportunity',
      category: 'expansion',
      title: 'Expansion Opportunities',
      description: `${expansionOpportunities.length} customers ready for upsell`,
      potential: calculateExpansionPotential(expansionOpportunities),
      action: {
        type: 'start_campaign',
        campaign: 'expansion_outreach',
      },
    });
  }
  
  return insights;
}

app.listen(PORT, () => console.log(`Command Center listening on ${PORT}`));
```

---

## Phase 7: Integration (Week 15-16)

### P7.1: Connect Foundation Services 🔲

```typescript
// src/integrations/index.ts

// MemoryOS
import { MemoryOS } from '@hojai/memory-sdk';
const memory = new MemoryOS({ url: process.env.MEMORY_OS_URL });

// TwinOS
import { TwinOS } from '@hojai/twin-sdk';
const twinOs = new TwinOS({ url: process.env.TWIN_OS_URL });

// AgentOS
import { AgentOS } from '@hojai/agentos-sdk';
const agentOs = new AgentOS({ url: process.env.AGENT_OS_URL });

// SUTAR OS
import { SutarOS } from '@rtmn/sutar-os';
const sutar = new SutarOS({ url: process.env.SUTAR_OS_URL });

// Connect everything
export async function initializeIntegrations() {
  await memory.connect();
  await twinOs.connect();
  await agentOs.connect();
  await sutar.connect();
  
  console.log('All integrations connected');
}
```

### P7.2: RTMN Hub Wiring 🔲

**Update Hub:** `services/unified-os-hub/src/routes/index.js`

```javascript
// Add SalesOS routes
const salesOsRoutes = require('./routes/sales-os');
app.use('/api/sales', salesOsRoutes);

// routes/sales-os.js
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = createProxyMiddleware({
  target: process.env.SALES_OS_GATEWAY_URL || 'http://localhost:5055',
  changeOrigin: true,
  pathRewrite: { '^/api/sales': '' },
  onProxyReq: (proxyReq, req) => {
    proxyReq.setHeader('x-correlation-id', req.headers['x-correlation-id']);
  },
});
```

---

## Timeline Summary

| Phase | Duration | Key Deliverables |
|-------|----------|-----------------|
| Phase 0 | Week 1-2 | Gateway, Service wiring |
| Phase 1 | Week 3-4 | Twin Platform enhancements |
| Phase 2 | Week 5-6 | AI Workforce processing |
| Phase 3 | Week 7-8 | Intelligence + Conversation |
| Phase 4 | Week 9-10 | Engagement Hub |
| Phase 5 | Week 11-12 | Database + Events |
| Phase 6 | Week 13-14 | Command Center |
| Phase 7 | Week 15-16 | Full integration |

**Total: 16 weeks**

---

## Files to Create

### Phase 0
- [ ] `platform/company-os/sales-os/sales-gateway/src/index.ts`
- [ ] `platform/company-os/sales-os/sales-gateway/src/routes/crm.ts`
- [ ] `platform/company-os/sales-os/sales-gateway/src/routes/twins.ts`
- [ ] `platform/company-os/sales-os/sales-gateway/src/routes/workers.ts`
- [ ] `platform/company-os/sales-os/sales-gateway/src/routes/intelligence.ts`
- [ ] `platform/company-os/sales-os/sales-gateway/package.json`
- [ ] `platform/company-os/sales-os/scripts/start-sales-os.sh`

### Phase 1
- [ ] `platform/company-os/sales-os/sales-twin-platform/src/routes/relationships.ts`
- [ ] `platform/company-os/sales-os/sales-twin-platform/src/simulation.ts`

### Phase 2
- [ ] `platform/company-os/sales-os/sales-ai-workforce/src/routes/delegate.ts`
- [ ] `platform/company-os/sales-os/sales-ai-workforce/src/routes/learn.ts`
- [ ] `platform/company-os/sales-os/sales-ai-workforce/src/ai-processor.ts`

### Phase 3
- [ ] `platform/company-os/sales-os/conversation-intelligence/src/index.ts`
- [ ] `platform/company-os/sales-os/conversation-intelligence/package.json`

### Phase 4
- [ ] `platform/company-os/sales-os/sales-engagement/src/index.ts`
- [ ] `platform/company-os/sales-os/sales-engagement/package.json`

### Phase 5
- [ ] `platform/company-os/sales-os/shared/src/db/postgres.ts`
- [ ] `platform/company-os/sales-os/shared/src/events/sales-events.ts`

### Phase 6
- [ ] `platform/company-os/sales-os/command-center/src/index.ts`
- [ ] `platform/company-os/sales-os/command-center/package.json`

### Phase 7
- [ ] `platform/company-os/sales-os/shared/src/integrations/index.ts`
- [ ] Update RTMN Hub routes

---

## Dependencies

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "uuid": "^9.0.0",
    "http-proxy-middleware": "^2.0.6",
    "pg": "^8.11.0"
  }
}
```

---

## Testing Plan

```bash
# Unit tests
npm test

# Integration tests
bash scripts/integration-test.sh

# E2E tests
bash scripts/e2e-test.sh

# Health checks
curl http://localhost:5055/health
curl http://localhost:5055/dashboard
```

---

*Build Plan created: July 2, 2026*
