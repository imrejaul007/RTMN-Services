# Franchise AI Manager — Product Specification

**Version:** 1.0 | **Date:** June 28, 2026 | **Product:** P2 (Phase 4) | **Build:** ₹35L / 7 weeks | **ARR:** ₹1.5Cr

---

## 1. Concept & Vision

**What it is:** AI-powered franchise operations management connecting franchisors and franchisees — standardizing brand operations, optimizing multi-location performance, and enabling data-driven growth.

**What it does:**
- Centralized operations dashboard for all locations
- Brand compliance monitoring
- Performance benchmarking
- Inventory and supply chain coordination
- Centralized ordering and procurement

---

## 2. Problem Statement

- 60% of franchise failures due to operational inconsistency
- Manual monitoring of 10+ locations is impossible
- Franchisees lack visibility into performance
- Centralized ordering saves 15-25% on supplies
- Brand compliance requires constant field visits

---

## 3. Product Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRANCHISE AI MANAGER                             │
├─────────────────────────────────────────────────────────────────┤
│  FRANCHISOR DASHBOARD ────────────────────────────────────────── │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │Operations│ │ Compliance│ │Analytics │ │ Ordering │           │
│  │ Monitor  │ │ Tracking │ │ Insights │ │ System  │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    AI LAYER                               │   │
│  │  Performance │ Compliance │ Inventory │ Demand │ Staffing  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    FRANCHISEE PORTALS                    │   │
│  │  Location 1 │ Location 2 │ Location 3 │ ... Location N  │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Core Features

### 4.1 Multi-Location Dashboard (P0)

| Feature | Description |
|---------|-------------|
| Real-time KPIs | Sales, orders, footfall per location |
| Comparative Analysis | Location vs location benchmarking |
| Trend Analysis | Daily, weekly, monthly trends |
| Alerts | Anomaly detection, threshold breaches |
| Export | Reports in PDF, Excel |

**KPIs Tracked:**
- Revenue per location
- Average order value
- Customer footfall
- Staff productivity
- Inventory turnover
- Customer satisfaction

### 4.2 Brand Compliance (P0)

**Compliance Checkpoints:**

| Category | Checks |
|----------|--------|
| Visual | Logo usage, signage, color codes |
| Operations | SOP adherence, service time |
| Products | Menu/item compliance, pricing |
| Staff | Uniform, grooming standards |
| Cleanliness | Store cleanliness scores |
| Customer Service | Service standards |

**Compliance Scoring:**
```
Location Score = Σ(checkpoints × weight × score) / Σ(weight)

Weights:
├── Visual Standards: 20%
├── Operations: 30%
├── Products: 25%
├── Staff: 15%
└── Cleanliness: 10%

Score: 0-100
- 90-100: Excellent
- 75-89: Good
- 60-74: Needs Improvement
- Below 60: Critical
```

### 4.3 Centralized Ordering (P0)

**Features:**
- Single dashboard for all supply needs
- Automated reorder triggers
- Bulk ordering for better prices
- Delivery scheduling
- Inventory tracking
- Supplier management

**Benefits:**
- 15-25% savings on bulk orders
- 50% reduction in stockouts
- Unified supplier relationships

### 4.4 Performance Benchmarking (P0)

**Benchmarks:**
- Location vs brand average
- Location vs top performer
- Week-over-week, month-over-month
- Category-level comparison

**AI Insights:**
- Why is this location underperforming?
- What can we learn from top locations?
- What interventions are recommended?

### 4.5 Staff Management (P1)

- Shift scheduling across locations
- Attendance tracking
- Performance tracking
- Training completion
- Certification management

### 4.6 Financial Management (P1)

- Royalty tracking
- Revenue sharing calculations
- Payment reconciliation
- Profit/loss per location
- Cash flow management

---

## 5. AI Agents

### 5.1 Performance Monitor Agent
- Tracks all location KPIs
- Detects anomalies
- Sends alerts
- Recommends actions

### 5.2 Compliance Agent
- Analyzes compliance reports
- Identifies gaps
- Prioritizes corrective actions
- Tracks remediation

### 5.3 Demand Forecasting Agent
- Predicts demand per location
- Optimizes inventory
- Prevents stockouts
- Reduces waste

### 5.4 Staffing Optimizer Agent
- Predicts staffing needs
- Optimizes shift schedules
- Reduces labor costs
- Prevents burnout

---

## 6. Data Model

```typescript
interface FranchiseManager {
  id: string;
  franchisorId: string;
  
  // Brand Configuration
  brand: {
    name: string;
    logo: string;
    colors: string[];
    sops: SOP[];
    menu: MenuItem[];
    suppliers: Supplier[];
  };
  
  // Locations
  locations: FranchiseLocation[];
  
  // Performance
  analytics: {
    totalRevenue: number;
    avgComplianceScore: number;
    topLocation: string;
    bottomLocation: string;
  };
}

interface FranchiseLocation {
  id: string;
  franchiseeId: string;
  name: string;
  address: Location;
  
  // Performance
  performance: {
    revenue: DailyRevenue[];
    orders: OrderMetrics;
    footfall: FootfallMetrics;
    satisfaction: number;
  };
  
  // Compliance
  compliance: {
    overall: number;
    visual: number;
    operations: number;
    products: number;
    staff: number;
    cleanliness: number;
    lastAudit: Date;
  };
  
  // Inventory
  inventory: {
    current: InventoryItem[];
    reorderLevel: number;
    lastOrder: Date;
  };
  
  // Staff
  staff: {
    total: number;
    schedule: Shift[];
    attendance: Attendance[];
  };
}

interface ComplianceAudit {
  id: string;
  locationId: string;
  date: Date;
  type: 'scheduled' | 'mystery' | 'self';
  score: number;
  findings: Finding[];
  photos: string[];
}
```

---

## 7. API Endpoints

### Dashboard
```
GET    /api/franchise/dashboard
GET    /api/franchise/analytics
GET    /api/franchise/comparison
```

### Locations
```
GET    /api/locations
POST   /api/locations
GET    /api/locations/:id
PUT    /api/locations/:id
GET    /api/locations/:id/performance
GET    /api/locations/:id/compliance
```

### Compliance
```
GET    /api/compliance/audits
POST   /api/compliance/audits
GET    /api/compliance/scores
GET    /api/compliance/:locationId/history
PUT    /api/compliance/:locationId/remediation
```

### Ordering
```
GET    /api/orders
POST   /api/orders
GET    /api/orders/:id
PUT    /api/orders/:id/status
GET    /api/inventory/:locationId
PUT    /api/inventory/:locationId/:itemId
```

### Staff
```
GET    /api/staff/:locationId
POST   /api/staff/:locationId
GET    /api/staff/:locationId/schedule
PUT    /api/staff/:locationId/schedule
GET    /api/staff/:locationId/attendance
```

---

## 8. Dashboard Screens

### 8.1 Franchisor Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│  Franchise Command Center                    [Brand: BurgerHub]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Portfolio Overview                                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐           │
│  │ 45 Locations │ │ ₹2.5Cr/mo  │ │ 92% Avg     │           │
│  │ Active       │ │ Revenue      │ │ Compliance   │           │
│  └──────────────┘ └──────────────┘ └──────────────┘           │
│                                                                 │
│  Location Performance                                           │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Location          │ Revenue    │ Compliance │ Trend         ││
│  │ ─────────────────────────────────────────────────────────── ││
│  │ Koramangala       │ ₹4.2L     │ 95%       │ ↑ 12%       ││
│  │ Indiranagar       │ ₹3.8L     │ 91%       │ ↑ 5%        ││
│  │ Whitefield        │ ₹3.5L     │ 88%       │ ↓ 2%        ││
│  │ HSR Layout        │ ₹3.1L     │ 82%       │ ↓ 8%        ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  Alerts                                                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ ⚠️ HSR Layout: Compliance dropped 8% | Action needed      │  │
│  │ 🔴 Mall Location: Stockout alert for 3 items              │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. Success Metrics

| Metric | Target |
|--------|--------|
| Compliance score | 90%+ |
| Revenue per location | +15% |
| Stockout rate | -70% |
| Order processing | -50% time |
| Manual effort | -60% |
| Franchisee satisfaction | NPS 50+ |

---

## 10. Team & Timeline

| Role | Count |
|------|-------|
| Tech Lead | 1 |
| Backend Developer | 1 |
| Frontend Developer | 1 |
| AI/ML Engineer | 1 |

**Duration:** 7 weeks  
**Investment:** ₹35L

---

## 11. Go-to-Market

### Phase 1: Pilot (Month 1-2)
- 1 franchise brand, 5 locations
- Core dashboard + compliance

### Phase 2: Expansion (Month 3-5)
- 5 franchise brands, 50 locations
- Full feature set

### Phase 3: Scale (Month 5-7)
- 20 brands, 200+ locations
- Mobile app for franchisees

### Revenue Model
- SaaS per location/month: ₹2,000-10,000
- Centralized ordering: 1-3% of order value
- Implementation fee: ₹50,000-200,000

---

*Spec created: June 28, 2026*
