# Business Copilot - Feature Specification

**Version:** 1.0.0  
**Port:** 4600  
**Status:** ✅ BUILT | **June 18, 2026**

---

## 🎯 Core Feature Overview

Business Copilot is an **AI-powered business intelligence service** with 24 industry skill packs containing 120+ specialized skills for comprehensive business automation and insights.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          BUSINESS COPILOT                                        │
│                            (Port 4600)                                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐       │
│  │                      24 INDUSTRY SKILL PACKS                           │       │
│  │                                                                       │       │
│  │   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐              │       │
│  │   │Restaurant│ │  Hotel   │ │Healthcare│ │  Retail  │   ... +20    │       │
│  │   │  (5010)  │ │  (5025) │ │  (5020)  │ │  (5030)  │              │       │
│  │   │ 12 skills│ │ 12 skills│ │ 12 skills│ │ 12 skills│              │       │
│  │   └──────────┘ └──────────┘ └──────────┘ └──────────┘              │       │
│  │                                                                       │       │
│  └─────────────────────────────────────────────────────────────────────┘       │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐       │
│  │                      SKILL EXECUTION ENGINE                           │       │
│  │                                                                       │       │
│  │   Intent Detection → Industry Matching → Skill Selection → Execution  │       │
│  │                                                                       │       │
│  └─────────────────────────────────────────────────────────────────────┘       │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Core Features

### 1. 24 Industry Skill Packs
**Purpose:** Domain-specific AI capabilities for each industry vertical

| Industry | Port | Skill Count | Key Skills |
|----------|------|------------|------------|
| Restaurant | 5010 | 12 | menu_optimization, inventory_management, table_reservations |
| Hotel | 5025 | 12 | room_pricing, occupancy_optimization, loyalty_program |
| Healthcare | 5020 | 12 | patient_intake, billing_coding, appointment_scheduling |
| Retail | 5030 | 12 | inventory_control, pricing_strategy, customer_segmentation |
| Legal | 5035 | 12 | case_management, document_review, contract_analysis |
| Education | 5060 | 12 | student_enrollment, grade_management, curriculum_planning |
| Agriculture | 5070 | 12 | crop_planning, irrigation_scheduling, harvest_planning |
| Automotive | 5080 | 12 | vehicle_diagnostics, service_scheduling, parts_inventory |
| Beauty | 5090 | 12 | appointment_booking, service_pricing, product_recommendations |
| Fashion | 5095 | 12 | trend_analysis, inventory_planning, visual_merchandising |
| Fitness | 5110 | 12 | member_checkin, class_scheduling, progress_tracking |
| Gaming | 5120 | 12 | player_acquisition, retention_campaigns, tournament_management |
| Government | 5130 | 12 | citizen_intake, permit_processing, compliance_tracking |
| Home Services | 5140 | 12 | job_scheduling, route_optimization, quote_generation |
| Manufacturing | 5150 | 12 | production_planning, quality_control, supply_chain |
| Non-Profit | 5160 | 12 | donor_management, fundraising_campaigns, volunteer_management |
| Professional | 5170 | 12 | client_intake, project_management, billing_management |
| Sports | 5180 | 12 | ticket_sales, venue_management, fan_engagement |
| Travel | 5190 | 12 | booking_management, itinerary_planning, visa_processing |
| Entertainment | 5200 | 12 | event_scheduling, ticket_pricing, artist_management |
| Construction | 5210 | 12 | project_planning, material_tracking, crew_scheduling |
| Financial | 5220 | 12 | account_management, risk_assessment, fraud_detection |
| Real Estate | 5230 | 12 | property_listing, lead_qualification, market_analysis |
| Transport | 5240 | 12 | fleet_management, route_optimization, fuel_management |

**Total: 24 Industries × 12 Skills = 288 Skills**

### 2. Intent Detection
**Purpose:** Understand what the user wants

| Intent | Keywords | Industry Mapping |
|--------|----------|------------------|
| analysis | analyze, insight, report | All |
| optimization | optimize, improve, increase | All |
| scheduling | schedule, plan, book | Restaurant, Hotel, Fitness |
| management | manage, track, monitor | All |
| financial | cost, revenue, profit, margin | All |

### 3. Skill Execution Engine
**Purpose:** Execute industry-specific skills with parameters

| Skill Type | Parameters | Output |
|------------|------------|--------|
| menu_optimization | { items, sales } | recommendations |
| room_pricing | { occupancy, season } | { recommended, range } |
| patient_intake | { patient_data } | { forms, wait_time } |
| inventory_control | { lowStock } | { alerts, reorder } |
| risk_assessment | { credit_data } | { score, factors } |

### 4. Cross-Industry Search
**Purpose:** Find skills across all industries

| Feature | Description |
|---------|-------------|
| Keyword Search | Find skills by keyword |
| Industry Filter | Search within specific industry |
| Multi-Match | Find same skill across industries |

---

## 🌐 API Endpoints

### Health & Status

```
GET /health
  Response: {
    status: 'healthy',
    service: 'business-copilot',
    port: 4600,
    industries: 24,
    totalSkills: 288,
    timestamp: string
  }

GET /ready
  Response: { ready: true, service: 'business-copilot', industries: 24, skills: 288 }
```

### Industries

```
GET /api/industries
  Response: {
    success: true,
    industries: [
      { id: 'restaurant', name: 'Restaurant', port: 5010, skills: 12 },
      ...
    ],
    totalIndustries: 24,
    totalSkills: 288
  }

GET /api/industries/:id
  Response: {
    success: true,
    industry: {
      id: string,
      name: string,
      port: number,
      skills: string[]
    }
  }

GET /api/industries/:id/skills
  Response: {
    success: true,
    industry: string,
    skills: [
      { id: 1, name: 'menu_optimization' },
      ...
    ]
  }
```

### Skills

```
GET /api/skills/search?q=pricing&industry=restaurant
  Response: {
    success: true,
    query: 'pricing',
    results: [
      { industry: 'Restaurant', industryId: 'restaurant', skills: ['menu_optimization'] },
      { industry: 'Hotel', industryId: 'hotel', skills: ['room_pricing'] },
      ...
    ],
    totalMatches: number
  }

POST /api/skills/execute
  Body: { industry: string, skill: string, params?: object }
  Response: {
    success: true,
    industry: string,
    skill: string,
    result: object,
    timestamp: string
  }
```

### Chat (Main Endpoint)

```
POST /api/chat
  Body: {
    query: string,           // Required
    industry?: string,       // Auto-detected if not provided
    userId?: string,
    context?: object
  }
  
  Response: {
    success: true,
    requestId: string,
    query: string,
    industry: string,
    intent: string,
    skillsUsed: string[],
    response: {
      message: string,
      intent: string,
      insights: string[],
      recommendations: string[],
      industry: string,
      context: object
    },
    timestamp: string
  }
```

### Statistics

```
GET /api/stats
  Response: {
    success: true,
    stats: {
      industries: 24,
      totalSkills: 288,
      skillsPerIndustry: [
        { industry: 'Restaurant', count: 12 },
        ...
      ]
    }
  }
```

---

## 📊 Industry-to-Skill Mapping

### Restaurant (5010)
```
menu_optimization, inventory_management, staff_scheduling, table_reservations,
customer_feedback, table_turnover, food_cost_analysis, peak_hour_planning,
supplier_management, hygiene_compliance, special_offer_planning, review_management
```

### Hotel (5025)
```
room_pricing, occupancy_optimization, guest_checkin, housekeeping_scheduling,
concierge_services, event_management, revenue_forecasting, amenity_management,
cancellation_policy, loyalty_program, review_response, upselling_techniques
```

### Healthcare (5020)
```
patient_intake, appointment_scheduling, billing_coding, insurance_claims,
medical_records, treatment_plans, bed_management, staff_credentials,
inventory_management, compliance_tracking, patient_followup, emergency_protocol
```

### Retail (5030)
```
inventory_control, visual_merchandising, customer_segmentation, loyalty_programs,
pricing_strategy, supplier_negotiation, loss_prevention, POS_operations,
e_commerce, returns_management, staff_training, seasonal_planning
```

### Financial (5220)
```
account_management, transaction_processing, risk_assessment, compliance_reporting,
portfolio_management, client_onboarding, fee_calculations, audit_support,
regulatory_filing, fraud_detection, statement_generation, advisory_services
```

---

## 🛡️ Security Features

| Feature | Implementation |
|---------|----------------|
| Rate Limiting | 100 requests/minute per IP |
| Request IDs | UUID tracking for all requests |
| Helmet.js | Security headers |
| CORS | Cross-origin resource sharing |
| Input Validation | All inputs validated |

---

## 🔄 Flow Diagrams

### Query Flow
```
User: "How can I improve restaurant profits?"
         ↓
Business Copilot: POST /api/chat
         ↓
Intent Detection: optimization
         ↓
Industry Detection: restaurant (auto or specified)
         ↓
Skill Selection: menu_optimization, food_cost_analysis
         ↓
Skill Execution
         ↓
Response Generation
         ↓
User: Insights + Recommendations
```

### Skill Execution Flow
```
Developer: POST /api/skills/execute
Body: { industry: 'restaurant', skill: 'menu_optimization', params: {} }
         ↓
Validation: Check industry and skill exist
         ↓
Skill Lookup: Find skill in INDUSTRY_SKILLS
         ↓
Execution: Call SkillEngine.execute()
         ↓
Result Return: { recommendations, analysis }
```

---

## ⚙️ Configuration

```env
PORT=4600
```

---

## 🧪 Testing

### Test Health
```bash
curl http://localhost:4600/health
```

### List Industries
```bash
curl http://localhost:4600/api/industries
```

### Search Skills
```bash
curl "http://localhost:4600/api/skills/search?q=inventory"
```

### Chat Query
```bash
curl -X POST http://localhost:4600/api/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "optimize my hotel pricing", "industry": "hotel"}'
```

### Execute Skill
```bash
curl -X POST http://localhost:4600/api/skills/execute \
  -H "Content-Type: application/json" \
  -d '{"industry": "restaurant", "skill": "menu_optimization"}'
```

---

## 📈 Statistics

| Metric | Value |
|--------|-------|
| Industries | 24 |
| Total Skills | 288 |
| Skills per Industry | 12 |
| API Endpoints | 10 |
| Rate Limit | 100 req/min |

---

## 🚀 Deployment

```bash
# Install dependencies
cd companies/HOJAI-AI/services/business-copilot
npm install

# Start production server
npm start

# Health check
curl http://localhost:4600/health
```

---

## 📝 Summary

| Aspect | Details |
|--------|---------|
| **Port** | 4600 |
| **Type** | Business Intelligence / AI Copilot |
| **Framework** | Express.js |
| **Industries** | 24 |
| **Total Skills** | 288 |
| **API Endpoints** | 10+ |
| **Rate Limit** | 100 req/min |
| **Authentication** | Request ID tracking |

---

*Last Updated: June 18, 2026*
