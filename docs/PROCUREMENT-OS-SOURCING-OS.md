# SourcingOS - Implementation Guide

**Part of:** ProcurementOS Complete Build Plan  
**Version:** 1.0  
**Date:** July 1, 2026  
**Status:** Ready to Build

---

## Overview

SourcingOS is where companies decide what to buy, from whom, under what terms, and why.

```
SourcingOS
=
SAP Ariba Sourcing
+ Jaggaer Strategic Sourcing
+ Coupa Sourcing
+ GEP SMART
+ Global Nexha Discovery
+ SUTAR Negotiation Agents
+ TwinOS
```

---

## Architecture

```
SourcingOS
├── 2.1 RequirementOS           → Intent understanding
├── 2.2 CategoryOS              → Category management
├── 2.3 Discovery Engine        → Supplier search
├── 2.4 RFQOS                  → Request for quotes
├── 2.5 RFPOS                  → Request for proposals
├── 2.6 AuctionOS               → Reverse auctions
├── 2.7 NegotiationOS          → AI-powered negotiation
├── 2.8 Market Intelligence     → Pricing, trends
├── 2.9 Strategic Sourcing     → Long-term optimization
├── 2.10 Cost Intelligence     → Total cost analysis
├── 2.11 Collaboration         → Supplier workspace
├── 2.12 Simulation Engine      → What-if scenarios
├── 2.13 Global Nexha          → Federation discovery
└── 2.14 Autonomous Workforce → AI sourcing agents
```

---

## Core Data Models

### Requirement

```typescript
interface SourcingRequirement {
  id: string;
  
  title: string;
  description: string;
  
  category: string;
  subcategory?: string;
  
  // Specifications
  specifications: {
    technical?: string;
    quality?: string;
    compliance?: string[];
  };
  
  // Quantity & Budget
  quantity: number;
  unit: string;
  
  budget?: {
    min?: number;
    max?: number;
    target?: number;
    currency: string;
  };
  
  // Timeline
  deliveryRequiredBy?: Date;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  
  // Approval
  approvalStatus: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: Date;
  
  // Status
  status: 'draft' | 'active' | 'sourcing' | 'negotiating' | 'awarded' | 'cancelled';
  
  // Results
  selectedSupplierId?: string;
  awardedValue?: number;
  
  createdBy: string;
  createdAt: Date;
}
```

### RFQ

```typescript
interface RFQ {
  id: string;
  
  title: string;
  requirementId: string;
  
  category: string;
  
  items: RFQItem[];
  
  // Timeline
  biddingStart: Date;
  biddingEnds: Date;
  
  // Suppliers
  invitedSuppliers: string[];
  publicRFQ: boolean;
  
  // Bids
  bids: Bid[];
  bidCount: number;
  
  // Status
  status: 'draft' | 'published' | 'bidding' | 'evaluation' | 'awarded' | 'cancelled';
  
  // Award
  winner?: {
    supplierId: string;
    totalValue: number;
    terms: string[];
  };
  
  createdBy: string;
  createdAt: Date;
}

interface RFQItem {
  lineNumber: number;
  
  description: string;
  
  quantity: number;
  unit: string;
  
  specifications?: string;
  
  requiredDeliveryDate?: Date;
  
  targetPrice?: number;
  maxPrice?: number;
}

interface Bid {
  id: string;
  supplierId: string;
  supplierName: string;
  
  status: 'draft' | 'submitted' | 'under_review' | 'shortlisted' | 'won' | 'lost';
  
  pricing: {
    items: {
      lineNumber: number;
      unitPrice: number;
      totalPrice: number;
      currency: string;
    }[];
    subtotal: number;
    taxes: number;
    total: number;
  };
  
  delivery: {
    leadTimeDays: number;
    deliveryDate: Date;
    terms: 'exw' | 'fob' | 'cif' | 'dap' | 'ddp';
  };
  
  paymentTerms: string;
  
  validityDays: number;
  
  documents: {
    name: string;
    url: string;
  }[];
  
  score?: number;
  evaluationNotes?: string;
  
  submittedAt?: Date;
}
```

### Negotiation

```typescript
interface NegotiationSession {
  id: string;
  
  type: 'price' | 'contract' | 'volume' | 'terms';
  
  requirementId?: string;
  rfqId?: string;
  
  parties: {
    buyer: {
      companyId: string;
      agentId?: string;
    };
    supplier: {
      supplierId: string;
      agentId?: string;
    };
  };
  
  variables: NegotiationVariable[];
  
  currentRound: number;
  maxRounds: number;
  
  status: 'proposed' | 'countered' | 'accepted' | 'rejected' | 'expired' | 'cancelled';
  
  history: NegotiationRound[];
  
  agreement?: {
    terms: Record<string, any>;
    acceptedBy: string[];
    signedAt?: Date;
    contractId?: string;
  };
  
  createdAt: Date;
  expiresAt?: Date;
}

interface NegotiationVariable {
  name: string;
  type: 'price' | 'quantity' | 'delivery' | 'payment' | 'warranty' | 'penalty' | 'other';
  
  buyerTarget: any;
  buyerWalkaway?: any;
  
  supplierPosition?: any;
  supplierTarget?: any;
  supplierWalkaway?: any;
  
  currentValue: any;
  
  weight: number;  // 1-10 importance
}

interface NegotiationRound {
  round: number;
  
  buyerPosition: Record<string, any>;
  supplierPosition?: Record<string, any>;
  
  gapAnalysis?: {
    variable: string;
    buyerValue: any;
    supplierValue: any;
    gap: any;
  }[];
  
  aiRecommendation?: {
    suggestedMove: Record<string, any>;
    rationale: string;
    risk: 'low' | 'medium' | 'high';
  };
  
  timestamp: Date;
}
```

---

## API Endpoints

### Requirements

```
GET    /requirements                  # List
POST   /requirements                 # Create
GET    /requirements/:id             # Get
PUT    /requirements/:id              # Update
DELETE /requirements/:id             # Cancel

POST   /requirements/:id/approve      # Approve
POST   /requirements/:id/submit      # Submit for sourcing
```

### RFQs

```
GET    /rfqs                         # List
POST   /rfqs                         # Create
GET    /rfqs/:id                     # Get
PUT    /rfqs/:id                     # Update
POST   /rfqs/:id/publish            # Publish
POST   /rfqs/:id/invite             # Invite suppliers
POST   /rfqs/:id/cancel             # Cancel

GET    /rfqs/:id/bids               # List bids
GET    /rfqs/:id/bids/:bidId        # Get bid
POST   /rfqs/:id/bids/:bidId/evaluate
POST   /rfqs/:id/bids/:bidId/shortlist
POST   /rfqs/:id/award              # Award to winner
```

### Negotiations

```
GET    /negotiations                 # List
POST   /negotiations                 # Create
GET    /negotiations/:id             # Get
PUT    /negotiations/:id             # Update

POST   /negotiations/:id/counter     # Counter-offer
POST   /negotiations/:id/accept     # Accept terms
POST   /negotiations/:id/reject      # Reject
POST   /negotiations/:id/expire      # Expire
```

### Discovery

```
POST   /discover/suppliers          # Global Nexha search
POST   /discover/capabilities      # Search by capabilities
POST   /discover/benchmark          # Price benchmarking
```

---

## Module Implementations

### Module 2.3: Discovery Engine (8 days)

**Location:** `sourcing-os/discovery/`

```typescript
// Global Nexha supplier discovery
interface DiscoveryService {
  
  async search(params: SearchParams): Promise<DiscoveryResult[]> {
    const { query, filters } = params;
    
    // 1. Search internal suppliers
    const internal = await this.searchInternal(query, filters);
    
    // 2. Search Global Nexha federation
    const federation = await nexha.search({
      type: 'supplier',
      query: query,
      filters: {
        ...filters,
        federationOnly: filters.federationOnly ?? false,
      },
    });
    
    // 3. Rank and score
    const results = this.rankResults([...internal, ...federation]);
    
    return results;
  }
  
  async searchByCapability(params: CapabilitySearch): Promise<Supplier[]> {
    return await twinOS.query({
      capabilities: {
        products: { includes: params.productCategory },
        manufacturing: {
          monthlyCapacity: { gte: params.minCapacity },
        },
        certifications: { includes: params.requiredCertifications },
      },
    });
  }
}
```

### Module 2.7: NegotiationOS (12 days)

**Location:** `sourcing-os/negotiation/`

**This is the key differentiator with SUTAR integration.**

```typescript
// AI-powered negotiation
interface NegotiationService {
  
  async createSession(params: CreateSessionParams): Promise<NegotiationSession> {
    const session = {
      id: generateId(),
      type: params.type,
      parties: params.parties,
      variables: params.variables,
      currentRound: 0,
      maxRounds: params.maxRounds ?? 5,
      status: 'proposed',
      history: [],
      createdAt: new Date(),
      expiresAt: params.expiresAt,
    };
    
    // Register with SUTAR for AI agents
    if (params.useAIAgents) {
      await sutar.registerAgents({
        buyer: 'buyer-ai',
        supplier: 'supplier-agent',
      });
    }
    
    return session;
  }
  
  async runNegotiationRound(
    sessionId: string,
    buyerPosition: Record<string, any>
  ): Promise<NegotiationResult> {
    
    const session = await this.getSession(sessionId);
    
    // 1. Record buyer position
    session.history.push({
      round: session.currentRound + 1,
      buyerPosition,
      timestamp: new Date(),
    });
    
    // 2. AI analysis
    const aiAnalysis = await this.analyzePosition(session);
    
    // 3. Supplier counter (AI or manual)
    let supplierCounter;
    if (session.parties.supplier.agentId) {
      supplierCounter = await this.getAISupplierCounter(session);
    }
    
    // 4. Gap analysis
    const gapAnalysis = this.calculateGap(session);
    
    // 5. Check for agreement
    const agreement = this.checkAgreement(session);
    
    if (agreement.agreed) {
      session.status = 'accepted';
      session.agreement = agreement.terms;
    } else if (session.currentRound >= session.maxRounds) {
      session.status = 'expired';
    } else {
      session.currentRound++;
    }
    
    return {
      session,
      aiAnalysis,
      supplierCounter,
      gapAnalysis,
      agreement,
    };
  }
  
  async analyzePosition(session: NegotiationSession): Promise<AIAnalysis> {
    const history = session.history;
    const variables = session.variables;
    
    return await ai.analyze({
      type: 'negotiation',
      history: history,
      variables: variables,
      
      questions: [
        'What is the optimal next move?',
        'What are the BATNA options?',
        'What is the supplier most likely to accept?',
        'What are the risks of walking away?',
      ],
    });
  }
}
```

### Module 2.8: Market Intelligence (6 days)

**Location:** `sourcing-os/market-intelligence/`

```typescript
interface MarketIntelligenceService {
  
  async getCategoryInsights(category: string): Promise<CategoryInsights> {
    return {
      category,
      
      pricing: await this.getPricingData(category),
      demand: await this.getDemandData(category),
      suppliers: await this.getSupplierData(category),
      trends: await this.analysisTrends(category),
      forecasts: await this.getForecasts(category),
      risks: await this.analysisRisks(category),
    };
  }
  
  async getBenchmark(params: BenchmarkParams): Promise<BenchmarkResult> {
    const { product, region, quantity } = params;
    
    // 1. Get historical prices
    const history = await this.getPriceHistory(product, region);
    
    // 2. Get current market prices
    const current = await this.getCurrentPrices(product, region);
    
    // 3. Calculate benchmarks
    const benchmarks = {
      lowest: Math.min(...current.map(p => p.price)),
      average: this.average(current.map(p => p.price)),
      median: this.median(current.map(p => p.price)),
      percentile25: this.percentile(current, 25),
      percentile75: this.percentile(current, 75),
    };
    
    // 4. AI recommendation
    const recommendation = await ai.analyze({
      type: 'pricing_benchmark',
      data: { benchmarks, history, quantity },
      questions: [
        'What is the fair price for this quantity?',
        'Should we wait for better prices?',
        'Who are the best suppliers at this price point?',
      ],
    });
    
    return { benchmarks, recommendation };
  }
}
```

### Module 2.12: Simulation Engine (5 days)

**Location:** `sourcing-os/simulation/`

```typescript
interface SimulationService {
  
  async simulate(params: SimulationParams): Promise<SimulationResult> {
    const { scenario, variables } = params;
    
    const results: SimulationResult = {
      scenario,
      variables,
      outcomes: [],
      recommendations: [],
    };
    
    // Run simulations
    switch (scenario) {
      case 'single_vs_multiple':
        results.outcomes = await this.simulateSingleVsMultiple(variables);
        break;
      case 'local_vs_import':
        results.outcomes = await this.simulateLocalVsImport(variables);
        break;
      case 'price_increase':
        results.outcomes = await this.simulatePriceIncrease(variables);
        break;
      case 'supplier_failure':
        results.outcomes = await this.simulateSupplierFailure(variables);
        break;
      case 'demand_surge':
        results.outcomes = await this.simulateDemandSurge(variables);
        break;
    }
    
    // AI recommendations
    results.recommendations = await this.generateRecommendations(results.outcomes);
    
    return results;
  }
  
  async simulateSingleVsMultiple(variables: {
    supplierA: SupplierProfile;
    supplierB?: SupplierProfile;
    quantity: number;
    duration: number;
  }): Promise<ScenarioOutcome[]> {
    
    const outcomes: ScenarioOutcome[] = [];
    
    // Single supplier A
    outcomes.push({
      scenario: 'single_supplier_a',
      totalCost: variables.quantity * variables.supplierA.price * variables.duration,
      risk: 'high',
      backupPlan: 'None - critical dependency',
    });
    
    // Split A/B
    if (variables.supplierB) {
      outcomes.push({
        scenario: 'split_60_40',
        totalCost: (variables.quantity * 0.6 * variables.supplierA.price * variables.duration) +
                  (variables.quantity * 0.4 * variables.supplierB.price * variables.duration),
        risk: 'medium',
        backupPlan: 'Can shift to A if B fails',
      });
    }
    
    return outcomes;
  }
}
```

### Module 2.14: Autonomous Workforce (6 days)

**Location:** `sourcing-os/workforce/`

```typescript
const SOURCING_AI_WORKERS = {
  
  'chief-sourcing-officer': {
    id: 'ai-chief-sourcing-officer',
    name: 'AI Chief Sourcing Officer',
    department: 'sourcing-os',
    level: 'executive',
    
    capabilities: [
      'sourcing_strategy',
      'supplier_network_optimization',
      'cost_optimization',
      'risk_management',
      'executive_reporting',
    ],
    
    memory: {
      categoryStrategies: 'permanent',
      negotiationOutcomes: '2y',
      supplierRelationships: 'permanent',
    },
    
    reports: ['category-managers', 'strategic-buyers'],
  },
  
  'category-manager': {
    id: 'ai-category-manager',
    name: 'AI Category Manager',
    department: 'sourcing-os',
    level: 'senior',
    
    capabilities: [
      'category_strategy',
      'market_intelligence',
      'supplier_segmentation',
      'risk_assessment',
      'contract_optimization',
    ],
    
    skills: ['category_analysis', 'supplier_scoring', 'pricing_models'],
    
    memory: {
      categoryMarkets: 'weekly',
      supplierProfiles: 'monthly',
      contractHistory: 'permanent',
    },
  },
  
  'strategic-buyer': {
    id: 'ai-strategic-buyer',
    name: 'AI Strategic Buyer',
    department: 'sourcing-os',
    level: 'senior',
    
    capabilities: [
      'supplier_discovery',
      'rfq_management',
      'negotiation',
      'contract_drafting',
      'relationship_management',
    ],
    
    skills: ['supplier_evaluation', 'negotiation_tactics', 'contract_terms'],
    
    memory: {
      negotiations: '2y',
      supplierInteractions: '1y',
      pricingHistory: 'permanent',
    },
  },
  
  'rfq-manager': {
    id: 'ai-rfq-manager',
    name: 'AI RFQ Manager',
    department: 'sourcing-os',
    level: 'mid',
    
    capabilities: [
      'rfq_creation',
      'bid_collection',
      'bid_evaluation',
      'comparison_analysis',
      'award_recommendation',
    ],
  },
  
  'negotiation-agent': {
    id: 'ai-negotiation-agent',
    name: 'AI Negotiation Agent',
    department: 'sourcing-os',
    level: 'senior',
    
    capabilities: [
      'price_negotiation',
      'terms_optimization',
      'batna_analysis',
      'game_theory',
      'win_win_optimization',
    ],
    
    skills: ['pricing_models', 'supplier_psychology', 'contract_terms'],
    
    tools: [
      'market_intelligence',
      'supplier_database',
      'pricing_benchmark',
      'sutar_negotiation_engine',
    ],
  },
  
  'market-analyst': {
    id: 'ai-market-analyst',
    name: 'AI Market Analyst',
    department: 'sourcing-os',
    level: 'mid',
    
    capabilities: [
      'pricing_analysis',
      'demand_forecasting',
      'trend_detection',
      'risk_identification',
      'opportunity_detection',
    ],
  },
  
  'discovery-agent': {
    id: 'ai-discovery-agent',
    name: 'AI Supplier Discovery Agent',
    department: 'sourcing-os',
    level: 'mid',
    
    capabilities: [
      'supplier_search',
      'capability_matching',
      'qualification_scoring',
      'verification',
    ],
    
    tools: [
      'nexha_network',
      'web_search',
      'company_databases',
      'verification_services',
    ],
  },
};
```

---

## Effort Estimate

| Module | Days | Priority |
|--------|------|----------|
| 2.1 RequirementOS | 5 | P0 |
| 2.2 CategoryOS | 4 | P0 |
| 2.3 Discovery Engine | 8 | P0 |
| 2.4 RFQOS | 8 | P0 |
| 2.5 RFPOS | 6 | P1 |
| 2.6 AuctionOS | 6 | P1 |
| 2.7 NegotiationOS | 12 | P0 |
| 2.8 Market Intelligence | 6 | P1 |
| 2.9 Strategic Sourcing | 5 | P1 |
| 2.10 Cost Intelligence | 5 | P1 |
| 2.11 Collaboration | 4 | P2 |
| 2.12 Simulation Engine | 5 | P1 |
| 2.13 Global Nexha | 6 | P0 |
| 2.14 Autonomous Workforce | 6 | P0 |
| **Total** | **86 days** | **17 weeks** |

---

## Dependencies

| Dependency | Module | Status |
|------------|--------|--------|
| SupplierOS | 2.3, 2.4 | ✅ Ready |
| TwinOS | 2.3, 2.12 | ✅ Ready |
| MemoryOS | 2.7, 2.8 | ✅ Ready |
| SUTAR OS | 2.7, 2.14 | ✅ Ready |
| Nexha | 2.3, 2.13 | ✅ Ready |
| ContractOS | 2.7 | ⏳ Later |

---

## File Structure

```
sourcing-os/
├── src/
│   ├── index.ts                    # Main router
│   ├── requirements/
│   │   ├── routes.ts
│   │   ├── services/
│   │   │   └── requirement.service.ts
│   │   └── models/
│   ├── categories/
│   │   └── ...
│   ├── discovery/
│   │   └── ...
│   ├── rfq/
│   │   └── ...
│   ├── negotiation/
│   │   ├── routes.ts
│   │   ├── services/
│   │   │   ├── negotiation.service.ts
│   │   │   └── ai-negotiation.service.ts
│   │   └── ...
│   ├── market-intelligence/
│   ├── strategic-sourcing/
│   ├── simulation/
│   ├── workforce/
│   │   └── workers.ts             # AI worker definitions
│   └── __tests__/
│       ├── negotiation.test.ts
│       ├── discovery.test.ts
│       └── ...
├── package.json
└── README.md
```

---

*Implementation Guide Version: 1.0*
*Created: July 1, 2026*
