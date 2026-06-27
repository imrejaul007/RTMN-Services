# Supply Chain Risk Observatory — Product Specification

**Version:** 1.0  
**Date:** June 28, 2026  
**Product:** P1 (Phase 3)  
**Estimated Build:** ₹55L / 9 weeks  
**ARR Potential:** ₹2.4Cr

---

## 1. Concept & Vision

**What it is:** An AI-powered supply chain risk monitoring platform that provides real-time visibility into supplier health, predicts disruptions before they happen, and suggests alternative sourcing automatically.

**What it does:**
- Monitors 100+ risk signals across your supply chain
- Predicts supplier failures 30-60 days in advance
- Recommends alternative suppliers when risks emerge
- Provides early warning for geopolitical, weather, and market disruptions
- Automates risk mitigation workflows

**The feeling:** Like having a 24/7 intelligence operation for your supply chain — knowing about problems before they become crises and having options ready when they do.

---

## 2. Problem Statement

- 60% of companies have no visibility beyond Tier 1 suppliers
- Average disruption costs ₹2-10Cr for mid-size manufacturers
- 80% of disruptions are predictable with proper monitoring
- Manual supplier monitoring takes 40+ hours/week
- Recovery time averages 3-6 weeks without alternatives

---

## 3. Product Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                 SUPPLY CHAIN RISK OBSERVATORY                      │
├─────────────────────────────────────────────────────────────────┤
│  DATA SOURCES                                                   │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │ Supplier│ │ Weather │ │GeoPolitical│ │ Market │ │ Social │   │
│  │ Data    │ │ Events  │ │ News    │ │ Indices │ │ Media  │   │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └───┬────┘   │
│       └────────────┴───────────┴───────────┴───────────┘           │
│                           ↓                                        │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    RISK ENGINE                               │ │
│  │  Signal Processing │ Risk Scoring │ Prediction │ Alerting      │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                           ↓                                        │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                 ALTERNATIVE SOURCING                         │ │
│  │  Supplier Discovery │ Qualification │ Comparison │ Contract    │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                           ↓                                        │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    DASHBOARD & APPS                          │ │
│  │  Risk Dashboard │ Supplier Portal │ Procurement Tools        │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Core Features

### 4.1 Supply Chain Mapping (P0)

| Feature | Description |
|---------|-------------|
| Multi-tier Visibility | Map to Tier N suppliers |
| Dependency Analysis | Identify critical path dependencies |
| Geographic Risk | Map suppliers by location |
| Product-bill-of-materials | Link suppliers to SKUs |
| Alternative Paths | Multiple sourcing routes |

**Tier Visibility:**
```
Tier 1: Direct suppliers (you have contracts)
  ↓
Tier 2: Your suppliers' suppliers (influence only)
  ↓
Tier 3: Critical raw material sources (industry knowledge)
```

### 4.2 Risk Monitoring (P0)

**Risk Categories & Signals:**

| Category | Signals Monitored |
|----------|-------------------|
| Financial | Credit ratings, bankruptcy filings, payment delays |
| Operational | Capacity utilization, quality issues, delivery delays |
| Geopolitical | Trade restrictions, sanctions, political instability |
| Environmental | Natural disasters, climate events, resource scarcity |
| Market | Price volatility, demand shifts, commodity trends |
| Social | Labor disputes, worker safety, community issues |
| Cyber | Data breaches, system outages, ransomware |

**Risk Scoring Formula:**
```
Supplier Risk Score = Σ(category_weight × signal_score × confidence)

Category Weights (configurable):
├── Financial: 25%
├── Operational: 25%
├── Geopolitical: 20%
├── Environmental: 15%
├── Market: 10%
└── Social: 5%

Signal Score: 0-100 (anomaly magnitude)
Confidence: 0-100% (data reliability)
```

### 4.3 Predictive Analytics (P0)

**ML Models:**

| Model | Purpose | Prediction Horizon |
|-------|---------|------------------|
| Failure Predictor | Supplier default/quit | 30-60 days |
| Delay Predictor | Shipment delays | 7-14 days |
| Price Predictor | Commodity price moves | 30-90 days |
| Demand Shift | Market demand changes | 30-60 days |
| Disruption Scorer | Global events impact | 24-72 hours |

**Prediction Engine:**
```python
def predict_failure(supplier_id):
    signals = collect_signals(supplier_id)
    
    # Financial health
    financial_score = ml_model.financial_risk(signals)
    
    # Operational health
    operational_score = ml_model.operational_risk(signals)
    
    # Sentiment analysis
    sentiment_score = nlp.analyze_news_sentiment(supplier_id)
    
    # Historical patterns
    historical_score = pattern_match(supplier_id)
    
    # Weighted ensemble
    risk_score = (
        0.30 * financial_score +
        0.30 * operational_score +
        0.25 * sentiment_score +
        0.15 * historical_score
    )
    
    return {
        'supplier_id': supplier_id,
        'risk_score': risk_score,
        'confidence': calculate_confidence(signals),
        'top_risks': identify_top_risks(signals),
        'recommended_actions': suggest_actions(risk_score)
    }
```

### 4.4 Alternative Sourcing (P0)

**Auto-Sourcing Workflow:**
1. Risk alert triggers sourcing need
2. Match requirements to supplier database
3. Score and rank alternatives
4. Auto-initiate qualification
5. Negotiate via SUTAR
6. Onboard if selected

**Supplier Matching:**
- Location/geography
- Capacity availability
- Certification match
- Quality track record
- Price competitiveness
- Risk profile

### 4.5 Early Warning System (P1)

| Alert Type | Trigger | Response Time |
|------------|---------|--------------|
| Critical | Immediate threat | 15 minutes |
| High | Significant risk | 1 hour |
| Medium | Moderate concern | 24 hours |
| Low | Watch list | Weekly digest |

**Alert Channels:**
- Dashboard notification
- Email digest
- SMS for critical
- Slack/Teams integration
- API webhook
- Mobile push

### 4.6 Scenario Planning (P1)

**What-If Analysis:**
- "What if our top supplier shuts down?"
- "What if this region has a natural disaster?"
- "What if a key commodity doubles in price?"

**Simulation Engine:**
- Monte Carlo simulations
- Historical scenario replay
- Stress testing
- Recovery path optimization

---

## 5. AI Agents

### 5.1 Risk Monitor Agent
- Continuously scans all data sources
- Updates risk scores in real-time
- Triggers alerts based on thresholds
- Learns from false positives

### 5.2 Supplier Scout Agent
- Discovers alternative suppliers
- Pre-qualifies based on criteria
- Negotiates initial terms
- Accelerates onboarding

### 5.3 Disruption Response Agent
- Activated when disruption occurs
- Coordinates response workflow
- Allocates resources
- Communicates to stakeholders
- Tracks recovery

### 5.4 Compliance Monitor Agent
- Tracks regulatory changes
- Alerts on compliance impacts
- Maintains audit trail
- Generates compliance reports

---

## 6. Data Model

```typescript
interface SupplyChainRiskTwin {
  id: string;
  organizationId: string;
  
  // Supply Chain Map
  supplyChain: {
    tiers: SupplierTier[];
    products: ProductBOM[];
    routes: SourcingRoute[];
  };
  
  // Risk State
  riskState: {
    overall: number;
    tier1Risk: number;
    tier2Risk: number;
    geographicRisk: Map<string, number>;
    categoryRisks: Map<RiskCategory, number>;
  };
  
  // Suppliers
  suppliers: Supplier[];
  
  // Alerts
  alerts: Alert[];
  
  // Scenarios
  scenarios: Scenario[];
  
  // Timestamps
  updatedAt: Date;
}

interface Supplier {
  id: string;
  name: string;
  tier: number;
  location: {
    country: string;
    region: string;
    city: string;
  };
  
  financial: {
    creditScore: number;
    paymentHistory: PaymentRecord[];
    revenue: FinancialMetric;
  };
  
  operational: {
    qualityScore: number;
    onTimeRate: number;
    capacityUtilization: number;
    leadTime: LeadTimeMetric;
  };
  
  risk: {
    overall: number;
    financial: number;
    operational: number;
    geopolitical: number;
    environmental: number;
    market: number;
    social: number;
  };
  
  relationships: {
    products: string[];  // Product IDs
    alternatives: string[];  // Alternative supplier IDs
    criticality: 'critical' | 'important' | 'standard';
  };
}

interface Alert {
  id: string;
  type: 'critical' | 'high' | 'medium' | 'low';
  category: RiskCategory;
  supplierId?: string;
  region?: string;
  commodity?: string;
  
  trigger: {
    signal: string;
    value: number;
    threshold: number;
  };
  
  impact: {
    affectedProducts: string[];
    estimatedLoss: FinancialImpact;
    timeToImpact: string;
  };
  
  recommendedActions: Action[];
  
  status: 'new' | 'acknowledged' | 'mitigating' | 'resolved';
  createdAt: Date;
}
```

---

## 7. API Endpoints

### Supply Chain
```
GET           /api/supply-chain/map
GET           /api/supply-chain/suppliers
POST          /api/supply-chain/suppliers
GET           /api/supply-chain/suppliers/:id
PUT           /api/supply-chain/suppliers/:id
GET           /api/supply-chain/tiers
```

### Risk Monitoring
```
GET           /api/risk/dashboard
GET           /api/risk/suppliers/:id/score
GET           /api/risk/suppliers/:id/signals
GET           /api/risk/geographic
GET           /api/risk/categories/:category
GET           /api/risk/trends
```

### Alerts
```
GET           /api/alerts
POST          /api/alerts
GET           /api/alerts/:id
PUT           /api/alerts/:id/status
POST          /api/alerts/:id/acknowledge
POST          /api/alerts/:id/mitigate
```

### Alternative Sourcing
```
POST          /api/sourcing/search
GET           /api/sourcing/suppliers/:id/alternatives
POST          /api/sourcing/qualify
POST          /api/sourcing/negotiate
```

### Predictive Analytics
```
GET           /api/ai/predictions/suppliers
GET           /api/ai/predictions/suppliers/:id/failure
GET           /api/ai/predictions/disruptions
POST          /api/ai/predictions/scenario
GET           /api/ai/predictions/price-forecast
```

### Scenarios
```
GET           /api/scenarios
POST          /api/scenarios
GET           /api/scenarios/:id
POST          /api/scenarios/:id/run
GET           /api/scenarios/:id/results
```

---

## 8. Data Sources

### 8.1 Internal Data

| Source | Data Provided |
|--------|--------------|
| ERP (SAP/Oracle) | Purchase orders, invoices, deliveries |
| Supplier Portal | Quality scores, capacity reports |
| Logistics | Shipment tracking, delays |
| Quality Systems | Defect rates, returns |
| Finance | Payment history, credit data |

### 8.2 External Data

| Source | Refresh | Data |
|--------|---------|------|
| News APIs | Hourly | Supplier mentions, events |
| Weather Services | Real-time | Storms, disasters |
| Credit Bureaus | Daily | Financial health |
| Trade Data | Daily | Shipping, customs |
| Social Media | Real-time | Sentiment, issues |
| Government | Weekly | Regulations, sanctions |
| Commodity Markets | Real-time | Price indices |

---

## 9. Dashboard Screens

### 9.1 Risk Command Center

```
┌─────────────────────────────────────────────────────────────────┐
│  Supply Chain Risk Observatory                    [Alert: 12]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Overall Risk Score                                             │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    ████████████████░░░░░░░  72/100        ││
│  │                              MODERATE RISK                 ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  Risk by Category     │  Tier 1 Supplier Health                  │
│  ┌────────────────┐  │  ┌───────────────────────────────────┐  │
│  │ Financial  ████ │  │  │ ● Critical (15): 12 🟢 3 🟡     │  │
│  │ Operational████ │  │  │ ● Important (45): 38 🟢 7 🟡    │  │
│  │ GeoPoly  ███░░ │  │  │ ● Standard (120): 115 🟢 5 🟡   │  │
│  │ Environ  ██░░░░ │  │  └───────────────────────────────────┘  │
│  │ Market   █░░░░░ │  │                                        │
│  └────────────────┘  │  Geographic Risk Map                     │
│                       │  ┌───────────────────────────────────┐  │
│                       │  │ [India] ████ 45 🟢 🟡 🟠 🟢 🟢    │  │
│                       │  │ [China] █████ 78 🟠 🟠 🟠 🟠 🟠    │  │
│                       │  │ [Vietnam]███░░ 52 🟡 🟡 🟡 🟡 🟢  │  │
│                       │  └───────────────────────────────────┘  │
│                                                                 │
│  Active Alerts                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 🔴 CRITICAL: Supplier "ABC Corp" bankruptcy filing       │  │
│  │    Impact: 3 products | Loss: ₹2.5Cr | Action: Urgent    │  │
│  │ 🟠 HIGH: Typhoon approaching Vietnam | ETA: 5 days         │  │
│  │    Impact: 12 suppliers | Action: Stock up now           │  │
│  │ 🟡 MEDIUM: Steel prices up 15% | May impact Q3 costs     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 10. Success Metrics

| Metric | Target |
|--------|--------|
| Risk prediction accuracy | 85% |
| Average warning time | 30+ days |
| Disruption recovery time | -50% |
| Alternative supplier readiness | 90% |
| Cost of disruptions | -60% |
| Supply chain visibility | 100% Tier 1 |

---

## 11. Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js + Python |
| Database | PostgreSQL, Neo4j (graph) |
| ML | TensorFlow, PyTorch |
| Real-time | Kafka, Redis |
| Visualization | React + D3.js |
| Mobile | React Native |

---

## 12. Team & Timeline

| Role | Count |
|------|-------|
| Tech Lead | 1 |
| Backend Developer | 2 |
| ML Engineer | 2 |
| Data Engineer | 1 |
| Frontend Developer | 1 |

**Duration:** 9 weeks  
**Investment:** ₹55L

---

## 13. Go-to-Market

### Phase 1: Pilot (Month 1-2)
- 3 manufacturing companies
- 50 suppliers monitored
- Internal data integration

### Phase 2: Expansion (Month 3-5)
- 15 companies
- 500 suppliers
- External data feeds

### Phase 3: Scale (Month 5-9)
- 100 companies
- Multi-industry
- Auto-sourcing integration

### Revenue Model
- SaaS per supplier/month: ₹500-2,000
- Risk report add-on: ₹10,000/month
- Alternative sourcing: Transaction fee
- API access: Usage-based

---

*Spec created: June 28, 2026*
