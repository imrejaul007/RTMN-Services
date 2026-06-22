# Plan: Integrate REZ Atlas into REZ Sales Mind

**Date:** June 18, 2026
**Status:** Draft for Approval
**Direction:** Keep Atlas as separate microservices, Sales Mind as unified gateway/API layer

---

## Executive Summary

**Goal:** Create a unified "REZ Atlas" module inside REZ Sales Mind that integrates all Atlas v1 + core Atlas v2 services as microservices behind Sales Mind's gateway. Sales Mind replaces mock endpoints with real Atlas service calls.

**Architecture:**
```
REZ Sales Mind (Port 5170) — Unified Gateway/API
├── Existing modules (leads, campaign, SDR, CRM, copilot) — keep
├── REZ Atlas module (NEW) — gateway to all Atlas microservices
│   ├── Atlas v1 (5150-5191) — maps, territory, routes, twin, signals, discovery
│   └── Atlas v2 (5150-5395) — discover, intelligence, engage, AI workforce
└── Mock replacements — swap fake data → real Atlas calls
```

---

## Decision Summary

| Decision | Choice |
|----------|--------|
| Architecture | Microservices (Atlas stays separate, Sales Mind = gateway) |
| Scope | Atlas v1 + core Atlas v2 (GTM as future phase) |
| Mock endpoints | Replace with real Atlas integrations |

---

## Phase 1: Foundation — REZ Atlas Module in Sales Mind

### 1.1 Create `/api/atlas/*` Route Module

**File:** `src/routes/atlas.js`

New route file that acts as the gateway to all Atlas services, mirroring the pattern of `ecosystem.js`.

**Structure:**
```javascript
// /api/atlas/* — REZ Atlas module gateway
import { Router } from 'express';
import { atlasGateway } from '../services/atlas/atlasGateway.js';

const router = Router();

// Atlas v1 — Core Intelligence
router.use('/discover',  atlasRoutes('http://localhost:5151'));  // Merchant discovery
router.use('/maps',     atlasRoutes('http://localhost:5152'));  // Heat maps, clusters
router.use('/twin',     atlasRoutes('http://localhost:5153'));  // Merchant digital twin
router.use('/score',    atlasRoutes('http://localhost:5154'));  // AI lead scoring
router.use('/signals',  atlasRoutes('http://localhost:5155'));  // Opportunity detection

// Atlas v1 — Sales Intelligence
router.use('/territory', atlasRoutes('http://localhost:5170'));  // Territory management
router.use('/routes',    atlasRoutes('http://localhost:5171'));  // Route optimization
router.use('/copilot',   atlasRoutes('http://localhost:5172'));  // AI sales assistant
router.use('/graph',     atlasRoutes('http://localhost:5173'));  // Merchant network graph

export { router as atlasRoutes };
```

### 1.2 Create Atlas Gateway Service

**File:** `src/services/atlas/atlasGateway.js`

A reusable gateway service that proxies requests to Atlas microservices with:
- Health checks with circuit breaker pattern
- Request/response logging
- Error handling with fallback
- Timeout handling (10s default)

```javascript
export async function atlasGateway(serviceUrl, endpoint, options = {}) {
  const url = `${serviceUrl}${endpoint}`;
  const timeout = options.timeout || 10000;
  
  try {
    const response = await axios.get(url, { timeout });
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

### 1.3 Register Route in index.js

**File:** `src/index.js` (or `dist/index.js`)

```javascript
import { atlasRoutes } from './routes/atlas.js';

// Add after existing routes
app.use('/api/atlas', atlasRoutes);
```

### 1.4 Add Environment Variables

**File:** `.env`

```env
# Atlas v1 Services
ATLAS_DISCOVER_URL=http://localhost:5151
ATLAS_MAPS_URL=http://localhost:5152
ATLAS_TWIN_URL=http://localhost:5153
ATLAS_SCORE_URL=http://localhost:5154
ATLAS_SIGNALS_URL=http://localhost:5155
ATLAS_TERRITORY_URL=http://localhost:5170
ATLAS_ROUTES_URL=http://localhost:5171
ATLAS_COPILOT_URL=http://localhost:5172
ATLAS_GRAPH_URL=http://localhost:5173
ATLAS_DASHBOARD_URL=http://localhost:5190

# Atlas v2 Services
ATLAS_V2_DISCOVER_URL=http://localhost:5150
ATLAS_V2_CONTACT_FINDER_URL=http://localhost:5151
ATLAS_V2_COMPANY_TWIN_URL=http://localhost:5156
ATLAS_V2_PERSON_TWIN_URL=http://localhost:5157
ATLAS_V2_RESEARCH_AGENT_URL=http://localhost:5158
ATLAS_V2_INTENT_ENGINE_URL=http://localhost:5159
ATLAS_V2_EMAIL_URL=http://localhost:5161
ATLAS_V2_WHATSAPP_URL=http://localhost:5162
ATLAS_V2_SMS_URL=http://localhost:5163
ATLAS_V2_CALL_URL=http://localhost:5164
ATLAS_V2_SDR_AGENT_URL=http://localhost:5174
ATLAS_V2_QUALIFICATION_AGENT_URL=http://localhost:5175
ATLAS_V2_MEETING_AGENT_URL=http://localhost:5176
ATLAS_V2_CRM_CORE_URL=http://localhost:5180
ATLAS_V2_PIPELINE_URL=http://localhost:5181
ATLAS_V2_FORECAST_URL=http://localhost:5182
ATLAS_V2_CONVERSATION_INTEL_URL=http://localhost:5183
```

---

## Phase 2: Replace Mock Endpoints with Real Atlas Calls

### 2.1 Replace `/api/sales` — Real Sales Intelligence

**File:** `src/routes/sales.js`

Replace mock data with calls to Atlas services:

| Endpoint | Replace With | Atlas Service |
|----------|-------------|---------------|
| `GET /api/sales/intelligence/:leadId` | → Atlas twin + score | `ATLAS_TWIN_URL`, `ATLAS_SCORE_URL` |
| `GET /api/sales/pre-call/:leadId` | → Atlas copilot | `ATLAS_COPILOT_URL` |
| `GET /api/sales/twin/:leadId` | → Atlas twin | `ATLAS_TWIN_URL` |
| `GET /api/sales/talking-points/:leadId` | → Atlas copilot | `ATLAS_COPILOT_URL` |
| `GET /api/sales/next-action/:leadId` | → Atlas signals | `ATLAS_SIGNALS_URL` |
| `GET /api/sales/signals/:leadId` | → Atlas signals | `ATLAS_SIGNALS_URL` |
| `GET /api/sales/pipeline` | → Atlas v2 CRM | `ATLAS_V2_CRM_CORE_URL` |
| `GET /api/sales/pipeline-summary` | → Atlas v2 forecast | `ATLAS_V2_FORECAST_URL` |

### 2.2 Replace `/api/insights` — Real Market Intelligence

**File:** `src/routes/insights.js`

Replace mock data with Atlas v2 Intelligence layer:

| Endpoint | Replace With | Atlas v2 Service |
|----------|-------------|-----------------|
| `GET /api/insights/market/:industry` | → Atlas intent engine | `ATLAS_V2_INTENT_ENGINE_URL` |
| `GET /api/insights/intent/:prospectId` | → Atlas intent engine | `ATLAS_V2_INTENT_ENGINE_URL` |
| `GET /api/insights/churn-risk/:prospectId` | → Atlas company twin | `ATLAS_V2_COMPANY_TWIN_URL` |
| `GET /api/insights/pipeline-summary` | → Atlas v2 forecast | `ATLAS_V2_FORECAST_URL` |
| `GET /api/insights/engagement/:leadId` | → Atlas person twin | `ATLAS_V2_PERSON_TWIN_URL` |

### 2.3 Replace `/api/dashboard` — Real Analytics

**File:** `src/routes/dashboard.js`

Replace mock data with Atlas dashboard aggregation:

| Endpoint | Replace With | Atlas Service |
|----------|-------------|--------------|
| `GET /api/dashboard/stats` | → Atlas gateway dashboard | `ATLAS_GATEWAY_URL/api/dashboard/summary` |
| `GET /api/dashboard/pipeline-chart` | → Atlas v2 pipeline | `ATLAS_V2_PIPELINE_URL` |
| `GET /api/dashboard/leaderboard` | → Atlas territory | `ATLAS_TERRITORY_URL` |

---

## Phase 3: Integrate Atlas v2 Core Layers

### 3.1 Add Atlas v2 Routes

**File:** `src/routes/atlasV2.js`

```javascript
// Atlas v2 Gateway Routes
const router = Router();

// Discover Layer (5150-5155)
router.use('/discover', atlasV2Routes(ATLAS_V2_DISCOVER_URL));
router.use('/contact-finder', atlasV2Routes(ATLAS_V2_CONTACT_FINDER_URL));

// Intelligence Layer (5156-5160)
router.use('/company-twin', atlasV2Routes(ATLAS_V2_COMPANY_TWIN_URL));
router.use('/person-twin', atlasV2Routes(ATLAS_V2_PERSON_TWIN_URL));
router.use('/research', atlasV2Routes(ATLAS_V2_RESEARCH_AGENT_URL));
router.use('/intent', atlasV2Routes(ATLAS_V2_INTENT_ENGINE_URL));

// Engage Layer (5161-5165)
router.use('/email', atlasV2Routes(ATLAS_V2_EMAIL_URL));
router.use('/whatsapp', atlasV2Routes(ATLAS_V2_WHATSAPP_URL));
router.use('/sms', atlasV2Routes(ATLAS_V2_SMS_URL));
router.use('/call', atlasV2Routes(ATLAS_V2_CALL_URL));

// AI Workforce (5174-5177)
router.use('/sdr-agent', atlasV2Routes(ATLAS_V2_SDR_AGENT_URL));
router.use('/qualification-agent', atlasV2Routes(ATLAS_V2_QUALIFICATION_AGENT_URL));
router.use('/meeting-agent', atlasV2Routes(ATLAS_V2_MEETING_AGENT_URL));

// Revenue OS (5180-5183)
router.use('/crm', atlasV2Routes(ATLAS_V2_CRM_CORE_URL));
router.use('/pipeline', atlasV2Routes(ATLAS_V2_PIPELINE_URL));
router.use('/forecast', atlasV2Routes(ATLAS_V2_FORECAST_URL));
router.use('/conversation-intel', atlasV2Routes(ATLAS_V2_CONVERSATION_INTEL_URL));
```

### 3.2 Consolidate AI SDR

**File:** `src/services/atlas/atlasSDR.js`

Replace `autonomousSDR.js` with Atlas v2 SDR agent:

```javascript
// Instead of internal SDR engine, delegate to Atlas SDR Agent
export async function startSDRWorkflow(config) {
  const response = await axios.post(`${ATLAS_V2_SDR_AGENT_URL}/api/workflow/start`, config);
  return response.data;
}

export async function getSDRWorkflowStatus(id) {
  const response = await axios.get(`${ATLAS_V2_SDR_AGENT_URL}/api/workflow/${id}/status`);
  return response.data;
}
```

### 3.3 Consolidate Lead Scoring

**File:** `src/services/atlas/atlasScoring.js`

Replace internal scoring with Atlas v1 Score + Atlas v2 Intent Engine:

```javascript
export async function scoreLead(leadId, leadData) {
  // 1. Get twin data
  const twin = await atlasGateway(ATLAS_TWIN_URL, `/api/merchants/${leadId}`);
  
  // 2. Get intent signals
  const intent = await atlasGateway(ATLAS_V2_INTENT_ENGINE_URL, `/api/intent/${leadId}`);
  
  // 3. Compute combined score
  const score = computeCompositeScore(twin.data, intent.data);
  
  return { score, twin: twin.data, intent: intent.data };
}
```

### 3.4 Replace Call Transcription

**File:** `src/routes/transcription.js`

Replace with Atlas v2 Conversation Intelligence:

```javascript
// Replace internal transcription with atlas-conversation-intel
router.post('/transcribe', async (req, res) => {
  const response = await axios.post(
    `${ATLAS_V2_CONVERSATION_INTEL_URL}/api/transcribe`,
    req.body
  );
  res.json(response.data);
});

router.post('/analyze', async (req, res) => {
  const response = await axios.post(
    `${ATLAS_V2_CONVERSATION_INTEL_URL}/api/analyze`,
    req.body
  );
  res.json(response.data);
});
```

---

## Phase 4: New Capabilities from Atlas

These features are NEW to Sales Mind — not replacements, additions.

### 4.1 Territory Management Module

**File:** `src/routes/territory.js`

```javascript
// NEW — Not in Sales Mind before
router.get('/', async (req, res) => {
  const response = await atlasGateway(ATLAS_TERRITORY_URL, '/api/territories');
  res.json(response.data);
});

router.post('/', async (req, res) => {
  const response = await axios.post(`${ATLAS_TERRITORY_URL}/api/territories`, req.body);
  res.json(response.data);
});

router.get('/:id/performance', async (req, res) => {
  const response = await atlasGateway(ATLAS_TERRITORY_URL, `/api/territories/${req.params.id}/performance`);
  res.json(response.data);
});

router.post('/balance', async (req, res) => {
  const response = await atlasGateway(ATLAS_TERRITORY_URL, '/api/territories/balance');
  res.json(response.data);
});
```

### 4.2 Route Optimization Module

**File:** `src/routes/routes.js`

```javascript
// NEW — Not in Sales Mind before
router.post('/optimize', async (req, res) => {
  const { stops, mode = 'driving' } = req.body;
  const response = await axios.post(`${ATLAS_ROUTES_URL}/api/routes/optimize`, { stops, mode });
  res.json(response.data);
});

router.get('/', async (req, res) => {
  const response = await atlasGateway(ATLAS_ROUTES_URL, '/api/routes');
  res.json(response.data);
});

router.post('/', async (req, res) => {
  const response = await axios.post(`${ATLAS_ROUTES_URL}/api/routes`, req.body);
  res.json(response.data);
});

router.patch('/:id/stops/:stopId', async (req, res) => {
  const response = await axios.patch(
    `${ATLAS_ROUTES_URL}/api/routes/${req.params.id}/stops/${req.params.stopId}`,
    req.body
  );
  res.json(response.data);
});
```

### 4.3 Map Intelligence Module

**File:** `src/routes/maps.js`

```javascript
// NEW — Not in Sales Mind before
router.get('/heat', async (req, res) => {
  const response = await atlasGateway(ATLAS_MAPS_URL, '/api/heat', { params: req.query });
  res.json(response.data);
});

router.get('/clusters', async (req, res) => {
  const response = await atlasGateway(ATLAS_MAPS_URL, '/api/clusters', { params: req.query });
  res.json(response.data);
});

router.get('/territory/:id', async (req, res) => {
  const response = await atlasGateway(ATLAS_MAPS_URL, `/api/territory/${req.params.id}`);
  res.json(response.data);
});
```

### 4.4 Opportunity Detection Module

**File:** `src/routes/opportunities.js`

```javascript
// NEW — Not in Sales Mind before
router.get('/', async (req, res) => {
  const response = await atlasGateway(ATLAS_SIGNALS_URL, '/api/opportunities', { params: req.query });
  res.json(response.data);
});

router.get('/stats', async (req, res) => {
  const response = await atlasGateway(ATLAS_SIGNALS_URL, '/api/opportunities/stats');
  res.json(response.data);
});

router.get('/competitors', async (req, res) => {
  const response = await atlasGateway(ATLAS_SIGNALS_URL, '/api/competitors', { params: req.query });
  res.json(response.data);
});

router.post('/enrich', async (req, res) => {
  const response = await axios.post(`${ATLAS_SIGNALS_URL}/api/enrich`, req.body);
  res.json(response.data);
});
```

### 4.5 Merchant Discovery Module

**File:** `src/routes/discover.js`

```javascript
// NEW — Not in Sales Mind before
router.get('/search', async (req, res) => {
  const response = await atlasGateway(ATLAS_DISCOVER_URL, '/api/search', { params: req.query });
  res.json(response.data);
});

router.get('/nearby', async (req, res) => {
  const response = await atlasGateway(ATLAS_DISCOVER_URL, '/api/nearby', { params: req.query });
  res.json(response.data);
});

router.get('/categories', async (req, res) => {
  const response = await atlasGateway(ATLAS_DISCOVER_URL, '/api/categories');
  res.json(response.data);
});

router.post('/sync/google-places', async (req, res) => {
  const response = await axios.post(`${ATLAS_DISCOVER_URL}/api/sync/google-places`, req.body);
  res.json(response.data);
});
```

### 4.6 Merchant Twin Module

**File:** `src/routes/twin.js`

```javascript
// NEW — Not in Sales Mind before
router.get('/:merchantId', async (req, res) => {
  const response = await atlasGateway(ATLAS_TWIN_URL, `/api/merchants/${req.params.merchantId}`);
  res.json(response.data);
});

router.get('/:merchantId/dashboard', async (req, res) => {
  const response = await atlasGateway(ATLAS_TWIN_URL, `/api/merchants/${req.params.merchantId}/dashboard`);
  res.json(response.data);
});

router.get('/:merchantId/performance', async (req, res) => {
  const response = await atlasGateway(ATLAS_TWIN_URL, `/api/merchants/${req.params.merchantId}/performance`);
  res.json(response.data);
});

router.get('/:merchantId/presence', async (req, res) => {
  const response = await atlasGateway(ATLAS_TWIN_URL, `/api/merchants/${req.params.merchantId}/presence`);
  res.json(response.data);
});

router.get('/:merchantId/reputation', async (req, res) => {
  const response = await atlasGateway(ATLAS_TWIN_URL, `/api/merchants/${req.params.merchantId}/reputation`);
  res.json(response.data);
});
```

### 4.7 AI Copilot Enhancement

**File:** `src/services/atlas/atlasCopilot.js`

Enhance existing copilot with Atlas copilot:

```javascript
// Delegate to Atlas copilot, supplement with Sales Mind copilot
export async function generatePitch(merchantId, product, channel) {
  // Primary: Atlas copilot
  const atlasResponse = await axios.post(`${ATLAS_COPILOT_URL}/api/pitch`, {
    merchantId, product, channel
  });
  
  if (atlasResponse.data.success) {
    return atlasResponse.data;
  }
  
  // Fallback: Sales Mind copilot
  return salesCopilot.generatePitch(merchantId, product, channel);
}

export async function summarizeMerchant(merchantId) {
  const atlasResponse = await atlasGateway(ATLAS_COPILOT_URL, '/api/summarize', {
    method: 'POST',
    data: { merchantId }
  });
  return atlasResponse.data;
}
```

### 4.8 CRM Consolidation (Atlas v2)

**File:** `src/routes/atlasCRM.js`

```javascript
// Replace internal CRM routes with Atlas v2 CRM Core
const router = Router();

// Accounts
router.get('/accounts', async (req, res) => {
  const response = await atlasGateway(ATLAS_V2_CRM_CORE_URL, '/api/accounts', { params: req.query });
  res.json(response.data);
});

router.post('/accounts', async (req, res) => {
  const response = await axios.post(`${ATLAS_V2_CRM_CORE_URL}/api/accounts`, req.body);
  res.json(response.data);
});

// Contacts
router.get('/contacts', async (req, res) => {
  const response = await atlasGateway(ATLAS_V2_CRM_CORE_URL, '/api/contacts', { params: req.query });
  res.json(response.data);
});

// Opportunities
router.get('/opportunities', async (req, res) => {
  const response = await atlasGateway(ATLAS_V2_CRM_CORE_URL, '/api/opportunities', { params: req.query });
  res.json(response.data);
});

router.post('/opportunities', async (req, res) => {
  const response = await axios.post(`${ATLAS_V2_CRM_CORE_URL}/api/opportunities`, req.body);
  res.json(response.data);
});
```

---

## Phase 5: Health Checks & Monitoring

### 5.1 Atlas Health Endpoint

**File:** `src/routes/atlasHealth.js`

```javascript
router.get('/health', async (req, res) => {
  const services = [
    { name: 'Atlas Discover', url: `${ATLAS_DISCOVER_URL}/health` },
    { name: 'Atlas Maps', url: `${ATLAS_MAPS_URL}/health` },
    { name: 'Atlas Twin', url: `${ATLAS_TWIN_URL}/health` },
    { name: 'Atlas Score', url: `${ATLAS_SCORE_URL}/health` },
    { name: 'Atlas Signals', url: `${ATLAS_SIGNALS_URL}/health` },
    { name: 'Atlas Territory', url: `${ATLAS_TERRITORY_URL}/health` },
    { name: 'Atlas Routes', url: `${ATLAS_ROUTES_URL}/health` },
    { name: 'Atlas Copilot', url: `${ATLAS_COPILOT_URL}/health` },
    { name: 'Atlas Graph', url: `${ATLAS_GRAPH_URL}/health` },
    { name: 'Atlas v2 CRM', url: `${ATLAS_V2_CRM_CORE_URL}/health` },
    { name: 'Atlas v2 SDR', url: `${ATLAS_V2_SDR_AGENT_URL}/health` },
  ];
  
  const results = await Promise.allSettled(
    services.map(s => axios.get(s.url, { timeout: 2000 }))
  );
  
  const status = services.map((s, i) => ({
    name: s.name,
    status: results[i].status === 'fulfilled' ? 'up' : 'down'
  }));
  
  const allUp = status.every(s => s.status === 'up');
  res.json({
    atlas: allUp ? 'healthy' : 'degraded',
    services: status,
    timestamp: new Date().toISOString()
  });
});
```

---

## Phase 6: Documentation

### 6.1 Create Atlas Module Documentation

**File:** `docs/ATLAS-MODULE.md`

Document all new endpoints, their Atlas service origins, and data models.

### 6.2 Update CLAUDE.md

Add the Atlas integration architecture to Sales Mind's developer documentation.

---

## Implementation Order

| Phase | Task | Effort | Risk |
|-------|------|--------|------|
| **1** | Create `atlas.js` route + `atlasGateway.js` service | Low | Low |
| **2** | Replace `/api/sales` mocks with real Atlas calls | Low | Low |
| **3** | Replace `/api/insights` mocks with Atlas v2 | Low | Low |
| **4** | Replace `/api/dashboard` mocks with Atlas | Low | Low |
| **5** | Add Territory Management routes | Low | Low |
| **6** | Add Route Optimization routes | Low | Low |
| **7** | Add Map Intelligence routes | Low | Low |
| **8** | Add Opportunity Detection routes | Low | Low |
| **9** | Add Merchant Discovery routes | Low | Low |
| **10** | Add Merchant Twin routes | Low | Low |
| **11** | Create Atlas v2 routes (`atlasV2.js`) | Medium | Medium |
| **12** | Consolidate SDR → Atlas v2 SDR Agent | Medium | Medium |
| **13** | Consolidate Call Transcription → Atlas v2 | Medium | Medium |
| **14** | Add CRM routes from Atlas v2 | Medium | Medium |
| **15** | Health check endpoint | Low | Low |
| **16** | Documentation | Low | Low |

**Total estimated phases: 16**
**Recommended batch: Phases 1-4 → Test → Phases 5-10 → Test → Phases 11-16**

---

## Files to Create/Modify

### Create (New Files)
```
src/routes/atlas.js              # Atlas gateway routes
src/routes/atlasV2.js            # Atlas v2 gateway routes
src/routes/atlasHealth.js        # Atlas health check
src/routes/territory.js          # Territory management
src/routes/routes.js             # Route optimization
src/routes/maps.js               # Map intelligence
src/routes/opportunities.js      # Opportunity detection
src/routes/discover.js           # Merchant discovery
src/routes/twin.js               # Merchant twin
src/routes/atlasCRM.js           # Atlas v2 CRM
src/services/atlas/
  atlasGateway.js                # Reusable proxy service
  atlasSDR.js                   # Atlas SDR wrapper
  atlasScoring.js                # Atlas scoring wrapper
  atlasCopilot.js               # Atlas copilot wrapper
docs/ATLAS-MODULE.md             # Documentation
```

### Modify (Existing Files)
```
src/index.js                     # Register atlas routes
.env                             # Add Atlas service URLs
CLAUDE.md                        # Update architecture docs
```

---

## Testing Strategy

1. **Unit test** each route module independently
2. **Integration test** Atlas gateway with mock Atlas services
3. **E2E test** full flow: discover merchant → score → twin → opportunity → route → CRM
4. **Load test** gateway proxy overhead (should be < 50ms per call)

---

## Rollout Plan

1. **Phase 1-4 first** — Replace mocks, minimal new code, immediate value
2. **Deploy to staging** — Test all Atlas service connections
3. **Phase 5-10** — Add new capabilities, test in parallel
4. **Phase 11-14** — Atlas v2 integration, more complex
5. **Production rollout** — Feature flag each Atlas service
